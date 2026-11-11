# 01 — Product Spec

## 1. Vision
Make saving a weekly habit by giving it a face. Sprout is a small creature that only grows
when you save. Savings go into the user's own Nimiq stake, so they earn rewards and the pet
keeps growing even while the user sleeps.

## 2. Audience
- **Primary:** young adults 18–30 (students, first-jobbers) who hold or receive NIM in Nimiq Pay
  and want to build a saving habit.
- **Secondary:** friend groups (hostel mates, office teams) who motivate each other.
- **Not for:** kids (no parent controls, no chores). This keeps us clearly different from
  kids' piggy-bank apps already in the competition.

Within 5 seconds of opening, a user must understand: *"I save NIM, my pet grows."*

## 3. Positioning vs. competitors (Save category)
| Competitor | What it is | How Sprout differs |
|---|---|---|
| Kuza | Savings goals in your own NIM stake | Sprout adds a living pet, evolutions, streak game, squads |
| Kitty / GoalJar | Shared goal jars | Sprout is personal saving + social streaks, not pooled jars |
| AKilii / Zamu | Rotating savings circles (chama) | No rotation, no pot; each person saves for themselves |
| Oinkly | Kids' piggy bank | Adults, no parents/quests |

Lead with what only Sprout has: **the pet that grows from real savings + squad streaks.**

## 4. Core loop
1. User opens Sprout → sees pet + mood + streak + saved total.
2. Taps **Feed Sprout** → chooses amount → approves a staking transaction in Nimiq Pay.
3. Backend verifies on-chain → pet celebrates, grows, streak updates, Sparks awarded.
4. Over the week: staking rewards compound → "Sprout grew overnight" moments.
5. Friends in the squad see who saved; anyone can send a treat.
6. Milestones → evolution → share card → new users.

## 5. Features — MVP (must ship)

### F1. Onboarding + sign-in
- 3 onboarding screens (skippable), then **Connect Nimiq Pay**.
- Sign-in = `nimiq.sign(challenge)`; server verifies signature, derives address, creates session.
- **Acceptance:** works first try in Nimiq Pay; cancel returns to the connect screen with a
  friendly message; reopening the app keeps the session (no new prompt) for 30 days.

### F2. Name & hatch your Sprout
- User names the pet (1–16 chars, emoji allowed but counted safely).
- Pet starts as **Seed** (stage 0).
- **Acceptance:** name saved server-side; profanity not filtered in MVP (store as-is, escape on render).

### F3. Plant (first save) and Feed (add savings)
- First save creates the staker: **minimum 100 NIM** (protocol minimum stake). Copy explains
  "100 NIM is the minimum to start earning" and shows the local-currency value.
- User picks a staking pool (default = recommended, see `03` §6) on first save only.
- Later saves add any amount ≥ 1 NIM via add-stake.
- Quick chips: 100 / 500 / 1,000 / custom. Shows "≈ ₹X" using a price feed (optional; hide if unavailable).
- **Acceptance:** the save counts only after on-chain confirmation; UI shows
  Pending → Confirmed (or Failed / Checking). No double-send possible.

### F4. Pet: stages, mood, growth
- 4 stages: Seed → Sprout → Bloom → Grove (thresholds in `04`).
- Mood from streak, last save, treats, time of day (rules in `04`).
- Pet size inside a stage scales smoothly with progress to the next stage.
- **Acceptance:** pet state is a pure function of server data (deterministic, unit-tested).

### F5. Earnings ("grew overnight")
- Show **Earned** = staking rewards proven from chain (formula in `03` §7).
- If earned increased since last visit → "Sprout grew overnight (+X NIM)" toast + small growth animation.
- If it can't be computed yet → show "Not known yet", never guess.

### F6. Weekly goal + streak
- User sets a weekly goal (default 500 NIM, editable).
- A week is "kept" if verified saves in that ISO week (UTC) ≥ goal.
- Streak = consecutive kept weeks ending with the current or last week.
- **Acceptance:** streak computed server-side from verified saves only.

### F7. Withdraw (honest)
- Always available. Flow: deactivate → cooldown (read release block from chain) → retire → remove.
- Pet shrinks to the stage matching the remaining stake; streak is not reset by withdrawing.
- **Acceptance:** each step validates invariants first; cooldown time comes from chain data.

### F8. Squads
- Create a squad (name, max 8 members) → invite link (deep link into Nimiq Pay) + code.
- Squad screen: members, who kept this week, squad streak (weeks where **all** members kept their goal).
- **Acceptance:** joining via link works when opened from WhatsApp on Android.

### F9. Treats
- Send a treat (≥ 1 NIM) to a squad member: a NIM payment with memo `sprout:t:<squadId>`.
- Recipient sees "X sent Sprout a treat" + love mood for 24h; they can **Plant it** (add to stake).
- **Acceptance:** backend verifies sender, recipient, amount, memo before showing it.

### F10. Leaderboard
- Global + squad leaderboards ranked by **consistency %** (kept weeks / weeks since joining),
  minimum 2 weeks of history to appear. Ties broken by current streak.
- Never ranks by amount (fairness; avoids whales).

### F11. Sparks & cosmetics
- Earn Sparks for verified actions (table in `04`). Spend on cosmetic hats/backgrounds.
- Cosmetics only; no gameplay advantage; no randomness.

### F12. Collection & badges
- Shows all stages (locked as silhouettes) and earned badges.

### F13. Share card
- Server-rendered image (`/api/share/:id`) for evolutions, streak milestones.
- Share via Web Share API, fallback copy link.

### F14. Demo mode
- `/demo` runs the full app with a mock wallet and fake chain, clearly labeled "Demo — no real money".
- Includes a "fast-forward a week" button so judges can see streaks and evolution.
- **Acceptance:** works in any desktop/mobile browser without Nimiq Pay.

### F15. Localization
- Follow `window.nimiqPay.language`. Ship English; add Hindi and Spanish if time allows.

## 6. Stretch (only after MVP is solid)
- S1. Dollar jar: show USDT (Polygon) balance as a second savings pot (read-only, via `window.ethereum`).
- S2. Treat yourself: spend earned rewards via `payLightningInvoice` (mainnet only).
- S3. Change pool (`sendUpdateStakerTransaction` after full cooldown).
- S4. Push-style reminders (in-app "Your streak ends in 2 days").
- S5. Seasonal cosmetics.

## 7. Out of scope
Fiat on/off-ramp, lending, pooled funds, random rewards, kids' features, NFTs.

## 8. Success metrics (for the submission)
- ≥ 20 real users with at least one verified save.
- ≥ 3 active squads.
- ≥ 50 verified on-chain saves, all linkable on a public "Proof" page.
