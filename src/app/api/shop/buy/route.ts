import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { inventory, sparksLedger } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { sparksBalance } from '@/lib/server/progress'
import { canBuy, itemById } from '@/lib/game/cosmetics'
import { id } from '@/lib/server/ids'

// Spending Sparks: balance check and ledger write in one transaction (no double spend).
export const POST = handle(async (req: Request) => {
  const { user } = await requireUser()
  const { itemId } = await body(req, z.object({ itemId: z.string() }))
  const db = await getDb()
  const result = await db.transaction(async (tx) => {
    const owned = (await tx.select({ i: inventory.itemId }).from(inventory).where(eq(inventory.userId, user.id))).map((r) => r.i)
    const balance = await sparksBalance(tx, user.id)
    const c = canBuy(itemId, balance, owned)
    if (!c.ok) throw new ApiError(400, c.reason, c.reason === 'sparks' ? 'Not enough Sparks yet' : c.reason === 'owned' ? 'You already own this' : 'Unknown item')
    const item = itemById(itemId)!
    await tx.insert(inventory).values({ userId: user.id, itemId })
    await tx.insert(sparksLedger).values({ id: id(), userId: user.id, delta: -item.price, reason: 'shop', ref: itemId })
    return balance - item.price
  })
  return json({ sparks: result, itemId })
})
