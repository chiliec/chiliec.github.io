---
title: "Building a Claude Code plugin: the obsidian-memory hooks"
date: 2026-09-27 10:00:00
tags: [claude-code, obsidian, plugin]
categories:
---
[How I work with AI agents](/post/How-I-work-with-AI-agents/) mentioned a plugin I wrote so project memory survives between sessions, but only in passing. This post is the plugin itself: two hooks, a locked-down child `claude` process, and the security fix I shipped the same day as the first release. <!-- more -->

[obsidian-memory](https://github.com/chiliec/obsidian-memory) installs as a Claude Code plugin from its own marketplace repo. It writes a project's state into an Obsidian vault when a session ends, and reads it back in when the next one starts.

## The two hooks

The whole plugin is wired through one `hooks.json`:

~~~json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/obsidian-load.sh",
            "timeout": 10
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/obsidian-save.sh",
            "timeout": 300,
            "async": true
          }
        ]
      }
    ]
  }
}
~~~

`SessionStart` gets 10 seconds and runs synchronously, because it's just a file read. `SessionEnd` gets 300 seconds and runs `async: true`, because it spawns a model call and shouldn't block the session from closing.

## SessionStart: load the summary

`obsidian-load.sh` reads the hook's JSON payload for `cwd`, takes the basename as the project name, and looks for `<vault>/<project>/SUMMARY.md`. If it finds one, it emits it as `additionalContext`:

~~~bash
jq -n \
  --arg ctx "Obsidian project summary from previous session (loaded from $SUMMARY):

$CONTENT" \
  '{hookSpecificOutput: {hookEventName: "SessionStart", additionalContext: $ctx}}'
~~~

It no-ops silently in five cases: a recursion guard is set, the vault env var is unset, the vault directory doesn't exist, `jq` isn't on `PATH`, or there's no `SUMMARY.md` for this project yet. An unconfigured install is just quiet, not broken.

## SessionEnd: write the summary

`obsidian-save.sh` does more work. It reads `session_id` and `cwd` from the payload, locates the session's transcript under `~/.claude/projects/`, and counts user/assistant turns. Below four turns it skips — not worth a model call for a one-liner. It also checks a dedup registry keyed on `session_id:turn_count`, so a hook that fires twice for the same session doesn't write twice, and it skips projects whose `SUMMARY.md` has `**Status**: archived`.

If none of those short-circuit it, it builds a prompt: the last ~150 turns of the transcript capped at 40KB, the project's `MEMORY.md` if one exists (treated as authoritative, human-owned ground truth), and the existing `SUMMARY.md`. That prompt goes to a child `claude` process that writes two files: a new, immutable session note under `sessions/`, and a rewritten `SUMMARY.md` for the project.

## Locking down the summarizer

The transcript fed into that prompt is untrusted — it can contain anything a session touched: pasted text, tool output, a web page. The first version ran the child with `--dangerously-skip-permissions`. A commit review on the day of the first release flagged that as a prompt-injection RCE risk, and I fixed it in the same session, in commit `c523729`, which also bumped `plugin.json` from version 0.1.0 to 0.1.1:

~~~bash
nohup "$CLAUDE_BIN" \
  -p "$PROMPT" \
  --output-format text \
  --permission-mode dontAsk \
  --allowedTools "Write" \
  --disallowedTools "Bash,Read,Edit,MultiEdit,NotebookEdit,WebFetch,WebSearch,Task,Agent" \
  --model claude-haiku-4-5 \
  </dev/null >>"$LOG" 2>&1
~~~

`--permission-mode dontAsk` means it never blocks on an interactive prompt — it auto-denies anything not explicitly allowed. `--allowedTools "Write"` is the only capability it needs. The `--disallowedTools` list is belt-and-suspenders: `dontAsk` still permits read-only Bash by default, so Bash, Read, and the network tools are denied explicitly. That closes both the code-execution and the exfiltration path. The existing `SUMMARY.md` is passed into the prompt text instead of read by the child, so it doesn't need `Read` at all. One risk is still open and documented in the README: a crafted transcript could in principle steer the one allowed `Write` to an unintended local path. The prompt marks everything between its `=====` delimiters as data, not instructions, as the mitigation.

The model doing the writing is `claude-haiku-4-5` — cheap enough that a summary per session end isn't a cost most people would notice.

## What gets written

A session note has `Summary`, `Created`/`Updated` timestamps, 2-5 tags, and 6-15 content bullets with `[[wikilinks]]`. `SUMMARY.md` has YAML frontmatter (`project`, `cwd`, `status`, `tags`) followed by `## Goal`, `## Current state`, `## Key files`, `## Recent decisions`, `## Open tasks / blockers`, `## Context to resume`, and a `## Recent sessions` block bounded by `<!-- SESSIONS:START -->` / `<!-- SESSIONS:END -->` markers. A shell post-processing step (not the model) rebuilds that block from the 10 most recent files in `sessions/` after every write, and truncates the whole file if it passes a 12,000-character trigger, keeping the tail intact.

## Installing it

~~~
/plugin marketplace add chiliec/obsidian-memory
/plugin install obsidian-memory
/obsidian-memory-setup
~~~

The setup command checks for `jq` and the `claude` CLI, asks for the vault's Projects-root path, and writes it as `OBSIDIAN_MEMORY_VAULT` in `~/.claude/settings.json`. There's also a manual `install.sh` fallback for anyone not on the plugin system.

Before any of that ships, `tests/smoke.sh` runs: it checks the shipped files for personal strings, validates shell syntax and JSON, and exercises both hooks against a temp vault. Ten checks, all passing, wired into GitHub Actions on every push to `main` and every pull request.

## The vault today

This plugin is why I can make claims like this one. Counting fresh from the vault right now: 99 project folders under `Journal/Projects/`, holding 406 specs, 445 plans and 1,176 session notes. The session notes go back to April, two months before the plugin: the same hooks ran as local scripts in my config first. Turning them into a plugin mostly meant stripping out the personal parts: hardcoded paths and my Linear logic.
