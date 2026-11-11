'use client'
// Auth/onboarding gate for the tabbed app + global overlays and background verification.
import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { ApiFail, api } from '@/lib/client/api'
import { meKey, useMe } from '@/lib/client/hooks'
import { getMode } from '@/lib/client/session'
import { pollSave, readChecking } from '@/lib/client/txFlow'
import { hostNetwork } from '@/lib/nimiq/wallet'
import { formatNim, fromWire } from '@/lib/nimiq/luna'
import { useT } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { Evolution } from './celebrate/Evolution'
import { SaveSuccess } from './celebrate/SaveSuccess'
import { FeedSheet } from './sheets/FeedSheet'
import { LinkPrompt } from './sheets/LinkPrompt'
import { TreatReceived } from './sheets/TreatReceived'
import { TreatSheet } from './sheets/TreatSheet'
import { TabBar } from './TabBar'
import { ErrorState, Skeleton } from './ui/kit'
import { WrongNetwork } from './WrongNetwork'

export function AppGate({ children }: { children: ReactNode }) {
  const t = useT()
  const router = useRouter()
  const path = usePathname()
  const qc = useQueryClient()
  const me = useMe()
  const toast = useUi((s) => s.toast)
  const setLinkPrompt = useUi((s) => s.setLinkPrompt)
  const visited = useRef(false)
  const watching = useRef(new Set<string>())

  const unauthorized = me.error instanceof ApiFail && me.error.status === 401
  useEffect(() => {
    if (unauthorized) router.replace(`/onboarding${path && path !== '/' ? `?next=${encodeURIComponent(path)}` : ''}`)
    else if (me.data && !me.data.pet) router.replace('/hatch')
  }, [unauthorized, me.data, router, path])

  // "While you slept, Sprout grew" — once per app open.
  useEffect(() => {
    if (!me.data?.pet || visited.current) return
    visited.current = true
    api<{ earnedDeltaLuna: string | null }>('/api/me/visit', { method: 'POST' })
      .then((r) => {
        if (r.earnedDeltaLuna && fromWire(r.earnedDeltaLuna) > 0n) toast(t('home.grewOvernight', { amount: '+' + formatNim(fromWire(r.earnedDeltaLuna)) }), 'success')
      })
      .catch(() => {})
  }, [me.data?.pet, t, toast])

  // Keep verifying saves that were registered but not yet confirmed (e.g. the app was closed).
  useEffect(() => {
    for (const s of me.data?.pendingSaves ?? []) {
      if (watching.current.has(s.id)) continue
      watching.current.add(s.id)
      pollSave(s.id)
        .then((r) => {
          if (r.status === 'needs_link') setLinkPrompt(true)
          qc.invalidateQueries({ queryKey: meKey })
        })
        .catch(() => {})
        .finally(() => watching.current.delete(s.id))
    }
  }, [me.data?.pendingSaves, qc, setLinkPrompt])

  const mode = typeof window === 'undefined' ? 'nimiq' : getMode()
  const host = typeof window === 'undefined' ? undefined : hostNetwork()
  const expected = process.env.NEXT_PUBLIC_NIMIQ_NETWORK ?? 'mainnet'
  if (mode === 'nimiq' && host && host !== expected) return <WrongNetwork expected={expected} />

  if (me.isError && !unauthorized)
    return (
      <main className="mx-auto min-h-dvh max-w-[480px]">
        <ErrorState title={t('common.error')} body={t('common.errorBody')} onRetry={() => me.refetch()} retryLabel={t('common.retry')} />
      </main>
    )

  if (!me.data?.pet)
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-4 p-5" aria-busy>
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-[330px] w-full rounded-[32px]" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-20 w-full" />
      </main>
    )

  const d = me.data
  return (
    <div className="mx-auto min-h-dvh max-w-[480px] pb-[calc(var(--safe-bottom)+96px)]">
      {d.user.isDemo && (
        <div className="sticky top-0 z-30 bg-navy py-1 pt-[calc(var(--safe-top)+4px)] text-center text-xs font-bold tracking-wide text-gold" role="note">
          {t('common.demoBanner')}
        </div>
      )}
      {!d.user.isDemo && !d.chainOk && <div className="bg-sky-soft px-4 py-2 text-center text-sm font-semibold text-navy">{t('common.chainDelayed')}</div>}
      {children}
      <TabBar />
      <FeedSheet me={d} />
      <TreatSheet me={d} />
      <TreatReceived me={d} />
      <LinkPrompt />
      <SaveSuccess me={d} />
      <Evolution me={d} />
      <CheckingWatcher />
    </div>
  )
}

/** On reopen, a save stuck in "checking" re-opens the feed sheet in its locked state. */
function CheckingWatcher() {
  const openFeed = useUi((s) => s.openFeed)
  useEffect(() => {
    if (readChecking()) openFeed(true)
  }, [openFeed])
  return null
}
