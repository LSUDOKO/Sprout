import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { saves } from '@/lib/db/schema'
import { body, handle, json, requireUser } from '@/lib/server/api'
import { id } from '@/lib/server/ids'
import { sameAddress, stakingContract } from '@/lib/nimiq/chain'
import { fromWire } from '@/lib/nimiq/luna'
import { RETRYABLE_FAILS, chainFor, linkedAddresses } from '@/lib/server/verify'

const LOOKBACK_MAX_MS = 24 * 3600_000

// Unknown outcome without a hash: look for a matching staking tx before allowing another attempt (docs/03 §8).
export const POST = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  const b = await body(req, z.object({ valueLuna: z.string().regex(/^\d+$/), sinceMs: z.number().int().positive(), kind: z.enum(['plant', 'feed']) }))
  const value = fromWire(b.valueLuna)
  // Look back from when the attempt started (the app may have been closed for a while), capped at 24h.
  const since = Math.max(b.sinceMs, now - LOOKBACK_MAX_MS) - 60_000
  const chain = chainFor(db, user, now)
  const addresses = await linkedAddresses(db, user.id)
  const txs = (await Promise.all(addresses.map((a) => chain.getTransactionsByAddress(a, 50)))).flat()
  const candidates = txs.filter((t) => sameAddress(t.to, stakingContract()) && t.value === value && t.timestamp >= since)
  if (!candidates.length) return json({ found: false })
  const hashes = candidates.map((c) => c.hash.toLowerCase())
  const known = await db.select().from(saves).where(inArray(saves.txHash, hashes))
  const fresh = candidates.find((c) => !known.some((k) => k.txHash === c.hash.toLowerCase()))
  if (fresh) {
    const sid = id()
    await db.insert(saves).values({ id: sid, userId: user.id, txHash: fresh.hash.toLowerCase(), kind: b.kind, valueLuna: value, status: 'pending', createdAt: new Date(now) })
    return json({ found: true, saveId: sid })
  }
  // A save of ours that failed only because the chain lagged: reopen it for verification.
  const retry = known.find((k) => k.userId === user.id && k.status === 'failed' && (RETRYABLE_FAILS as readonly string[]).includes(k.failReason ?? ''))
  if (retry) {
    await db.update(saves).set({ status: 'pending', failReason: null, createdAt: new Date(now) }).where(and(eq(saves.id, retry.id), eq(saves.status, 'failed')))
    return json({ found: true, saveId: retry.id })
  }
  return json({ found: false })
})
