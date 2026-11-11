import { sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { handle, json } from '@/lib/server/api'
import { RpcChain } from '@/lib/nimiq/chain'
import { env } from '@/lib/env'

export const GET = handle(async () => {
  const db = await getDb().then(async (d) => (await d.execute(sql`select 1`), true)).catch(() => false)
  let rpc: boolean | null = null
  let block: number | null = null
  if (env.hasRealChain) {
    try {
      block = await new RpcChain().getBlockNumber()
      rpc = true
    } catch {
      rpc = false
    }
  }
  const ok = db && rpc !== false
  return json({ ok, db, rpc, block, network: env.NEXT_PUBLIC_NIMIQ_NETWORK, demo: env.DEMO_ENABLED }, { status: ok ? 200 : 503 })
})
