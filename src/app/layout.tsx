import type { Metadata, Viewport } from 'next'
import { Fredoka, Nunito } from 'next/font/google'
import { Providers } from '@/components/Providers'
import './globals.css'

const fredoka = Fredoka({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-fredoka', display: 'swap' })
const nunito = Nunito({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-nunito', display: 'swap' })

export const metadata: Metadata = {
  title: 'Sprout — save NIM, grow a pet',
  description: 'A Nimiq Pay Mini App where saving money feels like raising a pet. Your NIM stays in your own stake.',
  applicationName: 'Sprout',
  icons: { icon: [{ url: '/favicon.ico' }, { url: '/icons/icon-192.png', sizes: '192x192' }], apple: '/icons/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  openGraph: { title: 'Sprout — save NIM, grow a pet', images: ['/icons/icon-512.png'] },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#FFF6E5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
