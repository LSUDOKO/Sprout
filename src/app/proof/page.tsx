'use client'
// S17 Public proof page: latest verified real saves with explorer links.
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/client/api'
import { formatNim, fromWire } from '@/lib/nimiq/luna'
import { useT } from '@/lib/i18n'
import { BackButton, ErrorState, Skeleton } from '@/components/ui/kit'

type Proof = { rows: { petName: string; valueLuna: string; at: number | null; txHash: string; kind: string }[]; totals: { savers: number; saves: number; totalLuna: string } }
const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_TX_URL ?? 'https://chaintracer.app/tx/{hash}'

export default function ProofPage() {
  const t = useT()
  const q = useQuery({ queryKey: ['proof'], queryFn: () => api<Proof>('/api/proof') })
  return (
    <main className="mx-auto min-h-dvh max-w-[480px] bg-cream px-4 pt-[calc(var(--safe-top)+12px)] pb-10">
      <BackButton label={t('common.back')} />
      <h1 className="text-[36px] font-bold">{t('proof.title')}</h1>
      <p className="text-ink/80">{t('proof.body')}</p>
      {q.isLoading && <Skeleton className="mt-4 h-60 w-full" />}
      {q.isError && <ErrorState title={t('common.error')} onRetry={() => q.refetch()} retryLabel={t('common.retry')} />}
      {q.data && (
        <>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            {[
              [t('proof.savers'), q.data.totals.savers.toLocaleString()],
              [t('proof.saves'), q.data.totals.saves.toLocaleString()],
              [t('proof.total'), formatNim(fromWire(q.data.totals.totalLuna), 0)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white p-3 shadow-[var(--shadow-card)]">
                <dd className="font-display text-2xl font-bold">{v}</dd>
                <dt className="text-xs text-slate">{k}</dt>
              </div>
            ))}
          </dl>
          {q.data.rows.length === 0 ? (
            <p className="mt-8 text-center text-slate">{t('proof.empty')}</p>
          ) : (
            <ul className="mt-4 divide-y divide-mist overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-card)]">
              {q.data.rows.map((r) => (
                <li key={r.txHash} className="flex items-center gap-3 px-4 py-3">
                  <span className="text-xl" aria-hidden>
                    🌱
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display font-semibold">{r.petName}</span>
                    <span className="text-xs text-slate">{r.at ? new Date(r.at).toLocaleString() : ''}</span>
                  </span>
                  <span className="font-display font-bold">{formatNim(fromWire(r.valueLuna))} NIM</span>
                  <a href={EXPLORER.replace('{hash}', r.txHash)} target="_blank" rel="noreferrer" className="text-sm font-bold text-navy underline">
                    {t('proof.view')}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
