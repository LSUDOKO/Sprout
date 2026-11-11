'use client'
// S4 Feed sheet + S5 pool picker. Validates staking invariants BEFORE opening any wallet dialog.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api, type Me } from '@/lib/client/api'
import { meKey } from '@/lib/client/hooks'
import { getMode, walletFor } from '@/lib/client/session'
import { readChecking, recoverSave, pollSave, runSave, writeChecking, type TxPhase } from '@/lib/client/txFlow'
import { FEED_CHIPS } from '@/lib/game/config'
import type { StageId } from '@/lib/game/config'
import { canAddStake, canCreateStaker, type Staker } from '@/lib/nimiq/invariants'
import { formatNim, fromWire, nim, parseNim } from '@/lib/nimiq/luna'
import { useT, type TKey } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { PetRig } from '../pet/PetRig'
import { Button, Chip, Spinner } from '../ui/kit'
import { Sheet } from '../ui/Sheet'
import { playSfx } from '../sfx'

type Pool = { address: string; name: string; logo: string | null; feePct: number | null; payout: 'restake' | 'direct' | 'none'; score: number | null; active: boolean; recommended: boolean }

export function stakerFromMe(me: Me): Staker | null {
  if (!me.stake || !me.stake.hasStaker) return null
  return { activeLuna: fromWire(me.stake.activeLuna), inactiveLuna: fromWire(me.stake.inactiveLuna), retiredLuna: fromWire(me.stake.retiredLuna), inactiveRelease: me.stake.inactiveRelease, delegation: me.stake.delegation }
}

