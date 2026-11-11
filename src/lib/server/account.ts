// Stake summary, proven earnings and the /api/me snapshot.
import 'server-only'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import type { Db } from '../db'
import { badges, inventory, pets, saves, stakerCache, streaks, treats, users, weeks, withdrawals } from '../db/schema'
import { stakerTotals, type ChainReader } from '../nimiq/chain'
import { totalStake, type Staker } from '../nimiq/invariants'
import { poolByAddress } from '../nimiq/validators'
import { growth } from '../game/growth'
import { prevWeekKey, recentWeeks, weekKey, weekResetAt } from '../game/streak'
import { goalForWeek, sparksBalance } from './progress'
import type { User } from './api'

export type Totals = Staker & { addresses: string[] }

/**
 * Proven staking rewards (docs/03 §7):
 *   earned = currentTotal + totalRemoved − totalDeposited (+ direct payouts)
 * Returns null whenever an input is unknown — never an estimate.
 */
export async function earnedFor(db: Db, user: User, totals: Totals | null): Promise<bigint | null> {
  if (!totals) return null
  // Deposits are only fully known when Sprout created the staker.
  if (!user.stakerCreatedBySprout) return null
  if (!user.isDemo) {
    const pool = await poolByAddress(user.delegation)
    // Direct-payout pools pay to the wallet; their reward address is not known here.
    if (!pool || pool.payout !== 'restake') return null
  }
  const [dep] = await db
    .select({ s: sql<string>`coalesce(sum(${saves.valueLuna}), 0)` })
    .from(saves)
    .where(and(eq(saves.userId, user.id), eq(saves.status, 'confirmed')))
  const [rem] = await db
    .select({ s: sql<string>`coalesce(sum(${withdrawals.valueLuna}), 0)` })
    .from(withdrawals)
    .where(and(eq(withdrawals.userId, user.id), eq(withdrawals.status, 'confirmed'), eq(withdrawals.step, 'remove')))
  const earned = totalStake(totals) + BigInt(rem?.s ?? '0') - BigInt(dep?.s ?? '0')
  return earned < 0n ? 0n : earned
}

/** Live staker totals with a cache fallback when the chain is unreachable. */
export async function readTotals(db: Db, chain: ChainReader, addresses: string[]): Promise<{ totals: Totals | null; stale: boolean }> {
  try {
    const totals = await stakerTotals(chain, addresses)
    if (chain.kind === 'rpc') {
      for (const a of totals.addresses) {
        await db
          .insert(stakerCache)
          .values({ address: a, activeLuna: totals.activeLuna, inactiveLuna: totals.inactiveLuna, retiredLuna: totals.retiredLuna, inactiveRelease: totals.inactiveRelease, delegation: totals.delegation, fetchedAt: new Date() })
          .onConflictDoUpdate({ target: stakerCache.address, set: { activeLuna: totals.activeLuna, inactiveLuna: totals.inactiveLuna, retiredLuna: totals.retiredLuna, inactiveRelease: totals.inactiveRelease, delegation: totals.delegation, fetchedAt: new Date() } })
      }
    }
    return { totals, stale: false }
  } catch {
    if (!addresses.length) return { totals: null, stale: true }
    const rows = await db.select().from(stakerCache).where(inArray(stakerCache.address, addresses))
    if (!rows.length) return { totals: null, stale: true }
    const t: Totals = { activeLuna: 0n, inactiveLuna: 0n, retiredLuna: 0n, inactiveRelease: null, delegation: null, addresses: [] }
    for (const r of rows) {
      t.activeLuna += r.activeLuna
      t.inactiveLuna += r.inactiveLuna
      t.retiredLuna += r.retiredLuna
      t.inactiveRelease ??= r.inactiveRelease
      t.delegation ??= r.delegation
      t.addresses.push(r.address)
    }
    return { totals: t, stale: true }
  }
}

