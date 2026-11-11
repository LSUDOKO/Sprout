'use client'
// S2 Name your Sprout.
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { api } from '@/lib/client/api'
import { meKey } from '@/lib/client/hooks'
import { PET_NAME_MAX, PET_NAME_SUGGESTIONS } from '@/lib/game/config'
import { useT } from '@/lib/i18n'
import { PetRig } from '@/components/pet/PetRig'
import { Button } from '@/components/ui/kit'

const count = (s: string) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s.trim())].length

export default function HatchPage() {
  const t = useT()
  const router = useRouter()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const n = count(name)
  const valid = n >= 1 && n <= PET_NAME_MAX

  async function hatch() {
    if (!valid) return
    setBusy(true)
    setErr(null)
    try {
      await api('/api/pet', { method: 'PATCH', body: { name: name.trim() } })
      await qc.invalidateQueries({ queryKey: meKey })
      router.replace('/')
    } catch (e) {
      const status = (e as { status?: number }).status
      if (status === 401) router.replace('/onboarding')
      setErr((e as Error).message)
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center bg-gradient-to-b from-sky-soft to-cream px-6 pt-[calc(var(--safe-top)+40px)] pb-[calc(var(--safe-bottom)+24px)] text-center">
      <h1 className="text-[38px] font-bold text-ink">{t('hatch.title')}</h1>
      <div className="relative my-auto">
        <PetRig stage="seed" mood="happy" size={240} />
        {/* pot */}
        <svg viewBox="0 0 200 90" className="mx-auto -mt-16 w-44" aria-hidden>
          <path d="M18 8 h164 l-18 76 h-128 z" fill="#E07B45" stroke="#1B1B30" strokeWidth="6" strokeLinejoin="round" />
          <rect x="8" y="4" width="184" height="22" rx="8" fill="#F59A5B" stroke="#1B1B30" strokeWidth="6" />
        </svg>
      </div>
      <form
        className="flex w-full flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          hatch()
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('hatch.placeholder')}
          aria-label={t('hatch.placeholder')}
          maxLength={48}
          className="h-16 w-full rounded-2xl border-[3px] border-navy bg-white px-5 text-center font-display text-2xl font-semibold outline-none"
        />
        <p className={`-mt-2 text-sm ${n > PET_NAME_MAX ? 'font-bold text-[#c2410c]' : 'text-slate'}`}>{t('hatch.hint')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {PET_NAME_SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => setName(s)} className={`press rounded-full px-4 py-2 font-display font-semibold ${name === s ? 'bg-navy text-white' : 'bg-white text-ink shadow-[var(--shadow-card)]'}`}>
              {s}
            </button>
          ))}
        </div>
        {err && <p className="text-sm font-bold text-[#c2410c]">{err}</p>}
        <Button type="submit" variant="gold" disabled={!valid} loading={busy}>
          {t('hatch.cta')} 🐣
        </Button>
      </form>
    </main>
  )
}
