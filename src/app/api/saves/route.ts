import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { saves } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { id } from '@/lib/server/ids'
import { rateLimit } from '@/lib/server/rateLimit'
import { fromWire } from '@/lib/nimiq/luna'

const schema = z.object({
  txHash: z.string().regex(/^(0x)?[0-9a-fA-F]{64}$/),
  kind: z.enum(['plant', 'feed']),
  valueLuna: z.string().regex(/^\d+$/),
})

// Register a tx hash the moment the wallet returns it. It is NOT a save until verified on chain.
export const POST = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  await rateLimit(db, `saves:${user.id}`, 30)
  const b = await body(req, schema)
  const txHash = b.txHash.replace(/^0x/, '').toLowerCase()
  const value = fromWire(b.valueLuna)
  if (value <= 0n) throw new ApiError(400, 'bad_value')
  const [dup] = await db.select().from(saves).where(eq(saves.txHash, txHash))
  if (dup) {
    if (dup.userId !== user.id) throw new ApiError(409, 'tx_already_claimed')
    return json({ id: dup.id, status: dup.status })
  }
  const sid = id()
  await db.insert(saves).values({ id: sid, userId: user.id, txHash, kind: b.kind, valueLuna: value, status: 'pending', createdAt: new Date(now) })
  return json({ id: sid, status: 'pending' }, { status: 201 })
})
