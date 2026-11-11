'use client'
// CLIENT, demo mode only (docs/03 §12). Same interface as the real wallet.
// Signs with a real in-memory Ed25519 key in the exact Nimiq message format (so the server
// verifies it the normal way) and sends "transactions" to the demo fake chain.
import { ed25519 } from '@noble/curves/ed25519.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { hashNimiqMessage } from './signature'
import type { Wallet, WalletResult } from './wallet'

const KEY = 'sprout_demo_key'

function secretKey(): Uint8Array {
  let hex: string | null = null
  try {
    hex = localStorage.getItem(KEY)
  } catch {}
  if (hex && /^[0-9a-f]{64}$/.test(hex)) return hexToBytes(hex)
  const sk = ed25519.utils.randomSecretKey()
  try {
    localStorage.setItem(KEY, bytesToHex(sk))
  } catch {}
  return sk
}

export function resetDemoKey() {
  try {
    localStorage.removeItem(KEY)
  } catch {}
}

/** Pretend the user takes a moment to approve in Nimiq Pay. */
const approvalDelay = () => new Promise((r) => setTimeout(r, 650))

async function chain(body: Record<string, string>): Promise<WalletResult<string>> {
  await approvalDelay()
  try {
    const res = await fetch('/api/demo/wallet', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const json = (await res.json()) as { result?: string; error?: { type?: string; message?: string } | string; message?: string }
    if (res.ok && json.result) return { ok: true, value: json.result }
    const err = typeof json.error === 'object' ? json.error : { message: json.message }
    return { ok: false, kind: err?.type === 'INVALID_TRANSACTION' || err?.type === 'INVALID_REQUEST' ? 'invalid' : 'error', message: err?.message ?? 'Demo wallet error' }
  } catch (e) {
    // Like the real wallet: a dropped connection after sending means the outcome is unknown.
    return { ok: false, kind: 'unknown_outcome', message: String(e) }
  }
}

export const mockWallet: Wallet = {
  mode: 'demo',
  async available() {
    return true
  },
  async sign(message) {
    await approvalDelay()
    const sk = secretKey()
    return { ok: true, value: { publicKey: bytesToHex(ed25519.getPublicKey(sk)), signature: bytesToHex(ed25519.sign(hashNimiqMessage(message), sk)) } }
  },
  async listAccounts() {
    const { addressFromPublicKey } = await import('./address')
    return { ok: true, value: [addressFromPublicKey(bytesToHex(ed25519.getPublicKey(secretKey())))] }
  },
  async getBalance() {
    const r = await chain({ method: 'getBalance' })
    return r.ok ? { ok: true, value: BigInt(r.value) } : r
  },
  newStaker: ({ delegation, value }) => chain({ method: 'sendNewStakerTransaction', delegation, value: value.toString() }),
  stake: ({ value }) => chain({ method: 'sendStakeTransaction', value: value.toString() }),
  setActiveStake: ({ newActiveBalance }) => chain({ method: 'sendSetActiveStakeTransaction', newActiveBalance: newActiveBalance.toString() }),
  retireStake: ({ retireStake }) => chain({ method: 'sendRetireStakeTransaction', retireStake: retireStake.toString() }),
  removeStake: ({ value }) => chain({ method: 'sendRemoveStakeTransaction', value: value.toString() }),
  payWithData: ({ recipient, value, data }) => chain({ method: 'sendBasicTransactionWithData', recipient, value: value.toString(), data }),
}
