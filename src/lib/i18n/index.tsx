'use client'
// Tiny i18n: flat keys, {var} interpolation, English fallback. Language follows Nimiq Pay
// (window.nimiqPay.language) unless the user overrides it in Profile.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en from './en.json'
import es from './es.json'
import hi from './hi.json'

export type TKey = keyof typeof en
export type Vars = Record<string, string | number>
export const LOCALES = { en: 'English', hi: 'हिन्दी', es: 'Español' } as const
export type Locale = keyof typeof LOCALES
const DICTS: Record<Locale, Partial<Record<TKey, string>>> = { en, hi, es }

export function translate(locale: Locale, key: TKey, vars?: Vars): string {
  const s = DICTS[locale][key] ?? en[key] ?? key
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`)) : s
}

export const pickLocale = (lang: string | null | undefined): Locale => {
  const l = (lang ?? '').slice(0, 2).toLowerCase()
  return l in LOCALES ? (l as Locale) : 'en'
}

const OVERRIDE_KEY = 'sprout_locale'
type Ctx = { locale: Locale; t: (key: TKey, vars?: Vars) => string; setOverride: (l: Locale | null) => void; override: Locale | null }
const I18nContext = createContext<Ctx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<Locale>('en')
  const [override, setOverrideState] = useState<Locale | null>(null)
  useEffect(() => {
    // Read after hydration so server and first client render agree.
    try {
      const o = localStorage.getItem(OVERRIDE_KEY)
      if (o && o in LOCALES) setOverrideState(o as Locale)
    } catch {}
    setHost(pickLocale(window.nimiqPay?.language ?? navigator.language))
  }, [])
  const locale = override ?? host
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  const setOverride = useCallback((l: Locale | null) => {
    setOverrideState(l)
    try {
      if (l) localStorage.setItem(OVERRIDE_KEY, l)
      else localStorage.removeItem(OVERRIDE_KEY)
    } catch {}
  }, [])
  const value = useMemo<Ctx>(() => ({ locale, t: (k, v) => translate(locale, k, v), setOverride, override }), [locale, setOverride, override])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const c = useContext(I18nContext)
  if (!c) throw new Error('useI18n outside I18nProvider')
  return c
}
export const useT = () => useI18n().t
