---
title: Open-Source Contributions
date: 2026-09-03 08:00:00
---

# Open-Source Contributions

Real pull requests to external open-source projects. Every bug fix is reproduced
locally with a failing test (RED → GREEN) before submission — no speculative or
unverified changes.

*[github.com/chiliec](https://github.com/chiliec) · [Telegram @babin](https://t.me/babin) · [vovababin@gmail.com](mailto:vovababin@gmail.com)*

---

## Merged

- **[OpenTelemetry-Go #8832](https://github.com/open-telemetry/opentelemetry-go/pull/8832)** — prevent a panic in `FixedSizeReservoir` on negative sizes.
- **[LangChain.js #11534](https://github.com/langchain-ai/langchainjs/pull/11534)** — route a new model id to the correct API.
- **[HDF5 (Go) #63](https://github.com/scigolib/hdf5/pull/63)** — prevent a panic on a B-tree node with `EntriesUsed = 0xFFFF` (uint16 overflow).
- **[Flet #6777](https://github.com/flet-dev/flet/pull/6777)** — identity equality for component list diffing.
- **[Mealie #8241](https://github.com/mealie-recipes/mealie/pull/8241)** — resize images before AI import to stay under provider limits.
- **[Mealie #8131](https://github.com/mealie-recipes/mealie/pull/8131)** — allow deleting a user who both rated and favorited a recipe.
- **[JoinMarket Jam #1439](https://github.com/joinmarket-webui/jam/pull/1439)** — opt-in numeric input companion for a slider.

## Under review (selected)

**Memory-safety / crash fixes**

- **[gopacket (Mandiant) #47](https://github.com/mandiant/gopacket/pull/47)** — reject an object-ACE whose header exceeds its declared size (inverted-slice panic from untrusted LDAP data).
- **[gxpdf #93](https://github.com/coregx/gxpdf/pull/93)** — prevent a panic on TTF table offset/length uint32 overflow (fonts extracted from untrusted PDFs).
- **[cockroachdb/apd #152](https://github.com/cockroachdb/apd/pull/152)** — respect the rounding mode when quantizing sub-ULP decimal values.
- **[6cy #1](https://github.com/byte271/6cy/pull/1)** · **[wadec #50](https://github.com/agis/wadec/pull/50)** · **[gho #1](https://github.com/nyarime/gho/pull/1)** — out-of-bounds / infinite-loop / unbounded-allocation fixes on untrusted binary input.

**Correctness & performance**

- **[goccy/go-yaml #929](https://github.com/goccy/go-yaml/pull/929)** — eliminate an O(n²) string concat in flow-style printing (~280× faster, byte-identical output).
- **[goccy/go-json #608](https://github.com/goccy/go-json/pull/608)** — case-insensitive key matching for structs with more than 16 fields (matches the standard library).
- **[yq #2854](https://github.com/mikefarah/yq/pull/2854)** · **[carapace-bin #3773](https://github.com/carapace-sh/carapace-bin/pull/3773)** — alias-resolution and crash fixes.

**Compiler / stdlib (Mojo — modular/modular)**

- **[#7066](https://github.com/modular/modular/pull/7066)** · **[#6978](https://github.com/modular/modular/pull/6978)** · **[#7026](https://github.com/modular/modular/pull/7026)** — CPython-init guard, negative-length abort, and a SIMD `String.find` phantom-match fix in the Mojo standard library.

---

*Method: bugs are located via crash/panic tracking and reasoning about untrusted-input paths, reproduced with a failing test, then fixed at the root cause with a minimal diff. Fixes that would change a deliberate design or interface choice are left to the maintainers rather than forced.*