export function FeedSheet({ me }: { me: Me }) {
  const t = useT()
  const qc = useQueryClient()
  const open = useUi((s) => s.feedOpen)
  const setOpen = useUi((s) => s.openFeed)
  const celebrate = useUi((s) => s.celebrate)
  const evolve = useUi((s) => s.evolve)
  const toast = useUi((s) => s.toast)
  const setLinkPrompt = useUi((s) => s.setLinkPrompt)
  const sound = useUi((s) => s.sound)

  const staker = stakerFromMe(me)
  const planting = !staker
  const chips = planting ? [100, 250, 500] : [...FEED_CHIPS]
  const [chip, setChip] = useState<number | 'custom'>(chips[0]!)
  const [custom, setCustom] = useState('')
  const [phase, setPhase] = useState<TxPhase>('idle')
  const [note, setNote] = useState<string | null>(null)
  const [pickPool, setPickPool] = useState(false)
  const [poolAddr, setPoolAddr] = useState<string | null>(null)
  const [wallet, setWallet] = useState<bigint | undefined>(undefined)
  const abort = useRef<AbortController | null>(null)
  const checking = phase === 'checking'
  const busy = phase === 'approving' || phase === 'confirming'

  const pools = useQuery({ queryKey: ['validators'], queryFn: () => api<{ pools: Pool[] }>('/api/validators'), enabled: open && planting, staleTime: 600_000 })
  const pool = useMemo(() => pools.data?.pools.find((p) => p.address === poolAddr) ?? pools.data?.pools.find((p) => p.recommended), [pools.data, poolAddr])

  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setPhase(readChecking() ? 'checking' : 'idle')
      setNote(null)
      setChip(chips[0]!)
    }
  }
  useEffect(() => {
    if (!open) return
    // Wallet balance check (feature-detected on the real host).
    walletFor(getMode())
      .getBalance(me.user.address)
      .then((r) => setWallet(r.ok && r.value !== null ? r.value : undefined))
      .catch(() => setWallet(undefined))
  }, [open, me.user.address])

  const amount = chip === 'custom' ? parseNim(custom) : nim(chip)
  const check = amount === null ? { ok: false as const, code: 'invalid_amount' as const, message: '' } : planting ? canCreateStaker(staker, amount, wallet) : canAddStake(staker, amount, wallet)

  async function done(outcome: Awaited<ReturnType<typeof runSave>>, value: bigint) {
    await qc.invalidateQueries({ queryKey: meKey })
    if (outcome.phase === 'done') {
      writeChecking(null)
      setOpen(false)
      setPhase('idle')
      if (sound) playSfx(outcome.result?.evolvedTo ? 'evolve' : 'coin')
      const r = outcome.result
      celebrate({ kind: planting ? 'plant' : 'feed', amountLuna: value.toString(), weekJustKept: !!r?.weekJustKept, streak: r?.streak ?? 0, sparks: r?.sparksAwarded ?? 0, evolvedTo: (r?.evolvedTo as StageId | null) ?? null, badges: r?.badgesEarned ?? [] })
      if (r?.evolvedTo) evolve({ to: r.evolvedTo as StageId, savedLuna: '0', weeks: 0 })
      return
    }
    setPhase(outcome.phase)
    if (outcome.phase === 'cancelled') setNote(t('feed.cancelled'))
    else if (outcome.phase === 'invalid') setNote(outcome.message ?? t('err.invalid'))
    else if (outcome.phase === 'unsupported') setNote(t('err.unsupported'))
    else if (outcome.phase === 'needs_link') {
      setOpen(false)
      setLinkPrompt(true)
    } else if (outcome.phase === 'failed') {
      const reason = outcome.message && (`err.${outcome.message}` as TKey)
      setNote(t('feed.failed', { reason: reason ? t(reason) : outcome.message ?? '' }))
      if (sound) playSfx('error')
    }
  }

  async function save() {
    if (!amount || !check.ok || busy || checking) return
    if (planting && !pool) return
    abort.current = new AbortController()
    setNote(null)
    try {
      const outcome = await runSave({ wallet: walletFor(getMode()), kind: planting ? 'plant' : 'feed', valueLuna: amount, delegation: pool?.address, onPhase: setPhase, signal: abort.current.signal })
      await done(outcome, amount)
    } catch (e) {
      // The hash is registered server-side; the home screen keeps polling it.
      setPhase('confirming')
      toast(String((e as Error).message ?? e), 'error')
    }
  }

  async function checkAgain() {
    const c = readChecking()
    if (!c) return setPhase('idle')
    setNote(null)
    const id = c.saveId ?? (await recoverSave(c).catch(() => null))
    if (!id) return setNote(t('feed.checking'))
    writeChecking({ ...c, saveId: id })
    setPhase('confirming')
    const final = await pollSave(id)
    await done(final.status === 'confirmed' ? { phase: 'done', result: final.result, saveId: id } : final.status === 'needs_link' ? { phase: 'needs_link' } : { phase: 'failed', message: final.failReason ?? undefined }, fromWire(c.valueLuna))
  }

  const label = amount ? formatNim(amount) : '0'
  return (
    <Sheet
      open={open}
      onClose={() => !busy && setOpen(false)}
      dismissible={!busy}
      label={t(planting ? 'feed.plantTitle' : 'feed.title')}
      peek={<PetRig stage={me.growth.stage as StageId} mood={busy ? 'hungry' : 'happy'} size={190} cosmetics={{ hat: me.pet?.hat, face: me.pet?.face, neck: me.pet?.neck }} />}
    >
      {pickPool ? (
        <PoolPicker pools={pools.data?.pools ?? []} loading={pools.isLoading} error={pools.isError} selected={pool?.address} onPick={(a) => (setPoolAddr(a), setPickPool(false))} onBack={() => setPickPool(false)} />
      ) : (
        <div className="flex flex-col items-center gap-4 pt-3 text-center">
          <h2 className="text-[28px] font-semibold text-ink">{t(planting ? 'feed.plantTitle' : 'feed.title')}</h2>
          <p className="font-display text-[46px] font-bold leading-none text-ink" aria-live="polite">
            {t('common.nim', { amount: label })}
          </p>
          <div className="flex w-full gap-2.5" role="group">
            {chips.map((c) => (
              <Chip key={c} active={chip === c} onClick={() => setChip(c)} disabled={busy || checking}>
                {formatNim(nim(c))}
              </Chip>
            ))}
            <Chip active={chip === 'custom'} onClick={() => setChip('custom')} disabled={busy || checking} className="text-base">
              {t('feed.custom')}
            </Chip>
          </div>
          {chip === 'custom' && (
            <input
              autoFocus
              inputMode="decimal"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={t('feed.customPlaceholder')}
              aria-label={t('feed.customPlaceholder')}
              className="h-14 w-full rounded-2xl border-[2.5px] border-navy px-4 text-center font-display text-2xl font-semibold outline-none"
            />
          )}
          <p className="text-[16px] text-ink/80">{planting ? t('feed.minPlant') : t('feed.line')}</p>
          {wallet !== undefined && <p className="-mt-2 text-sm text-slate">{t('feed.wallet', { amount: formatNim(wallet) })}</p>}

          {planting && (
            <button type="button" onClick={() => setPickPool(true)} className="press flex w-full items-center justify-between rounded-2xl bg-cream px-4 py-3 text-left text-sm" disabled={busy}>
              <span className="truncate">
                {pools.isLoading ? t('common.loading') : pool ? t('feed.pool', { name: pool.name, fee: pool.feePct ?? '?', payout: t(pool.payout === 'restake' ? 'pool.compounding' : pool.payout === 'direct' ? 'pool.direct' : 'pool.none') }) : t('pool.unavailable')}
              </span>
              <span className="ml-2 shrink-0 font-bold text-navy underline">{t('feed.change')}</span>
            </button>
          )}

          {!check.ok && amount !== null && 'code' in check && check.code !== 'invalid_amount' && <p className="text-sm font-bold text-[#c2410c]">{t(`err.${check.code}` as TKey)}</p>}
          {note && (
            <p role="status" className={`rounded-2xl px-4 py-3 text-sm font-semibold ${checking ? 'bg-sky-soft text-navy' : phase === 'failed' || phase === 'invalid' ? 'bg-[#ffe9e2] text-[#9a3412]' : 'bg-leaf-soft text-leaf-deep'}`}>
              {note}
            </p>
          )}
          {checking && !note && <p className="rounded-2xl bg-sky-soft px-4 py-3 text-sm font-semibold text-navy">{t('feed.checking')}</p>}

          {checking ? (
            <Button variant="navy" className="w-full" onClick={checkAgain}>
              {t('feed.checkAgain')}
            </Button>
          ) : (
            <Button variant="gold" className="w-full" onClick={save} disabled={!check.ok || (planting && !pool)} loading={busy}>
              {phase === 'approving' ? t('feed.waiting') : phase === 'confirming' ? t('feed.confirming') : t('feed.cta', { amount: label })}
            </Button>
          )}
        </div>
      )}
    </Sheet>
  )
}

