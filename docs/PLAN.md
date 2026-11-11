# Sprout — Implementation Plan

This plan turns the build kit (`docs/01`–`13`) into code. Milestones follow `13-BUILD-PLAN.md`.

## Architecture decisions up front
- **Next.js 16 App Router + TypeScript strict**, Tailwind 4 (tokens in CSS `@theme`), Motion for the pet rig.
- **One database layer, two drivers.** Real Postgres when `DATABASE_URL` is set (Neon in production),
  embedded PGlite (file in `.data/`) otherwise, so `npm run dev`, tests and Playwright need zero setup.
  Same Drizzle schema and migrations for both.
- **Money is `bigint` Luna everywhere.** API JSON carries Luna as decimal strings. Conversion to `number`
  happens only at the SDK boundary in `src/lib/nimiq/wallet.ts`.
- **Time is an input.** Every game function and `recompute()` takes `now`. Demo "fast-forward a week" is a
  per-user clock offset stored on the demo user.
- **One chain reader interface, two implementations.** `RpcChain` (real Nimiq JSON-RPC, server only) and
  `DemoChain` (fake ledger in the DB). Demo saves go through the exact same
  `POST /api/saves → verify → recompute` path; only the reader differs.
- **Pet = SVG rig in code** (moods × stages × cosmetics, recolourable for squad avatars).
  **Illustrations = raster crops** of the original art (onboarding, celebration, treat, withdraw, streak, collection).
  Garden scenes are drawn in SVG (the sheet-15 strips are too low-res).

## Milestones
| # | Scope | Proof |
|---|---|---|
| M0 | Scaffold, env validation, theme tokens, fonts, CI | `npm run build` green |
| M1 | `luna`, `signature`, `address`, `wallet`, `mockWallet`, auth tables + routes | unit tests |
| M2 | `chain` (RPC + demo), `invariants`, `/api/validators`, `/api/stake`, `/api/health` | unit tests |
| M3 | Game engine: `config`, `streak`, `growth`, `mood`, `sparks`, `badges` | unit tests incl. W53 boundary |
| M4 | Saves: verify + recompute in one transaction, Feed sheet, pool picker, celebration | demo flow |
| M5 | Pet rig, garden scene, Home, onboarding, hatch, streak detail, tab bar | screenshots vs mockups |
| M6 | Evolution screen, art integration, sounds toggle | screenshots |
| M7 | Squads, invites, treats, leaderboards | two-context E2E |
| M8 | Withdraw (3 steps), shop, collection, me, proof page, share cards | E2E |
| M9 | Demo mode polish, i18n (en/hi/es), skeleton/empty/error states, Playwright at 360/390/1280 | CI green |

## What cannot be verified from this machine
Real Nimiq Pay on a phone, mainnet RPC and real validator data. Those paths are implemented to spec and
behind env/config (`NIMIQ_RPC_URL`, `NIMIQ_STAKING_CONTRACT`, `VALIDATORS_API_URL`), and the on-device
checklist in `09-TESTING-QA.md` §4 stays open until run on a device.
