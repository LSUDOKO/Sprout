# Decisions

Where the spec was ambiguous, or the mockups and the spec disagree, the choice and the reason live here.
Rule of thumb: **the spec wins on rules and money, the mockups win on look.**

## Spec vs mockups
| Topic | Mockup | Spec | Decision |
|---|---|---|---|
| Feed chips | 10 / 25 / 50 / 100 | 100 / 500 / 1,000 / custom, 100 NIM minimum to plant | Spec chips. Planting needs 100 NIM (protocol minimum), so smaller chips would fail validation. |
| Withdraw | One "Withdraw" button | Three steps: stop earning → unlock → send to wallet | Three steps, styled like the mockup. A single button would hide the cooldown and the chain rules. |
| Treat received | Only "Say thanks" | "Plant it" and "Say thanks" | Both buttons. |
| Leaderboard avatars | Non-Sprout creatures | Pet avatar (stage + cosmetics) | Recoloured Sprout avatars. No foreign characters. |
| Collection lock text | Grove at 500 NIM | Thresholds from `config.ts` | Read thresholds from config. |
| Home progress | "420 / 500 NIM to Grove" | Includes kept-week gate | Shows the real blocker (NIM or kept weeks). |
| Onboarding dots | 4 dots | 3 slides + connect | 4 dots: 3 slides plus the connect step. |

## Engineering
- **DB driver by env.** Postgres (`DATABASE_URL`) in production, embedded PGlite file otherwise. Same schema.
- **Luna in JSON as strings.** `JSON.stringify` cannot encode `bigint`; strings keep precision above 2^53.
- **Clock injection.** All game rules take `now`. Demo users carry a `clock_offset_ms` for fast-forward.
- **Demo chain.** Demo transactions live in `demo_chain_txs` and demo stakers in `demo_stakers`.
  Production endpoints that touch money reject demo sessions; demo endpoints reject real sessions.
- **Staking contract address** is configurable (`NIMIQ_STAKING_CONTRACT`), default
  `NQ77 0000 0000 0000 0000 0000 0000 0001`, to be confirmed against a real staking tx (`03` §8.3).
- **Validators API field mapping** lives in one adapter (`src/lib/nimiq/validators.ts`).
- **Known exploit accepted:** withdraw and re-save the same NIM to keep a streak. Each cycle costs a
  cooldown, three approvals and fees, and the money is still saved (`04` §4).
- **Device test vector.** The address/signature test vectors are generated with an independent
  Ed25519 key; the on-device vector from a real phone is still a TODO (`09` §1).
