import 'server-only'
import { eq } from 'drizzle-orm'
import type { Db } from '../db'
import { treats, users } from '../db/schema'
import { ApiError, nowFor } from './api'
import { verifyTreat } from './verify'

/** Verify a treat as its sender (verification checks the sender's linked addresses). */
export async function verifyTreatById(db: Db, treatId: string) {
  const [t] = await db.select().from(treats).where(eq(treats.id, treatId))
  if (!t) throw new ApiError(404, 'not_found')
  const [sender] = await db.select().from(users).where(eq(users.id, t.fromUser))
  if (!sender) throw new ApiError(404, 'not_found')
  return { treat: t, status: await verifyTreat(db, t, sender, nowFor(sender)) }
}
