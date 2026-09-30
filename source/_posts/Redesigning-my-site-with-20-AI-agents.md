---
title: Redesigning my site with 20 AI agents in 89 minutes
date: 2026-09-30 12:00:00
tags: [claude-code, ai, web]
categories:
---
The site you're reading was redesigned yesterday. I didn't write the code — I wrote the spec, approved a plan, and let Claude Code run it through a pipeline of subagents: 9 tasks, 20 agents, 89 minutes of active work. Here's what that actually looked like, including the parts that didn't go to plan. <!-- more -->

## Spec first, code later

The work happened in two separate sessions, on purpose.

**Session one — design.** A brainstorm with rendered mockups of several visual directions, side by side in the browser. I picked "Editorial Paper": warm paper background, Instrument Serif headlines, JetBrains Mono labels, and real App Store screenshots of my own apps as the only imagery. Then an 89-line spec — palette, fonts, motion behaviour, performance budget, done criteria — and a 1,180-line plan split into 9 tasks, each with exact files, code and checks.

Some decisions made there, before any code existed:

- **GSAP + Lenis, no Three.js.** A fanned stack of screenshots gains nothing from WebGL, and Lighthouse would pay for it.
- **Progressive enhancement.** HTML and CSS render the final state; JavaScript only adds motion when it's allowed. `prefers-reduced-motion` exits before a single tween is created.
- **Motion only on Home, About, Apps.** Blog posts get the new fonts and colours, but stay calm.

**Session two — execution.** A fresh context that only knows the plan. This is the same lesson as in [the 1M context post](/post/How-Claude-Code-1M-context-burns-through-limits/): the long design conversation doesn't need to ride along into implementation.

## The pipeline

The orchestrator session doesn't write code. For each task it dispatches an implementer subagent, then a separate reviewer subagent that checks the result against the spec and the plan. The final review of the whole branch runs on a stronger model.

| Role | Count | Model |
|---|---|---|
| Implementers (tasks 1–8, perf fix, review fixes) | 10 | Sonnet |
| Per-task reviewers + re-review | 9 | Sonnet |
| Final whole-branch reviewer | 1 | Opus |

Result: 10 commits, 39 files changed, +730/−227 lines. First event to last commit of the implementation: 82 minutes. Merge and deploy check: another 3.

## What the reviews caught

Tasks 1–8 all passed review. The interesting findings came from elsewhere.

**A contradiction in my own plan.** The Task 5 reviewer noticed that the reduced-motion failsafe animated `visibility`, while the plan's global constraints said "transforms and opacity only." The agent didn't silently pick one — it stopped and asked. I kept the failsafe; `visibility` is an instant toggle, not an animation cost.

**Two real bugs, found only by the final review.** Per-task reviewers look at one task; the whole-branch reviewer sees how tasks interact:

1. A GSAP stagger tween finished by leaving an inline `transform: translate(0, 0)` on the work rows. Inline style beats the stylesheet, so the CSS hover nudge on the home page was permanently dead. Fix: `clearProps: 'transform'`.
2. The scroll parallax on screenshots also ran inside the horizontal-scroll strip on mobile, cropping shadows and adding vertical scroll where there should be none. Fix: gate it with `gsap.matchMedia()` to desktop widths.

Neither bug would show up in a unit test. Both are the kind a human would find a week later, on their phone.

## Performance: an honest 87

The plan's target was mobile performance ≥ 90 in Lighthouse. The first measurement of the home page: **77**, with LCP at 5.6 s.

The culprit was the hero screenshots: JPEGs from Apple's CDN. The CDN serves the same image as WebP if you ask for `.webp` instead of `.jpg` in the URL — a one-line change in the build script. One screenshot went from 69 KB to 24 KB at the same size. FCP dropped from 2.3 s to 0.9 s, performance rose to **87**.

The remaining gap comes from the intro animation: the hero fades in, and Lighthouse only credits LCP once the element is visible. The agent laid out the trade-off and asked. I kept the animation — the intro is the point of the page.

Final numbers (mobile, performance / accessibility / best practices / SEO):

| Page | Mobile | Desktop | CLS |
|---|---|---|---|
| Home | 87 / 100 / 100 / 100 | 98 / 100 / 100 / 100 | 0 |
| About | 92 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 0 |
| Apps | 90 / 100 / 100 / 100 | 100 / 100 / 100 / 100 | 0.01 |

## What didn't go smoothly

- **The browser was locked.** Chrome DevTools MCP uses a shared browser profile, and another Claude Code session held it through most of the run. Live browser checks for tasks 3–8 were deferred to the final task, which worked around it with the standalone `lighthouse` CLI and an isolated profile in `/tmp`.
- **A hanging screenshot.** Headless `chrome --screenshot` hung indefinitely — twice. The workaround was Lighthouse's own final-screenshot audit.
- **Five minor findings parked**, not fixed: a font preload on pages that don't need it, missing `lang="ru"` on archive titles, and similar. They're written down; they'll wait.

## My part

Three questions from the agents over the whole run, each with a recommended option: keep the failsafe, keep the animation, delete the merged branch. Everything else — code, reviews, measurements, fixes — happened without me.

What I actually did was the work before the code: choose the direction from rendered mockups, write down what "done" means, and cut scope (no Three.js, no motion on reading pages). The agents are good at following a plan and catching each other's mistakes. They can't decide what the site should be. That part is still the job.
