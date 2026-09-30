---
title: "How I work with AI agents: specs, plans, and a memory that survives the session"
date: 2026-09-30 17:00:00
tags: [claude-code, ai, workflow]
categories:
---
The last few posts — [the site redesign](/post/Redesigning-my-site-with-20-AI-agents/), [ClaudeBar](/post/Shipping-ClaudeBar-a-macOS-menu-bar-app/), [four App Store apps](/post/Four-App-Store-apps-in-ten-weeks/) — all mention the same thing in passing: "a spec, a plan, then agents". This post is that workflow, end to end. Since April 2026 it has produced 406 specs, 444 plans and 1,171 session notes across 99 projects, so it's not a theory. <!-- more -->

The tool is Claude Code. The workflow has four steps and one piece of infrastructure.

## 1. Spec: decide what "done" means

Every non-trivial piece of work starts as a conversation that ends in a short design document: goal, scope, what's explicitly *out* of scope, which files change, and how we'll know it's done. For the redesign it was 89 lines.

This is where I spend my attention. The spec is where I choose between options (often from rendered mockups, not descriptions), cut scope, and write down constraints the agents can't guess — "no new npm dependencies", "motion only on three pages", "copy may only use facts from the CV".

## 2. Plan: small tasks, each with its own check

The spec becomes a plan: a list of tasks, each small enough for one agent in one go. Every task in a good plan has the same shape:

1. **A failing check** — a command that fails now and should pass after the task, with its expected output.
2. **The change** — which files, often with the actual code.
3. **The same check again**, now expected to pass.
4. **A commit**, with the exact message.

On top sits a short list of global constraints that must hold after *every* task. The redesign plan was 1,180 lines for 9 tasks. That sounds like a lot of writing, but the agents write most of it; my job is to read it and push back before any code exists — the cheapest moment to change your mind.

## 3. Execute in a fresh session

Here's a rule from my global `CLAUDE.md`: small tasks run inline, but for a large plan, **stop before implementing**. Save the plan, update the project notes, end the session, and start the implementation in a new one.

Two reasons. The long design conversation is expensive to carry around — every message re-reads the whole history, as I found out [the hard way](/post/How-Claude-Code-1M-context-burns-through-limits/). And a fresh session that knows *only* the plan is a good test of the plan: if it can't execute from the document alone, the document isn't done.

## 4. Implement and review with subagents

The implementation session doesn't write code itself. For each task it starts an implementer subagent, then a separate reviewer subagent that checks the result against the spec and the plan. At the end, one more reviewer looks at the whole branch.

Models are picked by the kind of work, also written down in `CLAUDE.md`:

- **Searching** → the cheapest model.
- **Mechanical edits, summaries, log triage** → the mid-tier model.
- **Reasoning that actually needs it** — the final review, a hard bug → the strongest model.

The whole-branch review is the one that earns its cost. In the redesign, the per-task reviewers passed everything; the final reviewer found the two real bugs, both in how two tasks interacted.

## The missing piece: memory

Agents start every session from zero. Without memory, each new session re-discovers the same project, re-asks the same questions and repeats the same mistakes. I use two layers to fix that.

### Project notes: obsidian-memory

[obsidian-memory](https://github.com/chiliec/obsidian-memory) is a small Claude Code plugin I wrote. It's two hooks:

- **When a session ends**, it reads the transcript and, if there were at least four meaningful turns, runs one small, cheap model call that writes two notes into my Obsidian vault: an immutable note for that session, and an updated `SUMMARY.md` for the project — goal, current state, key files, recent decisions, open tasks, and "context to resume".
- **When a session starts**, it loads that project's `SUMMARY.md` into the context.

So a new session starts by knowing that the redesign is merged, which CV variants exist, and what's still open. Specs and plans live next to the summaries, in the same vault, so they're searchable and linked.

One design decision I'd repeat: the summarizer treats the transcript as **untrusted input**. A transcript can contain anything — web pages, tool output, text someone crafted to look like instructions. So the child process that writes the notes is allowed to use exactly one tool, `Write`. No shell, no reading other files, no network. If something in a transcript tries to hijack it, there's nothing to hijack it with.

### Lessons: feedback memories

The second layer is Claude Code's own per-project memory: small files, one fact each. The most valuable kind is *feedback* — a correction I gave once, with the reason, so I don't have to give it again. Two real examples:

- **"Find every call site before shipping."** Twice in one day a fix shipped after finding only the first matching call, or was declared "verified" from evidence that couldn't tell it apart from another explanation. The rule now: search every spelling of the API before naming the cause, and don't claim "verified" if the evidence is ambiguous.
- **"Plain UI over decoration."** I kept rejecting decorative additions — a coloured ring, a gradient background — in favour of system colours and native materials. The rule now: don't add styling nobody asked for.

## What I still do myself

Looking at this workflow from the outside, it can seem like I've automated myself away. The opposite happened. My work moved to both ends:

- **Before the code**: choosing the direction, writing down what "done" means, deciding what's out of scope.
- **After the code**: the questions agents escalate, the bugs that only show up on a real device, and the final call on every merge.

The agents are very good at following a clear plan and at catching each other's mistakes. They're only as good as the plan — and the plan is still my job.
