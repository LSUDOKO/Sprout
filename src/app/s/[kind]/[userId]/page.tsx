// Shareable landing page: Open Graph image = the share card, CTA to try Sprout.
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SHARE_KINDS, headline, shareData, type ShareKind } from '@/lib/server/shareData'

type P = { params: Promise<{ kind: string; userId: string }> }

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { kind, userId } = await params
  const d = SHARE_KINDS.includes(kind as ShareKind) ? await shareData(userId) : null
  if (!d) return {}
  const title = headline(kind as ShareKind, d)
  const image = `/api/share/${kind}/${userId}`
  return { title, openGraph: { title, images: [{ url: image, width: 1080, height: 1920 }] }, twitter: { card: 'summary_large_image', images: [image] } }
}

export default async function SharePage({ params }: P) {
  const { kind, userId } = await params
  if (!SHARE_KINDS.includes(kind as ShareKind)) notFound()
  const d = await shareData(userId)
  if (!d) notFound()
  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center gap-5 bg-sky-soft px-6 py-10 text-center">
      <img src={`/api/share/${kind}/${userId}`} alt={headline(kind as ShareKind, d)} className="w-full max-w-[320px] rounded-[28px] shadow-[var(--shadow-card)]" />
      <Link href="/onboarding" className="press flex h-14 w-full max-w-[320px] items-center justify-center rounded-full bg-navy font-display text-xl font-semibold text-white shadow-[var(--shadow-navy)]">
        Grow your own Sprout
      </Link>
    </main>
  )
}
