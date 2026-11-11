import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { saves, treats } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { id as newId } from '@/lib/server/ids'

// "Plant it": the recipient adds the treat to their own stake (add-stake tx), recorded as a treat_plant save.
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params
  const { db, user, now } = await requireUser()
  const { txHash: raw } = await body(req, z.object({ txHash: z.string().regex(/^(0x)?[0-9a-fA-F]{64}$/) }))
  const txHash = raw.replace(/^0x/, '').toLowerCase()
  const [t] = await db.select().from(treats).where(and(eq(treats.id, id), eq(treats.toUser, user.id), eq(treats.status, 'confirmed')))
  if (!t) throw new ApiError(404, 'not_found')
  if (t.plantedSaveId) {
    const [s] = await db.select().from(saves).where(eq(saves.id, t.plantedSaveId))
    if (s && s.status !== 'failed') return json({ saveId: s.id, status: s.status })
  }
  const [dup] = await db.select().from(saves).where(eq(saves.txHash, txHash))
  if (dup) throw new ApiError(409, 'tx_already_claimed')
  const sid = newId()
  await db.insert(saves).values({ id: sid, userId: user.id, txHash, kind: 'treat_plant', valueLuna: t.valueLuna, createdAt: new Date(now) })
  await db.update(treats).set({ plantedSaveId: sid, seenAt: t.seenAt ?? new Date(now) }).where(eq(treats.id, t.id))
  return json({ saveId: sid, status: 'pending' }, { status: 201 })
})
