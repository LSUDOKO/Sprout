import { z } from 'zod'
import { body, handle, json } from '@/lib/server/api'
import { requireDemo } from '@/lib/server/demoGuard'
import { DemoTxError, demoWallet } from '@/lib/server/demo'

const luna = z.string().regex(/^\d+$/)
const schema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('sendNewStakerTransaction'), delegation: z.string(), value: luna }),
  z.object({ method: z.literal('sendStakeTransaction'), value: luna }),
  z.object({ method: z.literal('sendSetActiveStakeTransaction'), newActiveBalance: luna }),
  z.object({ method: z.literal('sendRetireStakeTransaction'), retireStake: luna }),
  z.object({ method: z.literal('sendRemoveStakeTransaction'), value: luna }),
  z.object({ method: z.literal('sendBasicTransactionWithData'), recipient: z.string(), value: luna, data: z.string().max(64) }),
  z.object({ method: z.literal('getBalance') }),
])

// The demo stand-in for Nimiq Pay's wallet + the blockchain. Returns a tx hash (or balance).
export const POST = handle(async (req: Request) => {
  const { db, user, now } = await requireDemo()
  const r = await body(req, schema)
  try {
    return json({ result: await demoWallet(db, user.primaryAddress, now, r) })
  } catch (e) {
    if (e instanceof DemoTxError) return json({ error: { type: e.type, message: e.message } }, { status: 422 })
    throw e
  }
})
