'use client'
import { useSyncExternalStore } from 'react'

const noop = () => () => {}
/** false during SSR and hydration, true afterwards — without a setState-in-effect. */
export const useHydrated = () => useSyncExternalStore(noop, () => true, () => false)
