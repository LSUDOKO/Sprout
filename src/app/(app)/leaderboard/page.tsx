'use client'
// S12 Leaderboard: ranked by consistency, never by amount.
import { useQuery } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { api } from '@/lib/client/api'
import type { StageId } from '@/lib/game/config'
import { useT } from '@/lib/i18n'
import { PetRig, paletteFor } from '@/components/pet/PetRig'
import type { SquadDetail } from '@/components/squad/types'
import { BackButton, ErrorState, Skeleton } from '@/components/ui/kit'

type Row = { rank: number; userId: string; name: string; petStage: string; cosmetics: { hat: string | null; neck: string | null; face: string | null }; consistencyPct: number; streak: number; isMe: boolean }

export default function Page() {
  return (
    <Suspense>
      <Leaderboard />
    </Suspense>
  )
}

function Leaderboard() {
  const t = useT()
  const router = useRouter()
  const sp = useSearchParams()
  const squads = useQuery({ queryKey: ['squads'], queryFn: () => api<{ squads: SquadDetail[] }>('/api/squads') })
  const squadId = sp.get('squad') ?? squads.data?.squads[0]?.id ?? null
  const [scope, setScope] = useState<'squad' | 'global'>(sp.get('squad') ? 'squad' : 'global')
  const q = useQuery({
    queryKey: ['lb', scope, squadId],
    queryFn: () => api<{ rows: Row[]; minWeeks: number }>(scope === 'squad' && squadId ? `/api/leaderboard?scope=squad&squadId=${squadId}` : '/api/leaderboard?scope=global'),
    enabled: scope === 'global' || !!squadId,
  })
  const rows = q.data?.rows ?? []
  const podium = [rows[1], rows[0], rows[2]]
  const rest = rows.slice(3)
  const me = rows.find((r) => r.isMe)

  return (
    <main className="min-h-dvh bg-sky-soft px-4 pt-[calc(var(--safe-top)+12px)] pb-6">
      <BackButton label={t('common.back')} />
      <h1 className="text-center text-[34px] font-bold leading-tight">{t('lb.title')}</h1>
      <p className="text-center text-lg text-ink/80">{t('lb.subtitle')}</p>
      <div className="mx-auto mt-3 flex w-fit rounded-full bg-white p-1 shadow-[var(--shadow-card)]" role="tablist">
        {(['squad', 'global'] as const).map((s) => (
          <button key={s} role="tab" aria-selected={scope === s} disabled={s === 'squad' && !squadId} onClick={() => (setScope(s), router.replace(s === 'squad' && squadId ? `/leaderboard?squad=${squadId}` : '/leaderboard'))} className={`press rounded-full px-5 py-2 font-display font-semibold ${scope === s ? 'bg-navy text-white' : 'text-ink'}`}>
            {t(s === 'squad' ? 'lb.squad' : 'lb.global')}
          </button>
        ))}
      </div>

      {q.isLoading && <Skeleton className="mt-6 h-72 w-full" />}
      {q.isError && <ErrorState title={t('common.error')} onRetry={() => q.refetch()} retryLabel={t('common.retry')} />}
      {q.data && rows.length === 0 && <p className="mt-10 text-center text-lg text-slate">{t('lb.empty', { n: q.data.minWeeks })}</p>}

      {rows.length > 0 && (
        <div className="relative mt-6 flex items-end justify-center gap-0 px-1">
          {podium.map((r, i) =>
            r ? (
              <div key={r.userId} className="flex flex-1 flex-col items-center">
                <div className="relative">
                  <Crown tone={r.rank} />
                  <PetRig stage={r.petStage as StageId} mood="happy" size={r.rank === 1 ? 104 : 86} palette={paletteFor(r.userId, r.isMe)} cosmetics={r.cosmetics} animated={false} title={r.name} />
                </div>
                <p className="max-w-full truncate font-display text-lg font-semibold">{r.name}</p>
                <p className="font-display text-base font-bold">{r.consistencyPct}%</p>
                <div className={`flex w-full items-center justify-center rounded-t-xl border-[3px] border-ink font-display text-4xl font-bold ${['h-20 bg-[#d4d7de]', 'h-28 bg-gold', 'h-16 bg-[#c98a5a]'][i]}`}>{r.rank}</div>
              </div>
            ) : (
              <div key={i} className="flex-1" />
            ),
          )}
        </div>
      )}
      <div className="-mx-4 h-6 rounded-[50%] bg-[#bfe39a]" />

      <ol className="mt-4 flex flex-col gap-2.5">
        {rest.map((r) => (
          <li key={r.userId} className={`flex items-center gap-3 rounded-full px-5 py-2.5 shadow-[var(--shadow-card)] ${r.isMe ? 'border-[3px] border-[#b98a1c] bg-gradient-to-r from-gold to-[#f8d26b]' : 'bg-white'}`}>
            <span className="w-6 font-display text-2xl font-bold">{r.rank}</span>
            <PetRig stage={r.petStage as StageId} mood="content" size={52} palette={paletteFor(r.userId, r.isMe)} cosmetics={r.cosmetics} animated={false} />
            <span className="min-w-0 flex-1 truncate font-display text-xl font-semibold">{r.isMe ? t('lb.you', { name: r.name }) : r.name}</span>
            <span className="font-display text-xl font-bold">{r.consistencyPct}%</span>
          </li>
        ))}
      </ol>
      {me && me.rank <= 3 && <p className="mt-3 text-center font-display font-semibold text-navy">🎉 {t('lb.you', { name: me.name })} · #{me.rank}</p>}
    </main>
  )
}

function Crown({ tone }: { tone: number }) {
  const fill = tone === 1 ? '#FFCB3D' : tone === 2 ? '#D9DDE6' : '#D99A6C'
  return (
    <svg viewBox="0 0 60 36" className="absolute -top-5 left-1/2 z-10 w-10 -translate-x-1/2" aria-hidden>
      <path d="M6 32 L4 6 L18 18 L30 2 L42 18 L56 6 L54 32 Z" fill={fill} stroke="#1B1B30" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  )
}
