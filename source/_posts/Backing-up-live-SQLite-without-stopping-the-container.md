---
title: Backing up live SQLite without stopping the container, with VACUUM INTO
date: 2026-10-01 14:00:00
tags: [sqlite, backup, bash, ops]
categories:
---
One of my servers runs a Claude agent whose entire state is a directory of SQLite databases. Its nightly backup used to stop every container on that volume, tar the directory, encrypt it, upload it, and start everything again. Safe, and about 20 minutes of downtime per night. On 2026-09-29 the backup failed outright, and fixing that turned into removing the stop entirely. <!-- more -->

## Why it failed

The archive had grown from 2.1 GB at the end of August to 11 GB. The script staged the encrypted archive in `/tmp`, which on that box is a 7.7 GB tmpfs. Age encryption ran out of space, the EXIT trap restarted the containers, and the night's backup was gone.

The growth was the agent's own doing. It had installed a Swift toolchain (3.3 GB) and a pnpm store (3.0 GB) for its coding work inside the data directory. The exclude list already had an entry for the toolchain, but as an exact name, and the installed directory carried a version suffix. Two globs fixed the size:

~~~bash
'data/hermes/swift-toolchain*'
'data/hermes/.pnpm-store'
~~~

The next run produced a 4.6 GB archive and succeeded. That was the quick fix. The downtime was still there.

## Why a plain tar of SQLite is not a backup

A SQLite database in WAL mode is three files on disk: the main `.db`, the `-wal` log, and the `-shm` index. Tar reads them one after another, at slightly different instants. Under a concurrent writer that can capture them mid-checkpoint, which gives you a snapshot that opens fine and is missing or corrupting the last transactions. Stopping the writer is the obvious fix, and it is the one I had.

The alternative is to ask SQLite for a consistent copy:

~~~
sqlite3 state.db "VACUUM INTO '/path/to/snapshot.db'"
~~~

`VACUUM INTO` writes a single self-contained file with every committed WAL frame folded in and no sidecars. It takes a read transaction, so it is safe against a concurrent writer, and the output opens as a normal rollback-journal database. I already used it in the fleet-wide backup script for Kamal apps. The agent's backup had just never adopted it.

## The rewrite

The new script finds every non-empty `.db` under the data directory, snapshots each into a staging directory on the root disk, and tells tar to skip the live files:

~~~bash
STAGE=$(mktemp -d "$PLAN_DIR/.snap.XXXXXX")
SNAPS=(); SNAP_FAIL=()
while IFS= read -r -d '' db; do
    snap="snap/${db#data/}"
    mkdir -p "$STAGE/$(dirname "$snap")"
    if sqlite3 -cmd '.timeout 10000' "$db" "VACUUM INTO '$STAGE/$snap'"; then
        chown --reference="$db" "$STAGE/$snap"
        chmod --reference="$db" "$STAGE/$snap"
        TAR_ARGS+=(--exclude="$db" --exclude="$db-wal" --exclude="$db-shm" --exclude="$db-journal")
        SNAPS+=("$snap")
    else
        echo "[backup] WARNING: sqlite snapshot failed for $db — tarring it raw" >&2
        SNAP_FAIL+=("$db")
    fi
done < <(find data \( "${PRUNE[@]}" \) -prune -o -type f -name '*.db' -size +0 -print0)
~~~

Three details that matter:

- **`.timeout 10000`** gives a non-WAL database up to ten seconds to wait out a writer's lock instead of failing immediately.
- **Snapshots stage on the root disk**, not in `/tmp`. The tmpfs is what overflowed. Only the final encrypted archive goes there.
- **A failed snapshot is a warning, not a failure.** The raw files get tarred, the names go into the heartbeat message, and I find out in the morning rather than losing the whole night.

Then one tar reads two trees and archives the snapshots under their original paths, so the restore script did not have to change:

~~~bash
tar -c "${TAR_ARGS[@]}" -C "$PLAN_DIR" data \
        -C "$STAGE" --transform='s|^snap/|data/|S' "${SNAPS[@]}" \
    | age -r "$AGE_RECIPIENT" -o "$ARCHIVE"
~~~

The rest of the directory is tarred live. Something will change under tar during a one-minute read, and GNU tar reports that as exit code 1, "some files differ". The archive is still complete. Only exit code 2 is fatal:

~~~bash
PIPE_RC=("${PIPESTATUS[@]}")
TAR_RC=${PIPE_RC[0]}; AGE_RC=${PIPE_RC[1]}
if [ "$TAR_RC" -gt 1 ] || [ "$AGE_RC" -ne 0 ]; then
    alert "tar/age failed (tar=$TAR_RC age=$AGE_RC)"; exit 1
fi
~~~

I learned that distinction the hard way in August, when treating exit code 1 as fatal turned a harmless warning into zero backups for a night. `age` has no such nuance. Any non-zero exit means no ciphertext.

## What it looks like now

The dry run on the real box: seven databases snapshotted, about one minute end to end, the agent healthy the whole time, a 4.3 GB archive. I extracted the snapshots from the archive and ran `PRAGMA integrity_check` on each. All clean. The container stop, start, and the EXIT trap that restarted things on failure are all deleted, which made the script shorter than the version with downtime.

Two smaller things came out of the same incident. The bootstrap script now installs `sqlite3` on a fresh box, since the backup depends on the CLI and not on the app's own bindings. And the exclude list has a comment with the number that matters: keep the archive under about 7 GB, because that is the tmpfs, and the day it grows back past that is the day both bugs return at once.

Related: [46 apps on 5 servers with Kamal, SOPS, and age, solo](/post/46-apps-on-5-servers-with-Kamal-SOPS-and-age-solo/).
