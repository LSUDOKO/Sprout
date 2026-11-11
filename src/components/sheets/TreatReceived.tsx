'use client'
// S11 Treat received: love mood, "Plant it" (add-stake) or "Say thanks" (in-app, no tx).
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { api, type Me } from '@/lib/client/api'
import { meKey } from '@/lib/client/hooks'
import { getMode, walletFor } from '@/lib/client/session'
import { pollSave } from '@/lib/client/txFlow'
import { canAddStake } from '@/lib/nimiq/invariants'
import { formatNim, fromWire } from '@/lib/nimiq/luna'
import { useT } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { Button } from '../ui/kit'
import { stakerFromMe } from './FeedSheet'

type InboxTreat = { id: string; valueLuna: string; note: string | null; fromName: string; seen: boolean; planted: boolean; thanked: boolean }

export function TreatReceived({ me }: { me: Me }) {
  const t = useT()
  const qc = useQueryClient()
  const celebrate = useUi((s) => s.celebrate)
  const toast = useUi((s) => s.toast)
  const [busy, setBusy] = useState<'plant' | 'thanks' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const inbox = useQuery({ queryKey: ['inbox'], queryFn: () => api<{ treats: InboxTreat[] }>('/api/treats/inbox'), refetchInterval: me.unseenTreats > 0 ? false : 20_000 })
  const treat = inbox.data?.treats.find((x) => !x.seen)
  const blocked = useUi((s) => !!s.celebration || !!s.evolution || s.feedOpen)

  const done = async () => {
    setMsg(null)
    await qc.invalidateQueries({ queryKey: ['inbox'] })
    await qc.invalidateQueries({ queryKey: meKey })
  }
  const dismiss = async () => {
    if (!treat) return
    await api(`/api/treats/${treat.id}/seen`, { method: 'POST' }).catch(() => {})
    await done()
  }
  const thanks = async () => {
    if (!treat) return
    setBusy('thanks')
    await api(`/api/treats/${treat.id}/thanks`, { method: 'POST' }).catch(() => {})
    toast(t('treat.thanked'), 'success')
    setBusy(null)
    await done()
  }
  const plant = async () => {
    if (!treat) return
    const value = fromWire(treat.valueLuna)
    const check = canAddStake(stakerFromMe(me), value)
    if (!check.ok) return setMsg(check.code === 'not_planted' ? t('treat.needStake') : check.message)
    setBusy('plant')
    const r = await walletFor(getMode()).stake({ value })
    if (!r.ok) {
      setBusy(null)
      return setMsg(r.kind === 'cancelled' ? t('feed.cancelled') : r.kind === 'unknown_outcome' ? t('feed.checking') : r.message)
    }
    try {
      const { saveId } = await api<{ saveId: string }>(`/api/treats/${treat.id}/plant`, { body: { txHash: r.value } })
      const final = await pollSave(saveId)
      await done()
      if (final.status === 'confirmed') celebrate({ kind: 'treat_plant', amountLuna: treat.valueLuna, weekJustKept: false, streak: final.result?.streak ?? me.streak.current, sparks: 5 + (final.result?.sparksAwarded ?? 0), evolvedTo: null, badges: final.result?.badgesEarned ?? [] })
      else setMsg(t('common.error'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <AnimatePresence>
      {treat && !blocked && (
        <motion.div className="fixed inset-0 z-[65] flex items-center justify-center bg-navy/45 px-5 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div role="dialog" aria-modal="true" aria-label={t('treat.received', { name: treat.fromName })} initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative w-full max-w-[400px] rounded-[32px] bg-white px-6 pt-8 pb-6 text-center shadow-[var(--shadow-card)]">
            <button type="button" onClick={dismiss} aria-label={t('common.close')} className="press absolute top-4 right-4 h-10 w-10 rounded-full text-2xl font-bold">
              ✕
            </button>
            <h2 className="px-6 text-[28px] font-semibold leading-tight">{t('treat.received', { name: treat.fromName })}</h2>
            <p className="mt-2 font-display text-[44px] font-bold text-leaf-deep">+{formatNim(fromWire(treat.valueLuna))} NIM</p>
            <div className="relative mx-auto my-2 flex w-fit justify-center">
              <motion.img src="/art/treat-love.webp" alt="" className="h-56 w-auto" animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity }} />
              {treat.note && <span className="absolute -top-1 -right-24 max-w-[130px] rounded-2xl border-[2.5px] border-ink bg-white px-3 py-2 font-display text-sm font-semibold">{treat.note}</span>}
            </div>
            {msg && <p className="mb-3 rounded-2xl bg-cream px-4 py-2 text-sm font-semibold">{msg}</p>}
            <div className="flex flex-col gap-2.5">
              {!treat.planted && (
                <Button variant="gold" onClick={plant} loading={busy === 'plant'} disabled={!!busy}>
                  🌱 {t('treat.plant')}
                </Button>
              )}
              <Button variant={treat.planted ? 'gold' : 'outline'} onClick={thanks} loading={busy === 'thanks'} disabled={!!busy || treat.thanked}>
                {t('treat.thanks')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
