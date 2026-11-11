// SERVER ONLY. Every chain read goes through a ChainReader (docs/03 §8, docs/06 §4).
// Two implementations: RpcChain (real Nimiq JSON-RPC) and DemoChain (fake ledger in the DB).
import 'server-only'
import { eq, or } from 'drizzle-orm'
import { env } from '../env'
import type { Db } from '../db'
import { demoBalances, demoChainTxs, demoStakers } from '../db/schema'
import { normalizeAddress } from './address'
import type { Staker } from './invariants'

export type ChainTx = {
  hash: string
  from: string
  to: string
  value: bigint
  /** true = executed successfully, false = included but failed, null = unknown */
  executed: boolean | null
  confirmations: number
  blockNumber: number
  /** ms since epoch */
  timestamp: number
  recipientData: string
  senderData: string
}

export interface ChainReader {
  readonly kind: 'rpc' | 'demo'
  getBlockNumber(): Promise<number>
  getTransaction(hash: string): Promise<ChainTx | null>
  getTransactionsByAddress(address: string, max?: number): Promise<ChainTx[]>
  getStaker(address: string): Promise<Staker | null>
  getBalance(address: string): Promise<bigint | null>
}

export const stakingContract = () => normalizeAddress(env.NIMIQ_STAKING_CONTRACT) ?? env.NIMIQ_STAKING_CONTRACT

export const sameAddress = (a: string | null | undefined, b: string | null | undefined) =>
  !!a && !!b && normalizeAddress(a) === normalizeAddress(b)

// ---------------- Real JSON-RPC ----------------

const ALLOWED = ['getTransactionByHash', 'getTransactionsByAddress', 'getStakerByAddress', 'getBlockNumber', 'getAccountByAddress'] as const
type Method = (typeof ALLOWED)[number]

export class RpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message)
  }
}

function authHeader(): Record<string, string> {
  return env.NIMIQ_RPC_AUTH ? { authorization: 'Basic ' + Buffer.from(env.NIMIQ_RPC_AUTH).toString('base64') } : {}
}

async function rpcOnce<T>(url: string, method: Method, params: unknown[]): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeader() },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  })
  if (!res.ok) throw new RpcError(`RPC HTTP ${res.status}`)
  const json = (await res.json()) as { result?: { data?: T } | T; error?: { message?: string; code?: number } }
  if (json.error) throw new RpcError(json.error.message ?? 'RPC error', json.error.code)
  const r = json.result as { data?: T } | T | undefined
  return (r && typeof r === 'object' && 'data' in r ? r.data : r) as T
}

export async function rpc<T>(method: Method, params: unknown[] = []): Promise<T> {
  if (!ALLOWED.includes(method)) throw new RpcError(`Method not allowed: ${method}`)
  if (!env.NIMIQ_RPC_URL) throw new RpcError('NIMIQ_RPC_URL is not configured')
  try {
    return await rpcOnce<T>(env.NIMIQ_RPC_URL, method, params)
  } catch (e) {
    // Only fall back on transport failures, not on a definitive RPC answer.
    if (e instanceof RpcError && e.code !== undefined) throw e
    if (!env.NIMIQ_RPC_URL_FALLBACK) throw e
    return rpcOnce<T>(env.NIMIQ_RPC_URL_FALLBACK, method, params)
  }
}

/** Raw RPC transaction → ChainTx. Field names per nimiq.dev/rpc; adapt here if a node differs. */
type RawTx = {
  hash: string
  from: string
  to: string
  value: number | string
  blockNumber?: number
  timestamp?: number
  confirmations?: number
  executionResult?: boolean
  recipientData?: string
  senderData?: string
}
const toLuna = (v: number | string | undefined | null) => (v === undefined || v === null ? 0n : BigInt(v))

export function adaptTx(t: RawTx): ChainTx {
  const ts = t.timestamp ?? 0
  return {
    hash: t.hash,
    from: normalizeAddress(t.from) ?? t.from,
    to: normalizeAddress(t.to) ?? t.to,
    value: toLuna(t.value),
    // Never assume success: a missing field stays unknown and the save stays pending.
    executed: typeof t.executionResult === 'boolean' ? t.executionResult : null,
    confirmations: t.confirmations ?? 0,
    blockNumber: t.blockNumber ?? 0,
    timestamp: ts < 1e12 ? ts * 1000 : ts,
    recipientData: t.recipientData ?? '',
    senderData: t.senderData ?? '',
  }
}

type RawStaker = {
  balance?: number | string
  inactiveBalance?: number | string
  retiredBalance?: number | string
  inactiveRelease?: number | null
  inactiveFrom?: number | null
  delegation?: string | null
}
export function adaptStaker(s: RawStaker): Staker {
  return {
    activeLuna: toLuna(s.balance),
    inactiveLuna: toLuna(s.inactiveBalance),
    retiredLuna: toLuna(s.retiredBalance),
    inactiveRelease: s.inactiveRelease ?? s.inactiveFrom ?? null,
    delegation: s.delegation ? (normalizeAddress(s.delegation) ?? s.delegation) : null,
  }
}

