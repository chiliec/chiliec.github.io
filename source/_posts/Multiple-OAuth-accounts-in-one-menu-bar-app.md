---
title: Multiple OAuth accounts in one menu bar app
date: 2026-09-22 10:00:00
tags: [macos, swift, keychain, oauth]
categories:
---
[ClaudeBar](/post/Shipping-ClaudeBar-a-macOS-menu-bar-app/) started as a single-account app: sign in once, watch the number in the menu bar. I use more than one Claude.ai account, and re-authenticating every time I wanted to check a different one defeated the point of a menu bar app. I ended up building two separate things to solve two separate account-switching problems — one inside ClaudeBar, one as a standalone CLI for Claude Code logins. <!-- more -->

## One Keychain item, not one per account

ClaudeBar's OAuth credentials used to live in a single Keychain item: one JSON blob with an access token, a refresh token and an expiry. Adding accounts meant deciding whether to give each one its own Keychain item or keep one item for all of them. I went with one item — an `AccountSet`:

~~~swift
public struct Account: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public var label: String
    public var credentials: OAuthCredentials
}

public struct AccountSet: Codable, Equatable, Sendable {
    public var accounts: [Account]
    public var activeID: String?
}
~~~

`AccountStore` reads and writes that whole struct as one JSON string under the Keychain account key `oauth_accounts`. The first time it runs against an existing single-account install, it migrates the old lone-credential blob into a one-account `AccountSet` and deletes the legacy item. Fewer Keychain entries means fewer places a signing-identity mismatch or an ACL prompt can bite — the app already had that lesson from the [dev/release Keychain service split](/post/Shipping-ClaudeBar-a-macOS-menu-bar-app/).

## Refreshing the right account's token

Only the active account's credentials get refreshed and polled — the others sit in the Keychain untouched until you switch to them. The threshold is five minutes:

~~~swift
/// Refresh this far ahead of expiry so a poll never races the clock.
static let refreshWindow: TimeInterval = 300
~~~

`refreshUsage()` checks that window before every fetch, and separately, a `401` from the API triggers one refresh and one retry:

~~~swift
do {
    usage = try await ClaudeAPIClient.fetchOAuthUsage(accessToken: creds.accessToken)
} catch APIError.sessionExpired {
    creds = try await refreshAndSave(creds)
    usage = try await ClaudeAPIClient.fetchOAuthUsage(accessToken: creds.accessToken)
}
~~~

A refreshed token gets written back into that one account's slot in the `AccountSet`, not the whole blob replaced blindly — `switchTo(id:)` and `removeAccount(id:)` both go through the same `persistAccounts()` call so the Keychain item never gets out of sync with what's on screen.

## Switching without a flicker

`switchTo(id:)` doesn't clear the usage numbers immediately — it keeps the previous account's numbers on screen but marks them stale:

~~~swift
public func switchTo(id: String) {
    guard id != activeID, accounts.contains(where: { $0.id == id }) else { return }
    activeID = id
    // Stale usage deliberately survives: it's the old account's, so it gets
    // redacted rather than shown, but keeping the layout stops the panel
    // resizing twice.
    resetSession(keepStaleUsage: true)
    try? persistAccounts()
    startPolling()
}
~~~

The view applies `.redacted(reason: .placeholder)` while `isSwitchingAccount` is true, and that flag only clears once the new account's fetch finishes. Without this, switching accounts meant the panel emptying out, resizing to fit nothing, then resizing again once the new numbers landed — two visible jumps for what should read as one instant switch.

## The feature I shipped and reverted

For one commit, the menu bar label showed every account's usage at once — `24% · 100%` instead of just the active account's number. It also meant polling every account each cycle instead of just the active one. I reverted it the same day:

> The label shows the active account only, which is what the switcher is for — listing every account made the item wide and put three numbers in a spot that answers one question.

Reverting also dropped the extra polling, back to one request per five-minute cycle regardless of how many accounts are stored.

## Panel positioning

ClaudeBar's panel [isn't built on `MenuBarExtra`](/post/Shipping-ClaudeBar-a-macOS-menu-bar-app/) — SwiftUI's API gives no control over where the panel opens relative to the status item, and multiple accounts made that worse, not better: switching accounts can change the label from `"9%"` to `"100%"`, and a resizing status item drags its own anchor point sideways. The fix has two parts. First, the status item gets a fixed width, measured from the widest possible label rather than guessed:

~~~swift
button.title = "100%"
statusItem.length = button.intrinsicContentSize.width
~~~

Second, the panel hangs from a fixed edge of that now-stable item:

~~~swift
public func menuBarPanelOrigin(
    statusItem: CGRect,
    panelSize: CGSize,
    visibleFrame: CGRect,
    gap: CGFloat = 4
) -> CGPoint {
    let leftLimit = visibleFrame.minX + gap
    let rightLimit = visibleFrame.maxX - panelSize.width - gap
    let x = max(leftLimit, min(statusItem.minX, rightLimit))
    return CGPoint(x: x, y: statusItem.minY - panelSize.height - gap)
}
~~~

`visibleFrame` clamping matters for a status item near the screen edge or on a secondary display — without it, a panel near the right edge of the menu bar would try to open partly off-screen.

## A different account, a different Keychain

Switching *Claude.ai* accounts inside ClaudeBar solved one problem. Switching *Claude Code* CLI logins is a separate one, with its own storage: a Keychain item called `Claude Code-credentials`, plus `oauthAccount` and `userID` fields in `~/.claude.json`. Claude Code itself only ever holds one login — running `/login` with a second account silently overwrites the first.

I wrote [`claude-account`](https://github.com/chiliec/claude-account) for this: a single bash script, under 170 lines, no dependency beyond what macOS already ships (`security`, `jq`, bash).

~~~
$ claude-account
 1) * personal          me@gmail.com
 2)   work             me@acme.com
 3)   client           me@client.io
account [1-3]: 2
switched to 'work' (me@acme.com) — start a new Claude Code session
~~~

`save` copies the current token into a parallel Keychain item (`Claude Code-credentials:<name>`) and writes the non-secret identity block — email, org name, account UUID — to `~/.claude/accounts/<name>.json`. `use` puts both pieces back. Tokens never touch disk, only the Keychain; the identity file is metadata only. It shipped as four commits, with CI running shellcheck on Ubuntu, since the macOS GitHub Actions image doesn't ship it.

Two account-switching problems, two Keychain stores, two small tools — neither one needed the other's code.
