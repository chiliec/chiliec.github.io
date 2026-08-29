---
title: TON / Tact Smart-Contract Security Review
date: 2026-08-29 08:00:00
---

# TON / Tact Smart-Contract Security Review

Independent value-conservation and logic audits for TON smart contracts
(**Tact / FunC / Tolk**). Fixed-fee, fast turnaround, paid in crypto
(TON / USDT / USDC). No KYC to engage.

*Contact: [Telegram @babin](https://t.me/babin) · [vovababin@gmail.com](mailto:vovababin@gmail.com) · [github.com/chiliec](https://github.com/chiliec)*

---

## Why me

- **11 years shipping production software**, with a focused track record finding
  real, paid-severity bugs in on-chain money code.
- **Found and reported a $100k reward-over-mint bug** in a Solana/Anchor perpetual
  DEX and a **$50k emission over-claim** in an Obyte DeFi contract — both via
  source audit plus a working proof-of-concept, not scanner output.
- **Native TON / Tact fluency** — I ship Tact contract suites myself (a
  sealed-on-mainnet messenger and token economy), so I read your code the way you
  wrote it.
- **Method proven across ~12 audits** of live money code (Solana, TON, Obyte,
  Stellar/Soroban, VIZ) — including a federated multisig bridge and lending
  markets. I report honestly: a clean contract gets a clean bill, never invented
  findings.

## What I look for — the value-conservation lens

The bugs that actually lose funds, not style nits:

- **Mint / emission over-issue** — more tokens minted than backed; reward
  accumulators that over-pay late claimers.
- **Peg / conservation breaks** — locked ≠ circulating; a burn replayable into two
  releases.
- **Rounding and fee edges** that leak value on every operation.
- **Auth / replay** — missing sender checks, jetton-notification spoofing,
  order-hash collisions, double-claim windows.
- **State-machine holes** in escrows, streams, and staking — claim-then-cancel
  double-spends, stranded balances.

## What you get

- A ranked report: each finding with the exact code location, a concrete
  attack/failure scenario, an honest severity (I don't inflate), and a fix.
- **A runnable regression test that fails on the bug and passes on the fix** —
  proof, not assertion — wherever your harness allows (Blueprint / Sandbox / tact-test).
- A short "what I verified holds" section for the clean parts, per trust boundary.
- Private disclosure first; public credit or a fix PR only when you're ready.
- One free re-review of your fixes.

## Scope and price

| Tier | Scope | Turnaround | Fee (crypto) |
|---|---|---|---|
| **Spot check** | 1 contract, ≤400 LOC, one review pass | 2–3 days | from $600 |
| **Standard** | a contract suite (≤1.5k LOC), PoCs for findings | ~1 week | $2,000–4,000 |
| **Deep** | full protocol + invariant / property tests | 2–3 weeks | from $6,000 |

Final quote after a 30-minute scoping call on the actual code size and
complexity. Payout in TON / USDT (TON) / USDC.

---

**Ready to talk?** [Message me on Telegram](https://t.me/babin) or email
[vovababin@gmail.com](mailto:vovababin@gmail.com) with a repo link (private is
fine) and I'll come back with a scope and quote.
