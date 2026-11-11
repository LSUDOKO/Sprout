import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { squadMembers, squads } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { inviteCode, shortId } from '@/lib/server/ids'
import { inviteUrl, squadView } from '@/lib/server/squads'

const name = z.string().trim().min(1).max(32)

export const POST = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  const b = await body(req, z.object({ name }))
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(squads).where(eq(squads.createdBy, user.id))
  if (Number(n) >= 10) throw new ApiError(400, 'too_many_squads', 'You can create up to 10 squads')
  const id = shortId()
  const code = inviteCode()
  await db.insert(squads).values({ id, name: b.name, inviteCode: code, createdBy: user.id, isDemo: user.isDemo, createdAt: new Date(now) })
  await db.insert(squadMembers).values({ squadId: id, userId: user.id, role: 'admin', joinedAt: new Date(now) })
  return json({ squad: await squadView(db, id, user.id, now), inviteCode: code, inviteUrl: inviteUrl(code) }, { status: 201 })
})

export const GET = handle(async () => {
  const { db, user, now } = await requireUser()
  const mine = await db.select({ id: squadMembers.squadId }).from(squadMembers).where(eq(squadMembers.userId, user.id))
  const views = await Promise.all(mine.map((m) => squadView(db, m.id, user.id, now)))
  return json({ squads: views.map((v) => ({ ...v, inviteUrl: inviteUrl(v.inviteCode) })) })
})
