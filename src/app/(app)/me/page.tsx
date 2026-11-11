'use client'
// S15 Profile & settings (+ demo tools when in demo mode).
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { api } from '@/lib/client/api'
import { meKey, useMe } from '@/lib/client/hooks'
import { signOut } from '@/lib/client/session'
import type { StageId } from '@/lib/game/config'
import { shortAddress } from '@/lib/nimiq/address'
import { formatNim, fromWire } from '@/lib/nimiq/luna'
import { LOCALES, useI18n, type Locale } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { PetRig } from '@/components/pet/PetRig'
import { Button, Card } from '@/components/ui/kit'

export default function MePage() {
  const { t, override, setOverride } = useI18n()
  const router = useRouter()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const sound = useUi((s) => s.sound)
  const setSound = useUi((s) => s.setSound)
  const toast = useUi((s) => s.toast)
  const setLinkPrompt = useUi((s) => s.setLinkPrompt)
  const [name, setName] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  if (!me?.pet) return null

  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: meKey }), qc.invalidateQueries({ queryKey: ['squads'] }), qc.invalidateQueries({ queryKey: ['inbox'] })])
  async function demo(path: string, done: string) {
    setBusy(path)
    try {
      await api(`/api/demo/${path}`, { method: 'POST' })
      await refresh()
      toast(done, 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }
  async function rename() {
    if (!name?.trim()) return
    try {
      await api('/api/pet', { method: 'PATCH', body: { name } })
      await refresh()
      setName(null)
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  return (
    <main className="min-h-dvh bg-cream px-4 pt-[calc(var(--safe-top)+20px)] pb-6">
      <h1 className="px-1 text-[38px] font-bold">{t('me.title')}</h1>
      <Card className="mt-3 flex items-center gap-3">
        <PetRig stage={me.growth.stage as StageId} mood="happy" size={92} cosmetics={{ hat: me.pet.hat, neck: me.pet.neck, face: me.pet.face, effect: me.pet.effect }} animated={false} />
        <div className="min-w-0 flex-1">
          {name === null ? (
            <button type="button" onClick={() => setName(me.pet!.name)} className="press block max-w-full truncate text-left font-display text-2xl font-semibold" aria-label={t('me.petName')}>
              {me.pet.name} ✏️
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                rename()
              }}
              className="flex gap-2"
            >
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} aria-label={t('me.petName')} className="h-10 min-w-0 flex-1 rounded-xl border-2 border-navy px-3 font-display font-semibold" />
              <Button size="sm" type="submit">
                {t('common.save')}
              </Button>
            </form>
          )}
          <p className="text-slate">
            {t(`stage.${me.growth.stage}` as 'stage.seed')} · 🔥 {me.streak.current} · ✨ {me.sparks}
          </p>
        </div>
      </Card>

      {me.user.isDemo && (
        <Card className="mt-4 border-[3px] border-dashed border-gold bg-gold-soft/60">
          <h2 className="text-xl font-semibold">🧪 {t('me.demoTools')}</h2>
          <div className="mt-3 flex flex-col gap-2">
            <Button size="md" variant="navy" loading={busy === 'fast-forward'} onClick={() => demo('fast-forward', t('me.ffDone'))}>
              ⏩ {t('me.ffWeek')}
            </Button>
            <Button size="md" variant="white" loading={busy === 'treat'} onClick={() => demo('treat', '🎁')}>
              🎁 {t('me.simTreat')}
            </Button>
            <Button size="md" variant="white" loading={busy === 'rewards'} onClick={() => demo('rewards', t('me.rewardsDone'))}>
              🌙 {t('me.simRewards')}
            </Button>
          </div>
        </Card>
      )}

      <ul className="mt-4 flex flex-col overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-card)]">
        <Row href="/streak" label={t('me.streak')} value={`${formatNim(fromWire(me.user.goalLuna), 0)} NIM`} />
        <Row href="/leaderboard" label={t('me.leaderboard')} />
        <Row href="/collection" label={t('tab.collection')} />
        <Row label={t('me.pool')} value={me.pool?.name ?? (me.stake?.delegation ? shortAddress(me.stake.delegation) : '—')} />
        <Row
          label={t('me.language')}
          value={
            <select value={override ?? ''} onChange={(e) => setOverride((e.target.value || null) as Locale | null)} className="rounded-lg bg-cream px-2 py-1 font-semibold" aria-label={t('me.language')}>
              <option value="">{t('me.languageAuto')}</option>
              {Object.entries(LOCALES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          }
        />
        <Row
          label={t('me.sound')}
          value={
            <button type="button" role="switch" aria-checked={sound} onClick={() => setSound(!sound)} className={`relative h-8 w-14 rounded-full transition-colors ${sound ? 'bg-leaf' : 'bg-mist'}`}>
              <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${sound ? 'left-7' : 'left-1'}`} />
            </button>
          }
        />
      </ul>

      <Card className="mt-4">
        <h2 className="font-display text-lg font-semibold">{t('me.addresses')}</h2>
        <ul className="mt-1 text-sm text-slate">
          {me.user.addresses.map((a) => (
            <li key={a} className="font-mono">
              {shortAddress(a)}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setLinkPrompt(true)} className="press mt-2 text-sm font-bold text-navy underline">
          {t('me.linkAnother')}
        </button>
      </Card>

      <div className="mt-4 flex flex-col gap-3">
        <Link href="/withdraw" className="press flex h-14 items-center justify-center rounded-full border-[3px] border-navy font-display text-lg font-semibold">
          {t('me.withdraw')}
        </Link>
        <Link href="/proof" className="press text-center font-display font-semibold text-navy underline underline-offset-4">
          {t('me.proof')}
        </Link>
      </div>

      <details className="mt-4 rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)]">
        <summary className="cursor-pointer font-display font-semibold">{t('me.privacy')}</summary>
        <p className="mt-2 text-sm text-ink/80">{t('me.privacyBody')}</p>
      </details>
      <details className="mt-3 rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)]">
        <summary className="cursor-pointer font-display font-semibold">{t('me.credits')}</summary>
        <p className="mt-2 text-sm text-ink/80">Sprout character, art and code: original, MIT. Fonts: Fredoka & Nunito (OFL). Confetti: canvas-confetti (ISC). Built on the Nimiq Pay Mini App SDK (MIT).</p>
      </details>

      <Button
        variant="ghost"
        className="mt-4 w-full text-slate"
        onClick={async () => {
          await signOut()
          qc.clear()
          router.replace(me.user.isDemo ? '/onboarding' : '/onboarding')
        }}
      >
        {me.user.isDemo ? t('me.exitDemo') : t('me.signOut')}
      </Button>
    </main>
  )
}

function Row({ label, value, href }: { label: string; value?: ReactNode; href?: string }) {
  const inner = (
    <>
      <span className="font-display text-lg font-semibold">{label}</span>
      <span className="flex items-center gap-2 text-slate">
        {value}
        {href && <span aria-hidden>›</span>}
      </span>
    </>
  )
  return (
    <li className="border-b border-mist last:border-0">
      {href ? (
        <Link href={href} className="press flex items-center justify-between px-5 py-4">
          {inner}
        </Link>
      ) : (
        <div className="flex items-center justify-between px-5 py-4">{inner}</div>
      )}
    </li>
  )
}
