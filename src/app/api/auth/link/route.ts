import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { userAddresses } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { consumeChallenge } from '@/lib/server/challenge'
import { linkedAddresses } from '@/lib/server/verify'

// Link an extra Nimiq Pay account by signing a fresh challenge from it (docs/03 §3.4).
export const POST = handle(async (req: Request) => {
  const { db, user } = await requireUser()
  const b = await body(req, z.object({ challenge: z.string().max(200), publicKey: z.string().regex(/^[0-9a-fA-F]{64}$/), signature: z.string().regex(/^[0-9a-fA-F]{128}$/) }))
  const { address, publicKey } = await consumeChallenge(db, { ...b, purpose: 'link', userId: user.id })
  const [existing] = await db.select().from(userAddresses).where(eq(userAddresses.address, address))
  if (existing && existing.userId !== user.id) throw new ApiError(409, 'address_taken', 'That address belongs to another Sprout account')
  if (!existing) await db.insert(userAddresses).values({ address, userId: user.id, publicKey })
  return json({ addresses: await linkedAddresses(db, user.id), linked: address })
})
