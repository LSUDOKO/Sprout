import { and, eq } from 'drizzle-orm'
import { withdrawals } from '@/lib/db/schema'
import { ApiError, handle, json, requireUser } from '@/lib/server/api'
import { verifyWithdrawal } from '@/lib/server/verify'

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const { db, user, now } = await requireUser()
  const [w] = await db.select().from(withdrawals).where(and(eq(withdrawals.id, id), eq(withdrawals.userId, user.id)))
  if (!w) throw new ApiError(404, 'not_found')
  try {
    const status = await verifyWithdrawal(db, w, user, now)
    const [fresh] = await db.select().from(withdrawals).where(eq(withdrawals.id, id))
    return json({ status, step: w.step, failReason: fresh?.failReason ?? null })
  } catch (e) {
    console.error('[verifyWithdrawal]', e)
    return json({ status: 'pending', step: w.step, chainError: true })
  }
})
