'use client'
// Sign-in / link via a signed challenge, and wallet selection by mode.
import { mockWallet, resetDemoKey } from '../nimiq/mockWallet'
import { nimiqWallet, type Wallet, type WalletResult } from '../nimiq/wallet'
import { api } from './api'

const MODE_KEY = 'sprout_mode'
export type Mode = 'nimiq' | 'demo'

export function getMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'demo' ? 'demo' : 'nimiq'
  } catch {
    return 'nimiq'
  }
}
export function setMode(m: Mode) {
  try {
    localStorage.setItem(MODE_KEY, m)
  } catch {}
}
export const walletFor = (mode: Mode): Wallet => (mode === 'demo' ? mockWallet : nimiqWallet)

export type SignInResult = { ok: true; isNew: boolean } | { ok: false; kind: string; message: string }

export async function signIn(mode: Mode, locale?: string): Promise<SignInResult> {
  const wallet = walletFor(mode)
  const { challenge } = await api<{ challenge: string }>('/api/auth/challenge', { body: { purpose: 'signin' } })
  const sig = await wallet.sign(challenge)
  if (!sig.ok) return sig
  const r = await api<{ isNew: boolean }>('/api/auth/verify', { body: { challenge, ...sig.value, demo: mode === 'demo', locale } })
  setMode(mode)
  return { ok: true, isNew: r.isNew }
}

export async function linkAccount(mode: Mode): Promise<WalletResult<string>> {
  const { challenge } = await api<{ challenge: string }>('/api/auth/challenge', { body: { purpose: 'link' } })
  const sig = await walletFor(mode).sign(challenge)
  if (!sig.ok) return sig
  const r = await api<{ linked: string }>('/api/auth/link', { body: { challenge, ...sig.value } })
  return { ok: true, value: r.linked }
}

export async function signOut() {
  const mode = getMode()
  await api('/api/auth/logout', { method: 'POST' }).catch(() => {})
  if (mode === 'demo') resetDemoKey()
  setMode('nimiq')
  try {
    localStorage.removeItem('sprout_checking')
    window.nimiq?.disconnect?.()
  } catch {}
}
