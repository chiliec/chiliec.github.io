---
title: My Claude Code config is a git repo
date: 2026-09-26 10:00:00
tags: [claude-code, tooling, dotfiles]
categories:
---
`~/.claude/` is where Claude Code keeps its model choice, permissions, hooks and skills, and none of it is meant to be edited by hand and forgotten. I keep the real files in a private repo and symlink them into place, so every change — mine or the agent's — is a diff I can read and revert. This is the setup, not a pitch for it. <!-- more -->

## What's symlinked

`setup.sh` links seven paths from the repo into `~/.claude/`:

~~~bash
link CLAUDE.md          CLAUDE.md
link settings.json      settings.json
link skills             skills
link hooks/pin-model.sh     hooks/pin-model.sh
link hooks/context-guard.sh hooks/context-guard.sh
link hooks/obsidian-load.sh hooks/obsidian-load.sh
link hooks/obsidian-save.sh hooks/obsidian-save.sh
~~~

Because `~/.claude/settings.json` is a symlink, not a copy, any write Claude Code itself makes to that file lands directly in the working tree. That turns out to matter, see below. One thing is deliberately *not* symlinked: my [account switcher](https://github.com/chiliec/claude-account) is its own public repo, fetched by `curl` in `setup.sh` instead, so the auth state it manages stays local to each machine rather than living in a config repo.

## Four hooks

`settings.json` wires four scripts, all in `hooks/`:

| Script | Event(s) | What it does |
|---|---|---|
| `pin-model.sh` | `UserPromptSubmit` | Restores the pinned default model |
| `context-guard.sh` | `Stop`, `UserPromptSubmit` | Warns when context is getting large, never blocks |
| `obsidian-load.sh` | `SessionStart` | Loads the project's `SUMMARY.md` into context |
| `obsidian-save.sh` | `SessionEnd` | Writes `SUMMARY.md` and a session note back to the vault |

The Obsidian pair is the memory layer I wrote about in [how I work with AI agents](/post/How-I-work-with-AI-agents/). `context-guard.sh` reads the real context size out of the session transcript and nudges toward `/exit` at 130k tokens, which is below the roughly 166k point where Claude Code auto-compacts a 200k-token window on its own. It also warns on resume past 100k tokens after 300 seconds idle, on the theory that re-caching a cold session costs more than starting a fresh one.

## The model setting fights back

`settings.json` pins `"model": "opusplan"` — Opus for planning, Sonnet for execution, a rule that's also spelled out in my global `CLAUDE.md`. The problem: `/model` and the harness's own on-exit save both rewrite that same top-level key, and since the file is a symlink into the repo, the rewrite shows up as uncommitted drift I'd otherwise have to notice and revert by hand. `pin-model.sh` runs on every prompt and puts it back:

~~~bash
PINNED="opusplan"
F="$HOME/.claude/settings.json"

[ -f "$F" ] || exit 0
grep -q "^  \"model\": \"$PINNED\",\$" "$F" && exit 0

current=$(sed -n 's/^  "model": "\(.*\)",$/\1/p' "$F")
[ -n "$current" ] || exit 0

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
sed "s/^  \"model\": \".*\",\$/  \"model\": \"$PINNED\",/" "$F" > "$tmp"
cat "$tmp" > "$F"  # redirect, not mv — mv would replace the symlink with a file
~~~

It only touches the on-disk default. A mid-session `/model` switch still runs on whatever model I picked; only the next fresh session goes back to `opusplan`. The `cat > "$F"` instead of `mv` matters for the same reason the whole setup exists: `mv` would replace the symlink with a plain file and quietly break the link to the repo.

## Skills are generated, not forked

`skills/` is [superpowers](https://github.com/obra/superpowers) — pinned in this repo at tag `v6.2.0` — plus a small overlay, and it's never hand-edited. `build.sh` clones the pinned tag, replaces `skills/` wholesale, then reapplies the overlay via `overlay/customize.sh`:

1. A path redirect across every `*.md`, so upstream's generic docs convention points at my actual Obsidian vault path instead.
2. Four patches (`overlay/patches/*.patch`) against `brainstorming`, `writing-plans`, `executing-plans`, and `subagent-driven-development` — they add the Opus model gates and point plan/session saves at the vault.
3. One shared helper file the patched skills reference for worktree edge cases, which doesn't exist upstream.
4. Local skills that have no upstream equivalent — currently just `disk-cleanup`.

Everything else is byte-identical to what `obra/superpowers` ships. If a future upstream release restructures a patched section, `build.sh` fails loudly instead of silently applying a stale patch, which is the point of pinning a tag rather than tracking a branch.

## What the baseline actually costs

I measured what reaches the model at the start of a session, once, on 2026-08-07, by reading the `content` field of the `SessionStart` attachment in a session transcript (not the attachment object — it repeats the text in both `content` and `stdout`, which doubles the apparent size):

| Block | chars | Lever |
|---|---|---|
| Workflow tool schema | ~12,000 | disabled, never invoked |
| Obsidian `SUMMARY.md` | 7,890 | generation cap |
| Skill listing | 6,018 | per-skill overrides |
| `CLAUDE.md` ×2 | 5,463 | keep terse |
| Ponytail `SessionStart` | 5,228 | only `off` removes it |
| Agent listing | 2,531 | plugin config |
| claude.ai connector tool names | 1,262 | disabled |
| MCP instructions | 775 | per-server |
| Bundled deferred tool names | 362 | — |

Roughly 25k tokens of fixed baseline (divide chars by ~3.7), out of a 200k window, leaves about 135k tokens of real working room once a safety margin is subtracted. That's why `context-guard.sh` warns at 130k rather than closer to the actual auto-compact point — there isn't much room past it. The one surprising result: I'd assumed a plugin's intensity setting (`lite`/`full`/`ultra`) changed how much it injected into context. It doesn't — all three levels cost about the same, because the level only swaps one table row in the prompt. Turning a block off entirely is the only lever that moves the number.

None of this is exotic. It's a symlink farm, four small scripts, and one generated directory, kept in git so a change is a commit instead of a fact I have to remember.
