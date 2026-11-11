'use client'
// S7 Evolution: old form shakes → white flash pulses → new form springs in → confetti (≤ 3s).
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Me } from '@/lib/client/api'
import { STAGE_IDS, type StageId } from '@/lib/game/config'
import { formatNim, fromWire } from '@/lib/nimiq/luna'
import { useT } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { PetRig } from '../pet/PetRig'
import { Button } from '../ui/kit'
import { burst } from './confetti'
import { shareCard } from './share'

export function Evolution({ me }: { me: Me }) {
  const evo = useUi((s) => s.evolution)
  // A new key per evolution resets the sequence state.
  return evo ? <EvolutionSequence key={evo.to} me={me} evo={evo} /> : null
}

function EvolutionSequence({ me, evo }: { me: Me; evo: { to: StageId } }) {
  const t = useT()
  const close = useUi((s) => s.evolve)
  const toast = useUi((s) => s.toast)
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<'old' | 'flash' | 'new'>(reduced ? 'new' : 'old')
  const [canSkip, setCanSkip] = useState(false)

  useEffect(() => {
    if (reduced) return
    navigator.vibrate?.([40, 60, 40])
    const a = setTimeout(() => setPhase('flash'), 600)
    const b = setTimeout(() => setPhase('new'), 1600)
    const c = setTimeout(() => burst(['#F6B221', '#5BC26A', '#FFE58A']), 2000)
    const d = setTimeout(() => setCanSkip(true), 1000)
    return () => [a, b, c, d].forEach(clearTimeout)
  }, [reduced])

  const prev = (STAGE_IDS[Math.max(0, STAGE_IDS.indexOf(evo.to) - 1)] ?? 'seed') as StageId
  const stageName = t(`stage.${evo.to}`)
  const cos = { hat: me.pet?.hat, neck: me.pet?.neck, face: me.pet?.face }
  return (
    <AnimatePresence>
      <motion.div role="dialog" aria-modal="true" aria-label={t('evo.title', { name: me.pet?.name ?? '', stage: stageName })} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[75] mx-auto flex max-w-[480px] flex-col items-center overflow-hidden bg-navy px-6 pt-[calc(var(--safe-top)+44px)] pb-[calc(var(--safe-bottom)+24px)] text-center text-white">
        {/* light rays */}
        <motion.div aria-hidden className="absolute top-1/2 left-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-40" style={{ background: 'repeating-conic-gradient(from 0deg, rgba(255,214,90,.55) 0deg 8deg, transparent 8deg 24deg)' }} animate={reduced ? undefined : { rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: 'linear' }} />
        <div aria-hidden className="absolute top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,226,120,.85),rgba(255,226,120,0)_65%)]" />

        <motion.h2 className="relative text-[38px] font-bold leading-tight" initial={{ y: 30, opacity: 0 }} animate={phase === 'new' ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }} transition={{ delay: 0.2 }}>
          <span className="text-gold">{me.pet?.name}</span> evolved
          <br />
          into <span className="text-gold">{stageName}!</span>
        </motion.h2>
        <motion.p className="relative mt-2 text-lg text-white/85" initial={{ opacity: 0 }} animate={{ opacity: phase === 'new' ? 1 : 0 }} transition={{ delay: 0.4 }}>
          {t('evo.body', { amount: formatNim(fromWire(me.stake?.totalLuna ?? '0')), weeks: me.streak.keptTotal })}
        </motion.p>

        <div className="relative my-auto flex h-[300px] items-center justify-center">
          {phase !== 'new' ? (
            <motion.div animate={phase === 'old' ? { x: [-4, 4, -4, 4, 0] } : { opacity: [1, 0.2, 1, 0.2, 1, 0.2] }} transition={{ duration: phase === 'old' ? 0.6 : 1, ease: 'easeInOut' }} style={{ filter: phase === 'flash' ? 'brightness(0) invert(1)' : undefined }}>
              <PetRig stage={prev} mood="content" size={240} cosmetics={cos} animated={false} />
            </motion.div>
          ) : (
            <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
              <PetRig stage={evo.to} mood="celebrating" size={280} cosmetics={cos} />
            </motion.div>
          )}
        </div>

        <div className="relative flex w-full flex-col items-center gap-2">
          {phase === 'new' || canSkip ? (
            <>
              <Button variant="gold" className="w-full max-w-xs" onClick={() => (phase === 'new' ? close(null) : setPhase('new'))} autoFocus>
                {phase === 'new' ? t('evo.meet', { stage: stageName }) : t('evo.skip')}
              </Button>
              {phase === 'new' && (
                <button
                  type="button"
                  className="press font-display text-xl font-semibold text-gold"
                  onClick={async () => {
                    const r = await shareCard({ kind: 'evolved', userId: me.user.id, text: t('share.evolved', { name: me.pet?.name ?? 'Sprout', stage: stageName }) })
                    if (r === 'copied') toast(t('common.copied'), 'success')
                  }}
                >
                  {t('common.share')}
                </button>
              )}
            </>
          ) : (
            <div className="h-14" />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
