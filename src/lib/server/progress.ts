// recompute(): weeks, streaks, stage, sparks, badges, squad weeks — one DB transaction,
// idempotent (unique keys + ON CONFLICT DO NOTHING), driven by an injected `now`. (docs/06 §3)
import 'server-only'
import { and, eq, gte, inArray, sql } from 'drizzle-orm'
import type { Db, Tx } from '../db'
import { badges, pets, saves, sparksLedger, squadMembers, squadWeeks, squads, streaks, treats, users, weeks } from '../db/schema'
import { GOAL, type StageId } from '../game/config'
import { growth, stageIndex } from '../game/growth'
import { newBadges } from '../game/badges'
import { computeStreak, weekKey, weekKeyToDate } from '../game/streak'
import { evolutionAward, saveAward, squadPerfectAward, weekKeptAward, type SparkAward } from '../game/sparks'
import { id } from './ids'

export type RecomputeResult = {
  stageBefore: StageId
  stageAfter: StageId
  evolvedTo: StageId | null
  weekKept: boolean
  weekJustKept: boolean
  streak: number
  sparksAwarded: number
  badgesEarned: string[]
}

type DbLike = Db | Tx

/** Goal that applies to a given week: a scheduled goal change takes effect from its week on. */
export function goalForWeek(u: { weeklyGoalLuna: bigint; nextWeeklyGoalLuna: bigint | null; nextGoalWeek: string | null }, wk: string) {
  if (u.nextWeeklyGoalLuna !== null && u.nextGoalWeek && wk >= u.nextGoalWeek) return u.nextWeeklyGoalLuna
  return u.weeklyGoalLuna ?? GOAL.default
}

export async function award(db: DbLike, userId: string, a: SparkAward | null): Promise<number> {
  if (!a) return 0
  const r = await db.insert(sparksLedger).values({ id: id(), userId, delta: a.delta, reason: a.reason, ref: a.ref }).onConflictDoNothing().returning({ delta: sparksLedger.delta })
  return r[0]?.delta ?? 0
}

export async function sparksBalance(db: DbLike, userId: string) {
  const [r] = await db.select({ s: sql<number>`coalesce(sum(${sparksLedger.delta}), 0)::int` }).from(sparksLedger).where(eq(sparksLedger.userId, userId))
  return Number(r?.s ?? 0)
}

async function awardsToday(db: DbLike, userId: string, reason: string, now: number) {
  const dayStart = new Date(Math.floor(now / 86_400_000) * 86_400_000)
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(sparksLedger)
    .where(and(eq(sparksLedger.userId, userId), eq(sparksLedger.reason, reason), gte(sparksLedger.createdAt, dayStart)))
  return Number(r?.n ?? 0)
}

/** Kept weeks for many users at once (for squads / leaderboards). */
export async function keptWeeksByUser(db: DbLike, userIds: string[]) {
  const map = new Map<string, string[]>()
  if (!userIds.length) return map
  const rows = await db.select({ userId: weeks.userId, weekKey: weeks.weekKey }).from(weeks).where(and(inArray(weeks.userId, userIds), eq(weeks.kept, true)))
  for (const r of rows) map.set(r.userId, [...(map.get(r.userId) ?? []), r.weekKey])
  return map
}

/** A squad week is perfect when every member who joined before that week started kept it. */
export async function squadWeekPerfect(db: DbLike, squadId: string, wk: string): Promise<boolean> {
  const members = await db.select({ userId: squadMembers.userId, joinedAt: squadMembers.joinedAt }).from(squadMembers).where(eq(squadMembers.squadId, squadId))
  const wkStart = weekKeyToDate(wk).getTime()
  const eligible = members.filter((m) => m.joinedAt.getTime() < wkStart + 7 * 86_400_000).map((m) => m.userId)
  if (eligible.length < 2) return false
  const kept = await keptWeeksByUser(db, eligible)
  return eligible.every((u) => kept.get(u)?.includes(wk))
}

