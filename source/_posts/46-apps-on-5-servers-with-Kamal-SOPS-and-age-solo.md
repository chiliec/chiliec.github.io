---
title: 46 apps on 5 servers with Kamal, SOPS, and age, solo
date: 2026-09-29 20:00:00
tags: [kamal, docker, devops]
categories:
---
I run a personal infrastructure repo that provisions, deploys, and backs up everything I ship outside the App Store: client sites, internal bots, a couple of blockchain services, one Claude agent. No ops team, no dashboard SaaS — Kamal for deploys, SOPS + age for secrets, cron for backups. Before writing this I recounted the fleet from the repo itself instead of trusting what I remembered: 46 apps across 5 servers. <!-- more -->

## The count

The repo keeps a `manifest.yml` per server — a plain list of app names, types, and hosts, used by the backup scripts to know which volumes exist. Counting real entries instead of guessing:

~~~
$ cat servers/*/manifest.yml | grep -c "^  - name:"
49
~~~

49 entries, minus the three `monitoring` stacks (a Beszel agent, not an app), gives 46: static sites, Node bots and services, one PHP app, one Go proxy, three Python services, and two blockchain validator nodes. `servers/` also holds two more boxes that carry zero apps by design — one is a third-party host where I only hold a VPN tunnel, the other is a bare Tailscale exit node with no inbound path at all. Five servers total, three of them doing the actual hosting.

## Deploying with Kamal

Most apps follow the same shape: a Dockerfile, a `config/deploy.yml`, and a `.kamal/secrets` file that pulls credentials out of this repo instead of holding them itself:

~~~
# .kamal/secrets
KAMAL_REGISTRY_PASSWORD=$(sops -d --extract '["docker_registry_password"]' "$INFRA/secrets/shared.enc.yaml")
~~~

`kamal setup` provisions the container, registers it with `kamal-proxy`, and requests a Let's Encrypt cert over HTTP-01 — which means DNS has to resolve to the server *before* that command runs, not after. `kamal deploy` is everything after. Builds run on a remote builder over SSH rather than my laptop, so a deploy doesn't depend on what's plugged in at the time.

Adding a new app to the fleet is: provision a DB user if it needs one, scaffold from a static-site/node-app/php-app template, point DNS, deploy, then add the entry to `manifest.yml` so the nightly backup picks up its volumes. That last step is easy to forget — two apps went undocumented in a manifest for over a week after I deployed them, which meant their SQLite databases were being backed up nowhere. No error, no page, just nothing to restore if the disk died. The manifest is now the thing I check first, not last.

## Secrets: SOPS and age

Every credential in the repo is SOPS-encrypted YAML, decrypted only at deploy or backup time. One `age` key pair covers everything, and the public half sits in plain sight in the config, because that's the point of asymmetric encryption — the recipient list doesn't need to be a secret:

~~~
# .sops.yaml
creation_rules:
  - path_regex: secrets/.*\.enc\.yaml$
    encrypted_regex: '^(.*_password|.*_token|.*_key|.*_secret|.*_uri|.*_id|.*_json|ssh_authorized_keys|.*_blob)$'
    age: age1...  # public key
~~~

Anything matching that regex gets encrypted field-by-field; everything else — app names, hostnames, comments — stays readable, so a diff of a secrets file still tells you what changed without exposing the value. The private age key lives only on my laptop. Lose it and every secret in the repo is gone with it — there's no recovery path, which is the tradeoff for not running a KMS for a fleet this size.

## When it breaks

The most recent incident was the backup job for the Claude agent I run on one of the servers. Its nightly backup used to stop every container sharing the agent's data volume, snapshot the SQLite state while nothing could write to it, then restart everything — safe, but it held the agent down for the whole upload. On 2026-09-29 I rewrote it to skip the stop entirely: every SQLite database under the data directory gets a `VACUUM INTO` snapshot taken while the container keeps running, archived under its original path, with the rest of the directory tarred live. A file changing mid-tar now just produces tar's exit code 1 ("some files differ"), which the script treats as expected rather than fatal, because the database state comes from the consistent snapshot, not the raw file.

Two commits landed that same day. The first excluded a Swift toolchain and a pnpm store the agent had fetched for its own coding work, after the archive regrew from 2.1 GB back to 11 GB and overflowed the tmpfs it stages to — `tar` exit 2 plus `age` exit 1 both mean the same thing, out of space, and the fix each time is `du -sh` on the data directory to find what grew. The second removed the container stop. Both are small diffs on a script that runs unattended at 4 AM; both came from reading a failed run's log rather than guessing.

## Running it solo

The parts that make this workable alone aren't clever, they're boring on purpose: every server bootstraps from the same numbered scripts, every backup pushes a dead-man heartbeat instead of a success message (silence is the healthy state, so a page only fires when something's actually wrong), and every credential has exactly one place it's allowed to live in plaintext — a 600-mode file on the server itself, shipped there by one `make` target. None of that prevents incidents. It just means the fix is usually a few lines in a script I already understand, not an afternoon reconstructing what a dashboard used to show.
