import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { pets, userAddresses, users } from '@/lib/db/schema'
import { setSessionCookie } from '@/lib/auth/session'
import { ApiError, body, handle, json } from '@/lib/server/api'
import { consumeChallenge } from '@/lib/server/challenge'
import { id } from '@/lib/server/ids'
import { seedDemo } from '@/lib/server/demo'
import { env } from '@/lib/env'

const schema = z.object({
  challenge: z.string().min(10).max(200),
  publicKey: z.string().regex(/^[0-9a-fA-F]{64}$/),
  signature: z.string().regex(/^[0-9a-fA-F]{128}$/),
  demo: z.boolean().optional(),
  locale: z.string().max(8).optional(),
})

export const POST = handle(async (req: Request) => {
  const b = await body(req, schema)
  const demo = !!b.demo
  if (demo && !env.DEMO_ENABLED) throw new ApiError(403, 'demo_disabled')
  const db = await getDb()
  const { address, publicKey } = await consumeChallenge(db, { ...b, purpose: 'signin' })

  const [link] = await db.select().from(userAddresses).where(eq(userAddresses.address, address))
  let userId = link?.userId
  if (userId) {
    const [u] = await db.select().from(users).where(eq(users.id, userId))
    // Demo and real namespaces never mix.
    if (!u || u.isDemo !== demo) throw new ApiError(409, 'namespace_mismatch', 'This address is used in the other mode')
  } else {
    userId = id()
    await db.insert(users).values({ id: userId, primaryAddress: address, isDemo: demo, locale: b.locale ?? null })
    await db.insert(userAddresses).values({ address, userId, publicKey })
    if (demo) {
      const [u] = await db.select().from(users).where(eq(users.id, userId))
      await seedDemo(db, u!, Date.now())
    }
  }
  const [pet] = await db.select().from(pets).where(eq(pets.userId, userId))
  await setSessionCookie({ uid: userId, demo })
  return json({ user: { id: userId, address }, isNew: !pet })
})
