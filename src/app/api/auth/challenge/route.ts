import { z } from 'zod'
import { getDb } from '@/lib/db'
import { authChallenges } from '@/lib/db/schema'
import { getSession } from '@/lib/auth/session'
import { body, clientIp, handle, json, ApiError } from '@/lib/server/api'
import { id, nonce } from '@/lib/server/ids'
import { rateLimit } from '@/lib/server/rateLimit'

const LABEL = { signin: 'Sprout sign-in', link: 'Sprout link address', join: 'Sprout join squad' } as const
const TTL_MS = 5 * 60_000

export const POST = handle(async (req: Request) => {
  const { purpose } = await body(req, z.object({ purpose: z.enum(['signin', 'link', 'join']) }))
  const db = await getDb()
  await rateLimit(db, `challenge:${clientIp(req)}`, 10)
  const session = purpose === 'signin' ? null : await getSession()
  if (purpose !== 'signin' && !session) throw new ApiError(401, 'unauthorized')
  const issued = new Date()
  // ASCII only: character length == byte length, so the signed prefix is unambiguous.
  const challenge = `${LABEL[purpose]}\nNonce: ${nonce()}\nIssued: ${issued.toISOString()}`
  const expiresAt = new Date(issued.getTime() + TTL_MS)
  await db.insert(authChallenges).values({ id: id(), challenge, purpose, userId: session?.uid ?? null, ip: clientIp(req), createdAt: issued, expiresAt })
  return json({ challenge, expiresAt: expiresAt.getTime() })
})
