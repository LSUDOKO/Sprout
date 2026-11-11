// Consistency ranking (docs/04 §9). Never ranks by amount.
import { LEADERBOARD } from './config'
import { weekKey, weekRange } from './streak'

export type RankInput = {
  userId: string
  firstPlantedWeek: string | null
  plantedAt: number | null
  keptWeeks: string[]
  currentStreak: number
}

/** Completed weeks since the first planted week; the current week counts only if kept. */
export function consistency(r: RankInput, now: number): { kept: number; eligible: number; pct: number } | null {
  if (!r.firstPlantedWeek) return null
  const thisWeek = weekKey(now)
  const kept = new Set(r.keptWeeks)
  const weeks = weekRange(r.firstPlantedWeek, thisWeek).filter((w) => w !== thisWeek || kept.has(w))
  const eligible = weeks.length
  const keptCount = weeks.filter((w) => kept.has(w)).length
  if (eligible === 0) return null
  return { kept: keptCount, eligible, pct: Math.round((keptCount * 100) / eligible) }
}

export function rank<T extends RankInput>(rows: T[], now: number) {
  return rows
    .map((r) => ({ row: r, c: consistency(r, now) }))
    .filter((x): x is { row: T; c: NonNullable<ReturnType<typeof consistency>> } => !!x.c && x.c.eligible >= LEADERBOARD.minEligibleWeeks)
    .sort(
      (a, b) =>
        b.c.kept * a.c.eligible - a.c.kept * b.c.eligible || // consistency desc (exact, no float)
        b.row.currentStreak - a.row.currentStreak ||
        (a.row.plantedAt ?? Infinity) - (b.row.plantedAt ?? Infinity),
    )
    .map((x, i) => ({ rank: i + 1, ...x.row, consistencyPct: x.c.pct }))
}
