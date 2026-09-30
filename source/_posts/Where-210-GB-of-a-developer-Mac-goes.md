---
title: Where 210 GB of a developer Mac goes
date: 2026-09-23 10:00:00
tags: [macos, xcode, tooling]
categories:
---
My MacBook has 228 GB of usable disk, and I run out of it often enough that disk cleanup is a recurring routine with its own notes. So I have the receipts: what fills it, how fast, and what I do about it. <!-- more -->

## The map

`diskutil info` on the Data volume, right now:

~~~
$ diskutil info /System/Volumes/Data | grep -E "Volume (Used|Free)|Container Total"
   Container Total Space:     245.1 GB (245107195904 Bytes)
   Volume Used Space:         210.8 GB (210836877312 Bytes)
   Volume Free Space:         9.0 GB (8988352512 Bytes)
~~~

245.1 GB in decimal units is 228 GiB, which is where my 228 figure comes from. 210 GB of it is used and 9 GB is free, which is a bad day but not an unusual one. Here's where the big developer-tool consumers sit, from `du -sh` on the paths I check most often:

~~~
15G   ~/Library/Containers/com.docker.docker/Data
11G   ~/Library/Developer/CoreSimulator
7.5G  /opt/homebrew            (mostly Cellar: 4.2G)
7.4G  ~/Library/Application Support
6.1G  node_modules under ~/Develop (all projects)
1.1G  ~/Library/Application Support/Code
1.0G  ~/Library/Developer/Xcode/DerivedData
932M  ~/.claude
830M  ~/.npm
688M  ~/.cache
554M  ~/Library/Caches/ms-playwright
485M  ~/.gradle
~~~

Leaving out Application Support (mostly app data, not cache), that's about 44 GB of developer tooling, caches and build artifacts that can be reinstalled or rebuilt. The rest of the 210 GB is everything else on the machine.

## One line per category

- **Docker** — the VM's disk image doesn't shrink when you delete something inside it. `docker builder prune` and `docker system prune` are the levers.
- **Xcode DerivedData** — rebuilds itself on the next build. Always safe to delete, rarely worth doing manually because it's small compared to everything else.
- **CoreSimulator** — every simulator device you've ever booted stays at full size, shut down or not, until you delete the device (not just the OS runtime).
- **node_modules** — reinstalls from a lockfile in seconds. Only worth touching for projects you're not actively working in; 6.1 GB across every active project isn't worth curating.
- **Package caches** (npm, pip, Homebrew, Playwright, Gradle) — each one is just downloaded artifacts, keyed by version. Safe to wipe, refills on the next install.
- **~/.claude** — mostly `projects/`, the session transcripts Claude Code keeps per project (604 MB of the 932 MB total).

## Why it keeps coming back

The categories above are honest but slow-moving. The fast-moving one is Docker's build cache: one recent cleanup found 12.4 GB of it from rebuilding a single project's image repeatedly that day — roughly a 12 GB/day rate while that project is under active development. `docker builder prune` after a rebuild session is the fix; there's no cache-eviction policy that does it for me.

mediaanalysisd — the background process that runs Photos' on-device ML indexing — is the other one that moves without warning: I've seen it anywhere from 1.8 GB to 5.6 GB across different cleanup sessions. It's not something I asked for, and it comes back after every clear.

## Full Disk Access changes what you can trust

One thing worth knowing before you believe any `du` number on macOS: without Full Disk Access, some tools get silently truncated results. I hit this with my terminal app — `du -x ~` was reporting over a hundred paths as "Operation not permitted" and skipping them entirely, no error banner, just a smaller total than reality. Granting Full Disk Access to the terminal fixed it. If your cleanup math never seems to add up, check that first.

## What Scrub automates

The actual manual routine — run `du` on a dozen paths, decide what's stale versus what's mid-project, delete, repeat next week — is exactly the kind of task that should be a tool instead of a habit. I've been building one: Scrub, a macOS app with 11 scanners split into three safety tiers:

- **Always safe**: npm, Yarn, pnpm, and Homebrew caches.
- **Usually safe**: Xcode DerivedData, Playwright, browser caches.
- **Review needed**: iOS device support files, simulator runtimes, node_modules, Trash.

Each scanner reports its size, then a preview sheet lets me check or uncheck individual items before anything is deleted — nothing runs unattended. An mtime filter keeps it from flagging a `node_modules` folder that's been touched in the last 30 days as stale, which is the mistake I'd otherwise make by hand under time pressure. It's still a dormant side project, ad-hoc signed for my own machine rather than notarized and shipped, but the scanning and preview logic already replaces the du-and-guess part of every cleanup session I run.

The disk itself isn't getting bigger. Until it does, this is the routine.
