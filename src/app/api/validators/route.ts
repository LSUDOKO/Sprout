import { getSession } from '@/lib/auth/session'
import { handle, json } from '@/lib/server/api'
import { DEMO_POOLS, getPools } from '@/lib/nimiq/validators'

export const GET = handle(async () => {
  const session = await getSession()
  if (session?.demo) return json({ pools: DEMO_POOLS, demo: true })
  try {
    return json({ pools: await getPools() })
  } catch (e) {
    console.error('[validators]', e)
    return json({ error: 'validators_unavailable', message: 'Pool list is unavailable right now' }, { status: 503 })
  }
})
