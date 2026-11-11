import { ApiError, handle, json, requireUser } from '@/lib/server/api'
import { verifyTreatById } from '@/lib/server/treats'

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const { db, user } = await requireUser()
  try {
    const { treat, status } = await verifyTreatById(db, id)
    if (treat.fromUser !== user.id && treat.toUser !== user.id) throw new ApiError(404, 'not_found')
    return json({ status, valueLuna: treat.valueLuna })
  } catch (e) {
    if (e instanceof ApiError) throw e
    console.error('[verifyTreat]', e)
    return json({ status: 'pending', chainError: true })
  }
})
