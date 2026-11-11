// Sparks award table (docs/04 §5). Deterministic, no randomness.
// Every award carries (reason, ref); the DB has a unique (user_id, reason, ref) index,
// so re-running a confirmation never awards twice.
import { SPARKS, type StageId } from './config'

export type SparkReason = 'save' | 'week_kept' | 'evolution' | 'squad_perfect' | 'treat_sent' | 'treat_planted' | 'shop'
export type SparkAward = { delta: number; reason: SparkReason; ref: string }

export function saveAward(savesAwardedToday: number, txHash: string): SparkAward | null {
  if (savesAwardedToday >= SPARKS.saveDailyCap) return null
  return { delta: SPARKS.save, reason: 'save', ref: txHash }
}

export function weekKeptAward(currentStreak: number, weekKey: string): SparkAward {
  const delta = Math.min(SPARKS.weekKeptCap, SPARKS.weekKeptBase + SPARKS.weekKeptPerStreak * currentStreak)
  return { delta, reason: 'week_kept', ref: weekKey }
}

export const evolutionAward = (stage: StageId): SparkAward => ({ delta: SPARKS.evolution, reason: 'evolution', ref: stage })

export const squadPerfectAward = (squadId: string, weekKey: string): SparkAward => ({
  delta: SPARKS.squadPerfectWeek,
  reason: 'squad_perfect',
  ref: `${squadId}:${weekKey}`,
})

export function treatSentAward(treatsAwardedToday: number, treatId: string): SparkAward | null {
  if (treatsAwardedToday >= SPARKS.treatSentDailyCap) return null
  return { delta: SPARKS.treatSent, reason: 'treat_sent', ref: treatId }
}

export const treatPlantedAward = (treatId: string): SparkAward => ({ delta: SPARKS.treatPlanted, reason: 'treat_planted', ref: treatId })

/** Balance = sum of ledger deltas. */
export const balance = (ledger: { delta: number }[]) => ledger.reduce((s, r) => s + r.delta, 0)
