#!/usr/bin/env node
// Stats over Journal session notes: source/date/tags are structured fields
// every note carries; model names and "1M context" only show up as
// incidental prose, so those are counted separately and reported as
// partial signal, not a clean metric.
//
// Usage: node session-stats.js [path/to/Journal/Projects]
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || path.join(process.env.HOME, 'Develop/Pet/Journal/Projects');

function findSessionFiles(root) {
  const files = [];
  for (const project of fs.readdirSync(root, { withFileTypes: true })) {
    if (!project.isDirectory()) continue;
    const sessionsDir = path.join(root, project.name, 'sessions');
    if (!fs.existsSync(sessionsDir)) continue;
    for (const f of fs.readdirSync(sessionsDir)) {
      if (f.endsWith('.md')) files.push({ project: project.name, file: path.join(sessionsDir, f) });
    }
  }
  return files;
}

const MODEL_RE = /\b(opus|sonnet|haiku|fable)\b/i;
const CONTEXT_RE = /1[- ]?m(illion)?[- ]?(token)?[- ]?context/i;

const files = findSessionFiles(root);

const perProject = new Map();
const perMonth = new Map();
const tagCounts = new Map();
let withModelMention = 0;
let with1mContext = 0;
const projectsWithModelMention = new Set();

for (const { project, file } of files) {
  const text = fs.readFileSync(file, 'utf8');

  perProject.set(project, (perProject.get(project) || 0) + 1);

  const created = text.match(/^\*\*Created\*\*:\s*(\d{4}-\d{2})/m);
  if (created) {
    const month = created[1];
    perMonth.set(month, (perMonth.get(month) || 0) + 1);
  }

  const tagsLine = text.match(/^\*\*Tags\*\*:\s*(.+)$/m);
  if (tagsLine) {
    for (const tag of tagsLine[1].match(/#[\w-]+/g) || []) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  if (MODEL_RE.test(text)) {
    withModelMention++;
    projectsWithModelMention.add(project);
  }
  if (CONTEXT_RE.test(text)) with1mContext++;
}

function topN(map, n) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

const report = {
  totalSessionFiles: files.length,
  totalProjectsWithSessions: perProject.size,
  sessionsPerMonth: Object.fromEntries([...perMonth.entries()].sort()),
  topProjectsBySessionCount: topN(perProject, 10),
  topTags: topN(tagCounts, 15),
  modelMentions: {
    filesWithAnyModelName: withModelMention,
    projectsWithAnyModelName: projectsWithModelMention.size,
    note: 'incidental prose mentions (opus/sonnet/haiku/fable), not a structured field',
  },
  oneMillionContextMentions: with1mContext,
};

console.log(JSON.stringify(report, null, 2));
