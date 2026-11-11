# 13 — Build Plan (milestones + prompts for your AI agent)

Work milestone by milestone. Each ends with something you can open on your phone.
Paste the prompt into Claude Code / Cursor with this folder in the repo root (`/docs`).
After each milestone: commit, push, update `DECISIONS.md`, tick the checklist.

---
## M0 — Setup (½ day)
**Prompt:**
```
Read /docs/CLAUDE.md and /docs/02-ARCHITECTURE.md. Scaffold the Next.js + TypeScript project exactly as in the folder structure: Tailwind, Framer Motion, Zustand, TanStack Query, Drizzle + Postgres, jose, zod, @noble/curves, @noble/hashes, @nimiq/mini-app-sdk (>=0.2.4), Vitest, Playwright. Add MIT LICENSE, CREDITS.md, DECISIONS.md, .env.example from /docs/10-DEPLOYMENT.md, env validation in src/lib/env.ts, GitHub Actions CI (lint, typecheck, test, build). Add theme tokens and fonts from /docs/05-SCREENS-UX.md. Create a placeholder Home page that shows "Sprout" and the host network from getHostNetwork(). No features yet.
```
✅ Deployed to Vercel; opens in Nimiq Pay via Custom URL; CI green.

## M1 — Wallet layer, auth, address (1 day)
**Prompt:**
```
Implement src/lib/nimiq/wallet.ts, signature.ts, address.ts, luna.ts exactly per /docs/03-NIMIQ-INTEGRATION.md §1–3, plus mockWallet.ts (§12) with the same interface. Implement DB tables users, user_addresses, auth_challenges and routes /api/auth/challenge, /api/auth/verify, /api/auth/link, /api/auth/logout per /docs/06-DATA-MODEL-API.md. Add a dev-only debug page /dev/wallet that shows listAccounts(), the derived address from sign(), and whether they match. Write unit tests for signature, address and luna.
```
✅ On a real phone: sign-in works, derived address matches `listAccounts()`; add that vector to tests.

## M2 — Chain client, validators, stake summary (1 day)
**Prompt:**
```
Implement src/lib/nimiq/chain.ts (server JSON-RPC client with allowlist and fallback URL) and src/lib/nimiq/invariants.ts per /docs/03 §5. Add /api/validators (cached 10 min, adapter to the shape in /docs/06) and /api/stake (staker summary across linked addresses, earned formula per /docs/03 §7 returning null when unknown). Add /api/health. Log one raw response of getStakerByAddress and getTransactionByHash in dev and adapt field names. Unit-test invariants.
```
✅ `/api/stake` returns correct numbers for a real address with stake.

## M3 — Game engine (1 day)
**Prompt:**
```
Implement pure functions in src/lib/game/: config.ts, growth.ts, mood.ts, streak.ts, sparks.ts, badges.ts exactly per /docs/04-GAME-DESIGN.md. 100% unit-test coverage on these files, including ISO-week year boundaries and idempotent awards.
```
✅ Tests green.

## M4 — Plant & feed, verification, celebration (2 days)
**Prompt:**
```
Build the Feed sheet, Pool picker and Save success overlay per /docs/05 S4–S6. Flow per /docs/02 §5 and /docs/03 §8: validate invariants, call sendNewStakerTransaction (first save) or sendStakeTransaction, POST /api/saves immediately, poll GET /api/saves/:id, handle every WalletResult kind per /docs/03 §1 (cancelled, invalid, unknown_outcome → Checking + /api/saves/recover). Implement verify.ts and recompute() in one DB transaction (weeks, streaks, stage, sparks, badges). Implement tables saves, weeks, streaks, pets, sparks_ledger, badges.
```
✅ Real 100 NIM plant on mainnet confirms; killing the app mid-confirm never allows a double send.

## M5 — Pet rig & Home (2 days)
**Prompt:**
```
Implement the 2D pet rig and animations per /docs/08-ANIMATION.md using placeholder SVG parts (simple shapes in the palette) until final art arrives. Build Home (S3), Onboarding (S1), Name your Sprout (S2), Streak detail (S8), tab bar. Wire mood and growth from /api/me. Add "grew overnight" via /api/me/visit. Respect prefers-reduced-motion and 360px width.
```
✅ Home feels alive on a low-end Android at 60fps.

## M6 — Art integration (1 day, after you generate art with /docs/07 prompts)
**Prompt:**
```
Replace placeholder parts with the final SVG/PNG assets in /public/pet, /public/bg, /public/cosmetics following the naming in /docs/07 §4. Create rig.json anchor points per stage. Add the Evolution screen (S7) with the sequence in /docs/08 §5. Add UI sounds (off by default).
```

## M7 — Squads, treats, leaderboard (2 days)
**Prompt:**
```
Implement squads (create, invite code + deep link, join page incl. outside-Nimiq-Pay state, member list with weekly status, squad streak), treats (sendBasicTransactionWithData with memo sprout:t:<squadId>, server verification per /docs/03 §8 and §10, inbox, thanks, plant-it via sendStakeTransaction as kind treat_plant), and leaderboards (consistency per /docs/04 §9). Screens S9–S12. Tables squads, squad_members, squad_weeks, treats.
```
✅ Two phones: treat sent, verified, received, planted.

## M8 — Withdraw, shop, collection, me, proof, share (2 days)
**Prompt:**
```
Implement the 3-step withdraw flow per /docs/03 §9 and screen S16 (state derived from chain, countdown from inactiveRelease and current block). Shop and cosmetics (S14), Collection (S13), Me/Settings (S15), public Proof page (S17), share images with next/og (S18) and Web Share API.
```

## M9 — Demo mode, i18n, polish (1–2 days)
**Prompt:**
```
Complete /demo per /docs/01 F14 and /docs/04 §11 using mockWallet and a demo data namespace (fast-forward week, simulate treat, simulate rewards). Add i18n (en; hi and es if time) following window.nimiqPay.language. Add skeletons, empty and error states to every screen. Run Playwright flows from /docs/09 §3 at 360px, 390px and desktop.
```

## M10 — Real-world testing & launch (ongoing, start early)
- Run the on-device checklist in `/docs/09` §4; write `TESTLOG.md` with tx links.
- Recruit 3–5 outside testers; fix and test every real issue.
- Start squads with friends; post progress (see `/docs/11` §4).
- Record the demo video, write the description and builder story, submit in the **Save** category.

---
### Rough timeline (solo, focused)
Week 1: M0–M4 · Week 2: M5–M7 · Week 3: M8–M9 + testers · Week 4: polish, real usage, video, submit.
If time is short, cut in this order: shop → leaderboard global → share images → i18n beyond English.
**Never cut:** verification, error handling, withdraw, demo mode.
