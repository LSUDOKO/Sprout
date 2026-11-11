'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useT } from '@/lib/i18n'

const TABS = [
  { href: '/', key: 'tab.home', icon: HomeIcon },
  { href: '/squad', key: 'tab.squad', icon: SquadIcon },
  { href: '/collection', key: 'tab.collection', icon: CollectionIcon },
  { href: '/me', key: 'tab.me', icon: ProfileIcon },
] as const

export function TabBar() {
  const path = usePathname()
  const t = useT()
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] rounded-t-[28px] bg-white pb-[var(--safe-bottom)] shadow-[0_-8px_30px_-12px_rgb(31_35_72/0.25)]">
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, key, icon: Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href) || (href === '/collection' && path.startsWith('/shop')) || (href === '/me' && (path.startsWith('/withdraw') || path.startsWith('/streak')))
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 pt-3 pb-2.5 font-display text-[13px] font-semibold ${active ? 'text-navy' : 'text-slate'}`}>
                <Icon filled={active} />
                {t(key)}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

type I = { filled: boolean }
const stroke = { stroke: 'currentColor', strokeWidth: 2.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
function HomeIcon({ filled }: I) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
      <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6h-6v6H4.5a1 1 0 0 1-1-1z" fill={filled ? 'currentColor' : 'none'} {...stroke} />
    </svg>
  )
}
function SquadIcon({ filled }: I) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
      <circle cx="9" cy="8" r="3.5" fill={filled ? 'currentColor' : 'none'} {...stroke} />
      <circle cx="16.5" cy="9" r="2.8" fill={filled ? 'currentColor' : 'none'} {...stroke} />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5zM15 14c3 0 6 1.6 6 5h-4" fill={filled ? 'currentColor' : 'none'} {...stroke} />
    </svg>
  )
}
function CollectionIcon({ filled }: I) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
      <rect x="4" y="3.5" width="14" height="17" rx="2.5" fill={filled ? 'currentColor' : 'none'} {...stroke} />
      <path d="M20 6v14.5H7" fill="none" {...stroke} />
      <path d="m11 8.2 2.6 1.5v3l-2.6 1.5-2.6-1.5v-3z" fill={filled ? '#fff' : 'none'} stroke={filled ? '#fff' : 'currentColor'} strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  )
}
function ProfileIcon({ filled }: I) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="8" r="4" fill={filled ? 'currentColor' : 'none'} {...stroke} />
      <path d="M4 20.5c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5z" fill={filled ? 'currentColor' : 'none'} {...stroke} />
    </svg>
  )
}
