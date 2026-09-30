---
title: "Shipping ClaudeBar: a small macOS menu bar app, 35 releases later"
date: 2026-09-30 16:00:00
tags: [macos, swift, swiftui, claude-code]
categories:
---
[ClaudeBar](https://github.com/chiliec/ClaudeBar) is a tiny macOS app: an icon in the menu bar that shows how much of your Claude usage limit you have left. The idea fits in one sentence. Shipping it properly — signed, notarized, auto-updating, installable with Homebrew — took 193 commits and 32 GitHub releases between April and September 2026. This is about the part between "it works on my Mac" and "you can install it". <!-- more -->

## Why

I work in Claude Code all day, and [limits are real](/post/How-Claude-Code-1M-context-burns-through-limits/). Checking usage meant opening a browser tab. I wanted a number in the menu bar, the way you glance at the battery.

## Getting the data

The first version read the `sessionKey` cookie from claude.ai and called the same private endpoint the website uses. It worked, and it was fragile: cookies expire, and pasting a cookie into an app is not something I want to ask anyone to do.

In August I moved it to OAuth. You click "Sign in", the browser opens, you approve, and the app receives tokens through a one-shot local callback. Then it asks for usage with a normal bearer token.

Two details from that migration that cost me an evening each:

- **The callback port.** I assumed a fixed port for the local redirect; the server rejected it. The real flow uses a port the OS assigns at random, so the app opens an `NWListener` on port 0 and builds the redirect URL from whatever it got.
- **`NWListener` is picky about order.** Both `stateUpdateHandler` and `newConnectionHandler` must be set *before* `.start()`. Otherwise the listener starts and quietly never delivers a connection.

Tokens — access plus a rotating refresh token — live in one Keychain item as a small JSON blob. The app refreshes them five minutes before expiry, and on a `401` it refreshes once and retries once. The same Keychain blob holds several accounts, so you can switch between them.

## Architecture: small on purpose

- **SwiftUI, macOS 14+.** Around 3,000 lines of app code and 2,000 lines of tests (145 of them).
- **Two SPM targets.** `ClaudeBarUI` is a library with all the models, services and views; `ClaudeBar` is a thin `@main` executable. The split exists for one reason: SwiftUI `#Preview` doesn't work inside an executable target.
- **Three layers.** Views → an `@Observable` `AppState` → stateless services (API client, OAuth, account store, Keychain). Polling every 5 minutes, manual refresh on click.
- **Two dependencies.** Sparkle for updates, ViewInspector only in tests.

One deliberate non-choice: **no `MenuBarExtra`**. It's the obvious SwiftUI API for menu bar apps, but it gives no control over where the panel appears, and the panel drifted every time the label's width changed. So the status item and its panel are built by hand in an `AppDelegate`, with a fixed-width status item the panel hangs from.

## The release pipeline

A Mac app outside the App Store must be signed with a Developer ID and notarized by Apple, or Gatekeeper refuses to open it. My `release.sh` does it in a strict order:

1. Build, sign with hardened runtime.
2. Notarize with `notarytool`, staple the ticket to the `.app`.
3. Zip the **stapled** bundle — with `ditto`, not `zip -r`, which mangles the symlinks inside the bundle.
4. Sign the zip for Sparkle, compute the SHA-256, write the appcast entry.
5. Tag, upload the GitHub release, bump the Homebrew cask.
6. Fail the whole release if `spctl` doesn't report "Notarized Developer ID".

It runs locally, on purpose. CI runs the tests on every push, but I decided against notarizing in CI: that would mean exporting the signing certificate, the notarization credentials and the Sparkle private key into GitHub secrets. For a one-person project, keeping them in my Keychain is the smaller risk.

Installing is one line:

```bash
brew install --cask chiliec/tap/claudebar-menubar
```

The cask is `claudebar-menubar`, not `claudebar`, because that name was already taken in homebrew-core. After that, Sparkle checks for updates daily.

One scary moment: when I switched to a paid Developer ID certificate, the code-signing team changed. Would existing installs refuse the next update? Reading Sparkle's source answered it: what matters is the EdDSA update key, not the signing identity. I kept the key, and the update chain survived.

## One day, five releases

The most educational day was v0.0.31 → v0.0.35. Three bugs, each one hidden by the previous:

1. **Liquid Glass.** Calls to the new `.glassEffect()` API crashed. Removed.
2. **Infinite layout.** Setting `NSPanel.contentViewController` together with SwiftUI `sizingOptions` sent AutoLayout into endless re-layout until the stack ran out. I found it with a 2×3 A/B test of the combinations, not by reading the stack trace.
3. **An invisible icon.** The app launched, but the menu bar item never appeared. A synchronous Keychain read on the launch path blocked the run loop before the icon could draw. Fix: create `AppState` without loading, draw the icon first, then load accounts asynchronously.

None of these showed up in the 145 tests. All of them showed up on a real Mac within minutes. For a menu bar app, the launch path *is* the product.

## How it was built

Every feature started as a short design spec and a task-by-task plan, then went to Claude Code agents for implementation with tests first — the same approach I used for [this site's redesign](/post/Redesigning-my-site-with-20-AI-agents/). The agents were at their best on well-specified work: services, tests, the release script. The hard parts were the ones in this post: an OAuth flow that behaved differently from what I assumed, AppKit layout, launch order. Those needed a person with a debugger and a real Mac.

ClaudeBar is open source: [github.com/chiliec/ClaudeBar](https://github.com/chiliec/ClaudeBar).
