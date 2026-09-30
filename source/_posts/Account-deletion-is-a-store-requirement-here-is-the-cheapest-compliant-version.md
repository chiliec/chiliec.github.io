---
title: Account deletion is a store requirement, here is the cheapest compliant version
date: 2026-09-24 10:00:00
tags: [app-store, google-play, backend, privacy]
categories:
---
Both app stores require that if your app lets someone create an account, it must also let them delete it. I shipped this for [Escape Roguelike](https://escaperoguelike.com), a Godot game with a Hono backend, as one DELETE endpoint, one static HTML page, and a confirmation modal in the settings screen. No third-party deletion service. <!-- more -->

## What Apple requires

[App Store Review Guideline 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/) is direct about it:

> If your app supports account creation, you must also [offer account deletion within the app](https://developer.apple.com/support/offering-account-deletion-in-your-app/).

The linked support page says the option should be easy to find, typically in account settings, and that it has to remove the account record: "only offering to temporarily deactivate or disable an account is insufficient."

## What Google requires

[Google Play's account deletion policy](https://support.google.com/googleplay/android-developer/answer/13327111) asks for two things at once, not one or the other:

> Provide users with an in-app path to delete their app account and associated data, and provide a web link resource where users can request app account deletion.

That second part is the one people miss: a working web page, separate from the app, that anyone can use even after they uninstalled. Google's Play Console data-safety form asks for that URL directly.

Both requirements point at the same shape: an in-app action plus a reachable deletion page. Build one thing that satisfies both.

## The endpoint

The backend is Hono on a SQLite-backed schema. Deletion is a single transaction that walks every table with an `account_id` foreign key, then removes the account row:

~~~ts
// Google Play / App Store require in-app account deletion. Removes every row
// tied to the account; the client then discards its token and starts fresh.
const deleteAccount = db.transaction((accountId: string) => {
  for (const table of ['events', 'daily_rewards', 'purchases', 'entitlements', 'saves', 'account_providers']) {
    db.prepare(`DELETE FROM ${table} WHERE account_id = ?`).run(accountId)
  }
  db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId)
})

app.delete('/me', bearerAuth(db), (c) => {
  deleteAccount(c.get('accountId'))
  return c.body(null, 204)
})
~~~

`DELETE /api/v1/accounts/me` requires the same bearer token as every other authenticated route, wipes events, daily reward claims, purchases, entitlements, saves, and linked sign-in providers in one transaction, then deletes the account row and returns 204. On the client, a 204 clears the stored token and credentials file and resets account progress. It also treats 401 and 404 as already deleted, so retrying after a half-finished attempt still succeeds.

## The web page

`https://escaperoguelike.com/account-deletion/` is a static page under the same domain as the game, not a separate subdomain, so it's obviously tied to the app rather than looking like a generic legal boilerplate page. It covers four things:

1. How to delete from inside the game (Settings → Account → Delete account, with a confirmation step).
2. How to request deletion by email if the game isn't installed anymore.
3. What gets deleted: account ID, login token, linked sign-in identities, saves, purchase and entitlement records, daily-reward history, and analytics events tied to the account.
4. What's kept and why: aggregated statistics with no account identifiers, server access logs rotated within 30 days, and encrypted database backups that can hold a copy of deleted data for up to 30 days before they expire. Store purchase receipts stay with Apple or Google under their own policies.

That last section is the part worth being explicit about. Deletion doesn't have to mean the data vanishes from every byte of infrastructure instantly. It has to mean the account and everything tied to it is gone from the live system, and anything left over (backups, logs) is bounded and disclosed.

## What it cost

One PR: a route, a transaction, a static HTML page, a settings button with a confirmation modal, and localized strings for the three languages the app ships in. Backend tests covered the endpoint two ways: that it wipes the account and every linked table, and that it requires auth. No new infrastructure, no vendor, no schema migration beyond the tables the game already had.

The same shape shows up anywhere an app or a SaaS has accounts: an endpoint that does the deletion server-side in one transaction, and a page that proves it exists independent of whether someone still has the app installed. The expensive version adds a step-up confirmation code, per-account business rules (for example, blocking a sole owner of a shared workspace from deleting until they transfer ownership), and an audit trail. Add those when you actually have shared accounts or a compliance regime that requires them, not before.
