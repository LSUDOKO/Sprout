import { handle, json } from '@/lib/server/api'
import { requireDemo } from '@/lib/server/demoGuard'
import { DemoTxError, simulateRewards } from '@/lib/server/demo'

export const POST = handle(async () => {
  const { db, user } = await requireDemo()
  try {
    await simulateRewards(db, user)
    return json({ ok: true })
  } catch (e) {
    if (e instanceof DemoTxError) return json({ error: 'demo', message: e.message }, { status: 422 })
    throw e
  }
})
