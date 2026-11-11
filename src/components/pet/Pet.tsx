'use client'
// The user's pet: mood from server data + local hour, speech bubble, tap/long-press interactions.
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Me } from '@/lib/client/api'
import type { StageId } from '@/lib/game/config'
import { moodFor, type Mood } from '@/lib/game/mood'
import { useT, type TKey } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { PetRig } from './PetRig'
import { playSfx } from '../sfx'

const LINES: Record<Mood, number> = { celebrating: 1, love: 2, sad: 2, hungry: 2, sleepy: 2, happy: 2, content: 3 }

export function useMood(me: Me | undefined, celebrating = false): Mood {
  return useMemo(() => {
    if (!me) return 'content'
    return moodFor({ ...me.moodInputs, now: me.now, localHour: new Date().getHours(), celebrating })
  }, [me, celebrating])
}

export function Pet({ me, size = 250, bubble = true }: { me: Me; size?: number; bubble?: boolean }) {
  const t = useT()
  const celebrating = !!useUi((s) => s.celebration)
  const sound = useUi((s) => s.sound)
  const mood = useMood(me, celebrating)
  const [line, setLine] = useState(0)
  const key = `mood.${mood}.${line % LINES[mood]}` as TKey
  const pet = me.pet!
  return (
    <div className="relative flex flex-col items-center pt-2">
      <AnimatePresence mode="wait">
        {bubble && (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-0 right-[60%] z-10 w-max max-w-[170px] rounded-2xl border-[2.5px] border-ink bg-white px-3 py-1.5 text-center font-display text-[14px] font-semibold leading-tight text-ink"
            aria-live="polite"
          >
            {t(key)}
            <span className="absolute -bottom-[8px] right-5 h-3.5 w-3.5 rotate-45 border-r-[2.5px] border-b-[2.5px] border-ink bg-white" />
          </motion.div>
        )}
      </AnimatePresence>
      <PetRig
        stage={me.growth.stage as StageId}
        mood={mood}
        scale={me.growth.scale}
        size={size}
        cosmetics={{ hat: pet.hat, neck: pet.neck, face: pet.face, effect: pet.effect }}
        title={`${pet.name}, ${me.growth.stage}, ${mood}`}
        onTap={() => sound && playSfx('tap')}
        onLongPress={() => setLine((l) => l + 1)}
      />
    </div>
  )
}
