import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { treats } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { id } from '@/lib/server/ids'
import { rateLimit } from '@/lib/server/rateLimit'
import { requireMember } from '@/lib/server/squads'
import { TREAT } from '@/lib/game/config'
import { fromWire } from '@/lib/nimiq/luna'

const schema = z.object({
  squadId: z.string().min(1).max(10),
  toUserId: z.string().min(1),
  txHash: z.string().regex(/^(0x)?[0-9a-fA-F]{64}$/),
  valueLuna: z.string().regex(/^\d+$/),
  // The thank-you note lives in Sprout's DB only, never on chain.
  note: z.string().trim().max(TREAT.noteMax).optional(),
})

export const POST = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  await rateLimit(db, `treats:${user.id}`, 30)
  const b = await body(req, schema)
  if (b.toUserId === user.id) throw new ApiError(400, 'self_treat', "You can't send a treat to yourself")
  await requireMember(db, b.squadId, user.id)
  await requireMember(db, b.squadId, b.toUserId)
  const value = fromWire(b.valueLuna)
  if (value < TREAT.minLuna) throw new ApiError(400, 'below_min', 'Treats are at least 1 NIM')
  const txHash = b.txHash.replace(/^0x/, '').toLowerCase()
  const [dup] = await db.select().from(treats).where(eq(treats.txHash, txHash))
  if (dup) return json({ id: dup.id, status: dup.status })
  const tid = id()
  await db.insert(treats).values({ id: tid, squadId: b.squadId, fromUser: user.id, toUser: b.toUserId, txHash, valueLuna: value, note: b.note || null, createdAt: new Date(now) })
  return json({ id: tid, status: 'pending' }, { status: 201 })
})
