import { z } from 'zod'
import { inArray } from 'drizzle-orm'
import { saves } from '@/lib/db/schema'
import { body, handle, json, requireUser } from '@/lib/server/api'
import { id } from '@/lib/server/ids'
import { sameAddress, stakingContract } from '@/lib/nimiq/chain'
import { fromWire } from '@/lib/nimiq/luna'
import { chainFor, linkedAddresses } from '@/lib/server/verify'

// Unknown outcome without a hash: look for a matching staking tx before allowing another attempt (docs/03 §8).
export const POST = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  const b = await body(req, z.object({ valueLuna: z.string().regex(/^\d+$/), sinceMs: z.number().int().positive(), kind: z.enum(['plant', 'feed']) }))
  const value = fromWire(b.valueLuna)
  const since = Math.max(b.sinceMs, now - 10 * 60_000) - 60_000
  const chain = chainFor(db, user, now)
  const addresses = await linkedAddresses(db, user.id)
  const txs = (await Promise.all(addresses.map((a) => chain.getTransactionsByAddress(a, 25)))).flat()
  const candidates = txs.filter((t) => sameAddress(t.to, stakingContract()) && t.value === value && t.timestamp >= since)
  if (!candidates.length) return json({ found: false })
  const known = new Set((await db.select({ h: saves.txHash }).from(saves).where(inArray(saves.txHash, candidates.map((c) => c.hash.toLowerCase())))).map((r) => r.h))
  const tx = candidates.find((c) => !known.has(c.hash.toLowerCase()))
  if (!tx) return json({ found: false })
  const sid = id()
  await db.insert(saves).values({ id: sid, userId: user.id, txHash: tx.hash.toLowerCase(), kind: b.kind, valueLuna: value, status: 'pending', createdAt: new Date(now) })
  return json({ found: true, saveId: sid })
})
