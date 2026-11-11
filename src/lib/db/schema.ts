// Postgres schema (docs/06 §1). Money is bigint Luna (mode: 'bigint'), timestamps are timestamptz.
import { sql } from 'drizzle-orm'
import { bigint, boolean, check, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'

const luna = (name: string) => bigint(name, { mode: 'bigint' })
const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' })
const created = () => ts('created_at').notNull().defaultNow()

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  primaryAddress: text('primary_address').notNull(),
  createdAt: created(),
  isDemo: boolean('is_demo').notNull().default(false),
  locale: text('locale'),
  weeklyGoalLuna: luna('weekly_goal_luna').notNull().default(sql`50000000`),
  nextWeeklyGoalLuna: luna('next_weekly_goal_luna'),
  nextGoalWeek: text('next_goal_week'),
  earnedAtLastVisitLuna: luna('earned_at_last_visit_luna'),
  deviceIdHash: text('device_id_hash'),
  /** Demo only: fast-forward offset added to "now" for this user. */
  clockOffsetMs: bigint('clock_offset_ms', { mode: 'number' }).notNull().default(0),
  /** Pool chosen on the first save. */
  delegation: text('delegation'),
  firstPlantedWeek: text('first_planted_week'),
  plantedAt: ts('planted_at'),
  /** True when Sprout created the staker, so deposits are fully known and earnings are provable. */
  stakerCreatedBySprout: boolean('staker_created_by_sprout').notNull().default(false),
})

export const userAddresses = pgTable(
  'user_addresses',
  {
    address: text('address').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    publicKey: text('public_key').notNull(),
    linkedAt: created(),
  },
  (t) => [index('user_addresses_user_idx').on(t.userId)],
)

export const authChallenges = pgTable(
  'auth_challenges',
  {
    id: text('id').primaryKey(),
    challenge: text('challenge').notNull().unique(),
    purpose: text('purpose').notNull(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    ip: text('ip'),
    createdAt: created(),
    expiresAt: ts('expires_at').notNull(),
    usedAt: ts('used_at'),
  },
  (t) => [check('auth_challenges_purpose', sql`${t.purpose} in ('signin','link','join')`)],
)

export const pets = pgTable('pets', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  stage: text('stage').notNull().default('seed'),
  maxStage: text('max_stage').notNull().default('seed'),
  hat: text('hat'),
  neck: text('neck'),
  face: text('face'),
  background: text('background'),
  effect: text('effect'),
  updatedAt: created(),
})

export const stakerCache = pgTable('staker_cache', {
  address: text('address').primaryKey(),
  activeLuna: luna('active_luna').notNull(),
  inactiveLuna: luna('inactive_luna').notNull(),
  retiredLuna: luna('retired_luna').notNull(),
  inactiveRelease: integer('inactive_release'),
  delegation: text('delegation'),
  fetchedAt: ts('fetched_at').notNull(),
})

export const saves = pgTable(
  'saves',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    txHash: text('tx_hash').notNull().unique(),
    kind: text('kind').notNull(),
    valueLuna: luna('value_luna').notNull(),
    fromAddress: text('from_address'),
    status: text('status').notNull().default('pending'),
    blockNumber: integer('block_number'),
    weekKey: text('week_key'),
    createdAt: created(),
    confirmedAt: ts('confirmed_at'),
    failReason: text('fail_reason'),
    /** Celebration diff computed at confirmation, replayed to the client. */
    resultJson: text('result_json'),
  },
  (t) => [
    index('saves_user_status_idx').on(t.userId, t.status),
    index('saves_week_idx').on(t.weekKey),
    check('saves_kind', sql`${t.kind} in ('plant','feed','treat_plant')`),
    check('saves_status', sql`${t.status} in ('pending','confirmed','failed','needs_link')`),
  ],
)

export const withdrawals = pgTable(
  'withdrawals',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    step: text('step').notNull(),
    txHash: text('tx_hash').notNull().unique(),
    valueLuna: luna('value_luna').notNull(),
    status: text('status').notNull().default('pending'),
    failReason: text('fail_reason'),
    createdAt: created(),
    confirmedAt: ts('confirmed_at'),
  },
  (t) => [check('withdrawals_step', sql`${t.step} in ('deactivate','retire','remove')`)],
)