export async function recompute(db: Db, userId: string, now: number, opts: { stakeLuna: bigint; savedTxHash?: string; everEarned?: boolean }): Promise<RecomputeResult> {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId))
    if (!user) throw new Error('user not found')
    const [pet] = await tx.select().from(pets).where(eq(pets.userId, userId))
    const stageBefore = (pet?.stage ?? 'seed') as StageId
    const thisWeek = weekKey(now)

    // 1) Weeks: sum confirmed counting saves (plant + feed; planted treats don't count).
    const sums = await tx
      .select({ weekKey: saves.weekKey, total: sql<string>`sum(${saves.valueLuna})` })
      .from(saves)
      .where(and(eq(saves.userId, userId), eq(saves.status, 'confirmed'), inArray(saves.kind, ['plant', 'feed'])))
      .groupBy(saves.weekKey)
    const existing = await tx.select().from(weeks).where(eq(weeks.userId, userId))
    const before = new Map(existing.map((w) => [w.weekKey, w]))
    const newlyKept: string[] = []
    for (const s of sums) {
      if (!s.weekKey) continue
      const saved = BigInt(s.total ?? '0')
      const goal = before.get(s.weekKey)?.goalLuna ?? goalForWeek(user, s.weekKey)
      const kept = saved >= goal
      if (kept && !before.get(s.weekKey)?.kept) newlyKept.push(s.weekKey)
      await tx
        .insert(weeks)
        .values({ userId, weekKey: s.weekKey, goalLuna: goal, savedLuna: saved, kept })
        .onConflictDoUpdate({ target: [weeks.userId, weeks.weekKey], set: { savedLuna: saved, kept } })
    }

    // 2) Streak from all kept weeks.
    const keptRows = await tx.select({ weekKey: weeks.weekKey }).from(weeks).where(and(eq(weeks.userId, userId), eq(weeks.kept, true)))
    const st = computeStreak(keptRows.map((r) => r.weekKey), now)
    await tx
      .insert(streaks)
      .values({ userId, ...st })
      .onConflictDoUpdate({ target: streaks.userId, set: { current: st.current, best: st.best, keptTotal: st.keptTotal, previous: st.previous, lastKeptWeek: st.lastKeptWeek } })

    // 3) Stage from verified stake + total kept weeks.
    const g = growth(opts.stakeLuna, st.keptTotal)
    const maxStage = (pet?.maxStage ?? 'seed') as StageId
    const evolvedTo = stageIndex(g.stage) > stageIndex(maxStage) ? g.stage : null
    if (pet) {
      await tx
        .update(pets)
        .set({ stage: g.stage, maxStage: evolvedTo ?? maxStage, updatedAt: new Date(now) })
        .where(eq(pets.userId, userId))
    }

    // 4) Sparks (idempotent by (reason, ref)).
    let sparksAwarded = 0
    if (opts.savedTxHash) sparksAwarded += await award(tx, userId, saveAward(await awardsToday(tx, userId, 'save', now), opts.savedTxHash))
    const keptList = keptRows.map((r) => r.weekKey)
    const streakAt = (wk: string, inclusive: boolean) => computeStreak(keptList.filter((k) => (inclusive ? k <= wk : k < wk)), weekKeyToDate(wk).getTime())
    for (const wk of newlyKept) sparksAwarded += await award(tx, userId, weekKeptAward(streakAt(wk, true).current, wk))
    if (evolvedTo) {
      // award every stage passed (e.g. seed → bloom in one go awards sprout and bloom)
      for (let i = stageIndex(maxStage) + 1; i <= stageIndex(evolvedTo); i++) {
        const sid = (['seed', 'sprout', 'bloom', 'grove'] as const)[i]!
        sparksAwarded += await award(tx, userId, evolutionAward(sid))
      }
    }

    // 5) Squad weeks: when this user's week is newly kept, the squad might be perfect now.
    const mySquads = await tx.select({ squadId: squadMembers.squadId }).from(squadMembers).where(eq(squadMembers.userId, userId))
    let perfectSquadWeek = false
    for (const { squadId } of mySquads) {
      for (const wk of newlyKept) {
        if (!(await squadWeekPerfect(tx, squadId, wk))) continue
        perfectSquadWeek = true
        await tx.insert(squadWeeks).values({ squadId, weekKey: wk, perfect: true }).onConflictDoUpdate({ target: [squadWeeks.squadId, squadWeeks.weekKey], set: { perfect: true } })
        // Only members who were in the squad that week share the award.
        const weekEnd = weekKeyToDate(wk).getTime() + 7 * 86_400_000
        const members = (await tx.select({ userId: squadMembers.userId, joinedAt: squadMembers.joinedAt }).from(squadMembers).where(eq(squadMembers.squadId, squadId))).filter((m) => m.joinedAt.getTime() < weekEnd)
        for (const m of members) {
          const d = await award(tx, m.userId, squadPerfectAward(squadId, wk))
          if (m.userId === userId) sparksAwarded += d
          await tx.insert(badges).values({ userId: m.userId, badgeId: 'perfect_squad' }).onConflictDoNothing()
        }
      }
    }
    if (!perfectSquadWeek) {
      const [p] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(squadWeeks)
        .innerJoin(squadMembers, eq(squadMembers.squadId, squadWeeks.squadId))
        .where(and(eq(squadMembers.userId, userId), eq(squadWeeks.perfect, true)))
      perfectSquadWeek = Number(p?.n ?? 0) > 0
    }

    // 6) Badges (never removed).
    const [founded] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(squads)
      .where(and(eq(squads.createdBy, userId), sql`(select count(*) from ${squadMembers} sm where sm.squad_id = ${squads.id}) >= 3`))
    const [sent] = await tx.select({ n: sql<number>`count(*)::int` }).from(treats).where(and(eq(treats.fromUser, userId), eq(treats.status, 'confirmed')))
    const owned = (await tx.select({ b: badges.badgeId }).from(badges).where(eq(badges.userId, userId))).map((r) => r.b)
    // Comeback: a week kept right after a broken streak of ≥ 2.
    const comebackWeek = newlyKept.some((wk) => {
      const b = streakAt(wk, false)
      return b.current === 0 && b.previous >= 2
    })
    const earned = newBadges(
      {
        stakeLuna: opts.stakeLuna,
        keptTotal: st.keptTotal,
        currentStreak: st.current,
        stage: evolvedTo ?? maxStage,
        everEarned: !!opts.everEarned,
        foundedSquadWith3: Number(founded?.n ?? 0) > 0,
        perfectSquadWeek,
        treatsSent: Number(sent?.n ?? 0),
        comebackWeek,
      },
      owned,
    )
    for (const b of earned) await tx.insert(badges).values({ userId, badgeId: b, earnedAt: new Date(now) }).onConflictDoNothing()

    const thisWeekRow = await tx.select().from(weeks).where(and(eq(weeks.userId, userId), eq(weeks.weekKey, thisWeek)))
    return {
      stageBefore,
      stageAfter: g.stage,
      evolvedTo,
      weekKept: !!thisWeekRow[0]?.kept,
      weekJustKept: newlyKept.includes(thisWeek),
      streak: st.current,
      sparksAwarded,
      badgesEarned: earned,
    }
  })
}
