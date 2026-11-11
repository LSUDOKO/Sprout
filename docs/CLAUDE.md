# CLAUDE.md — Instructions for the AI coding agent

You are building **Sprout**, a Nimiq Pay Mini App (savings + virtual pet). The specs in this
folder are the source of truth. When a spec and your instinct disagree, follow the spec. When
a spec is ambiguous, choose the safer option for the user's money and note it in `DECISIONS.md`.

## Read order
1. `01-PRODUCT-SPEC.md` 2. `03-NIMIQ-INTEGRATION.md` 3. `04-GAME-DESIGN.md`
4. `02-ARCHITECTURE.md` 5. `06-DATA-MODEL-API.md` 6. `05-SCREENS-UX.md`
Then follow `13-BUILD-PLAN.md` milestone by milestone. Do not skip ahead.

Also install the official Nimiq Mini Apps AI skill for accurate SDK context:
https://nimiq.dev/mini-apps/development/build-with-ai

## Money rules (never break these)
1. **Amounts are integers in Luna.** 1 NIM = 100,000 Luna. Never use floats for money.
   Convert to NIM only for display. Store as `bigint` in Postgres.
2. **Sprout never holds funds.** Savings go into the user's own staker via Nimiq Pay.
   There is no pool wallet, no server key that can move NIM.
3. **Never retry a transaction whose outcome is unknown.** On `NETWORK_ERROR`, timeout,
   `TRANSACTION_OUTCOME_UNKNOWN` or any ambiguous result: mark the action "Checking",
   poll the chain, and do not offer the same action again until resolved.
4. **Validate staking invariants before opening any wallet dialog** (see `03-NIMIQ-INTEGRATION.md` §5).
   Never send a transaction the chain will reject.
5. **A transaction hash is not success.** A save counts only after the backend confirms it
   on-chain (executed, correct sender, correct amount).
6. **Treat everything from the client as untrusted.** The server re-verifies every claim
   (signatures, tx hashes, amounts) against the chain.
7. **Never claim money is "locked".** Staked NIM can always be withdrawn (after the cooldown).
   UI copy must be honest about this.

## Code rules
- TypeScript strict mode. No `any` in money or chain code.
- All Nimiq provider calls go through `src/lib/nimiq/wallet.ts` (one place for error handling).
- All chain reads go through `src/lib/nimiq/chain.ts` on the server; the client reads chain data only via Sprout's own API routes (`/api/stake`, `/api/saves/:id`, …).
- Every user-facing string goes through `t()` (i18n).
- Every screen must work at **360px width** inside the Nimiq Pay WebView.
- Respect `prefers-reduced-motion`.
- No secrets in the repo. `.env.example` lists every variable with a dummy value.
- Write unit tests for: growth engine, streak calculator, Luna formatting, signature
  verification, address encoding, staking invariant checks.

## Definition of done for any feature
- Works in Nimiq Pay on a real Android phone on mainnet (or explicitly testnet-only, documented).
- Handles cancel (`PERMISSION_DENIED`), errors, slow network, and empty states.
- Has copy in English (other languages may fall back to English).
- Has at least one test if it contains logic.
- Demo mode (`/demo`) still works.

## Never
- Never invent SDK methods. Only use methods listed in `03-NIMIQ-INTEGRATION.md`.
  If you need something not listed, stop and check https://nimiq.dev/mini-apps/api-reference/nimiq-provider
- Never use random rewards, loot boxes or chance mechanics (competition rule).
- Never use copyrighted characters or assets.
- Never commit `.env*`, `node_modules`, `.next`, `dist`.
