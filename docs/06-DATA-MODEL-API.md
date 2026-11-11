# 06 — Data Model & API

Postgres + Drizzle. All money columns `bigint` (Luna). All timestamps `timestamptz`.
IDs: `text` (nanoid/base62) unless stated.

## 1. Schema
```ts
users            (id pk, primary_address text not null, created_at, is_demo bool default false,
                  locale text, weekly_goal_luna bigint default 50000000, next_weekly_goal_luna bigint null,
                  earned_at_last_visit_luna bigint null, device_id_hash text null)
user_addresses   (address text pk, user_id fk users, public_key text not null, linked_at)
auth_challenges  (id pk, challenge text unique, purpose text check in ('signin','link','join'),
                  user_id fk null, created_at, expires_at, used_at null)
pets             (user_id pk fk, name text, stage text default 'seed', hat text null, neck text null,
                  face text null, background text null, effect text null, updated_at)
staker_cache     (address pk, active_luna bigint, inactive_luna bigint, retired_luna bigint,
                  inactive_release int null, delegation text null, fetched_at)
saves            (id pk, user_id fk, tx_hash text unique, kind text check in ('plant','feed','treat_plant'),
                  value_luna bigint, from_address text null, status text check in ('pending','confirmed','failed','needs_link'),
                  block_number int null, week_key text null, created_at, confirmed_at null, fail_reason text null)
withdrawals      (id pk, user_id fk, step text check in ('deactivate','retire','remove'), tx_hash text unique,
                  value_luna bigint, status text, created_at, confirmed_at null)
weeks            (user_id fk, week_key text, goal_luna bigint, saved_luna bigint default 0, kept bool default false,
                  primary key (user_id, week_key))
streaks          (user_id pk fk, current int, best int, kept_total int, previous int, last_kept_week text null)
squads           (id pk (short base62 ≤10), name text, invite_code text unique, created_by fk users, created_at)
squad_members    (squad_id fk, user_id fk, role text check in ('admin','member'), joined_at, primary key (squad_id, user_id))
squad_weeks      (squad_id fk, week_key text, perfect bool, primary key (squad_id, week_key))
treats           (id pk, squad_id fk, from_user fk, to_user fk, tx_hash text unique, value_luna bigint,
                  note text null, status text, created_at, confirmed_at null, planted_save_id fk saves null, thanked bool default false)
sparks_ledger    (id pk, user_id fk, delta int, reason text, ref text null, created_at,
                  unique (user_id, reason, ref))          -- idempotent awards
inventory        (user_id fk, item_id text, acquired_at, primary key (user_id, item_id))
badges           (user_id fk, badge_id text, earned_at, primary key (user_id, badge_id))
```
Indexes: `saves(user_id, status)`, `saves(week_key)`, `treats(to_user, status)`, `squad_members(user_id)`.

Idempotency: every award/update triggered by a confirmation runs in **one DB transaction**
keyed by `tx_hash`; re-running verification must not double-award (unique constraints).

## 2. API (Next.js route handlers, JSON)
Auth: JWT cookie `sprout_session` → `{ uid, demo }`. 401 if missing. Zod-validate every body.

### Auth
| Method | Path | Body → Response |
|---|---|---|
| POST | `/api/auth/challenge` | `{ purpose: 'signin'\|'link'\|'join' }` → `{ challenge, expiresAt }` |
| POST | `/api/auth/verify` | `{ challenge, publicKey, signature }` → `{ user, isNew }` + cookie |
| POST | `/api/auth/link` | `{ challenge, publicKey, signature }` (auth) → `{ addresses }` |
| POST | `/api/auth/logout` | → 204, clears cookie |

### Me & pet
| GET | `/api/me` | → `{ user, pet, streak, week, sparks, badges, stake: StakeSummary, mood inputs, earnedDelta }` |
| PATCH | `/api/pet` | `{ name?, equip?: { slot, itemId\|null } }` → `{ pet }` |
| PATCH | `/api/me/goal` | `{ weeklyGoalLuna }` → applies next week |
| POST | `/api/me/visit` | → `{ earnedDeltaLuna }` (updates `earned_at_last_visit`) |

