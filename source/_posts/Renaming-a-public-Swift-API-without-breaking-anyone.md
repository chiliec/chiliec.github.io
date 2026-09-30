---
title: Renaming a public Swift API without breaking anyone
date: 2026-09-20 10:00:00
tags: [swift, codable, api-design]
categories:
---
The [VIZ blockchain](https://github.com/VIZ-Blockchain) renamed "witness" to "validator" across its whole stack: RPC methods, JSON field names, everything. The JS and PHP client libraries had already been migrated. My job was to bring `viz-swift-lib`, the Swift SDK, to parity, without breaking any app that already imports it. <!-- more -->

That last part is the constraint that shapes everything else. A rename like this touches two different audiences at once: the JSON coming over the wire, and the Swift source code calling into the library. Both need an old name to keep working for a while.

## Two compatibility problems, not one

On the wire: the node itself still accepts old method and field names for a deprecation window, but it now *returns* the new ones. So the library's decoders have to accept both `witness` and `validator` keys in incoming JSON, while its encoders should only ever write the new key. There's no reason to keep sending a name the node is phasing out.

In Swift source: any app that does `block.witness` needs to keep compiling. If a rename ships as a hard break, every downstream app needs a same-day fix or it's stuck pinning an old version. The library needed the old identifiers to still exist, just marked deprecated, so Xcode shows a warning with the new name to switch to instead of a compile error.

## Dual-key decode, canonical-only encode

For every struct with a renamed field, I dropped the synthesized `Decodable` and wrote a manual `init(from:)` that tries the new key first and falls back to the old one. Here's the actual code for `AccountValidatorVote` (was `AccountWitnessVote`):

~~~swift
public struct AccountValidatorVote: OperationType, Equatable {
    public var account: String
    public var validator: String
    public var approve: Bool

    public init(account: String, validator: String, approve: Bool) {
        self.account = account
        self.validator = validator
        self.approve = approve
    }

    @available(*, deprecated, message: "Use init(account:validator:approve:)")
    public init(account: String, witness: String, approve: Bool) {
        self.init(account: account, validator: witness, approve: approve)
    }

    @available(*, deprecated, renamed: "validator")
    public var witness: String {
        get { validator }
        set { validator = newValue }
    }

    enum CodingKeys: String, CodingKey {
        case account, validator, approve
        case legacyWitness = "witness"
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        self.account = try c.decode(String.self, forKey: .account)
        self.approve = try c.decode(Bool.self,   forKey: .approve)
        self.validator = try (try? c.decode(String.self, forKey: .validator))
                      ?? c.decode(String.self, forKey: .legacyWitness)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(account,   forKey: .account)
        try c.encode(validator, forKey: .validator)
        try c.encode(approve,   forKey: .approve)
    }
}
~~~

Four things carry the whole migration, and this one struct has all of them: a deprecated init that forwards to the canonical one, a deprecated computed property (with a setter, so old mutating code still compiles) that forwards to the new field, a `legacyWitness` `CodingKeys` case that only the decoder touches, and an explicit `encode(to:)` that never writes it. The `try (try? …) ?? …` shape matters. The first draft of the plan had `(try? …) ?? c.decode(…)` with no outer `try`, which doesn't compile: the right side of `??` is a throwing autoclosure, and `try` can't go inside it on the right of a binary operator. Marking the whole expression with `try` is the version that works.

Renamed enum cases follow the same idea without needing dual keys, since `OperationId` encodes as a string and decodes through an explicit switch:

~~~swift
case "witness_update", "validator_update": self = .validator_update
case "account_witness_vote", "account_validator_vote": self = .account_validator_vote
case "account_witness_proxy", "account_validator_proxy": self = .account_validator_proxy
~~~

Encoding writes `"\(self)"`, so once the case is renamed, encoding the new name is automatic — only decoding needs both spellings.

## The `.convertFromSnakeCase` trap

The root-level response types (`DynamicGlobalProperties`, `ExtendedAccount`) are configured with `JSONDecoder.keyDecodingStrategy = .convertFromSnakeCase`. That strategy converts a JSON key like `current_witness` to `currentWitness` *before* it's matched against `CodingKeys` raw values. So the legacy case has to be spelled in camelCase, not snake_case, or it silently never matches:

~~~swift
enum CodingKeys: String, CodingKey {
    case headBlockNumber, headBlockId, time, genesisTime,
         currentValidator,
         // ...
         inflationValidatorPercent,
         // ...
    case legacyCurrentWitness          = "currentWitness"
    case legacyInflationWitnessPercent = "inflationWitnessPercent"
}
~~~

Easy to get backwards once, easy to forget on every struct after that, since it looks wrong next to the actual JSON.

## What moved

Five operation structs were renamed with a deprecated typealias each (`Operation.WitnessUpdate` → `ValidatorUpdate`, `AccountWitnessVote` → `AccountValidatorVote`, `AccountWitnessProxy` → `AccountValidatorProxy`, `ShutdownWitness` → `ShutdownValidator`, `WitnessReward` → `ValidatorReward`), matching the five renamed `OperationId` cases — the underlying integer values (6, 7, 8, 30, 42) never change, only the JSON string names do. `Block.swift` renamed `witness`/`witnessSignature` to `validator`/`validatorSignature` on three types. `API.swift` renamed two fields on `DynamicGlobalProperties` and three on `ExtendedAccount`. `Client.swift`'s namespace-routing switch got old and new RPC method names both mapped to `validator_api`.

None of this needed a version bump serious enough to break anyone building against the library: every old identifier still resolves, with a deprecation warning pointing at its replacement. The only thing that doesn't work is asking the encoder to write the old key on purpose — deprecated names decode, they don't re-encode, which is deliberate since sending the new name is always what you want.

I split the work into a 12-task plan, one task per struct or file, each with its own commit, so a decode bug in one place couldn't hide inside a bigger diff. The last task before merge was a compile-smoke test that references every deprecated typealias, property, and init once, marked `@available(*, deprecated)` itself so Swift doesn't complain about the file using the very symbols it exists to protect. If a future cleanup deletes one of those symbols, this test file simply stops compiling, which is the whole point: the moment the deprecated surface actually breaks, this is the file that tells you.

## What I'd keep doing

Grep for `legacyWitness` and `@available(*, deprecated, renamed:` to find every site that needs cleanup once the deprecation window closes, since both markers are deliberately unique strings that exist nowhere else in the codebase. The rename touched five operation types, three files of response structs, and one routing switch, and the two markers find all of it.
