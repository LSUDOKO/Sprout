import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { squads } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { inviteUrl, requireMember, squadView } from '@/lib/server/squads'

type P = { params: Promise<{ id: string }> }

export const GET = handle(async (_req: Request, ctx: P) => {
  const { id } = await ctx.params
  const { db, user, now } = await requireUser()
  await requireMember(db, id, user.id)
  const v = await squadView(db, id, user.id, now)
  return json({ squad: { ...v, inviteUrl: inviteUrl(v.inviteCode) } })
})

// Admin rename.
export const PATCH = handle(async (req: Request, ctx: P) => {
  const { id } = await ctx.params
  const { db, user, now } = await requireUser()
  const m = await requireMember(db, id, user.id)
  if (m.role !== 'admin') throw new ApiError(403, 'admin_only')
  const { name } = await body(req, z.object({ name: z.string().trim().min(1).max(32) }))
  await db.update(squads).set({ name }).where(and(eq(squads.id, id)))
  return json({ squad: await squadView(db, id, user.id, now) })
})