const isNotFound = (e: unknown) => e instanceof RpcError && /not\s*found|no\s*staker|does\s*not\s*exist/i.test(e.message)

export class RpcChain implements ChainReader {
  readonly kind = 'rpc' as const
  getBlockNumber() {
    return rpc<number>('getBlockNumber')
  }
  async getTransaction(hash: string) {
    try {
      const t = await rpc<RawTx | null>('getTransactionByHash', [hash])
      return t ? adaptTx(t) : null
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  }
  async getTransactionsByAddress(address: string, max = 50) {
    const list = await rpc<RawTx[]>('getTransactionsByAddress', [address, max, null])
    return (list ?? []).map(adaptTx)
  }
  async getStaker(address: string) {
    try {
      const s = await rpc<RawStaker | null>('getStakerByAddress', [address])
      return s ? adaptStaker(s) : null
    } catch (e) {
      if (isNotFound(e)) return null
      throw e
    }
  }
  async getBalance(address: string) {
    const a = await rpc<{ balance?: number | string } | null>('getAccountByAddress', [address])
    return a ? toLuna(a.balance) : null
  }
}

// ---------------- Demo fake chain ----------------

const DEMO_GENESIS_S = 1_700_000_000
/** One demo block per second of (possibly fast-forwarded) demo time. */
export const demoBlockAt = (nowMs: number) => Math.floor(nowMs / 1000) - DEMO_GENESIS_S
export const demoBlockTime = (block: number) => (block + DEMO_GENESIS_S) * 1000

export class DemoChain implements ChainReader {
  readonly kind = 'demo' as const
  constructor(
    private db: Db,
    private nowMs: number,
  ) {}
  async getBlockNumber() {
    return demoBlockAt(this.nowMs)
  }
  private adapt(r: typeof demoChainTxs.$inferSelect): ChainTx {
    const block = demoBlockAt(this.nowMs)
    return {
      hash: r.hash,
      from: r.fromAddress,
      to: r.toAddress,
      value: r.valueLuna,
      executed: r.executed,
      confirmations: Math.max(0, block - r.blockNumber + 1),
      blockNumber: r.blockNumber,
      timestamp: demoBlockTime(r.blockNumber),
      recipientData: r.recipientData ?? '',
      senderData: '',
    }
  }
  async getTransaction(hash: string) {
    const [r] = await this.db.select().from(demoChainTxs).where(eq(demoChainTxs.hash, hash))
    return r ? this.adapt(r) : null
  }
  async getTransactionsByAddress(address: string, max = 50) {
    const rows = await this.db
      .select()
      .from(demoChainTxs)
      .where(or(eq(demoChainTxs.fromAddress, address), eq(demoChainTxs.toAddress, address)))
    return rows
      .sort((a, b) => b.blockNumber - a.blockNumber)
      .slice(0, max)
      .map((r) => this.adapt(r))
  }
  async getStaker(address: string) {
    const [s] = await this.db.select().from(demoStakers).where(eq(demoStakers.address, address))
    if (!s) return null
    return { activeLuna: s.activeLuna, inactiveLuna: s.inactiveLuna, retiredLuna: s.retiredLuna, inactiveRelease: s.inactiveRelease, delegation: s.delegation }
  }
  async getBalance(address: string) {
    const [b] = await this.db.select().from(demoBalances).where(eq(demoBalances.address, address))
    return b ? b.balanceLuna : 0n
  }
}

/** Sum staker balances across all of a user's linked addresses. Null = unknown (chain unreachable). */
export async function stakerTotals(chain: ChainReader, addresses: string[]) {
  const stakers = await Promise.all(addresses.map((a) => chain.getStaker(a)))
  const sum: Staker & { addresses: string[] } = { activeLuna: 0n, inactiveLuna: 0n, retiredLuna: 0n, inactiveRelease: null, delegation: null, addresses: [] }
  stakers.forEach((s, i) => {
    if (!s) return
    sum.activeLuna += s.activeLuna
    sum.inactiveLuna += s.inactiveLuna
    sum.retiredLuna += s.retiredLuna
    sum.inactiveRelease = s.inactiveRelease ?? sum.inactiveRelease
    sum.delegation ??= s.delegation
    sum.addresses.push(addresses[i]!)
  })
  return sum
}

/** Decode tx data hex → UTF-8 (memos). Returns '' for invalid hex. */
export function decodeData(hex: string): string {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex
  if (!h || h.length % 2 || !/^[0-9a-fA-F]+$/.test(h)) return ''
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(h.match(/../g)!.map((b) => parseInt(b, 16))))
  } catch {
    return ''
  }
}
export const encodeData = (text: string) => Buffer.from(text, 'utf8').toString('hex')
