import { and, eq, sql } from 'drizzle-orm'
import { squadMembers, squads } from '@/lib/db/schema'
import { ApiError, handle, requireUser } from '@/lib/server/api'
import { requireMember } from '@/lib/server/squads'

// Admin removes a member, or a member leaves. Leaving keeps your own progress.
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ id: string; userId: string }> }) => {
  const { id, userId } = await ctx.params
  const { db, user } = await requireUser()
  const me = await requireMember(db, id, user.id)
  if (userId !== user.id && me.role !== 'admin') throw new ApiError(403, 'admin_only')
  await db.delete(squadMembers).where(and(eq(squadMembers.squadId, id), eq(squadMembers.userId, userId)))
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(squadMembers).where(eq(squadMembers.squadId, id))
  if (Number(n) === 0) await db.delete(squads).where(eq(squads.id, id))
  else if (me.role === 'admin' && userId === user.id) {
    // hand admin to the longest-standing member
    const [next] = await db.select().from(squadMembers).where(eq(squadMembers.squadId, id)).orderBy(squadMembers.joinedAt).limit(1)
    if (next) await db.update(squadMembers).set({ role: 'admin' }).where(and(eq(squadMembers.squadId, id), eq(squadMembers.userId, next.userId)))
  }
  return new Response(null, { status: 204 })
})