export const weeks = pgTable(
  'weeks',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    weekKey: text('week_key').notNull(),
    goalLuna: luna('goal_luna').notNull(),
    savedLuna: luna('saved_luna').notNull().default(sql`0`),
    kept: boolean('kept').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.weekKey] })],
)

export const streaks = pgTable('streaks', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  current: integer('current').notNull().default(0),
  best: integer('best').notNull().default(0),
  keptTotal: integer('kept_total').notNull().default(0),
  previous: integer('previous').notNull().default(0),
  lastKeptWeek: text('last_kept_week'),
})

export const squads = pgTable('squads', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  isDemo: boolean('is_demo').notNull().default(false),
  createdAt: created(),
})

export const squadMembers = pgTable(
  'squad_members',
  {
    squadId: text('squad_id').notNull().references(() => squads.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    joinedAt: created(),
  },
  (t) => [
    primaryKey({ columns: [t.squadId, t.userId] }),
    index('squad_members_user_idx').on(t.userId),
    check('squad_members_role', sql`${t.role} in ('admin','member')`),
  ],
)

export const squadWeeks = pgTable(
  'squad_weeks',
  {
    squadId: text('squad_id').notNull().references(() => squads.id, { onDelete: 'cascade' }),
    weekKey: text('week_key').notNull(),
    perfect: boolean('perfect').notNull(),
  },
  (t) => [primaryKey({ columns: [t.squadId, t.weekKey] })],
)

export const treats = pgTable(
  'treats',
  {
    id: text('id').primaryKey(),
    squadId: text('squad_id').notNull().references(() => squads.id, { onDelete: 'cascade' }),
    fromUser: text('from_user').notNull().references(() => users.id, { onDelete: 'cascade' }),
    toUser: text('to_user').notNull().references(() => users.id, { onDelete: 'cascade' }),
    txHash: text('tx_hash').notNull().unique(),
    valueLuna: luna('value_luna').notNull(),
    note: text('note'),
    status: text('status').notNull().default('pending'),
    failReason: text('fail_reason'),
    createdAt: created(),
    confirmedAt: ts('confirmed_at'),
    seenAt: ts('seen_at'),
    plantedSaveId: text('planted_save_id').references(() => saves.id),
    thanked: boolean('thanked').notNull().default(false),
  },
  (t) => [index('treats_to_status_idx').on(t.toUser, t.status)],
)

export const sparksLedger = pgTable(
  'sparks_ledger',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    delta: integer('delta').notNull(),
    reason: text('reason').notNull(),
    ref: text('ref').notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex('sparks_idempotent').on(t.userId, t.reason, t.ref)],
)

export const inventory = pgTable(
  'inventory',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),
    acquiredAt: created(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
)

export const badges = pgTable(
  'badges',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    badgeId: text('badge_id').notNull(),
    earnedAt: created(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
)

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: ts('window_start').notNull(),
  count: integer('count').notNull(),
})

// ---- Demo namespace (fake chain). Never read by production verification. ----

export const demoChainTxs = pgTable('demo_chain_txs', {
  hash: text('hash').primaryKey(),
  fromAddress: text('from_address').notNull(),
  toAddress: text('to_address').notNull(),
  valueLuna: luna('value_luna').notNull(),
  recipientData: text('recipient_data'),
  blockNumber: integer('block_number').notNull(),
  executed: boolean('executed').notNull().default(true),
  createdAt: created(),
})

export const demoStakers = pgTable('demo_stakers', {
  address: text('address').primaryKey(),
  activeLuna: luna('active_luna').notNull().default(sql`0`),
  inactiveLuna: luna('inactive_luna').notNull().default(sql`0`),
  retiredLuna: luna('retired_luna').notNull().default(sql`0`),
  inactiveRelease: integer('inactive_release'),
  delegation: text('delegation'),
})

export const demoBalances = pgTable('demo_balances', {
  address: text('address').primaryKey(),
  balanceLuna: luna('balance_luna').notNull(),
})
