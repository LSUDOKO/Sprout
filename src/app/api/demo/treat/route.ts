import { handle, json } from '@/lib/server/api'
import { requireDemo } from '@/lib/server/demoGuard'
import { DemoTxError, simulateTreat } from '@/lib/server/demo'

export const POST = handle(async () => {
  const { db, user, now } = await requireDemo()
  try {
    return json({ treatId: await simulateTreat(db, user, now) })
  } catch (e) {
    if (e instanceof DemoTxError) return json({ error: 'demo', message: e.message }, { status: 422 })
    throw e
  }
})
