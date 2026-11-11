import { and, eq } from 'drizzle-orm'
import { treats } from '@/lib/db/schema'
import { handle, requireUser } from '@/lib/server/api'

// In-app thank-you, no transaction.
export const POST = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const { db, user } = await requireUser()
  await db.update(treats).set({ thanked: true, seenAt: new Date() }).where(and(eq(treats.id, id), eq(treats.toUser, user.id), eq(treats.status, 'confirmed')))
  return new Response(null, { status: 204 })
})
