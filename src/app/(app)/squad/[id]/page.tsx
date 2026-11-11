'use client'
// S9 Squad detail: squad streak, weekly savers, treats, invite, leaderboard.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client/api'
import type { StageId } from '@/lib/game/config'
import { useT } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { PetRig, paletteFor } from '@/components/pet/PetRig'
import { InviteSheet } from '@/components/squad/InviteSheet'
import type { SquadDetail } from '@/components/squad/types'
import { BackButton, Button, Card, ErrorState, Skeleton } from '@/components/ui/kit'

export default function SquadPage() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const openTreat = useUi((s) => s.openTreat)
  const [invite, setInvite] = useState(false)
  const [editing, setEditing] = useState(false)
  const q = useQuery({ queryKey: ['squad', id], queryFn: () => api<{ squad: SquadDetail }>(`/api/squads/${id}`), refetchInterval: 30_000 })
  const s = q.data?.squad
  const me = s?.members.find((m) => m.isMe)
  const isAdmin = me?.role === 'admin'

  async function remove(userId: string) {
    await api(`/api/squads/${id}/members/${userId}`, { method: 'DELETE' })
    await qc.invalidateQueries({ queryKey: ['squads'] })
    if (userId === me?.userId) router.replace('/squad')
    else q.refetch()
  }

  return (
    <main className="min-h-dvh bg-sky-soft px-4 pt-[calc(var(--safe-top)+12px)] pb-6">
      <div className="flex items-center gap-2">
        <BackButton href="/squad" label={t('common.back')} />
        <h1 className="truncate text-[30px] font-bold text-ink">{s ? t('squad.titleOne', { name: s.name }) : ''}</h1>
      </div>
      {q.isLoading && <Skeleton className="mt-4 h-64 w-full" />}
      {q.isError && <ErrorState title={t('common.error')} body={(q.error as Error).message} onRetry={() => q.refetch()} retryLabel={t('common.retry')} />}
      {s && (
        <div className="mt-3 flex flex-col gap-4">
          <Card className="relative overflow-hidden bg-cream py-6 text-center">
            <Sparkle className="top-3 left-4" />
            <Sparkle className="right-6 bottom-3 scale-75" />
            <Sparkle className="top-4 right-10 scale-50" />
            <p className="font-display text-[38px] font-bold">
              {t('squad.streak', { n: s.streak })} <span aria-hidden>🔥</span>
            </p>
          </Card>

          <Card className="relative">
            <h2 className="text-center text-[26px] font-semibold">{t('squad.weeklySavers')}</h2>
            <p className="text-center text-slate">{t('squad.savedThisWeek')}</p>
            {isAdmin && s.members.length > 1 && (
              <button type="button" onClick={() => setEditing(!editing)} className="press absolute top-5 right-5 text-sm font-bold text-navy underline">
                {editing ? t('common.done') : '✏️'}
              </button>
            )}
            <ul className="mt-3 flex flex-col gap-2">
              {s.members.map((m) => (
                <li key={m.userId} className="flex items-center gap-3">
                  <PetRig stage={m.stage as StageId} mood={m.keptThisWeek ? 'happy' : 'content'} size={58} palette={paletteFor(m.userId, m.isMe)} cosmetics={m.cosmetics} animated={false} title={m.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[22px] font-semibold">
                      {m.name}
                      {m.isMe && <span className="ml-1 text-sm text-slate">({t('common.you')})</span>}
                    </p>
                    <p className="text-xs text-slate">
                      🔥 {m.streak}
                      {m.role === 'admin' ? ` · ${t('squad.admin')}` : ''}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${m.keptThisWeek ? 'bg-leaf-soft text-ink' : 'bg-mist text-slate'}`}>
                    {m.keptThisWeek ? <span className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf text-xs text-white">✓</span> : '🕒'}
                    {m.keptThisWeek ? t('squad.saved') : t('squad.waiting')}
                  </span>
                  {isAdmin && editing && !m.isMe && (
                    <button type="button" onClick={() => remove(m.userId)} className="press text-xs text-slate underline" aria-label={`${t('squad.remove')} ${m.name}`}>
                      {t('squad.remove')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex items-center justify-between gap-2 py-4">
            <p className="font-display text-[22px] font-semibold">{t('squad.sendTreat')}</p>
            <img src="/art/pose-gift.webp" alt="" className="h-14 w-auto" />
            <button type="button" onClick={() => openTreat({ squadId: s.id })} disabled={s.members.length < 2} className="press rounded-full bg-navy px-5 py-2.5 font-display font-semibold text-white disabled:opacity-50">
              {t('squad.send')}
            </button>
          </Card>

          <Button variant="navy" onClick={() => setInvite(true)}>
            {t('squad.invite')}
          </Button>
          <Link href={`/leaderboard?squad=${s.id}`} className="press text-center font-display text-lg font-semibold text-navy underline underline-offset-4">
            🏆 {t('squad.leaderboard')}
          </Link>
          <button type="button" onClick={() => me && remove(me.userId)} className="press mx-auto text-sm text-slate underline">
            {t('squad.leave')}
          </button>
          <InviteSheet squad={s} open={invite} onClose={() => setInvite(false)} />
        </div>
      )}
    </main>
  )
}

const Sparkle = ({ className }: { className: string }) => (
  <svg viewBox="-14 -14 28 28" className={`absolute h-6 w-6 ${className}`} aria-hidden>
    <path d="M0 -14 C 2 -4 4 -2 14 0 C 4 2 2 4 0 14 C -2 4 -4 2 -14 0 C -4 -2 -2 -4 0 -14 Z" fill="#F6B221" />
  </svg>
)
