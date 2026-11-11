# 11 — Submission Playbook (how to score high)

Scoring (Nimiq Community Council, 100 points): Functionality/reliability/usefulness **45**,
Nimiq Pay & Nimiq integration **25**, Real usage **15**, Design & UX **10**, Builder promotion **5**.
Category: **Save**.

## 1. Map every criterion to evidence
| Criterion | What to show |
|---|---|
| Core feature works | Video: plant → confirmed → pet grows, in real Nimiq Pay on mainnet |
| Error handling | Video clip: cancel + "Checking…" recovery; list handled error types in README |
| Speed | Lighthouse score; first load < 1.5 MB |
| Stability | Test counts (unit/E2E), CI badge, on-device TESTLOG with tx links |
| Completeness | All MVP features + demo mode + proof page |
| Real need | One line: saving is a habit problem, not a math problem |
| Target audience | "Young adults building a weekly saving habit" — visible in onboarding |
| Originality | Pet that grows from **real staking rewards** + squad streaks; nothing else in Save does this |
| Repeat value | Weekly streak, squads, overnight growth |
| Nimiq integration (25) | sign-in with `sign()`, 5 staking tx types, treats with memos, on-chain verification, validators API, language + network from host |
| Real usage (15) | Proof page: number of savers, saves, NIM saved; squads count |
| Design (10) | Consistent original art, animations, 360px polish |
| Promotion (5) | Posts in Skool + X (see §4) |

## 2. Description (≤ 250 words) — draft
> **Sprout — save NIM, grow a pet.**
> Saving is a habit problem, not a math problem. Sprout gives the habit a face: a small creature
> that only grows when you save.
>
> Every save is a staking transaction from your own Nimiq Pay wallet, so your NIM stays in your
> address and earns rewards. Sprout grows from what you save and from rewards proven on-chain, so
> it literally grows while you sleep. Keep a weekly goal to build your streak, evolve Sprout from
> Seed to Sprout, Bloom and Grove, and earn cosmetic Sparks (no randomness, no loot boxes).
>
> Save with friends in Squads: everyone sees who kept their week, the squad keeps a shared streak,
> and you can send a friend a NIM treat that they can plant into their own stake. Leaderboards rank
> consistency, not wealth.
>
> Built for young adults who want a weekly saving habit. Your money is never locked: withdraw
> anytime in three honest steps that follow Nimiq's staking rules.
>
> Nimiq integration: sign-in with sign() verified on our server; new-staker, add-stake, set-active,
> retire and remove transactions; treats via payments with memos; every save and treat verified
> on-chain before it counts; pools from the Nimiq Validators API; language and network from Nimiq Pay.
> Try it in any browser at /demo, or open it in Nimiq Pay via Mini Apps → Custom URL.
> Public proof of real saves: /proof.

(Count words before submitting; trim to ≤ 250 if you add numbers.)

## 3. Demo video script (≤ 2:30)
| Time | Shot |
|---|---|
| 0:00–0:10 | Hook: phone in hand, Sprout bouncing. VO: "This is Sprout. It only grows when I save." |
| 0:10–0:30 | Open in Nimiq Pay → sign in → name pet |
| 0:30–1:00 | Plant 100 NIM → Nimiq Pay approval → "Confirming" → celebration → stage/progress |
| 1:00–1:15 | Next day: "Sprout grew overnight +X NIM" (rewards from chain) |
| 1:15–1:40 | Squad: two phones, friend sends a treat → love mood → plant it |
| 1:40–1:55 | Evolution sequence (use demo fast-forward if real time doesn't allow, and say so) |
| 1:55–2:10 | Withdraw screen: "never locked" + 3 steps |
| 2:10–2:30 | Proof page numbers + "open source, MIT" + link |
Record real screen captures; caption on-screen; no music copyright issues (use CC0 or none).

## 4. Promotion checklist (Builder promotion = 5 pts, and it drives real usage)
- [ ] Day 1 post in Skool: idea + mascot reveal, ask for testers
- [ ] Progress post every 2–3 days (GIFs of animations work best)
- [ ] X/Twitter thread: problem → pet → how staking makes it grow → demo GIF → link; tag @nimiq
- [ ] "First squad to a 4-week streak" community challenge
- [ ] Join the weekly live builder sessions; show the app
- [ ] Share cards from real users reposted (with permission)
- [ ] Final post: video + proof numbers + thank testers

## 5. Builder story (for the submission page)
Write 150–300 words: why saving habits, what surprised you building on Nimiq (e.g. signer accounts,
staking cooldowns, verifying on-chain), what testers taught you, what's next. Be concrete and honest —
the strongest entries in past cycles showed real tx links and tester counts.

## 6. Final checks before submit
- [ ] Category = Save
- [ ] Public repo, MIT, README with screenshots, Custom URL instructions, demo link
- [ ] Lead name/pseudonym, GitHub, Nimiq wallet address for payout
- [ ] Video link works unlisted/public
- [ ] Proof page live with real data
