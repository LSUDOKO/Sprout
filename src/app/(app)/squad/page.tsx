'use client'
// S9 Squad list: my squads, create, join with code.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client/api'
import type { StageId } from '@/lib/game/config'
import { useT } from '@/lib/i18n'
import { PetRig, paletteFor } from '@/components/pet/PetRig'
import type { SquadDetail } from '@/components/squad/types'
import { Button, Card, ErrorState, Skeleton } from '@/components/ui/kit'
import { Sheet } from '@/components/ui/Sheet'

export default function SquadsPage() {
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['squads'], queryFn: () => api<{ squads: SquadDetail[] }>('/api/squads') })
  const [sheet, setSheet] = useState<'create' | 'join' | null>(null)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setErr(null)
    try {
      const r = sheet === 'create' ? await api<{ squad: SquadDetail }>('/api/squads', { body: { name: value.trim() } }) : await api<{ squad: SquadDetail }>('/api/squads/join', { body: { code: value.trim().toUpperCase() } })
      await qc.invalidateQueries({ queryKey: ['squads'] })
      setSheet(null)
      router.push(`/squad/${r.squad.id}`)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-dvh bg-sky-soft px-4 pt-[calc(var(--safe-top)+20px)] pb-6">
      <h1 className="mb-4 px-1 text-[38px] font-bold text-ink">{t('squad.title')}</h1>
      {q.isLoading && <Skeleton className="h-40 w-full" />}
      {q.isError && <ErrorState title={t('common.error')} onRetry={() => q.refetch()} retryLabel={t('common.retry')} />}
      {q.data && q.data.squads.length === 0 && (
        <Card className="flex flex-col items-center gap-2 text-center">
          <img src="/art/pose-wave.webp" alt="" className="h-32 w-auto" />
          <h2 className="text-2xl font-semibold">{t('squad.empty')}</h2>
          <p className="text-ink/80">{t('squad.emptyBody')}</p>
        </Card>
      )}
      <ul className="flex flex-col gap-3">
        {q.data?.squads.map((s) => (
          <li key={s.id}>
            <Link href={`/squad/${s.id}`} className="press block rounded-[24px] bg-white p-4 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <h2 className="truncate text-xl font-semibold">{s.name}</h2>
                <span className="font-display text-lg font-bold">🔥 {s.streak}</span>
              </div>
              <p className="text-sm text-slate">{t('squad.members', { n: s.members.length })}</p>
              <div className="mt-2 flex -space-x-2">
                {s.members.slice(0, 8).map((m) => (
                  <PetRig key={m.userId} stage={m.stage as StageId} mood="content" size={44} palette={paletteFor(m.userId, m.isMe)} animated={false} title={m.name} />
                ))}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-3">
        <Button variant="navy" onClick={() => (setSheet('create'), setValue(''), setErr(null))}>
          {t('squad.create')}
        </Button>
        <Button variant="white" onClick={() => (setSheet('join'), setValue(''), setErr(null))}>
          {t('squad.join')}
        </Button>
        <Link href="/leaderboard" className="press mt-1 text-center font-display text-lg font-semibold text-navy underline underline-offset-4">
          🏆 {t('lb.title')}
        </Link>
      </div>
      <Sheet open={!!sheet} onClose={() => setSheet(null)} label={sheet === 'create' ? t('squad.createTitle') : t('squad.joinTitle')}>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <h2 className="text-2xl font-semibold">{sheet === 'create' ? t('squad.createTitle') : t('squad.joinTitle')}</h2>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={sheet === 'create' ? 32 : 6}
            placeholder={sheet === 'create' ? t('squad.namePlaceholder') : t('squad.codePlaceholder')}
            aria-label={sheet === 'create' ? t('squad.namePlaceholder') : t('squad.codePlaceholder')}
            className={`h-14 rounded-2xl border-[2.5px] border-navy px-4 font-display text-xl font-semibold outline-none ${sheet === 'join' ? 'text-center tracking-[0.3em] uppercase' : ''}`}
          />
          {err && <p className="text-sm font-bold text-[#c2410c]">{err}</p>}
          <Button type="submit" variant="gold" disabled={sheet === 'create' ? !value.trim() : value.trim().length !== 6} loading={busy}>
            {sheet === 'create' ? t('squad.create') : t('join.cta')}
          </Button>
        </form>
      </Sheet>
    </main>
  )
}
