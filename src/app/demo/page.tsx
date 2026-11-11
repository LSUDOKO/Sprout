'use client'
// /demo: the full app with a mock wallet and a fake chain. Clearly labeled, no real money.
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { signIn } from '@/lib/client/session'
import { useI18n } from '@/lib/i18n'
import { PetRig } from '@/components/pet/PetRig'
import { Button } from '@/components/ui/kit'

export default function DemoPage() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const [err, setErr] = useState<string | null>(null)
  const started = useRef(false)
  const start = async () => {
    setErr(null)
    try {
      const r = await signIn('demo', locale)
      if (r.ok) router.replace(r.isNew ? '/hatch' : '/')
      else setErr(r.message)
    } catch (e) {
      setErr((e as Error).message)
    }
  }
  useEffect(() => {
    if (started.current) return
    started.current = true
    start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-4 bg-navy px-8 text-center text-white">
      <PetRig stage="sprout" mood={err ? 'sad' : 'happy'} size={200} />
      <h1 className="text-3xl font-bold text-gold">{t('common.demoBanner')}</h1>
      <p className="text-white/80">{err ?? t('common.loading')}</p>
      {err && (
        <Button variant="gold" onClick={start}>
          {t('common.retry')}
        </Button>
      )}
    </main>
  )
}
