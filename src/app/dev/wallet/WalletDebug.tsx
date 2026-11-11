'use client'
import { useState } from 'react'
import { addressFromPublicKey } from '@/lib/nimiq/address'
import { hostLanguage, hostNetwork, nimiqWallet } from '@/lib/nimiq/wallet'

export function WalletDebug() {
  const [log, setLog] = useState<string[]>([])
  const add = (s: string) => setLog((l) => [...l, s])
  async function run() {
    setLog([])
    add(`network: ${hostNetwork() ?? 'unknown'} · language: ${hostLanguage() ?? 'unknown'}`)
    const accounts = await nimiqWallet.listAccounts()
    add(`listAccounts: ${JSON.stringify(accounts)}`)
    const msg = `Sprout debug\nNonce: ${Date.now()}`
    const sig = await nimiqWallet.sign(msg)
    if (!sig.ok) return add(`sign failed: ${sig.kind} ${sig.message}`)
    const derived = addressFromPublicKey(sig.value.publicKey)
    add(`publicKey: ${sig.value.publicKey}`)
    add(`signature: ${sig.value.signature}`)
    add(`derived address: ${derived}`)
    const match = accounts.ok && accounts.value.some((a) => a.replace(/\s/g, '') === derived.replace(/\s/g, ''))
    add(match ? '✅ MATCH — add this pair as a unit-test vector' : '❌ NO MATCH — stop and fix address.ts')
  }
  return (
    <main className="p-5 font-mono text-sm">
      <h1 className="mb-3 font-display text-2xl">Wallet debug</h1>
      <button type="button" onClick={run} className="rounded-full bg-navy px-5 py-3 text-white">
        Run checks in Nimiq Pay
      </button>
      <pre className="mt-4 whitespace-pre-wrap break-all">{log.join('\n')}</pre>
    </main>
  )
}
