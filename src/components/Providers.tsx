'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { useEffect, useState, type ReactNode } from 'react'
import { I18nProvider } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { Toasts } from './ui/Toasts'

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } }))
  useEffect(() => {
    try {
      useUi.setState({ sound: localStorage.getItem('sprout_sound') === '1' })
    } catch {}
  }, [])
  return (
    <QueryClientProvider client={qc}>
      <I18nProvider>
        {/* reducedMotion="user": Motion respects prefers-reduced-motion everywhere. */}
        <MotionConfig reducedMotion="user">
          {children}
          <Toasts />
        </MotionConfig>
      </I18nProvider>
    </QueryClientProvider>
  )
}
