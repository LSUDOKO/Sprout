// All game constants in one place (docs/04). Amounts in Luna.
import { nim } from '../nimiq/luna'

export const STAGE_IDS = ['seed', 'sprout', 'bloom', 'grove'] as const
export type StageId = (typeof STAGE_IDS)[number]

export type StageDef = { id: StageId; minStake: bigint; minKept: number }

// Tune before launch against the NIM price so Grove is reachable for a student in ~2 months.
export const STAGES: readonly StageDef[] = [
  { id: 'seed', minStake: 0n, minKept: 0 },
  { id: 'sprout', minStake: nim(1_000), minKept: 1 },
  { id: 'bloom', minStake: nim(5_000), minKept: 4 },
  { id: 'grove', minStake: nim(20_000), minKept: 8 },
]

export const GOAL = {
  default: nim(500),
  min: nim(50),
  max: nim(1_000_000),
} as const

export const SCALE_GROWTH = 0.15 // pet grows up to +15% inside a stage

export const SPARKS = {
  save: 10,
  saveDailyCap: 3,
  weekKeptBase: 30,
  weekKeptPerStreak: 5,
  weekKeptCap: 100,
  evolution: 100,
  squadPerfectWeek: 50,
  treatSent: 5,
  treatSentDailyCap: 3,
  treatPlanted: 5,
} as const

export const SQUAD = { minMembers: 2, maxMembers: 8, codeLength: 6, codeAlphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' } as const

export const TREAT = { minLuna: nim(1), chips: [1, 5, 10], noteMax: 80 } as const

export const FEED_CHIPS = [100, 500, 1_000] as const

export const LEADERBOARD = { minEligibleWeeks: 2, globalLimit: 100 } as const

export const PET_NAME_MAX = 16
export const PET_NAME_SUGGESTIONS = ['Pip', 'Mochi', 'Nimbus', 'Kiwi'] as const

export const HOUR = 3_600_000
export const DAY = 24 * HOUR
export const WEEK = 7 * DAY
