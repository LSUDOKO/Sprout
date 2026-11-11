import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { squadMembers, squads } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { SQUAD } from '@/lib/game/config'
import { squadView } from '@/lib/server/squads'

export const POST = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  const { code } = await body(req, z.object({ code: z.string().trim().min(4).max(12) }))
  const [squad] = await db.select().from(squads).where(eq(squads.inviteCode, code.toUpperCase()))
  if (!squad) throw new ApiError(404, 'not_found', 'This invite code does not exist')
  if (squad.isDemo !== user.isDemo) throw new ApiError(403, 'namespace_mismatch', 'Demo squads are only for the demo')
  const [already] = await db.select().from(squadMembers).where(and(eq(squadMembers.squadId, squad.id), eq(squadMembers.userId, user.id)))
  if (!already) {
    const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(squadMembers).where(eq(squadMembers.squadId, squad.id))
    if (Number(n) >= SQUAD.maxMembers) throw new ApiError(409, 'squad_full', `Squads have at most ${SQUAD.maxMembers} members`)
    await db.insert(squadMembers).values({ squadId: squad.id, userId: user.id, role: 'member', joinedAt: new Date(now) })
  }
  return json({ squad: await squadView(db, squad.id, user.id, now) })
})
