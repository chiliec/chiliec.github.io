---
title: How Claude Code's 1M context burns through limits 3-4x faster
date: 2026-04-03 23:02:00
tags: [claude-code, ai, llm]
categories:
---
I noticed something unpleasant: the weekly limit on my Max subscription in Claude Code started melting away in about a day. Same projects, same habits — yet a third of the weekly window was gone after 4 hours of work. I figured out what was going on (thanks to [Artem Mukhin](https://artem-mukhin.com) for the breakdown), and here's the short version. <!-- more -->

## What happened

In March 2026, two changes quietly landed:

1. **1M context became the default.** Sessions used to hit a wall at 200K; now they stretch to a million.
2. **The "clear context and implement" option was removed from plan mode.** The whole long planning conversation now stays in the session.

The UX didn't change at all. Same response speed, same status bar, `/stats` shows the same numbers. Meanwhile token usage grew 3.7x in three weeks: from ~27M a day to ~100M.

## Why it's expensive

Claude Code is an iterative session. On **every** new request, the API receives everything again: the system prompt, `CLAUDE.md`, tool definitions, and the entire conversation history. That's billed as `cache_read_input_tokens`.

```
cache_read = context size × number of messages
```

You type the same ~2K tokens per message, whether it's the first or the thirtieth. But by the 30th, the API is re-reading ~250K of accumulated history. With a 200K session you hit the wall after ~50 messages and ran `/compact` — the cache reset. With a 1M session the conversation runs 300+ messages, context swells to 500K, and every message re-reads the whole tail. Roughly: 5M vs 90M `cache_read` per "task" — almost an 18x difference.

So why don't you notice? Because the only way to see it is to crunch your own `jsonl` files. It's nowhere in the UI.

## The fix — two lines in settings.json

In `~/.claude/settings.json`:

```json
{
  "env": {
    "CLAUDE_CODE_DISABLE_1M_CONTEXT": "1"
  },
  "showClearContextOnPlanAccept": true
}
```

Restart Claude Code and you're done. The first line brings sessions back to 200K (`/compact` kicks in earlier, cache reads drop 50-70%). The second restores the "clear context" option in the plan mode menu, so implementation starts from a clean slate without the tail of the discussion.

## What else helps stay within budget

- **`/clear` between unrelated tasks.** The biggest lever. Switched topics — hit `/clear`. Context is a consumable.
- **Slim down `CLAUDE.md`.** The file ships with every message: 10K tokens × 300 messages = 3M `cache_read` a day for nothing. Move rarely needed material into separate files.
- **Use subagents deliberately.** Every subagent gets its own full context from scratch. Fine for parallel search; for sequential tasks it's simpler to work directly.

## Check yourself

Paste this prompt into Claude Code and get your own chart in half a minute:

```
Read all files in ~/.claude/projects/**/*.jsonl,
deduplicate messages by message.id, extract the fields
timestamp, message.usage.cache_read_input_tokens
and message.model. Group by day for the last
60 days. Show:
1) total tokens per day
2) max cache_read in a single message
3) how many messages per day had context >200K
Find the first day context went over 200K.
```

If `max_ctx` jumped above 200K after some date — you're in 1M mode. It's not that you started working more: the UX is the same, but the price is 3-4x higher. Two lines of config put everything back.
