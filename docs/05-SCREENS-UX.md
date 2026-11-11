# 05 — Screens & UX

Design rules: 360px-first, thick-outline sticker style, rounded cards (24px), pill buttons,
Nimiq gold `#F6B221` + navy `#1F2348` + leaf green `#5BC26A` + sky `#8EC9FF` + cream `#FFF6E5`.
Headings: Bricolage Grotesque ExtraBold (Google Fonts, OFL). Body: Inter.
Every screen needs: loading skeleton, empty state, error state, reduced-motion behaviour.
Bottom tab bar (after onboarding): **Home · Squad · Collection · Me**.

## S1. Onboarding (3 slides, skippable)
1. Sprout watering a coin tree. **"Grow your savings. Grow your Sprout."** — "Every NIM you save helps Sprout grow."
2. The 4 stages in a row. **"Save weekly. Watch it evolve."** — "Keep your streak and unlock new forms."
3. Sprout holding a phone. **"Your money stays yours."** — "Savings go into your own Nimiq stake and earn rewards. You approve every step."
CTA: **Connect Nimiq Pay** → sign-in.
States: not inside Nimiq Pay → "Open Sprout in Nimiq Pay" + button to deep link + "Try the demo".
Wrong network → "Sprout runs on mainnet. Switch network in Nimiq Pay settings."

## S2. Name your Sprout
Seed in a pot, text field "Name your Sprout", suggestions chips (Pip, Mochi, Nimbus, Kiwi). CTA **Hatch**.

## S3. Home
- Top bar: "Sprout" logo · streak flame with number · Sparks counter.
- Scene (top ~55%): garden background for current stage, pet centered with mood animation,
  speech bubble (mood line), equipped cosmetics.
- Under scene: `<name> · <Stage>` and progress bar "420 / 1,000 NIM to Sprout" (+ kept-weeks requirement if that's the blocker: "1 more kept week to evolve").
- Card **Savings:** Saved (NIM + ≈ local currency), Earned (+X NIM, green, or "Not known yet"), big round **Feed** button.
- Card **This week:** "320 / 500 NIM" bar + "Resets Mon 05:30".
- Card **Squad** (if any): avatars with ✓/⏳ + "Send a treat".
- Unplanted state: scene shows seed in a pouch, CTA **Plant your seed (100 NIM)**.
- Pending/checking saves show a small chip "Confirming save…".

Speech-bubble lines (examples; i18n keys `mood.<mood>.<n>`):
- happy: "We hit this week's goal!" · hungry: "I'm a bit hungry… a small save?" · sad: "We'll grow back, together."
- love: "A treat! Someone believes in us 💛" · sleepy: "Zzz… growing in my sleep." · content: "Every NIM counts."

## S4. Feed sheet (bottom sheet)
Title "Feed Sprout". Amount display, chips 100 / 500 / 1,000 / Custom.
Line: "≈ ₹14 · goes into your own stake · you can withdraw anytime".
If planting: pool row "Pool: <name> · fee X% · compounding" with **Change** → Pool picker.
Validation errors inline (from `invariants.ts`). CTA **Save X NIM** (gold).
After tap: button → spinner "Waiting for approval…" → "Confirming on chain…".
Cancel → "No problem — nothing was sent." Unknown outcome → "Checking…" lock with explanation.

## S5. Pool picker
List: logo, name, fee, payout ("Compounding" / "Pays to wallet"), trust score, "Recommended" tag on default.
Explainer at top: "Pools stake for you and share rewards. Your NIM stays in your own address."

## S6. Save success (overlay)
Confetti, pet jumps (celebrating). "+500 NIM saved!" · "Sprout grew a little 🌱" · streak chip.
If week just kept: "Week kept! Streak 7 🔥" + Sparks earned. Buttons: **Back to garden**, **Share**.

## S7. Evolution (full screen)
Navy background, light burst, old form → glow → new form. "Sprout evolved into Bloom!"
"You saved 5,000 NIM over 4 kept weeks." Buttons **Meet Bloom**, **Share**. Haptic if available (`navigator.vibrate`).

## S8. Streak detail
Big number + "week streak", row of last 8 weeks (✓ green / ✗ grey / current outlined),
best streak, "Next reward at 4 weeks: On a Roll badge". Edit weekly goal here.

## S9. Squad list / Squad detail / Join
- List: my squads + **Create squad** + **Join with code**.
- Detail: name, squad streak, members grid (avatar, name, ✓/⏳, streak), **Send a treat**, **Invite** (share link + code + QR), leaderboard tab.
- Join page (`/join/[code]`): squad name, member avatars, **Join squad** (requires sign-in). Outside Nimiq Pay: "Open in Nimiq Pay" + store links.

## S10. Treat sheet
Pick member → amount chips 1 / 5 / 10 NIM → optional thank-you note (stored in DB, max 80 chars, not on chain).
Note under button: "Treat memos are public on the Nimiq blockchain; your note is not."

## S11. Treat received
Pet with love eyes hugging a gift. "<Name> sent Sprout a treat! +5 NIM" + note bubble.
Buttons: **Plant it** (add to stake) · **Say thanks** (sends an in-app thank-you, no tx).

## S12. Leaderboard
Tabs: Squad · Global. Podium top 3, then list (rank, avatar, name, consistency %, streak). "Ranked by consistency, not amount." Me highlighted.

## S13. Collection
Stages grid (locked = silhouette + requirement), badges grid (locked badges show their rule), cosmetics owned.

## S14. Shop
Items grid with price in Sparks, **Buy** / **Equip**. Preview on the pet before buying.

## S15. Me / Settings
Pet name, weekly goal, language (follows Nimiq Pay; override), linked addresses (truncated), pool info,
**Withdraw**, Proof page link, privacy note, credits, sign out (`disconnect()` + clear session).

## S16. Withdraw
Step indicator 1-2-3. Copy: "Your money is always yours. Sprout will shrink a little, but you can grow it back."
Step 1 amount + **Stop earning** · Step 2 countdown "Unlocks in about 14h (block 65,912,000)" then **Unlock** ·
Step 3 **Send to wallet**. Explain the 100 NIM rule when relevant: "To keep staking, leave at least 100 NIM — or withdraw everything."

## S17. Proof page (public)
Table of the latest verified saves (pet name, amount, time, explorer link). Totals: savers, saves, NIM saved.
Great for judges (real usage evidence).

## S18. Share card (image)
1080×1920 PNG: stage background, pet in current form + cosmetics, headline ("I kept a 12-week saving streak 🔥" / "Sprout evolved into Grove!"), footer "Grow yours on Sprout · Nimiq Pay".

## Microcopy principles
Warm, short, never shaming. Never say "locked" about money. Always say what happens next.
