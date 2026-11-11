'use client'
// S16 Withdraw in three honest steps. The current step always comes from chain state (docs/03 §9).
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api, pollUntil } from '@/lib/client/api'
import { meKey, useMe } from '@/lib/client/hooks'
import { getMode, walletFor } from '@/lib/client/session'
import { canDeactivate, canRemove, canRetire, nonRetired, withdrawPlan, withdrawStep } from '@/lib/nimiq/invariants'
import { formatNim, parseNim } from '@/lib/nimiq/luna'
import type { WalletResult } from '@/lib/nimiq/wallet'
import { useT, type TKey } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { stakerFromMe } from '@/components/sheets/FeedSheet'
import { BackButton, Button, Card } from '@/components/ui/kit'

const LOCK_KEY = 'sprout_wd_checking'
const LOCK_MS = 120_000

function humanTime(seconds: number) {
  if (seconds <= 0) return '0m'
  const h = Math.floor(seconds / 3600)
  const m = Math.ceil((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function WithdrawPage() {
  const t = useT()
  const qc = useQueryClient()
  const { data: me, refetch } = useMe()
  const toast = useUi((s) => s.toast)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState(0)
  useEffect(() => {
    try {
      setLockedUntil(Number(sessionStorage.getItem(LOCK_KEY) ?? 0))
    } catch {}
    const id = setInterval(() => refetch(), 15_000)
    return () => clearInterval(id)
  }, [refetch])

  if (!me) return null
  const staker = stakerFromMe(me)
  const block = me.currentBlock ?? 0
  const step = staker ? withdrawStep(staker, block) : null
  const locked = Date.now() < lockedUntil
  const stepNo = step === 'deactivate' ? 1 : step === 'remove' ? 3 : 2
  const want = parseNim(input || '0') ?? 0n
  const plan = staker ? withdrawPlan(staker, want) : null

  async function run(stepName: 'deactivate' | 'retire' | 'remove', value: bigint, send: () => Promise<WalletResult<string>>) {
    setBusy(true)
    setMsg(null)
    const r = await send()
    if (!r.ok) {
      setBusy(false)
      if (r.kind === 'unknown_outcome') {
        const until = Date.now() + LOCK_MS
        setLockedUntil(until)
        try {
          sessionStorage.setItem(LOCK_KEY, String(until))
        } catch {}
        return setMsg(t('feed.checking'))
      }
      return setMsg(r.kind === 'cancelled' ? t('feed.cancelled') : r.kind === 'unsupported' ? t('err.unsupported') : r.message)
    }
    setMsg(t('wd.pending'))
    try {
      const { id } = await api<{ id: string }>('/api/withdrawals', { body: { txHash: r.value, step: stepName, valueLuna: value.toString() } })
      const final = await pollUntil(() => api<{ status: string; failReason?: string }>(`/api/withdrawals/${id}`), (x) => x.status !== 'pending', { fast: 1500 })
      await qc.invalidateQueries({ queryKey: meKey })
      if (final.status === 'confirmed') {
        setMsg(null)
        setInput('')
        if (stepName === 'remove') toast(t('wd.done', { amount: formatNim(value) }), 'success')
      } else setMsg(t('feed.failed', { reason: final.failReason ?? '' }))
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const wallet = walletFor(getMode())
  return (
    <main className="min-h-dvh bg-cream px-5 pt-[calc(var(--safe-top)+12px)] pb-8">
      <BackButton href="/me" label={t('common.back')} />
      <h1 className="text-center text-[38px] font-bold">{t('wd.title')}</h1>
      <p className="mx-auto mt-2 max-w-[330px] text-center text-lg leading-snug text-ink/85">{t('wd.body')}</p>
      <img src="/art/withdraw-worried.webp" alt="" className="mx-auto my-4 h-44 w-auto" />

      {!staker || (nonRetired(staker) === 0n && staker.retiredLuna === 0n) ? (
        <Card className="text-center">
          <p className="font-display text-xl font-semibold">{t('wd.nothing')}</p>
          <Link href="/" className="press mt-3 inline-block font-display font-semibold text-navy underline">
            {t('wd.keepSaving')}
          </Link>
        </Card>
      ) : (
        <>
          <ol className="mb-4 flex items-center justify-center gap-2" aria-label={t('wd.stepOf', { n: stepNo })}>
            {[1, 2, 3].map((n) => (
              <li key={n} className="flex items-center gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full font-display font-bold ${n < stepNo ? 'bg-leaf text-white' : n === stepNo ? 'bg-navy text-white' : 'bg-mist text-slate'}`}>{n < stepNo ? '✓' : n}</span>
                <span className={`text-sm font-bold ${n === stepNo ? 'text-ink' : 'text-slate'}`}>{t((['wd.step1', 'wd.step2', 'wd.step3'] as TKey[])[n - 1]!)}</span>
              </li>
            ))}
          </ol>

          {step === 'deactivate' && (
            <div className="flex flex-col gap-3">
              <label className="rounded-[22px] border-[3px] border-navy bg-white px-5 py-3">
                <span className="text-lg">{t('wd.amount')}</span>
                <span className="flex items-baseline gap-2">
                  <input inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0" className="w-full bg-transparent font-display text-[40px] font-bold outline-none" aria-label={t('wd.amount')} />
                  <span className="font-display text-3xl font-bold">NIM</span>
                </span>
              </label>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate">{t('wd.available', { amount: formatNim(staker.activeLuna) })}</span>
                <button type="button" className="press font-bold text-navy underline" onClick={() => setInput(formatNim(staker.activeLuna, 5).replace(/,/g, ''))}>
                  {t('wd.all')}
                </button>
              </div>
              <p className="flex items-center gap-2 rounded-2xl bg-sky-soft px-4 py-3 text-[15px]">🕒 {t('wd.info')}</p>
              <p className="text-sm text-slate">{t('wd.rule100')}</p>
              {plan?.adjusted && want > 0n && <p className="rounded-2xl bg-gold-soft px-4 py-2 text-sm font-semibold">{t('wd.adjusted', { amount: formatNim(plan.amountLuna) })}</p>}
              <Button
                variant="navy"
                disabled={!plan || plan.amountLuna <= 0n || want <= 0n || !canDeactivate(staker, plan.amountLuna).ok || locked}
                loading={busy}
                onClick={() => plan && run('deactivate', plan.amountLuna, () => wallet.setActiveStake({ newActiveBalance: staker.activeLuna - plan.amountLuna }))}
              >
                {t('wd.step1')}
              </Button>
            </div>
          )}

          {(step === 'cooldown' || step === 'retire') && (
            <Card className="text-center">
              <p className="font-display text-3xl font-bold">{formatNim(staker.inactiveLuna)} NIM</p>
              {step === 'cooldown' ? (
                <p className="mt-2 text-ink/80">{t('wd.cooldown', { time: humanTime((staker.inactiveRelease ?? block) - block), block: (staker.inactiveRelease ?? 0).toLocaleString() })}</p>
              ) : (
                <p className="mt-2 font-semibold text-leaf-deep">{t('wd.cooldownReady')}</p>
              )}
              <Button
                variant="navy"
                className="mt-4 w-full"
                disabled={step !== 'retire' || !canRetire(staker, staker.inactiveLuna, block).ok || locked}
                loading={busy}
                onClick={() => run('retire', staker.inactiveLuna, () => wallet.retireStake({ retireStake: staker.inactiveLuna }))}
              >
                {t('wd.unlockCta', { amount: formatNim(staker.inactiveLuna) })}
              </Button>
            </Card>
          )}

          {step === 'remove' && (
            <Card className="text-center">
              <p className="font-display text-3xl font-bold">{formatNim(staker.retiredLuna)} NIM</p>
              <Button variant="gold" className="mt-4 w-full" disabled={!canRemove(staker).ok || locked} loading={busy} onClick={() => run('remove', staker.retiredLuna, () => wallet.removeStake({ value: staker.retiredLuna }))}>
                {t('wd.sendCta', { amount: formatNim(staker.retiredLuna) })}
              </Button>
            </Card>
          )}

          {msg && <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-center text-sm font-semibold shadow-[var(--shadow-card)]">{msg}</p>}
          <Link href="/" className="press mt-4 flex h-14 items-center justify-center rounded-full border-[3px] border-navy font-display text-xl font-semibold">
            {t('wd.keepSaving')}
          </Link>
        </>
      )}
    </main>
  )
}
