'use client'
// Bottom sheet with backdrop, focus handling and Escape to close.
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

export function Sheet({ open, onClose, children, label, peek, dismissible = true, floating }: { open: boolean; onClose: () => void; children: ReactNode; label: string; peek?: ReactNode; dismissible?: boolean; floating?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dismissible && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose, dismissible])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <motion.div className="absolute inset-0 bg-navy/45 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => dismissible && onClose()} />
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            className={`relative w-full max-w-[480px] outline-none ${floating ? 'px-3 pb-[calc(var(--safe-bottom)+12px)]' : ''}`}
          >
            {peek && <div className="pointer-events-none relative z-0 -mb-20 flex justify-center">{peek}</div>}
            <div className={`relative z-10 max-h-[88dvh] overflow-y-auto bg-white px-5 pt-6 shadow-[0_-10px_40px_-10px_rgb(31_35_72/0.35)] ${floating ? 'rounded-[32px] pb-6' : 'rounded-t-[32px] pb-[calc(var(--safe-bottom)+20px)]'}`}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
