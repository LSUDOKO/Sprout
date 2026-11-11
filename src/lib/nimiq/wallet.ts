'use client'
// CLIENT ONLY. The single place every Nimiq Pay provider call goes through (docs/03 §1).
// Every outcome maps to a WalletResult kind so the UI can never mistake "unknown" for "failed".
import { init, NimiqProviderError, getHostLanguage, getHostNetwork, type NimiqProvider } from '@nimiq/mini-app-sdk'

export type WalletErrorKind = 'cancelled' | 'unsupported' | 'invalid' | 'network' | 'unknown_outcome' | 'not_in_app' | 'error'
export type WalletResult<T> = { ok: true; value: T } | { ok: false; kind: WalletErrorKind; message: string; raw?: unknown }

/** Same surface for the real wallet and the demo mock wallet. Amounts are Luna as bigint. */
export interface Wallet {
  readonly mode: 'nimiq' | 'demo'
  available(): Promise<boolean>
  sign(message: string): Promise<WalletResult<{ publicKey: string; signature: string }>>
  listAccounts(): Promise<WalletResult<string[]>>
  getBalance(address: string): Promise<WalletResult<bigint | null>>
  newStaker(p: { delegation: string; value: bigint }): Promise<WalletResult<string>>
  stake(p: { value: bigint }): Promise<WalletResult<string>>
  setActiveStake(p: { newActiveBalance: bigint }): Promise<WalletResult<string>>
  retireStake(p: { retireStake: bigint }): Promise<WalletResult<string>>
  removeStake(p: { value: bigint }): Promise<WalletResult<string>>
  payWithData(p: { recipient: string; value: bigint; data: string }): Promise<WalletResult<string>>
}

let providerPromise: Promise<NimiqProvider> | null = null
export function provider(timeout = 4000): Promise<NimiqProvider> {
  providerPromise ??= init({ timeout }).catch((e) => {
    providerPromise = null // allow a later retry (e.g. user opened inside Nimiq Pay)
    throw e
  })
  return providerPromise
}

/** Inside Nimiq Pay the host context is injected before page scripts run. */
export const isInNimiqPay = () => typeof window !== 'undefined' && (!!window.nimiqPay || !!window.nimiq)
export const hostNetwork = () => (typeof window === 'undefined' ? undefined : getHostNetwork())
export const hostLanguage = () => (typeof window === 'undefined' ? undefined : getHostLanguage())

/** Map any thrown value to a WalletResult. Exported for tests and the mock wallet. */
export function classify(e: unknown): Exclude<WalletResult<never>, { ok: true }> {
  const pe = NimiqProviderError.is(e) ? e : NimiqProviderError.from(e)
  if (!pe) {
    const message = e instanceof Error ? e.message : String(e)
    if (/timeout|not.*(found|available)|inject/i.test(message)) return { ok: false, kind: 'not_in_app', message, raw: e }
    return { ok: false, kind: 'error', message, raw: e }
  }
  switch (pe.type) {
    case 'PERMISSION_DENIED':
      return { ok: false, kind: 'cancelled', message: pe.message, raw: e }
    case 'UNKNOWN_REQUEST':
      return { ok: false, kind: 'unsupported', message: pe.message, raw: e }
    case 'INVALID_TRANSACTION':
    case 'INVALID_REQUEST':
      return { ok: false, kind: 'invalid', message: pe.message, raw: e }
    // The transaction may already have been submitted: never offer a blind retry.
    case 'NETWORK_ERROR':
    case 'TRANSACTION_OUTCOME_UNKNOWN':
    case 'DUPLICATE_PAYMENT':
      return { ok: false, kind: 'unknown_outcome', message: pe.message, raw: e }
    default:
      return { ok: false, kind: 'error', message: pe.message, raw: e }
  }
}

export async function call<T>(fn: (n: NimiqProvider) => Promise<T>): Promise<WalletResult<T>> {
  try {
    const n = await provider()
    const value = await fn(n)
    // Older hosts resolve with { error } instead of throwing.
    if (value && typeof value === 'object' && 'error' in (value as object)) return classify(NimiqProviderError.fromLegacyResponse(value) ?? value)
    return { ok: true, value }
  } catch (e) {
    return classify(e)
  }
}

// Luna → number only here, at the SDK boundary.
const n = (luna: bigint) => {
  if (luna < 0n || luna > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Luna out of range')
  return Number(luna)
}

export const nimiqWallet: Wallet = {
  mode: 'nimiq',
  async available() {
    try {
      await provider()
      return true
    } catch {
      return false
    }
  },
  sign: (message) => call((p) => p.sign(message)),
  listAccounts: () => call((p) => p.listAccounts()),
  getBalance: (address) =>
    call(async (p) => {
      // Only newer hosts implement getBalance: feature-detect.
      if (typeof p.getBalance !== 'function') return null
      return BigInt(await p.getBalance(address))
    }),
  newStaker: ({ delegation, value }) => call((p) => p.sendNewStakerTransaction({ delegation, value: n(value) })),
  stake: ({ value }) => call((p) => p.sendStakeTransaction({ value: n(value) })),
  setActiveStake: ({ newActiveBalance }) => call((p) => p.sendSetActiveStakeTransaction({ newActiveBalance: n(newActiveBalance) })),
  retireStake: ({ retireStake }) => call((p) => p.sendRetireStakeTransaction({ retireStake: n(retireStake) })),
  removeStake: ({ value }) => call((p) => p.sendRemoveStakeTransaction({ value: n(value) })),
  payWithData: ({ recipient, value, data }) => call((p) => p.sendBasicTransactionWithData({ recipient, value: n(value), data })),
}
