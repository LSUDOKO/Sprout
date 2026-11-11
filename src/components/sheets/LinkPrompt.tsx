'use client'
// Nimiq Pay may pay from a different account: link it by signing a fresh challenge (docs/03 §3.4).
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { meKey } from '@/lib/client/hooks'
import { getMode, linkAccount } from '@/lib/client/session'
import { useT } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { Button } from '../ui/kit'
import { Sheet } from '../ui/Sheet'

export function LinkPrompt() {
  const t = useT()
  const qc = useQueryClient()
  const open = useUi((s) => s.linkPrompt)
  const set = useUi((s) => s.setLinkPrompt)
  const toast = useUi((s) => s.toast)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const link = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await linkAccount(getMode())
      if (!r.ok) return setMsg(r.kind === 'cancelled' ? t('onb.cancelled') : r.message)
      toast(t('link.done'), 'success')
      set(false)
      await qc.invalidateQueries({ queryKey: meKey })
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet open={open} onClose={() => set(false)} label={t('link.title')}>
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/art/pose-phone.webp" alt="" className="h-36 w-auto" />
        <h2 className="text-2xl font-semibold">{t('link.title')}</h2>
        <p className="text-ink/80">{t('link.body')}</p>
        {msg && <p className="rounded-2xl bg-cream px-4 py-2 text-sm font-semibold">{msg}</p>}
        <Button variant="navy" className="w-full" onClick={link} loading={busy}>
          {t('link.cta')}
        </Button>
      </div>
    </Sheet>
  )
}
