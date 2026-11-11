import { and, eq, isNull } from 'drizzle-orm'
import { treats } from '@/lib/db/schema'
import { handle, requireUser } from '@/lib/server/api'

export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const { db, user } = await requireUser()
  await db.update(treats).set({ seenAt: new Date() }).where(and(eq(treats.id, id), eq(treats.toUser, user.id), isNull(treats.seenAt)))
  return new Response(null, { status: 204 })
})
