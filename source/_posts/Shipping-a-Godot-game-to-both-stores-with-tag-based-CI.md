---
title: Shipping a Godot game to both stores with tag-based CI
date: 2026-09-25 10:00:00
tags: [godot, ios, android, ci]
categories:
---
I wrote about the [fastlane and GitHub Actions pipeline](/post/Shipping-a-Kotlin-Multiplatform-app-to-the-App-Store-with-fastlane/) I use for Kotlin Multiplatform apps. A mobile game I'm shipping in Godot 4.7 needed the same result — push a tag, get a build on TestFlight and the Play internal track — but almost none of the plumbing carries over, because there's no Xcode project or Gradle project sitting in git to sign. Godot generates both from scratch on every export. <!-- more -->

## No project to check in

The KMP pipeline edits a committed `.xcodeproj`: build number, signing settings, provisioning profile, all as diffs fastlane applies to a real file. Godot doesn't have that file until you ask for it:

~~~bash
godot --headless --path Godot --export-release iOS "$OUT"
~~~

That one command reads `export_presets.cfg` and writes a full Xcode project to `$OUT`. CI runs it as its own step before fastlane touches anything, and the fastlane lane can skip re-running the export (`SKIP_GODOT_EXPORT=1`) when CI already did it. Locally, the same lane runs the export itself. Android is the same idea one level further down: Godot's own gradle build produces the signed `.aab` directly, no separate Android Studio project involved.

## Signing, same trick as the KMP post

The App Store Connect API key setup is identical to the KMP pipeline: a `.p8` key id/issuer id/base64 content, no `match`, no certificates repo, no Apple ID login. CI imports the Apple Distribution certificate and Apple's WWDR intermediates into a temporary keychain by hand:

~~~bash
security create-keychain -p "$KP" "$KEYCHAIN"
security import "$RUNNER_TEMP/dist.p12" -k "$KEYCHAIN" -P "$DIST_CERT_PASSWORD" \
  -T /usr/bin/codesign -T /usr/bin/security
security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KP" "$KEYCHAIN"
~~~

Build numbers work the same way too: query the highest build already on TestFlight and upload one more, so Godot's fixed build number in the export never collides.

## What's actually different: native plugins over Git LFS

The game ships three small native iOS plugins compiled outside Godot (OAuth login, deep links, a system-volume read). Those `.xcframework` static archives live in Git LFS, and if LFS objects don't hydrate, Xcode sees text pointer files and reports "unknown file type" at the link step — a confusing failure with no obvious cause. CI checks the real files before wasting a full build on it:

~~~bash
git lfs fsck
test "$(LC_ALL=C head -c 7 "$archive")" = '!<arch>' || {
  echo "::error file=$archive::Expected a hydrated static archive; Git LFS pointer or invalid file found"
  exit 1
}
~~~

`!<arch>` is the magic bytes of a real static archive. A pointer file fails that check in under a second instead of failing an Xcode build five minutes in.

## Android version codes come from every track, not one

The KMP post's Android side reads the next version code off one track. This pipeline queries all of them, because a code used on `alpha` still blocks reuse on `internal`:

~~~ruby
codes = %w[internal alpha beta production].flat_map do |track|
  google_play_track_version_codes(package_name: PACKAGE, track: track, json_key_data: json_key)
end
version_code = codes.max.to_i + 1
~~~

Godot bakes the version code into the export at build time, not at runtime, so the number has to land in `export_presets.cfg` before the export runs, not after:

~~~ruby
cfg = File.read(preset_path)
cfg.sub!(/^version\/code=\d+$/, "version/code=#{version_code}")
File.write(preset_path, cfg)
~~~

## The CI trigger

Both platform workflows share the same trigger:

~~~yaml
on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'
~~~

A tag push builds and uploads both platforms; a manual dispatch can do a build-only dry run. Both workflows set `concurrency.cancel-in-progress: false` on a repo-wide group, because the next build number and the next Play version code are both "current store max plus one" — two runs racing for that number would allocate the same one twice. Serializing them, rather than cancelling either, is the fix.

Linux runners are pinned to `ubuntu-24.04` explicitly, ahead of `ubuntu-latest` quietly becoming `26.04` on 2026-10-19.

## A separate workflow for assets

Downloadable asset packs get their own workflow, triggered on changes to the assets directory rather than on tags, since they don't need a version bump to ship. It runs a Godot script that checks every asset is claimed by exactly one pack (no orphans, no duplicates), then exports and checks size:

~~~bash
godot --headless --path Godot --export-pack Android /tmp/app.pck
SIZE=$(wc -c < /tmp/app.pck)
test "$SIZE" -lt 26214400 || { echo "app pck $SIZE exceeds 25MB budget"; exit 1; }
~~~

25 MB (26214400 bytes) is my own budget for the base game package; everything else ships as downloadable packs. The check fails the build the moment an asset lands in the wrong place.

## Store listing without a build

Store listing text, icon and screenshots go through their own fastlane lane and their own manually-triggered workflow, separate from the build-and-upload lane. No Godot export involved, no keystore, just the Play API pushing metadata. Same principle as the KMP post: a release and its metadata are two different operations that don't need to block each other.

## What stayed the same, what didn't

The signing model, the API-key auth, and the "let the store tell you the next number" trick all carried over unchanged from the KMP pipeline. What's new is entirely about Godot not leaving a native project on disk between commits: every export step regenerates what a normal mobile CI setup would just diff, and the numbers that used to live in a `.pbxproj` or `build.gradle` live in a `.cfg` file that gets rewritten before each export instead.
