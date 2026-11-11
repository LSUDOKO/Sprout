// SERVER ONLY. Nimiq Validators API adapter + neutral, explainable recommendation (docs/03 §6).
import 'server-only'
import { env } from '../env'
import { addressFromBytes, normalizeAddress } from './address'

export type Payout = 'restake' | 'direct' | 'none'
export type Pool = {
  address: string
  name: string
  logo: string | null
  feePct: number | null
  payout: Payout
  score: number | null
  active: boolean
  recommended: boolean
}

type RawValidator = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' && v ? v : null)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)

/** One adapter for the API shape. Tolerates field-name differences between API versions. */
export function adaptValidator(v: RawValidator): Pool | null {
  const address = normalizeAddress(str(v.address) ?? '')
  if (!address) return null
  const payoutRaw = (str(v.payoutType) ?? str(v.payout_type) ?? 'none').toLowerCase()
  const payout: Payout = payoutRaw.includes('restake') ? 'restake' : payoutRaw.includes('direct') ? 'direct' : 'none'
  const scoreObj = v.score as Record<string, unknown> | number | undefined
  const score = typeof scoreObj === 'object' && scoreObj ? num(scoreObj.total) : num(scoreObj)
  let fee = num(v.fee)
  if (fee !== null && fee <= 1) fee = fee * 100 // API may return a fraction
  const status = (str(v.status) ?? str(v.state) ?? 'active').toLowerCase()
  return {
    address,
    name: str(v.name) ?? address,
    logo: str(v.logo) ?? str(v.icon),
    feePct: fee,
    payout,
    score,
    active: !/(inactive|jailed|retired|deleted)/.test(status) && v.isActive !== false,
    recommended: false,
  }
}

/** Active → pays by restaking (provable growth) → highest score → lowest fee. Never paid placement. */
export function recommend(pools: Pool[]): Pool[] {
  const eligible = pools
    .filter((p) => p.active)
    .sort(
      (a, b) =>
        Number(b.payout === 'restake') - Number(a.payout === 'restake') ||
        (b.score ?? -1) - (a.score ?? -1) ||
        (a.feePct ?? 100) - (b.feePct ?? 100),
    )
  const best = eligible[0]?.address
  return [...eligible, ...pools.filter((p) => !p.active)].map((p) => ({ ...p, recommended: p.address === best }))
}

// Shown in demo mode and when the API is unreachable in development. Clearly fake addresses.
const demoAddr = (n: number) => addressFromBytes(new Uint8Array(20).fill(n))
export const DEMO_POOLS: Pool[] = recommend([
  { address: demoAddr(0xa1), name: 'Demo Garden Pool', logo: null, feePct: 9, payout: 'restake', score: 0.92, active: true, recommended: false },
  { address: demoAddr(0xb2), name: 'Demo Meadow Pool', logo: null, feePct: 7, payout: 'direct', score: 0.88, active: true, recommended: false },
  { address: demoAddr(0xc3), name: 'Demo Orchard Pool', logo: null, feePct: 12, payout: 'restake', score: 0.81, active: true, recommended: false },
])

let cache: { at: number; pools: Pool[] } | null = null
const TTL = 10 * 60_000

export async function getPools(): Promise<Pool[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.pools
  const res = await fetch(env.VALIDATORS_API_URL, { signal: AbortSignal.timeout(8000), next: { revalidate: 600 } })
  if (!res.ok) throw new Error(`Validators API HTTP ${res.status}`)
  const json = (await res.json()) as unknown
  const list = Array.isArray(json) ? json : ((json as { validators?: unknown[] }).validators ?? (json as { data?: unknown[] }).data ?? [])
  const pools = recommend((list as RawValidator[]).map(adaptValidator).filter((p): p is Pool => !!p))
  cache = { at: Date.now(), pools }
  return pools
}

export async function poolByAddress(address: string | null): Promise<Pool | null> {
  if (!address) return null
  const demo = DEMO_POOLS.find((p) => p.address === address)
  if (demo) return demo
  try {
    return (await getPools()).find((p) => p.address === address) ?? null
  } catch {
    return null
  }
}
