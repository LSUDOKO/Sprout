import { and, eq, inArray, isNotNull, or } from 'drizzle-orm'
import { pets, squadMembers, streaks, users } from '@/lib/db/schema'
import { ApiError, handle, json, requireUser } from '@/lib/server/api'
import { keptWeeksByUser } from '@/lib/server/progress'
import { requireMember } from '@/lib/server/squads'
import { rank } from '@/lib/game/leaderboard'
import { LEADERBOARD } from '@/lib/game/config'

// Ranked by consistency, never by amount (docs/04 §9).
export const GET = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') === 'squad' ? 'squad' : 'global'
  let ids: string[]
  if (scope === 'squad') {
    const squadId = url.searchParams.get('squadId')
    if (!squadId) throw new ApiError(400, 'squad_required')
    await requireMember(db, squadId, user.id)
    ids = (await db.select({ u: squadMembers.userId }).from(squadMembers).where(eq(squadMembers.squadId, squadId))).map((r) => r.u)
  } else {
    // Demo visitors see only their own seeded world; real users see real users.
    const where = user.isDemo ? or(eq(users.id, user.id), eq(users.demoOwnerId, user.id)) : and(eq(users.isDemo, false), isNotNull(users.firstPlantedWeek))
    ids = (await db.select({ id: users.id }).from(users).where(where)).map((r) => r.id)
  }
  if (!ids.length) return json({ rows: [], me: null })
  const base = await db
    .select({ userId: users.id, firstPlantedWeek: users.firstPlantedWeek, plantedAt: users.plantedAt, name: pets.name, stage: pets.stage, hat: pets.hat, neck: pets.neck, face: pets.face, current: streaks.current })
    .from(users)
    .leftJoin(pets, eq(pets.userId, users.id))
    .leftJoin(streaks, eq(streaks.userId, users.id))
    .where(inArray(users.id, ids))
  const kept = await keptWeeksByUser(db, ids)
  const ranked = rank(
    base.map((b) => ({ ...b, plantedAt: b.plantedAt?.getTime() ?? null, keptWeeks: kept.get(b.userId) ?? [], currentStreak: b.current ?? 0 })),
    now,
  )
  const rows = ranked.slice(0, LEADERBOARD.globalLimit).map((r) => ({
    rank: r.rank,
    userId: r.userId,
    name: r.name ?? 'Seed',
    petStage: r.stage ?? 'seed',
    cosmetics: { hat: r.hat, neck: r.neck, face: r.face },
    consistencyPct: r.consistencyPct,
    streak: r.currentStreak,
    isMe: r.userId === user.id,
  }))
  const me = ranked.find((r) => r.userId === user.id)
  return json({ rows, me: me ? { rank: me.rank, consistencyPct: me.consistencyPct } : null, minWeeks: LEADERBOARD.minEligibleWeeks })
})
