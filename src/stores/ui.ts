'use client'
// UI-only state (sheets, overlays, toasts). Server data lives in TanStack Query.
import { create } from 'zustand'
import type { StageId } from '@/lib/game/config'

export type Celebration = {
  kind: 'plant' | 'feed' | 'treat_plant'
  amountLuna: string
  weekJustKept: boolean
  streak: number
  sparks: number
  evolvedTo: StageId | null
  badges: string[]
}

type Toast = { id: number; text: string; tone?: 'info' | 'success' | 'error' }

type UiState = {
  feedOpen: boolean
  treatOpen: { squadId: string; toUserId?: string } | null
  celebration: Celebration | null
  evolution: { to: StageId; savedLuna: string; weeks: number } | null
  linkPrompt: boolean
  toasts: Toast[]
  sound: boolean
  openFeed: (v: boolean) => void
  openTreat: (v: UiState['treatOpen']) => void
  celebrate: (c: Celebration | null) => void
  evolve: (e: UiState['evolution']) => void
  setLinkPrompt: (v: boolean) => void
  toast: (text: string, tone?: Toast['tone']) => void
  dismiss: (id: number) => void
  setSound: (v: boolean) => void
}

let seq = 0
export const useUi = create<UiState>((set) => ({
  feedOpen: false,
  treatOpen: null,
  celebration: null,
  evolution: null,
  linkPrompt: false,
  toasts: [],
  sound: false,
  openFeed: (feedOpen) => set({ feedOpen }),
  openTreat: (treatOpen) => set({ treatOpen }),
  celebrate: (celebration) => set({ celebration }),
  evolve: (evolution) => set({ evolution }),
  setLinkPrompt: (linkPrompt) => set({ linkPrompt }),
  toast: (text, tone = 'info') => {
    const id = ++seq
    set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setSound: (sound) => {
    try {
      localStorage.setItem('sprout_sound', sound ? '1' : '0')
    } catch {}
    set({ sound })
  },
}))