### Saves
| POST | `/api/saves` | `{ txHash, kind, valueLuna }` → `{ id, status: 'pending' }` |
| GET | `/api/saves/:id` | runs verification if pending → `{ status, result?: { stageBefore, stageAfter, weekKept, streak, sparksAwarded, badgesEarned } }` |
| POST | `/api/saves/recover` | `{ valueLuna, sinceMs }` → searches recent txs for an unknown-outcome save → `{ found, saveId? }` |

### Stake
| GET | `/api/stake` | → `{ activeLuna, inactiveLuna, retiredLuna, inactiveRelease, currentBlock, delegation, pool, earnedLuna\|null, planted }` |
| GET | `/api/validators` | → cached list mapped to `{ address, name, logo, feePct, payout: 'restake'\|'direct'\|'none', score, active, recommended }` |
| POST | `/api/withdrawals` | `{ txHash, step, valueLuna }` → pending; `GET /api/withdrawals/:id` verifies |

### Squads & treats
| POST | `/api/squads` | `{ name }` → `{ squad, inviteCode, inviteUrl }` |
| GET | `/api/squads` | my squads |
| GET | `/api/squads/:id` | members with pet, week status, streaks; squad streak |
| GET | `/api/squads/by-code/:code` | public preview (name, member count, avatars) |
| POST | `/api/squads/join` | `{ code }` → `{ squad }` |
| DELETE | `/api/squads/:id/members/:userId` | admin remove / self leave |
| POST | `/api/treats` | `{ squadId, toUserId, txHash, valueLuna, note? }` → pending; `GET /api/treats/:id` verifies |
| GET | `/api/treats/inbox` | received treats (confirmed) |
| POST | `/api/treats/:id/thanks` | → 204 |
| POST | `/api/treats/:id/plant` | `{ txHash }` (the add-stake tx) → creates `treat_plant` save |

### Social & misc
| GET | `/api/leaderboard?scope=global\|squad&squadId=` | → `{ rows: [{ rank, name, petStage, consistencyPct, streak, isMe }] }` |
| GET | `/api/shop` / POST `/api/shop/buy` `{ itemId }` | Sparks spend (server checks balance) |
| GET | `/api/share/:kind/:userId` | PNG (next/og) |
| GET | `/api/proof` | public: latest 100 confirmed saves `{ petName, valueLuna, at, txHash }` + totals |
| GET | `/api/health` | DB + RPC reachability |
| ALL | `/api/demo/*` | demo-only helpers: fast-forward, simulate treat, simulate rewards (reject unless session.demo) |

## 3. Verification service (server)
`src/server/verify.ts`
```ts
verifySave(save): Promise<'pending'|'confirmed'|'failed'|'needs_link'>
verifyTreat(treat): …
verifyWithdrawal(w): …
recompute(userId, weekKey): updates weeks, streaks, squad_weeks, pets.stage, sparks, badges (single tx)
```
Rules in `03-NIMIQ-INTEGRATION.md` §8. Timeouts: a save still not found after 30 minutes → `failed` with reason `not_found` (user can retry).

## 4. Chain client (server)
```ts
// src/lib/nimiq/chain.ts
const ALLOWED = ['getTransactionByHash','getTransactionsByAddress','getStakerByAddress','getBlockNumber','getAccountByAddress'] as const
async function rpc<T>(method: typeof ALLOWED[number], params: unknown[]): Promise<T> {
  const res = await fetch(env.NIMIQ_RPC_URL, { method: 'POST', headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }) })
  const json = await res.json()
  if (json.error) throw new RpcError(json.error)
  return (json.result?.data ?? json.result) as T
}
```
Cache `getStakerByAddress` per address for 20s in `staker_cache`. Add a second RPC URL as fallback (`NIMIQ_RPC_URL_FALLBACK`).
