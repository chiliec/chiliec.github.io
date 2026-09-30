---
title: What 86 projects of session notes actually track
date: 2026-09-30 10:00:00
tags: [claude-code, data]
categories:
---
Every Claude Code session I run ends with a note: what happened, what got committed, what's next. After [writing about that workflow](/post/How-I-work-with-AI-agents/), I got curious about a narrower question — what do five months of these notes say about which model I actually use for what. I wrote a small script to check. The honest answer is: not much, directly, because I never set out to record it. Here's what the notes do carry, and the one thing they surprised me by carrying not at all. <!-- more -->

## The script

`build-tools/session-stats.js` walks `Journal/Projects/*/sessions/*.md`, reads each file's header fields, and counts. Plain Node, no dependencies, about 80 lines. Run against my Journal folder right now:

~~~json
{
  "totalSessionFiles": 1176,
  "totalProjectsWithSessions": 86,
  "sessionsPerMonth": {
    "2026-04": 100,
    "2026-05": 144,
    "2026-06": 429,
    "2026-07": 29,
    "2026-08": 303,
    "2026-09": 171
  }
}
~~~

1,176 session notes across 86 projects that have at least one. June was the busiest month by a wide margin (429 notes); July was the quietest (29).

## What a note actually carries

Every session note has the same four header fields:

~~~
**Summary**: ...
**Created**: 2026-06-29 14:53
**Updated**: 2026-06-29 14:53
**Tags**: #debugging #windows-bash #telegram-login
~~~

`Summary`, `Created`, `Updated`, `Tags` — that's it. No `Model` field. I write these notes (or rather, the agent does, at session end) to capture what happened and why, not which model handled it. So "count model mentions" isn't a metric the notes were built to answer. It's a grep against free text, and I should treat it that way.

## What grep finds anyway

Run it anyway and it's not empty, just sparse: 168 of the 1,176 files mention a model name (`opus`, `sonnet`, `haiku`, `fable`) somewhere in the body, across 32 of the 86 projects. That's incidental — usually because a model switch was itself the notable event, not routine work.

Two examples from this site's own project folder and from ClaudeBar's, both already public:

- A note from this repo's Journal folder, dated 2026-09-23, opens with: "Switched Claude Code model to Opus and updated CLI from 2.1.258 to 2.1.280 (environment maintenance)."
- A ClaudeBar session note from 2026-06-25 records cleaning up a stale `CLAUDE.md` rule about per-skill model switching, and fixing `settings.json` so the documented default (`opusplan` — Opus for planning, Sonnet for execution) actually matched what was configured. The note is explicit that model switching is user-only: the agent doesn't have a tool to change the session model and won't attempt to.

That's the real pattern behind the sparse numbers: model choice shows up in notes when it's a decision or a fix, not as a running log.

## What else holds up

Tags are free-text hashtags, a few per session, so they're noisy, but the most common ones across all 1,176 notes are a decent proxy for what the work actually was:

~~~
#deployment  214
#testing      84
#kamal        57
#design       56
#planning     47
~~~

That skew toward deployment and testing tracks with a workflow built around spec → plan → agents → review, where "shipped and verified" is the point where a note gets written.

## What the notes can't see

I also grepped for the [1M context change](/post/How-Claude-Code-1M-context-burns-through-limits/) I wrote about in April, the one that made the weekly limit burn in a day. Zero hits. That's not a finding, it's a gap: the earliest session note is from 2026-04-19, two weeks after that post. Notes only cover what happened after I started writing them, and only what felt worth writing down at the time.

The script is committed at `build-tools/session-stats.js` in this repo if you want to point it at your own `Journal/Projects/` and see what your notes actually track.
