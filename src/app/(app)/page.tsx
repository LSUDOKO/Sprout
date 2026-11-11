'use client'
// S3 Home: garden scene + pet, progress to next stage, savings, weekly goal, squad.
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/client/api'
import { useMe } from '@/lib/client/hooks'
import { readChecking } from '@/lib/client/txFlow'
import type { StageId } from '@/lib/game/config'
import { formatDelta, formatNim, fromWire } from '@/lib/nimiq/luna'
import { useT } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { GardenScene } from '@/components/pet/GardenScene'
import { Pet } from '@/components/pet/Pet'
import { PetRig, paletteFor } from '@/components/pet/PetRig'
import { Button, Card, ProgressBar } from '@/components/ui/kit'
import type { SquadDetail } from '@/components/squad/types'

export default function HomePage() {
  const t = useT()
  const { data: me } = useMe()
  const openFeed = useUi((s) => s.openFeed)
  const openTreat = useUi((s) => s.openTreat)
  const squads = useQuery({ queryKey: ['squads'], queryFn: () => api<{ squads: SquadDetail[] }>('/api/squads'), enabled: !!me })
  if (!me?.pet) return null

  const g = me.growth
  const stage = g.stage as StageId
  const stake = me.stake ? fromWire(me.stake.totalLuna) : 0n
  const planted = !!me.stake?.planted
  const earned = me.stake?.earnedLuna != null ? fromWire(me.stake.earnedLuna) : null
  const weekSaved = fromWire(me.week.savedLuna)
  const weekGoal = fromWire(me.week.goalLuna)
  const pending = me.pendingSaves.length > 0
  const checking = typeof window !== 'undefined' && !!readChecking()
  const squad = squads.data?.squads[0]

  const progressLabel = !g.next
    ? t('home.topStage', { stage: t(`stage.${stage}`), saved: formatNim(stake) })
    : g.blocker?.kind === 'weeks'
      ? t(g.blocker.needWeeks === 1 ? 'home.weeksBlocker' : 'home.weeksBlockerPlural', { n: g.blocker.needWeeks })
      : t('home.toNext', { saved: formatNim(stake, 0), target: formatNim(fromWire(g.next.minStake), 0), stage: t(`stage.${g.next.id}`) })

  const resets = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(me.week.resetAt))

  return (
    <main>
      {/* Scene */}
      <section className="relative overflow-hidden rounded-b-[40px] pt-[var(--safe-top)]" style={{ minHeight: 470 }}>
        <GardenScene stage={stage} background={me.pet.background} />
        <header className="relative z-10 flex items-start justify-between px-5 pt-4">
          <h1 className="text-[44px] font-bold leading-none text-navy">{t('app.name')}</h1>
          <div className="flex flex-col items-end gap-1.5">
            <Link href="/streak" className="press flex items-center gap-1.5 rounded-2xl bg-white/80 px-3.5 py-2 font-display text-2xl font-bold text-ink shadow-[var(--shadow-card)] backdrop-blur" aria-label={t('home.streakChip', { n: me.streak.current })}>
              <span aria-hidden>🔥</span>
              {me.streak.current}
            </Link>
            <Link href="/shop" className="press flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-ink" aria-label={t('shop.sparks', { n: me.sparks })}>
              ✨ {me.sparks}
            </Link>
          </div>
        </header>
        <div className="relative z-10 mt-1 flex justify-center">
          <Pet me={me} size={250} />
        </div>
        <div className="relative z-10 mx-auto -mt-1 w-[84%] pb-6 text-center">
          <p className="font-display text-[30px] font-bold text-ink drop-shadow-[0_2px_0_rgba(255,255,255,.7)]">{t('home.planted', { name: me.pet.name, stage: t(`stage.${stage}`) })}</p>
          <div className="relative mt-2">
            <ProgressBar value={g.progress} label={progressLabel} className="h-4 border-[2.5px] border-ink/80 bg-white/90" />
          </div>
          <p className="mt-1.5 font-display text-lg font-semibold text-ink">{progressLabel}</p>
        </div>
      </section>

      <div className="flex flex-col gap-4 px-4 pt-5">
        {(pending || checking) && (
          <p role="status" className="flex items-center justify-center gap-2 rounded-full bg-sky-soft px-4 py-2 text-sm font-bold text-navy">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-navy" />
            {checking ? t('home.checking') : t('home.confirming')}
          </p>
        )}

        {/* Savings */}
        {planted || (me.stake?.hasStaker ?? false) ? (
          <Card className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg text-ink">{t('home.saved')}</p>
              <p className="font-display text-[44px] font-bold leading-tight text-ink">{formatNim(stake)} NIM</p>
              <p className="text-[17px] text-ink">
                {t('home.earned')} <span className={`font-bold ${earned === null ? 'text-slate' : 'text-leaf-deep'}`}>{earned === null ? t('common.notKnown') : `${formatDelta(earned)} NIM`}</span>
              </p>
            </div>
            <button type="button" onClick={() => openFeed(true)} aria-label={t('home.feed')} className="press flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#3d4f9b] text-white shadow-[0_6px_0_0_#232c63]">
              <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>
          </Card>
        ) : (
          <Card className="flex flex-col items-center gap-3 text-center">
            <img src="/art/pose-coin-jar.webp" alt="" className="h-28 w-auto" />
            <h2 className="text-2xl font-semibold">{t('home.plantTitle')}</h2>
            <p className="text-ink/80">{t('home.plantBody')}</p>
            <Button variant="gold" className="w-full" onClick={() => openFeed(true)}>
              {t('home.plantCta')}
            </Button>
          </Card>
        )}

        {/* Weekly goal */}
        <Card>
          <Link href="/streak" className="block">
            <div className="flex items-baseline justify-between">
              <p className="text-xl text-ink">{t('home.weeklyGoal')}</p>
              <p className="font-display text-2xl font-bold">
                {formatNim(weekSaved, 0)} / {formatNim(weekGoal, 0)} NIM
              </p>
            </div>
            <ProgressBar value={weekGoal > 0n ? Number((weekSaved * 1000n) / weekGoal) / 1000 : 0} tone="sky" className="mt-3" label={t('home.weeklyGoal')} />
            <p className="mt-2 text-sm text-slate">{t('home.resets', { when: resets })}</p>
          </Link>
        </Card>

        {/* Squad */}
        {squad ? (
          <Card>
            <Link href={`/squad/${squad.id}`} className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">{squad.name}</h2>
              <span className="font-display font-bold">🔥 {squad.streak}</span>
            </Link>
            <ul className="mt-3 flex gap-1">
              {squad.members.slice(0, 6).map((m) => (
                <li key={m.userId} className="relative">
                  <PetRig stage={m.stage as StageId} mood={m.keptThisWeek ? 'happy' : 'content'} size={48} palette={paletteFor(m.userId, m.isMe)} cosmetics={m.cosmetics} animated={false} title={m.name} />
                  <span className={`absolute -right-0.5 -bottom-0.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${m.keptThisWeek ? 'bg-leaf text-white' : 'bg-mist text-slate'}`}>{m.keptThisWeek ? '✓' : '⏳'}</span>
                </li>
              ))}
            </ul>
            <Button variant="navy" size="md" className="mt-4 w-full" onClick={() => openTreat({ squadId: squad.id })}>
              🎁 {t('home.sendTreat')}
            </Button>
          </Card>
        ) : (
          squads.isSuccess && (
            <Card className="flex items-center gap-3">
              <img src="/art/pose-wave.webp" alt="" className="h-20 w-auto" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold">{t('home.noSquad')}</h2>
                <p className="text-sm text-slate">{t('home.noSquadBody')}</p>
              </div>
              <Link href="/squad" className="press rounded-full bg-navy px-4 py-2 font-display font-semibold text-white">
                {t('home.startSquad')}
              </Link>
            </Card>
          )
        )}
      </div>
    </main>
  )
}
