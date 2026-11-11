import { eq } from 'drizzle-orm'
import { users } from '@/lib/db/schema'
import { handle, json, requireUser } from '@/lib/server/api'
import { earnedFor, readTotals } from '@/lib/server/account'
import { badges } from '@/lib/db/schema'
import { chainFor, linkedAddresses } from '@/lib/server/verify'

// "While you slept, Sprout grew": compare proven earnings with the last visit (docs/04 §10).
export const POST = handle(async () => {
  const { db, user, now } = await requireUser()
  const { totals, stale } = await readTotals(db, chainFor(db, user, now), await linkedAddresses(db, user.id))
  const earned = stale ? null : await earnedFor(db, user, totals)
  if (earned === null) return json({ earnedDeltaLuna: null })
  const prev = user.earnedAtLastVisitLuna
  const delta = prev === null ? 0n : earned - prev
  await db.update(users).set({ earnedAtLastVisitLuna: earned }).where(eq(users.id, user.id))
  if (earned > 0n) await db.insert(badges).values({ userId: user.id, badgeId: 'grew_overnight' }).onConflictDoNothing()
  return json({ earnedDeltaLuna: delta > 0n ? delta : 0n, earnedLuna: earned })
})
