---
title: A signed, notarized, Sparkle-updated macOS release from a git tag
date: 2026-09-21 10:00:00
tags: [macos, sparkle, github-actions, notarization]
categories:
---
[notify-gcal-menu](https://github.com/mshirlaw/notify-gcal-menu) is a menu bar app that shows a system notification before a Google Calendar event starts. It's not mine — I contributed Sparkle auto-update and a tag-triggered release pipeline as two stacked pull requests after the maintainer approved the scope on an issue. That constraint (no shared machine, no access to the maintainer's signing keys, has to merge cleanly into someone else's repo) is what pushed the whole pipeline into GitHub Actions, instead of the local release script I use for [ClaudeBar](/post/Shipping-ClaudeBar-a-macOS-menu-bar-app/). <!-- more -->

## The recipe

Everything below is downstream of one command:

~~~
git tag v1.2.3
git push origin v1.2.3
~~~

A `v*` tag push builds the app, stamps the version, signs it with a Developer ID certificate, notarizes and staples it, publishes a GitHub release, and commits a new `<item>` to `appcast.xml` on `main` so existing installs see the update. No version-bump commit: `Info.plist` keeps a placeholder and the tag is the source of truth, stamped into the bundle at build time.

## The workflow

`.github/workflows/release.yml`, triggered on `push: tags: ["v*"]`:

~~~yaml
      - name: Write Secrets.plist
        env:
          GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
          GOOGLE_CLIENT_SECRET: ${{ secrets.GOOGLE_CLIENT_SECRET }}
        run: |
          SECRETS=Sources/NotifyGCalMenu/Resources/Secrets.plist
          cp "$SECRETS.example" "$SECRETS"
          plutil -replace GoogleClientID -string "$GOOGLE_CLIENT_ID" "$SECRETS"
          plutil -replace GoogleClientSecret -string "$GOOGLE_CLIENT_SECRET" "$SECRETS"

      - name: Import Developer ID certificate
        env:
          CERT_P12: ${{ secrets.DEVELOPER_ID_CERT_P12 }}
          CERT_PASSWORD: ${{ secrets.DEVELOPER_ID_CERT_PASSWORD }}
        run: |
          KEYCHAIN="$RUNNER_TEMP/signing.keychain-db"
          KEYCHAIN_PASSWORD="$(uuidgen)"
          echo "$CERT_P12" | base64 --decode > "$RUNNER_TEMP/cert.p12"
          security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
          security set-keychain-settings -lut 3600 "$KEYCHAIN"
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN"
          security import "$RUNNER_TEMP/cert.p12" -k "$KEYCHAIN" -P "$CERT_PASSWORD" -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN" >/dev/null
          security list-keychains -d user -s "$KEYCHAIN" $(security list-keychains -d user | tr -d '"')

      - name: Build, stamp version, and sign
        run: ./Scripts/build.sh release

      - name: Notarize and staple
        env:
          NOTARY_KEY_P8: ${{ secrets.NOTARY_API_KEY_P8 }}
          NOTARY_KEY_ID: ${{ secrets.NOTARY_API_KEY_ID }}
          NOTARY_ISSUER_ID: ${{ secrets.NOTARY_API_ISSUER_ID }}
        run: |
          echo "$NOTARY_KEY_P8" | base64 --decode > "$RUNNER_TEMP/notary.p8"
          ditto -c -k --keepParent build/NotifyGCalMenu.app "$RUNNER_TEMP/submission.zip"
          xcrun notarytool submit "$RUNNER_TEMP/submission.zip" \
            --key "$RUNNER_TEMP/notary.p8" \
            --key-id "$NOTARY_KEY_ID" \
            --issuer "$NOTARY_ISSUER_ID" \
            --wait
          xcrun stapler staple build/NotifyGCalMenu.app
          ditto -c -k --keepParent build/NotifyGCalMenu.app "NotifyGCalMenu-$VERSION.zip"
          spctl --assess --type execute -vv build/NotifyGCalMenu.app
~~~

A step ahead of all that checks `Info.plist` for the placeholder `SUPublicEDKey` and fails the job before spending ten minutes on notarization — publishing with a placeholder key would sign the appcast entry with a key no installed copy trusts.

The last step signs the notarized zip with Sparkle's `sign_update`, creates the GitHub release with `gh release create`, and splices a new `<item>` into `appcast.xml` after a marker comment, then commits it back to `main`:

~~~sh
SIGN_UPDATE="$(find .build/artifacts -name sign_update -type f | head -1)"
SIGNATURE="$(echo "$SPARKLE_PRIVATE_KEY" | "$SIGN_UPDATE" --ed-key-file - "$ZIP")"
gh release create "$GITHUB_REF_NAME" "$ZIP" --title "$VERSION" --generate-notes
sed -i '' -e "/<!-- Releases are added here/r $RUNNER_TEMP/item.xml" appcast.xml
git commit -m "chore: add $GITHUB_REF_NAME to the appcast" appcast.xml
git push origin main
~~~

`sign_update` is located with `find` rather than hardcoded, because it ships inside the Sparkle SwiftPM artifact the build just fetched, and a layout change in a future Sparkle release shouldn't strand an otherwise-signed build.

## Eight secrets, and CI needs none of them

The release job reads eight repository secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (the app's own OAuth client), `SPARKLE_PRIVATE_KEY` (EdDSA, from `generate_keys`), `DEVELOPER_ID_CERT_P12` and `DEVELOPER_ID_CERT_PASSWORD` (a base64-encoded `.p12` export), and `NOTARY_API_KEY_P8`, `NOTARY_API_KEY_ID`, `NOTARY_API_ISSUER_ID` (an App Store Connect API key). The separate `ci.yml` that builds every push and pull request needs none of them — `build.sh` seeds `Secrets.plist` from a committed `.example` file when the real one is missing, which is also what makes builds from forked pull requests work, since forks can't read repository secrets.

## What broke first

**A fresh clone couldn't build.** `Package.swift` declares `Secrets.plist` as a SwiftPM resource, but the file is gitignored, so a machine that had never run the app before failed with "type 'Bundle' has no member 'module'" — not a missing-file warning, a build failure. The fix lives in `build.sh`: if the file is absent, copy it from the tracked `.example` before building.

**`--deep --identifier` corrupted every nested Sparkle component.** The original ad-hoc signing command was:

~~~sh
codesign --force --deep --identifier "$BUNDLE_ID" -s - "$APP_BUNDLE"
~~~

Checked against a scratch bundle with a real `Sparkle.framework` inside: `--deep` re-signs everything it finds with the outer `--identifier`, so `Updater.app`, both XPC services, and the framework itself all ended up stamped with the app's own bundle ID (`com.notifygcalmenu.menu`) instead of their real ones (`org.sparkle-project.Sparkle.Updater` and the rest). Sparkle looks up its installer XPC service by bundle identifier, so a downloaded update would fail to install. The fix is inside-out signing — each nested component first, without `--identifier`, then the app bundle last:

~~~sh
"${SIGN[@]}" "$SPARKLE_BUNDLED/Versions/B/XPCServices/Downloader.xpc"
"${SIGN[@]}" "$SPARKLE_BUNDLED/Versions/B/XPCServices/Installer.xpc"
"${SIGN[@]}" "$SPARKLE_BUNDLED/Versions/B/Updater.app"
"${SIGN[@]}" "$SPARKLE_BUNDLED/Versions/B/Autoupdate"
"${SIGN[@]}" "$SPARKLE_BUNDLED"
"${SIGN[@]}" --identifier "$BUNDLE_ID" "$APP_BUNDLE"
~~~

`--deep` stays correct for *verifying* a bundle afterward (`codesign --verify --strict --deep`); it's only signing where it does the wrong thing.

## Where this differs from ClaudeBar

ClaudeBar's `release.sh` does the same four things — build, sign, notarize and staple, update the appcast — plus a Homebrew cask bump, but it runs on my own machine by hand, not in CI. That's a deliberate choice: CI-based notarization means putting the Developer ID certificate, the notarization credentials, and the Sparkle private key into GitHub secrets, and for a one-person project keeping them in Keychain and 1Password is the smaller risk.

notify-gcal-menu doesn't have that option. There's no machine we both have access to, so the certificate and keys have to live somewhere reachable from a tag push, and repository secrets on someone else's repo are that place. It also has no Homebrew cask — installing means downloading the zip from the GitHub release, so the pipeline stops at `gh release create` instead of continuing on to a tap.

One thing both pipelines get right the same way: neither commits or logs a raw secret. The Developer ID certificate goes through a throwaway keychain that's destroyed with the runner; the notarization key and Sparkle key are piped straight into the tool that needs them and never touch a file that survives the job.

As I'm writing this, both PRs are still open — the maintainer owns generating the Sparkle key pair and enrolling in the Apple Developer Program, and merging is their call. Locally, everything except the actual signing and notarization is verified: the appcast insertion, version stamping, a fresh-clone build, and the YAML itself (`bash -n` on every `run` block, `shellcheck` clean). The one part that needs a real Developer ID certificate to prove out is the part that can only run once the maintainer flips the switch.