function PoolPicker({ pools, loading, error, selected, onPick, onBack }: { pools: Pool[]; loading: boolean; error: boolean; selected?: string; onPick: (a: string) => void; onBack: () => void }) {
  const t = useT()
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onBack} className="press -ml-1 h-10 w-10 rounded-full text-2xl" aria-label={t('common.back')}>
          ←
        </button>
        <h2 className="text-2xl font-semibold">{t('pool.title')}</h2>
      </div>
      <p className="rounded-2xl bg-cream px-4 py-3 text-sm">{t('pool.explainer')}</p>
      {loading && (
        <div className="flex justify-center py-6">
          <Spinner className="h-7 w-7 text-navy" />
        </div>
      )}
      {error && <p className="text-sm text-[#9a3412]">{t('pool.unavailable')}</p>}
      <ul className="flex flex-col gap-2">
        {pools.map((p) => (
          <li key={p.address}>
            <button type="button" onClick={() => onPick(p.address)} disabled={!p.active} className={`press flex w-full items-center gap-3 rounded-2xl border-[2.5px] px-3 py-3 text-left ${selected === p.address ? 'border-navy bg-gold-soft' : 'border-mist bg-white'}`}>
              {p.logo ? <img src={p.logo} alt="" className="h-10 w-10 rounded-full bg-mist object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold font-display font-bold">{p.name.slice(0, 1)}</span>}
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-display font-semibold">
                  <span className="truncate">{p.name}</span>
                  {p.recommended && <span className="rounded-full bg-leaf px-2 py-0.5 text-[11px] text-white">{t('pool.recommended')}</span>}
                </span>
                <span className="block text-xs text-slate">
                  {p.feePct !== null ? `${p.feePct}% · ` : ''}
                  {t(p.payout === 'restake' ? 'pool.compounding' : p.payout === 'direct' ? 'pool.direct' : 'pool.none')}
                  {p.score !== null ? ` · ${t('pool.score', { score: Math.round(p.score * 100) / 100 })}` : ''}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
