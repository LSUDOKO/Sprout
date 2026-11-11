'use client'
import { useT } from '@/lib/i18n'

export function WrongNetwork({ expected }: { expected: string }) {
  const t = useT()
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center gap-4 px-8 text-center">
      <img src="/art/expr-surprised.webp" alt="" className="h-40 w-auto" />
      <h1 className="text-2xl font-semibold">{t('onb.wrongNetwork', { expected })}</h1>
    </main>
  )
}
