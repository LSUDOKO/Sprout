# 04 — Game Design (exact rules)

All rules here live in pure functions under `src/lib/game/` with unit tests.
All amounts in Luna (1 NIM = 100,000 Luna). Constants live in `src/lib/game/config.ts`.

## 1. Inputs (all from the server, all verified)
- `stakeLuna`: current staker total (active + inactive + retired) across linked addresses
- `keptWeeksTotal`: number of ISO weeks (UTC) where the user met their goal
- `currentStreak`, `bestStreak`
- `thisWeekSavedLuna`, `weeklyGoalLuna`
- `lastSaveAt`, `lastTreatReceivedAt`, `lastWeekKept`, `previousStreak`
- `localHour` (client)

## 2. Stages
| # | Stage | Stake ≥ | Kept weeks (total) ≥ | Look |
|---|---|---|---|---|
| 0 | **Seed** | 0 (unplanted) / 100 NIM (planted) | 0 | tiny gold seed with a leaf bud |
| 1 | **Sprout** | 1,000 NIM | 1 | base character |
| 2 | **Bloom** | 5,000 NIM | 4 | two leaves + flower + scarf |
| 3 | **Grove** | 20,000 NIM | 8 | leafy crown, glowing coin fruit |

```ts
export const STAGES = [
  { id: 'seed',   minStake: 0n,              minKept: 0 },
  { id: 'sprout', minStake: 1_000n * 100_000n,  minKept: 1 },
  { id: 'bloom',  minStake: 5_000n * 100_000n,  minKept: 4 },
  { id: 'grove',  minStake: 20_000n * 100_000n, minKept: 8 },
] as const
stage = highest s where stake >= s.minStake && keptWeeksTotal >= s.minKept
```
- Using **total kept weeks** (not current streak) means a broken streak never devolves the pet.
- Withdrawing below a threshold lowers the stage ("Sprout shrank — grow it back anytime").
- **Tune thresholds before launch** against the NIM price so Grove ≈ a meaningful but reachable
  amount for a student over ~2 months. Keep them in config, not hardcoded in UI.
- `planted = stakeLuna >= MIN_STAKE` — unplanted Seed shows "Plant your seed: 100 NIM".

**Progress within a stage** (drives size and the progress bar):
```
p = clamp((stake - stage.minStake) / (next.minStake - stage.minStake), 0, 1)
scale = 1.0 + 0.15 * p        // pet visibly grows inside a stage
```
At Grove, progress bar shows "Grove · X NIM saved" (no next stage).

## 3. Mood (first matching rule wins)
| Priority | Mood | Rule |
|---|---|---|
| 1 | `celebrating` | client-only, 4s after a confirmed save/evolution |
| 2 | `love` | treat received in the last 24h |
| 3 | `sad` | last week not kept AND previousStreak ≥ 2 AND today is within the first 3 days of the week |
| 4 | `hungry` | this week not kept AND (no save in the last 3 days) AND today ≥ Thursday (UTC week) |
| 5 | `sleepy` | localHour ≥ 22 or < 6 |
| 6 | `happy` | this week kept |
| 7 | `content` | default |

Moods change eyes, mouth, idle animation and one line of speech-bubble copy (see `05`).
Mood never affects money or rewards.

## 4. Weeks, goals, streaks
- Week key = ISO week in **UTC** (`2026-W46`). Display the reset time in local time ("resets Mon 05:30").
- Weekly goal: default **500 NIM**, min 50 NIM, max 1,000,000 NIM. Changing the goal applies from the next week.
- **Counts toward the goal:** confirmed `plant` and `feed` saves made by the user.
- **Does not count:** planted treats (they grow the pet, but the habit must be the user's own).
- Week kept = sum of counting saves in that week ≥ that week's goal.
- `currentStreak` = consecutive kept weeks ending at the current week if kept, else ending last week.
  (So the streak doesn't drop to 0 on Monday morning before you've had a chance to save.)
- Withdrawals don't affect streaks.
- Known exploit (withdraw and re-save the same NIM): accepted; it costs a ~12–24h cooldown, three
  approvals and fees each cycle, and the money is still being saved. Document in `DECISIONS.md`.

## 5. Sparks (cosmetic currency, deterministic, no randomness)
| Event | Sparks |
|---|---|
| Confirmed save | +10 (max 3 times per day) |
| Week kept | +30 + 5 × currentStreak (cap 100) |
| Evolution | +100 |
| Squad perfect week (all members kept) | +50 each member |
| Treat sent (verified) | +5 (max 3 per day) |
| Treat planted | +5 |
Ledger table records every change (`sparks_ledger`); balance = sum. Server-side only.

## 6. Cosmetics shop
Cosmetic only, fixed prices, always visible (no random drops).
| Item | Type | Price |
|---|---|---|
| Leaf cap | hat | 50 |
| Tiny crown | hat | 150 |
| Star scarf | neck | 120 |
| Sunglasses | face | 80 |
| Moon garden | background | 200 |
| Sakura garden | background | 200 |
| Night sky | background | 300 |
| Gold aura | effect | 400 |
One item equipped per slot (hat, neck, face, background, effect).

## 7. Badges
| Badge | Rule |
|---|---|
| First Seed | planted (stake ≥ 100 NIM) |
| Week One | first kept week |
| On a Roll | currentStreak ≥ 4 |
| Unstoppable | currentStreak ≥ 12 |
| Bloomer | reached Bloom |
| Grove Keeper | reached Grove |
| Grew Overnight | earned > 0 for the first time |
| Squad Founder | created a squad with ≥ 3 members |
| Perfect Squad | squad perfect week |
| Generous | sent 5 verified treats |
| Comeback | kept a week right after a broken streak (previousStreak ≥ 2) |
| 10K Club | stake ≥ 10,000 NIM |
Badges are never removed once earned.

## 8. Squads
- 2–8 members. Creator is admin (can rename, remove members).
- Invite code: 6 chars `[A-Z2-9]` (no ambiguous chars) + deep link.
- **Squad streak:** consecutive weeks where every member who joined before that week started kept their goal.
- Squad card shows each member: pet avatar (stage + equipped cosmetics), name, ✓ this week / ⏳.
- Leaving a squad keeps your own progress.

## 9. Leaderboards
- `consistency = keptWeeks / eligibleWeeks` where eligibleWeeks = completed weeks since the first planted week (current week excluded unless kept).
- Appear after ≥ 2 eligible weeks. Sort: consistency desc → currentStreak desc → earliest plant.
- Global top 100 + squad leaderboard. Never show amounts on leaderboards.
- Optional anti-spam: one leaderboard entry per `requestDeviceIdentifier` value (device ≠ user; only used to dedupe).

## 10. "Grew overnight"
On app open, compare `earned` with `earnedAtLastVisit` (stored server-side per user).
If increased → toast "While you slept, Sprout grew +X NIM 🌱" + 1.2s growth pulse. Update the stored value.

## 11. Demo mode rules
- Same engine, separate data namespace.
- Buttons: "Fast-forward 1 week", "Receive a treat", "Simulate rewards (+20 NIM)".
- Starts with a pre-filled squad of 4 demo members and history so leaderboards work.
