import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { withdrawals } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { id } from '@/lib/server/ids'
import { rateLimit } from '@/lib/server/rateLimit'
import { fromWire } from '@/lib/nimiq/luna'

export const POST = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  await rateLimit(db, `withdrawals:${user.id}`, 30)
  const b = await body(req, z.object({ txHash: z.string().regex(/^(0x)?[0-9a-fA-F]{64}$/), step: z.enum(['deactivate', 'retire', 'remove']), valueLuna: z.string().regex(/^\d+$/) }))
  const txHash = b.txHash.replace(/^0x/, '').toLowerCase()
  const [dup] = await db.select().from(withdrawals).where(eq(withdrawals.txHash, txHash))
  if (dup) {
    if (dup.userId !== user.id) throw new ApiError(409, 'tx_already_claimed')
    return json({ id: dup.id, status: dup.status })
  }
  const wid = id()
  await db.insert(withdrawals).values({ id: wid, userId: user.id, step: b.step, txHash, valueLuna: fromWire(b.valueLuna), createdAt: new Date(now) })
  return json({ id: wid, status: 'pending' }, { status: 201 })
})
