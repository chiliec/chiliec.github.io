---
title: Shipping a Kotlin Multiplatform app to the App Store with an API key and fastlane
date: 2026-09-30 18:00:00
tags: [kotlin-multiplatform, ios, fastlane, github-actions, app-store]
categories:
---
Kotlin Multiplatform tutorials end at "it runs in the simulator". Getting a Compose Multiplatform app onto TestFlight and into the App Store from CI is where the real work begins. This is the pipeline I built for [SLOVO](https://apps.apple.com/us/app/slovo-russian-phrases/id6796900036) and then copied almost verbatim into [BaliSurf](https://apps.apple.com/us/app/balisurf/id6801866165): App Store Connect API key, fastlane, GitHub Actions, and almost no Apple ID logins or 2FA prompts. "Almost" is explained at the end. <!-- more -->

## The Xcode project is committed

The standard KMP/Compose Multiplatform layout has a real Xcode project in `iosApp/iosApp.xcodeproj`, and I keep it in git. A stable `.pbxproj` is what fastlane edits: build numbers, signing settings, provisioning profile.

The bridge between Xcode and Kotlin is one Run Script build phase that runs before compilation:

```bash
cd "$SRCROOT/.."
./gradlew :composeApp:embedAndSignAppleFrameworkForXcode
```

Gradle builds the shared `ComposeApp.framework` (static) for the architecture Xcode is building, signs it and puts it where Xcode expects it. The Kotlin targets are just `iosArm64()` and `iosSimulatorArm64()` — no `iosX64`, since recent Compose Multiplatform versions no longer ship Intel-simulator artifacts.

**Pitfall #1:** if you've only ever run the simulator, `iosArm64` has never been compiled. The first device archive is the first real test of that target. Build it early, not on release day.

## Authentication: one API key

Everything talks to App Store Connect through an API key (a `.p8` file from *Users and Access → Integrations*). On CI it comes from secrets; locally it's a gitignored file:

```ruby
def asc_api_key
  if ENV["ASC_KEY_P8"] && !ENV["ASC_KEY_P8"].empty?
    app_store_connect_api_key(
      key_id: ENV.fetch("ASC_KEY_ID"),
      issuer_id: ENV.fetch("ASC_ISSUER_ID"),
      key_content: ENV.fetch("ASC_KEY_P8"),
      is_key_content_base64: true,
      in_house: false
    )
  else
    key_path = Dir[File.expand_path("../AuthKey_*.p8", __dir__)].first
    app_store_connect_api_key(
      key_id: ENV.fetch("ASC_KEY_ID", File.basename(key_path)[/AuthKey_(.+)\.p8/, 1]),
      issuer_id: ENV.fetch("ASC_ISSUER_ID"),
      key_filepath: key_path,
      in_house: false
    )
  end
end
```

No `match`, no certificates repo, no Apple ID session cookies that expire every month.

## The lanes

| Lane | What it does |
|---|---|
| `signing_assets` | One-time, local: creates the distribution certificate and App Store profile via the API |
| `beta` | Builds, signs and uploads to TestFlight |
| `release` | Pushes metadata and screenshots, doesn't submit |
| `submit` | Attaches the latest build and submits for review |

### Build numbers come from the store

Nothing to commit, nothing to forget. The build number is "highest build on TestFlight + 1":

```ruby
next_build = latest_testflight_build_number(
  api_key: api_key,
  app_identifier: APP_IDENTIFIER,
  initial_build_number: 0   # a brand-new app record has no builds yet
) + 1
increment_build_number_in_xcodeproj(
  build_number: next_build.to_s,
  xcodeproj: XCODEPROJ,
  target: SCHEME
)
```

The Android side uses the same idea: the next `versionCode` is computed from what Google Play already has on all tracks. The store is the source of truth; git doesn't need to know.

### Manual signing, on purpose

`beta` fetches the App Store provisioning profile through the API key, switches the project to manual signing with that profile, and exports with `export_method: "app-store"`.

**Pitfall #2:** an `ExportOptions.plist` with `signingStyle: automatic` makes Xcode try cloud signing, which fails locally with a confusing "Cloud signing permission error". Manual signing with an explicit profile name makes the build reproducible on any machine.

### Export compliance, answered once

Every build otherwise asks about encryption. Answer it in `Info.plist`:

```xml
<key>ITSAppUsesNonExemptEncryption</key>
<false/>
```

and in the `submit` lane's `submission_information` (`export_compliance_uses_encryption: false`, `add_id_info_uses_idfa: false`).

## CI: GitHub Actions

`ios-testflight.yml` runs on a tag `v*` or manually:

- `macos-15` runner, the newest installed Xcode (`ls -d /Applications/Xcode*.app | sort -V | tail -n1`), JDK 21 with Gradle cache, Ruby with bundler cache.
- A dedicated step creates a temporary keychain with `security create-keychain`, imports Apple's WWDR intermediate certificates and the distribution certificate from a secret, and sets the key partition list so `codesign` can use it without a prompt.
- Then `fastlane ios beta` with `SKIP_KEYCHAIN_SETUP=1`, so fastlane doesn't redo the keychain setup CI has already done.

Secrets, by name: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `DIST_CERT_P12`, `DIST_CERT_PASSWORD`.

BaliSurf added a second workflow for `release` and `submit`. Those lanes only call the App Store Connect API — no Xcode needed — so they run on a cheap Linux runner.

## Metadata lives in git

Descriptions, keywords, release notes, copyright and screenshots for both stores live in `store-assets/metadata/{ios,android}` and `store-assets/screenshots/{ios,android}`. Each run, fastlane copies them into the layout `deliver` and `supply` expect. One source of truth, reviewed like code.

**Pitfall #3:** `copyright` is required. A missing copyright can leave a submission stuck, and the error doesn't make that obvious.

**Pitfall #4:** `deliver` with `overwrite_screenshots` could upload every screenshot twice when it retried after a timeout — identical checksums, duplicates in every locale. BaliSurf switched to `sync_screenshots` (still behind fastlane's `FASTLANE_ENABLE_BETA_DELIVER_SYNC_SCREENSHOTS=1` flag), and a small script now checks for duplicates.

## Two bugs a review caught

The Android half of the pipeline got a review before merge, and it found two bugs worth sharing:

1. **A dry run that could never pass.** The build lane hard-failed when `keystore.properties` was missing, so the "build without credentials" check the PR itself described could never go green. Now a missing keystore is a warning for plain builds and fatal only for the Play upload lane.
2. **Two builds per release.** The workflow ran the build lane *and* the upload lane, which rebuilds. Every release took two full Gradle builds, and the archived artifact had a different `versionCode` from the one sent to Play. Now the workflow picks one lane and archives what it actually uploaded.

A related lesson: keystore passwords are written with `printf`, not an unquoted heredoc. A heredoc runs command substitution, and a `$` in a password is all it takes.

## The "almost" in "no Apple ID"

The API key covers almost everything. The exceptions I hit:

- **App Privacy.** Publishing the privacy answers ("Data Not Collected") isn't available with an API key — the endpoint returns 404. BaliSurf has a separate `privacy` lane that logs in with an Apple ID and 2FA. It runs once per app, not per release.
- **Review contact.** A brand-new app record rejects review contact details without a phone number. Fill it in once.
- **Google Play's draft wall.** On Android, a new app stays a "draft" until someone publishes the first release in the Play Console web UI. Until then, the API only accepts draft releases, so you can't start closed testing from fastlane alone.

Everything after that first setup — every build, every TestFlight upload, every metadata change — is one command or one tag push.
