import { handle, json } from '@/lib/server/api'
import { requireDemo } from '@/lib/server/demoGuard'
import { fastForward } from '@/lib/server/demo'
import { recompute } from '@/lib/server/progress'
import { totalStake } from '@/lib/nimiq/invariants'
import { stakerTotals } from '@/lib/nimiq/chain'
import { chainFor, linkedAddresses } from '@/lib/server/verify'

export const POST = handle(async () => {
  const { db, user } = await requireDemo()
  const now = await fastForward(db, user)
  // Streak, mood and leaderboards are recomputed for the new demo week.
  const totals = await stakerTotals(chainFor(db, user, now), await linkedAddresses(db, user.id))
  const result = await recompute(db, user.id, now, { stakeLuna: totalStake(totals) })
  return json({ now, result })
})
