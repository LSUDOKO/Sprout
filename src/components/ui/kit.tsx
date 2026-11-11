'use client'
// Design-system primitives: thick-outline sticker style, 24px cards, pill buttons.
import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'gold' | 'navy' | 'ghost' | 'outline' | 'leaf' | 'white'
const VARIANTS: Record<Variant, string> = {
  gold: 'bg-gold text-ink shadow-[var(--shadow-gold)]',
  navy: 'bg-navy text-white shadow-[var(--shadow-navy)]',
  leaf: 'bg-leaf text-white shadow-[0_5px_0_0_#2f8a3e]',
  white: 'bg-white text-ink shadow-[var(--shadow-card)]',
  outline: 'bg-transparent text-ink border-[2.5px] border-navy',
  ghost: 'bg-transparent text-ink',
}

export function Button({ variant = 'navy', size = 'lg', className = '', loading, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'lg' | 'md' | 'sm'; loading?: boolean }) {
  const sz = size === 'lg' ? 'h-14 px-7 text-[19px]' : size === 'md' ? 'h-11 px-5 text-base' : 'h-9 px-4 text-sm'
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      className={`press font-display inline-flex select-none items-center justify-center gap-2 rounded-full font-semibold ${sz} ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function LinkButton({ href, variant = 'navy', className = '', children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={`press font-display inline-flex h-14 items-center justify-center rounded-full px-7 text-[19px] font-semibold ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  )
}

export const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3.5" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
)

export function Card({ className = '', children, as: As = 'section' }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'li' }) {
  return <As className={`rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)] ${className}`}>{children}</As>
}

/** Rounded progress bar. `tone` picks the gradient from the mockups. */
export function ProgressBar({ value, tone = 'sunset', className = '', label }: { value: number; tone?: 'sunset' | 'sky' | 'gold'; className?: string; label?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  const fill = tone === 'sunset' ? 'from-[#f6829a] via-[#f8a65a] to-gold' : tone === 'sky' ? 'from-sky to-leaf' : 'from-gold to-gold-deep'
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label} className={`h-3.5 overflow-hidden rounded-full bg-mist ${className}`}>
      <div className={`h-full rounded-full bg-gradient-to-r ${fill} transition-[width] duration-700 ease-out`} style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }} />
    </div>
  )
}

export function Chip({ active, children, className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...rest}
      className={`press font-display h-14 min-w-0 flex-1 rounded-full text-xl font-semibold ${active ? 'bg-navy text-white shadow-[var(--shadow-navy)]' : 'bg-mist text-ink'} ${className}`}
    >
      {children}
    </button>
  )
}

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`skeleton rounded-2xl ${className}`} aria-hidden />

export function Pill({ children, tone = 'cream', className = '' }: { children: ReactNode; tone?: 'cream' | 'leaf' | 'mist' | 'gold' | 'navy'; className?: string }) {
  const t = { cream: 'bg-cream-deep/80 text-ink border border-gold/40', leaf: 'bg-leaf-soft text-leaf-deep', mist: 'bg-mist text-slate', gold: 'bg-gold-soft text-ink', navy: 'bg-navy text-white' }[tone]
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${t} ${className}`}>{children}</span>
}

export function BackButton({ href, label }: { href?: string; label: string }) {
  const cls = 'press -ml-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-navy'
  const icon = (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M20 12H5m6-7-7 7 7 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return href ? (
    <Link href={href} aria-label={label} className={cls}>
      {icon}
    </Link>
  ) : (
    <button type="button" aria-label={label} className={cls} onClick={() => history.back()}>
      {icon}
    </button>
  )
}

export function ErrorState({ title, body, onRetry, retryLabel }: { title: string; body?: string; onRetry?: () => void; retryLabel?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
      <img src="/art/expr-sad.webp" alt="" className="h-28 w-auto" />
      <h2 className="text-xl font-semibold">{title}</h2>
      {body && <p className="text-slate">{body}</p>}
      {onRetry && (
        <Button variant="navy" size="md" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  )
}
