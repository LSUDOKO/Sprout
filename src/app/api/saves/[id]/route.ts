import { and, eq } from 'drizzle-orm'
import { saves } from '@/lib/db/schema'
import { ApiError, handle, json, requireUser } from '@/lib/server/api'
import { verifySave } from '@/lib/server/verify'

// Polled by the client every few seconds; runs verification while pending.
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const { db, user, now } = await requireUser()
  const [save] = await db.select().from(saves).where(and(eq(saves.id, id), eq(saves.userId, user.id)))
  if (!save) throw new ApiError(404, 'not_found')
  try {
    const r = await verifySave(db, save, user, now)
    const [fresh] = await db.select().from(saves).where(eq(saves.id, id))
    return json({ status: r.status, result: r.result ?? null, failReason: fresh?.failReason ?? null, fromAddress: fresh?.fromAddress ?? null, valueLuna: save.valueLuna, kind: save.kind })
  } catch (e) {
    // Chain unreachable: stay pending, never guess.
    console.error('[verifySave]', e)
    return json({ status: 'pending', result: null, chainError: true, valueLuna: save.valueLuna, kind: save.kind })
  }
})
