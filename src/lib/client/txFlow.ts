'use client'
// The save / withdraw / treat transaction state machine (docs/03 §1, §8).
// Rule: an unknown outcome is never retried blindly — it becomes "checking" until the chain answers.
import type { Wallet, WalletResult } from '../nimiq/wallet'
import { ApiFail, api, pollUntil, sleep } from './api'

export type TxPhase = 'idle' | 'approving' | 'confirming' | 'checking' | 'done' | 'cancelled' | 'invalid' | 'failed' | 'unsupported' | 'needs_link'

const CHECK_KEY = 'sprout_checking'
export type CheckingSave = { kind: 'plant' | 'feed'; valueLuna: string; sinceMs: number; saveId?: string; txHash?: string }

export function readChecking(): CheckingSave | null {
  try {
    const raw = localStorage.getItem(CHECK_KEY)
    return raw ? (JSON.parse(raw) as CheckingSave) : null
  } catch {
    return null
  }
}
export function writeChecking(c: CheckingSave | null) {
  try {
    if (c) localStorage.setItem(CHECK_KEY, JSON.stringify(c))
    else localStorage.removeItem(CHECK_KEY)
  } catch {}
}

export type SaveStatus = { status: 'pending' | 'confirmed' | 'failed' | 'needs_link'; result: SaveResult | null; failReason?: string | null }
export type SaveResult = { stageBefore: string; stageAfter: string; evolvedTo: string | null; weekKept: boolean; weekJustKept: boolean; streak: number; sparksAwarded: number; badgesEarned: string[] }

export const pollSave = (id: string, signal?: AbortSignal) =>
  pollUntil(() => api<SaveStatus>(`/api/saves/${id}`), (r) => r.status !== 'pending', { signal, fast: 1500 })

/** Look for a tx whose outcome was unknown. Returns a save id once found, null after ~2 min. */
export async function recoverSave(c: CheckingSave, signal?: AbortSignal): Promise<string | null> {
  const until = Date.now() + 120_000
  while (Date.now() < until) {
    if (signal?.aborted) return null
    try {
      const r = await api<{ found: boolean; saveId?: string }>('/api/saves/recover', { body: { valueLuna: c.valueLuna, sinceMs: c.sinceMs, kind: c.kind } })
      if (r.found && r.saveId) return r.saveId
    } catch (e) {
      if (e instanceof ApiFail && e.status < 500 && e.status !== 0) throw e
    }
    await sleep(5000)
  }
  return null
}

export type SaveOutcome =
  | { phase: 'done'; result: SaveResult | null; saveId: string }
  | { phase: Exclude<TxPhase, 'done' | 'idle' | 'approving' | 'confirming'>; message?: string; saveId?: string }

/** Full save: wallet → register hash immediately → poll verification. */
export async function runSave(opts: {
  wallet: Wallet
  kind: 'plant' | 'feed'
  valueLuna: bigint
  delegation?: string
  onPhase: (p: TxPhase) => void
  signal?: AbortSignal
}): Promise<SaveOutcome> {
  const { wallet, kind, valueLuna, onPhase } = opts
  onPhase('approving')
  const sinceMs = Date.now()
  const res: WalletResult<string> = kind === 'plant' ? await wallet.newStaker({ delegation: opts.delegation!, value: valueLuna }) : await wallet.stake({ value: valueLuna })
  if (!res.ok) {
    if (res.kind === 'unknown_outcome') {
      writeChecking({ kind, valueLuna: valueLuna.toString(), sinceMs })
      return { phase: 'checking', message: res.message }
    }
    const map = { cancelled: 'cancelled', invalid: 'invalid', unsupported: 'unsupported', not_in_app: 'failed', network: 'checking', error: 'failed' } as const
    return { phase: map[res.kind], message: res.message }
  }
  onPhase('confirming')
  // Persist the hash locally FIRST: if registering it fails (offline, 5xx), the lock stays and
  // "Check again" registers the same hash later — the user is never offered a second payment.
  const pending: CheckingSave = { kind, valueLuna: valueLuna.toString(), sinceMs, txHash: res.value }
  writeChecking(pending)
  const id = await registerHash(pending)
  writeChecking({ ...pending, saveId: id })
  return settle(await pollSave(id, opts.signal), id)
}

export async function registerHash(c: CheckingSave): Promise<string> {
  const r = await api<{ id: string }>('/api/saves', { body: { txHash: c.txHash, kind: c.kind, valueLuna: c.valueLuna } })
  return r.id
}

/** Map a terminal server status to an outcome. Every terminal status releases the local lock. */
export function settle(final: SaveStatus, id: string): SaveOutcome {
  writeChecking(null)
  if (final.status === 'confirmed') return { phase: 'done', result: final.result, saveId: id }
  if (final.status === 'needs_link') return { phase: 'needs_link', saveId: id }
  return { phase: 'failed', message: final.failReason ?? undefined, saveId: id }
}
