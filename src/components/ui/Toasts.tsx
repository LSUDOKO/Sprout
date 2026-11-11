'use client'
import { AnimatePresence, motion } from 'motion/react'
import { useUi } from '@/stores/ui'

export function Toasts() {
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+12px)] z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -12, opacity: 0 }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto max-w-sm rounded-2xl px-4 py-3 text-left text-[15px] font-bold shadow-[var(--shadow-card)] ${t.tone === 'error' ? 'bg-[#ffe2e0] text-[#9a2b22]' : t.tone === 'success' ? 'bg-leaf-soft text-leaf-deep' : 'bg-white text-ink'}`}
          >
            {t.text}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  )
}
