'use client'
// S1 Onboarding: 3 skippable slides, then Connect Nimiq Pay (sign-in with a signed challenge).
import { AnimatePresence, motion } from 'motion/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { signIn } from '@/lib/client/session'
import { hostNetwork, isInNimiqPay } from '@/lib/nimiq/wallet'
import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui/kit'

const BG = ['bg-sky-soft', 'bg-cream', 'bg-[#dff3ea]', 'bg-cream']

export function Onboarding() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const next = useSearchParams().get('next')
  const [i, setI] = useState(0)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; notInApp?: boolean } | null>(null)
  const appUrl = typeof window === 'undefined' ? '' : window.location.host

  async function connect() {
    setBusy(true)
    setMsg(null)
    const expected = process.env.NEXT_PUBLIC_NIMIQ_NETWORK ?? 'mainnet'
    const host = hostNetwork()
    if (host && host !== expected) {
      setBusy(false)
      return setMsg({ text: t('onb.wrongNetwork', { expected }) })
    }
    try {
      const r = await signIn('nimiq', locale)
      if (r.ok) return router.replace(r.isNew ? '/hatch' : next && next.startsWith('/') ? next : '/')
      if (r.kind === 'cancelled') setMsg({ text: t('onb.cancelled') })
      else if (r.kind === 'not_in_app' || !isInNimiqPay()) setMsg({ text: t('onb.notInAppBody'), notInApp: true })
      else if (r.kind === 'unsupported') setMsg({ text: t('onb.unsupported') })
      else setMsg({ text: r.message })
    } catch (e) {
      setMsg({ text: (e as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const slides = [
    { title: t('onb.1.title'), body: t('onb.1.body'), art: <SlideGrow /> },
    { title: t('onb.2.title'), body: t('onb.2.body'), art: <SlideStages t={t} /> },
    { title: t('onb.3.title'), body: t('onb.3.body'), art: <img src="/art/onboard-safe.webp" alt="" className="mx-auto h-60 w-auto" /> },
  ]
  const last = i === slides.length
  return (
    <main className={`mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pt-[calc(var(--safe-top)+20px)] pb-[calc(var(--safe-bottom)+24px)] transition-colors duration-500 ${BG[i]}`}>
      <div className="flex h-10 justify-end">
        {!last && (
          <button type="button" onClick={() => setI(slides.length)} className="press font-display font-semibold text-slate">
            {t('onb.skip')}
          </button>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.section key={i} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.28 }} className="flex flex-1 flex-col text-center">
          {!last ? (
            <>
              <h1 className="mt-4 text-[38px] font-bold leading-[1.1] text-ink">{slides[i]!.title}</h1>
              <p className="mx-auto mt-4 max-w-[300px] text-[21px] leading-snug text-ink/85">{slides[i]!.body}</p>
              <div className="my-auto py-6">{slides[i]!.art}</div>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-[38px] font-bold leading-[1.1] text-ink">{t('onb.connectTitle')}</h1>
              <p className="mx-auto mt-4 max-w-[310px] text-lg text-ink/85">{t('onb.connectBody')}</p>
              <div className="my-auto py-4">
                <img src="/art/pose-phone.webp" alt="" className="mx-auto h-56 w-auto" />
              </div>
              {msg && (
                <div role="alert" className="mb-4 rounded-2xl bg-white p-4 text-left shadow-[var(--shadow-card)]">
                  {msg.notInApp && <h2 className="mb-1 text-lg font-semibold">{t('onb.notInApp')}</h2>}
                  <p className="text-ink/85">{msg.text}</p>
                  {msg.notInApp && (
                    <div className="mt-3 flex flex-col gap-2">
                      <a href={`https://nimpay.app/miniapps/open/${appUrl}`} className="press rounded-full bg-gold py-3 text-center font-display font-semibold shadow-[var(--shadow-gold)]">
                        {t('onb.openInApp')}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </motion.section>
      </AnimatePresence>

      <div className="flex flex-col items-center gap-4">
        {last ? (
          <>
            <Button variant="navy" className="w-full max-w-sm" onClick={connect} loading={busy}>
              {busy ? t('onb.connecting') : t('onb.connect')}
            </Button>
            <Link href="/demo" className="press font-display text-lg font-semibold text-navy underline decoration-2 underline-offset-4">
              {t('onb.tryDemo')}
            </Link>
          </>
        ) : (
          <Button variant="navy" className="w-full max-w-[280px]" onClick={() => setI(i + 1)}>
            {i === 0 ? t('onb.getStarted') : t('onb.next')}
          </Button>
        )}
        <div className="flex gap-2.5" aria-label={`${Math.min(i + 1, 4)} / 4`}>
          {[0, 1, 2, 3].map((d) => (
            <button key={d} type="button" aria-label={`${d + 1}`} onClick={() => setI(d)} className={`h-3 w-3 rounded-full transition-colors ${d === i ? 'bg-navy' : 'bg-slate/40'}`} />
          ))}
        </div>
      </div>
    </main>
  )
}

function SlideGrow() {
  return (
    <div className="relative mx-auto h-64 w-full max-w-[340px]">
      <div className="absolute inset-x-0 bottom-0 h-20 rounded-[50%] bg-[#bfe39a]" />
      <img src="/art/pose-coin-jar.webp" alt="" className="absolute bottom-6 left-1/2 h-56 w-auto -translate-x-1/2 animate-[float_3.2s_ease-in-out_infinite]" />
    </div>
  )
}

function SlideStages({ t }: { t: (k: 'stage.seed' | 'stage.sprout' | 'stage.bloom' | 'stage.grove') => string }) {
  const stages = [
    ['seed', 'h-16'],
    ['sprout', 'h-24'],
    ['bloom', 'h-28'],
    ['grove', 'h-36'],
  ] as const
  return (
    <div className="relative">
      <div className="absolute inset-x-0 bottom-9 h-6 rounded-[50%] bg-[#c8e6a0]" />
      <div className="relative flex items-end justify-between gap-1">
        {stages.map(([s, h], i) => (
          <motion.div key={s} className="flex flex-1 flex-col items-center gap-2" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * i }}>
            <img src={`/art/stage-${s}.webp`} alt="" className={`${h} w-auto`} />
            <span className="rounded-full border border-gold/50 bg-gold-soft px-3 py-0.5 font-display text-sm font-semibold">{t(`stage.${s}`)}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
