'use client'
// Squad invite landing (works inside and outside Nimiq Pay).
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ApiFail, api } from '@/lib/client/api'
import type { StageId } from '@/lib/game/config'
import { isInNimiqPay } from '@/lib/nimiq/wallet'
import { useT } from '@/lib/i18n'
import { PetRig, paletteFor } from '@/components/pet/PetRig'
import { Button, ErrorState, Skeleton } from '@/components/ui/kit'

type Preview = { name: string; memberCount: number; members: { name: string; stage: string; hat: string | null }[]; isDemo: boolean }

export default function JoinPage() {
  const t = useT()
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const q = useQuery({ queryKey: ['join', code], queryFn: () => api<Preview>(`/api/squads/by-code/${code}`), retry: false })

  async function join() {
    setBusy(true)
    setErr(null)
    try {
      const r = await api<{ squad: { id: string } }>('/api/squads/join', { body: { code } })
      router.replace(`/squad/${r.squad.id}`)
    } catch (e) {
      if (e instanceof ApiFail && e.status === 401) return router.push(`/onboarding?next=${encodeURIComponent(`/join/${code}`)}`)
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  const host = typeof window === 'undefined' ? '' : window.location.host
  const outside = typeof window !== 'undefined' && !isInNimiqPay()
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center bg-sky-soft px-6 pt-[calc(var(--safe-top)+48px)] pb-[calc(var(--safe-bottom)+24px)] text-center">
      {q.isLoading && <Skeleton className="h-60 w-full" />}
      {q.isError && <ErrorState title={t('join.notFound')} />}
      {q.data && (
        <>
          <h1 className="text-[36px] font-bold leading-tight">{t('join.title', { name: q.data.name })}</h1>
          <p className="mt-2 text-lg text-ink/80">{t('join.body', { n: q.data.memberCount })}</p>
          <div className="my-auto flex flex-wrap justify-center gap-1 py-8">
            {q.data.members.map((m, i) => (
              <figure key={i} className="flex flex-col items-center">
                <PetRig stage={m.stage as StageId} mood="happy" size={76} palette={paletteFor(m.name + i)} cosmetics={{ hat: m.hat }} animated={false} />
                <figcaption className="font-display text-sm font-semibold">{m.name}</figcaption>
              </figure>
            ))}
          </div>
          {err && <p className="mb-3 font-bold text-[#c2410c]">{err}</p>}
          <Button variant="gold" className="w-full" onClick={join} loading={busy}>
            {t('join.cta')}
          </Button>
          {outside && !q.data.isDemo && (
            <a href={`https://nimpay.app/miniapps/open/${host}/join/${code}`} className="press mt-4 font-display text-lg font-semibold text-navy underline underline-offset-4">
              {t('onb.openInApp')}
            </a>
          )}
        </>
      )}
    </main>
  )
}
