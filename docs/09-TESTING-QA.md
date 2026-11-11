# 09 — Testing & QA

## 1. Unit tests (Vitest) — required
| Module | Cases |
|---|---|
| `luna.ts` | 1 NIM = 100,000 Luna; formatting with separators; no float drift (0.1+0.2 style cases); parse user input "1,000.5" |
| `signature.ts` | valid sig from mock wallet; wrong message; wrong key; non-ASCII challenge rejected; real vector captured from a phone |
| `address.ts` | known publicKey → address vector (captured on device); checksum format `NQ\d\d`; 9 groups of 4 |
| `invariants.ts` | create < 100 NIM fails; add leaving < 100 fails; retire before release fails; retire leaving 50 NIM fails; remove = whole retired |
| `streak.ts` | ISO week keys across year boundary (2026-W53/2027-W01); streak doesn't drop before current week ends; broken streak sets `previous` |
| `growth.ts` | each stage threshold incl. kept-week gate; withdraw lowers stage; progress/scale clamps |
| `mood.ts` | every priority rule, ties, sleepy hours with timezone |
| `sparks.ts`/`badges.ts` | idempotent awards; daily caps |

## 2. API tests (Vitest + test DB)
- Auth: challenge single-use, expiry, replay rejected, link flow.
- Saves: duplicate tx hash rejected; sender not linked → `needs_link`; amount mismatch → failed; confirmation recompute is idempotent (run twice → same state).
- Treats: memo mismatch rejected; non-member rejected.
- Demo endpoints reject non-demo sessions; real endpoints reject demo sessions where money is involved.

## 3. E2E (Playwright, against `/demo`)
Viewports: 360×780 (Android), 390×844 (iPhone), 1280×800 (desktop).
Flows: onboarding → hatch → plant → fast-forward → week kept → evolve → share; squad create/join (two browser contexts) → treat → plant treat; withdraw 3 steps; reduced motion on.

## 4. On-device checklist (real Nimiq Pay, **mainnet**, small amounts)
Run on at least: one low-end Android, one recent Android, one iPhone. Record results in `TESTLOG.md` with tx links.
- [ ] App opens via Custom URL and via deep link from WhatsApp
- [ ] Sign-in prompt shows, approve → session; reopen app → no prompt
- [ ] Derived address equals one of `listAccounts()` (capture as test vector)
- [ ] Cancel sign-in → friendly message, can retry
- [ ] Plant 100 NIM with recommended pool → confirmed within ~1 min → pet + streak update
- [ ] Feed 10 NIM → confirmed
- [ ] Kill the app during "Confirming…" → reopen → status resolves correctly, no double-send offered
- [ ] Airplane mode during approval → "Checking…" → resolves after reconnect
- [ ] Sender address changed (if it happens) → link prompt works
- [ ] Withdraw step 1 → countdown shows a plausible time → step 2 & 3 after release
- [ ] Treat to a friend (two phones) → memo verified → recipient sees treat → plant it
- [ ] Squad invite link opens join page inside Nimiq Pay
- [ ] Language follows Nimiq Pay setting
- [ ] 60fps idle animation on the low-end phone (no jank when scrolling cards)
- [ ] All screens fit at 360px, no horizontal scroll, safe areas respected
- [ ] Wrong-network screen on testnet build vs mainnet host

## 5. Outside testers (do this — it scores)
Recruit 3–5 people from the Skool community. Give them a checklist and a form.
Fix every real bug, add a test for each, and mention "N testers, M issues fixed" in the submission.

## 6. Pre-submission audit
- [ ] `npm run build` clean, lint clean, tests green in CI (GitHub Actions)
- [ ] No secrets in git history (`gitleaks` or GitHub secret scanning)
- [ ] LICENSE (MIT), CREDITS.md, README with screenshots + demo link + Custom URL instructions
- [ ] Proof page shows real verified saves
- [ ] Lighthouse mobile performance ≥ 85 on Home
