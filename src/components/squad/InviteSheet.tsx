'use client'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { Button } from '../ui/kit'
import { Sheet } from '../ui/Sheet'
import type { SquadDetail } from './types'

export function InviteSheet({ squad, open, onClose }: { squad: SquadDetail; open: boolean; onClose: () => void }) {
  const t = useT()
  const toast = useUi((s) => s.toast)
  const [qr, setQr] = useState<string | null>(null)
  const link = squad.inviteUrl.deepLink
  useEffect(() => {
    if (open) QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: '#1F2348', light: '#FFFFFF' } }).then(setQr).catch(() => setQr(null))
  }, [open, link])
  const share = async () => {
    const text = `Join my Sprout squad "${squad.name}" — code ${squad.inviteCode}`
    try {
      if (navigator.share) return await navigator.share({ title: 'Sprout squad', text, url: link })
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
    await navigator.clipboard?.writeText(`${text} ${link}`).catch(() => {})
    toast(t('common.copied'), 'success')
  }
  return (
    <Sheet open={open} onClose={onClose} label={t('squad.inviteTitle')}>
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-2xl font-semibold">{t('squad.inviteTitle')}</h2>
        <p className="text-ink/80">{t('squad.inviteBody')}</p>
        {qr ? <img src={qr} alt={`QR: ${link}`} className="h-44 w-44 rounded-2xl border-[3px] border-navy" /> : <div className="skeleton h-44 w-44" />}
        <p className="font-display text-sm text-slate">{t('squad.code')}</p>
        <p className="font-display text-4xl font-bold tracking-[0.25em] text-navy">{squad.inviteCode}</p>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard?.writeText(link).catch(() => {})
            toast(t('common.copied'), 'success')
          }}
          className="press w-full truncate rounded-2xl bg-cream px-4 py-3 text-sm font-semibold"
        >
          {link}
        </button>
        <Button variant="navy" className="w-full" onClick={share}>
          {t('common.share')}
        </Button>
      </div>
    </Sheet>
  )
}