export async function meSnapshot(db: Db, user: User, chain: ChainReader, addresses: string[], now: number) {
  const [{ totals, stale }, block] = await Promise.all([readTotals(db, chain, addresses), chain.getBlockNumber().catch(() => null)])
  const [pet] = await db.select().from(pets).where(eq(pets.userId, user.id))
  const [st] = await db.select().from(streaks).where(eq(streaks.userId, user.id))
  const allWeeks = await db.select().from(weeks).where(eq(weeks.userId, user.id))
  const thisWeek = weekKey(now)
  const wk = allWeeks.find((w) => w.weekKey === thisWeek)
  const lastWk = allWeeks.find((w) => w.weekKey === prevWeekKey(thisWeek))
  const keptKeys = allWeeks.filter((w) => w.kept).map((w) => w.weekKey)
  const stake = totals ? totalStake(totals) : 0n
  const g = growth(stake, st?.keptTotal ?? 0)
  const earned = await earnedFor(db, user, totals)
  const [lastSave] = await db
    .select({ at: saves.confirmedAt })
    .from(saves)
    .where(and(eq(saves.userId, user.id), eq(saves.status, 'confirmed'), inArray(saves.kind, ['plant', 'feed'])))
    .orderBy(desc(saves.confirmedAt))
    .limit(1)
  const [lastTreat] = await db
    .select({ at: treats.confirmedAt })
    .from(treats)
    .where(and(eq(treats.toUser, user.id), eq(treats.status, 'confirmed')))
    .orderBy(desc(treats.confirmedAt))
    .limit(1)
  const [unseen] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(treats)
    .where(and(eq(treats.toUser, user.id), eq(treats.status, 'confirmed'), isNull(treats.seenAt)))
  const pending = await db
    .select({ id: saves.id, kind: saves.kind, valueLuna: saves.valueLuna, status: saves.status, createdAt: saves.createdAt })
    .from(saves)
    .where(and(eq(saves.userId, user.id), inArray(saves.status, ['pending', 'needs_link'])))
  const pendingWithdrawals = await db
    .select({ id: withdrawals.id, step: withdrawals.step, valueLuna: withdrawals.valueLuna, createdAt: withdrawals.createdAt })
    .from(withdrawals)
    .where(and(eq(withdrawals.userId, user.id), eq(withdrawals.status, 'pending')))
  const owned = await db.select({ itemId: inventory.itemId }).from(inventory).where(eq(inventory.userId, user.id))
  const myBadges = await db.select({ id: badges.badgeId, at: badges.earnedAt }).from(badges).where(eq(badges.userId, user.id))
  const pool = await poolByAddress(totals?.delegation ?? user.delegation)
  const [saveCount] = await db.select({ n: sql<number>`count(*)::int` }).from(saves).where(and(eq(saves.userId, user.id), eq(saves.status, 'confirmed')))

  return {
    now,
    network: user.isDemo ? 'demo' : process.env.NEXT_PUBLIC_NIMIQ_NETWORK ?? 'mainnet',
    user: {
      id: user.id,
      address: user.primaryAddress,
      addresses,
      isDemo: user.isDemo,
      locale: user.locale,
      goalLuna: goalForWeek(user, thisWeek),
      nextGoalLuna: user.nextWeeklyGoalLuna,
      nextGoalWeek: user.nextGoalWeek,
      plantedAt: user.plantedAt?.getTime() ?? null,
    },
    pet: pet ? { name: pet.name, stage: g.stage, maxStage: pet.maxStage, hat: pet.hat, neck: pet.neck, face: pet.face, background: pet.background, effect: pet.effect } : null,
    growth: { ...g, next: g.next ? { id: g.next.id, minStake: g.next.minStake, minKept: g.next.minKept } : null },
    streak: { current: st?.current ?? 0, best: st?.best ?? 0, keptTotal: st?.keptTotal ?? 0, previous: st?.previous ?? 0 },
    week: { key: thisWeek, savedLuna: wk?.savedLuna ?? 0n, goalLuna: wk?.goalLuna ?? goalForWeek(user, thisWeek), kept: !!wk?.kept, resetAt: weekResetAt(now).getTime() },
    recentWeeks: recentWeeks(keptKeys, now, 8, user.firstPlantedWeek),
    moodInputs: {
      thisWeekKept: !!wk?.kept,
      lastWeekKept: !!lastWk?.kept,
      previousStreak: st?.previous ?? 0,
      lastSaveAt: lastSave?.at?.getTime() ?? null,
      lastTreatReceivedAt: lastTreat?.at?.getTime() ?? null,
    },
    stake: totals
      ? {
          activeLuna: totals.activeLuna,
          inactiveLuna: totals.inactiveLuna,
          retiredLuna: totals.retiredLuna,
          totalLuna: stake,
          inactiveRelease: totals.inactiveRelease,
          delegation: totals.delegation,
          hasStaker: totals.delegation !== null || stake > 0n,
          planted: g.planted,
          earnedLuna: earned,
          stale,
        }
      : null,
    chainOk: !!totals && !stale,
    currentBlock: block,
    pool,
    sparks: await sparksBalance(db, user.id),
    badges: myBadges.map((b) => ({ id: b.id, at: b.at.getTime() })),
    inventory: owned.map((o) => o.itemId),
    pendingSaves: pending,
    pendingWithdrawals,
    unseenTreats: Number(unseen?.n ?? 0),
    savesCount: Number(saveCount?.n ?? 0),
  }
}

export type MeSnapshot = Awaited<ReturnType<typeof meSnapshot>>

export async function userById(db: Db, id: string) {
  const [u] = await db.select().from(users).where(eq(users.id, id))
  return u ?? null
}
