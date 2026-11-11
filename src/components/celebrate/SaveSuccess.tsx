'use client'
// S6 Save success overlay.
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import type { Me } from '@/lib/client/api'
import type { StageId } from '@/lib/game/config'
import { formatNim, fromWire } from '@/lib/nimiq/luna'
import { useT, type TKey } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { PetRig } from '../pet/PetRig'
import { Button } from '../ui/kit'
import { burst } from './confetti'
import { shareCard } from './share'

export function SaveSuccess({ me }: { me: Me }) {
  const t = useT()
  const c = useUi((s) => s.celebration)
  const evolving = useUi((s) => !!s.evolution)
  const close = useUi((s) => s.celebrate)
  const toast = useUi((s) => s.toast)
  useEffect(() => {
    if (c && !evolving) {
      burst()
      navigator.vibrate?.(30)
    }
  }, [c, evolving])
  const amount = c ? formatNim(fromWire(c.amountLuna)) : ''
  const title = c?.kind === 'treat_plant' ? t('success.treatPlanted') : t('success.saved', { amount })
  return (
    <AnimatePresence>
      {c && (
        <motion.div role="dialog" aria-modal="true" aria-label={title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] mx-auto flex max-w-[480px] flex-col items-center overflow-hidden bg-gradient-to-b from-sky-soft via-[#e9f4fb] to-cream px-6 pt-[calc(var(--safe-top)+48px)] pb-[calc(var(--safe-bottom)+24px)] text-center">
          <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="text-[40px] font-bold leading-tight text-ink">
            {title}
          </motion.h2>
          <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mt-2 text-xl text-ink/85">
            {c.kind === 'plant' ? t('success.planted') : t('success.grew')}
          </motion.p>
          <div className="relative my-auto">
            <PetRig stage={me.growth.stage as StageId} mood="celebrating" size={270} scale={me.growth.scale} cosmetics={{ hat: me.pet?.hat, neck: me.pet?.neck, face: me.pet?.face, effect: me.pet?.effect }} />
          </div>
          <div className="mb-6 flex flex-col items-center gap-2">
            <span className="rounded-2xl bg-white px-5 py-3 font-display text-2xl font-semibold shadow-[var(--shadow-card)]">
              {c.weekJustKept ? t('success.weekKept', { n: c.streak }) : t('success.streak', { n: c.streak })}
            </span>
            {c.sparks > 0 && <span className="rounded-full bg-gold-soft px-4 py-1 font-bold">✨ {t('success.sparks', { n: c.sparks })}</span>}
            {c.badges.length > 0 && (
              <span className="text-sm font-semibold text-leaf-deep">
                🏅 {c.badges.map((b) => t(`badge.${b}` as TKey)).join(' · ')}
              </span>
            )}
          </div>
          <Button variant="navy" className="w-full max-w-xs" onClick={() => close(null)} autoFocus>
            {t('success.back')}
          </Button>
          <button
            type="button"
            className="press mt-3 font-display text-xl font-semibold text-ink"
            onClick={async () => {
              const r = await shareCard({ kind: c.streak >= 2 ? 'streak' : 'saved', userId: me.user.id, text: c.streak >= 2 ? t('share.streak', { n: c.streak }) : t('share.saved') })
              if (r === 'copied') toast(t('common.copied'), 'success')
            }}
          >
            {t('common.share')}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
