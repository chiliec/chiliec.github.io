---
title: Four App Store apps in ten weeks, solo
date: 2026-09-30 15:00:00
tags: [ios, kotlin-multiplatform, swiftui, app-store]
categories:
---
Between July 8 and September 16, 2026 I took four apps from an empty repo to the App Store: [Lancar](https://apps.apple.com/us/app/lancar/id6795209576), [SLOVO](https://apps.apple.com/us/app/slovo-russian-phrases/id6796900036), [Callback](https://apps.apple.com/us/app/callback-interview-prep/id6796242315) and [BaliSurf](https://apps.apple.com/us/app/balisurf/id6801866165). Three are Kotlin Multiplatform, one is pure SwiftUI. None of them has an account, analytics or ads. Here's what each one taught me. <!-- more -->

| App | What it is | Stack | First commit → App Store |
|---|---|---|---|
| Lancar | Indonesian vocabulary trainer | KMP + Compose | Jul 8 → Aug 6 |
| SLOVO | Gamified Russian phrasebook | KMP + Compose | Jul 8 → Aug 14 |
| Callback | iOS interview prep | SwiftUI + SwiftData | Jul 29 → Aug 21 |
| BaliSurf | Surf verdicts for 20 reef breaks | KMP + Compose | Aug 15 → Sep 16 |

## Rules I kept for all four

- **Local-first.** Everything works offline. No sign-up, no server, no analytics. Progress lives on the device.
- **Pure logic in its own layer.** In the KMP apps, the domain code — scoring, spaced repetition, question generation — knows nothing about Compose, networking or the platform. That's the part with the most tests, and the part that stays the same on iOS and Android.
- **Release automation from day one.** Uploading builds by hand four times over is how you stop shipping.

## Lancar: the content is the product

I live in Bali and learn Indonesian, so the first app was for me. Lancar is a flashcard and drill trainer: 1,796 cards in 8 modules, with audio, and a 6-box Leitner system for spaced repetition.

The code was the easy part. The content came from Anki decks, and a small Node + ffmpeg pipeline turns them into bundled JSON and audio. Once that pipeline existed, adding a module was a data change, not a code change.

Kotlin Multiplatform surprises: the iOS host is a UIKit `AppDelegate`, not SwiftUI, because Compose Multiplatform expects it. And I had to downgrade SQLDelight from 2.3.2 to 2.0.2 because of an arm64 issue. Neither fact is on the "KMP in 10 minutes" slides.

## SLOVO: the migration I forgot

SLOVO is the reverse direction: a Russian phrasebook for English speakers, with 110 real recorded phrases from [Tatoeba](https://tatoeba.org) (CC-BY, credited in the app), 24 lessons, XP, streaks and hearts.

Its lesson was about databases. I changed the SQLDelight schema and forgot the `.sqm` migration file. New installs worked fine; build 4 crashed on devices that had the old schema. The fix was one file. The lasting fix was a regression test, so a missing migration fails CI instead of crashing on someone's phone.

The release pipeline from SLOVO became the template for the others. BaliSurf's Fastfile literally starts with "Ported from chiliec/slovo's Fastfile": archive a committed Xcode project whose build phase calls Gradle to build the shared framework, then upload with an App Store Connect API key — no Apple ID, no 2FA prompts.

## Callback: testing the content, not just the code

Callback is the only pure Swift app: SwiftUI, `@Observable`, SwiftData, and two local Swift packages — `DesignSystem` for the UI kit and `AppCore` for models, scoring and the review queue. It prepares iOS developers for interviews: 11 topics, 297 questions, lessons, drills and timed mock interviews. It's also the biggest of the four, at about 10,000 lines of Swift.

The most useful tests there don't test code at all. They test the question bank:

- One test checks that the correct answer isn't in a predictable position. It failed: in display order, correct options clustered in a pattern you could learn without knowing anything. The fix was rotating the options of three questions.
- Another checks that every topic and level has enough questions for a full mock interview. It caught a topic with 9 eligible questions for a target of 8 — one edit away from breaking.

For releases I skipped fastlane and wrote small Ruby scripts against the App Store Connect API. That's how I found the real reason a submission was stuck: an empty `copyright` field and an unset price schedule — not the App Privacy issue I'd suspected at first.

## BaliSurf: rejected for being a template

BaliSurf answers one question for 20 reef breaks around Bali, Nusa Lembongan and Lombok: is it worth paddling out, and when? Forecast data comes from the free Open-Meteo marine API. The app doesn't try to beat Windguru on raw numbers; its value is a hand-tuned rule engine that turns swell, wind and tide into a verdict for each specific spot, with 36 tests pinning its behaviour.

Apple rejected the first submission under Guideline 4.3(a) — "spam", too similar to existing apps. Fair: from the outside, it's another forecast app. The resubmission notes walked the reviewer through what's original: the per-spot rules, and reef depth maps for 14 of the 20 spots, derived from Sentinel-2 satellite imagery. It was approved.

The lesson: if your app is in a crowded category, the review notes need to explain what's yours, in plain words, before the reviewer has to guess.

## What I'd tell myself in July

- **Pick one stack per app, and one pipeline for all.** The code differed; the release process was copied.
- **Test the data.** In content apps, bugs live in the content as often as in the code.
- **Plan for review.** Budget days for App Store review, and write reviewer notes as if they're part of the product.
- **Store consoles are their own project.** On Android, Lancar ships as an APK on GitHub Releases, and SLOVO and BaliSurf are still working through Google Play's testing requirements. The code runs on both platforms; getting it into both stores is a separate job.

All four apps were built with Claude Code doing much of the implementation from my specs and plans. The ideas, the content choices, the review notes, and the bugs that only a real device shows — those stayed with me.

All four apps are free on the [App Store](/apps/).
