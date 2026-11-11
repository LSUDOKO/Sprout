// Badge rules (docs/04 §7). Badges are never removed once earned:
// the caller inserts newly qualifying ids with ON CONFLICT DO NOTHING.
import { nim } from '../nimiq/luna'
import { MIN_STAKE } from '../nimiq/invariants'
import { stageIndex } from './growth'
import type { StageId } from './config'

export const BADGES = [
  { id: 'first_seed', icon: '🌱' },
  { id: 'week_one', icon: '📅' },
  { id: 'on_a_roll', icon: '🔥' },
  { id: 'unstoppable', icon: '⚡' },
  { id: 'bloomer', icon: '🌸' },
  { id: 'grove_keeper', icon: '🌳' },
  { id: 'grew_overnight', icon: '🌙' },
  { id: 'squad_founder', icon: '🛡️' },
  { id: 'perfect_squad', icon: '⭐' },
  { id: 'generous', icon: '🎁' },
  { id: 'comeback', icon: '💪' },
  { id: 'club_10k', icon: '🏅' },
] as const
export type BadgeId = (typeof BADGES)[number]['id']

export type BadgeContext = {
  stakeLuna: bigint
  keptTotal: number
  currentStreak: number
  /** Highest stage ever reached (stage can drop after a withdrawal, badges do not). */
  stage: StageId
  everEarned: boolean
  foundedSquadWith3: boolean
  perfectSquadWeek: boolean
  treatsSent: number
  /** True when this week (or the week just kept) followed a broken streak of ≥ 2. */
  comebackWeek: boolean
}

export function qualifyingBadges(c: BadgeContext): BadgeId[] {
  const out: BadgeId[] = []
  const si = stageIndex(c.stage)
  if (c.stakeLuna >= MIN_STAKE) out.push('first_seed')
  if (c.keptTotal >= 1) out.push('week_one')
  if (c.currentStreak >= 4) out.push('on_a_roll')
  if (c.currentStreak >= 12) out.push('unstoppable')
  if (si >= stageIndex('bloom')) out.push('bloomer')
  if (si >= stageIndex('grove')) out.push('grove_keeper')
  if (c.everEarned) out.push('grew_overnight')
  if (c.foundedSquadWith3) out.push('squad_founder')
  if (c.perfectSquadWeek) out.push('perfect_squad')
  if (c.treatsSent >= 5) out.push('generous')
  if (c.comebackWeek) out.push('comeback')
  if (c.stakeLuna >= nim(10_000)) out.push('club_10k')
  return out
}

/** Only the badges not already owned. */
export const newBadges = (c: BadgeContext, owned: Iterable<string>) => {
  const have = new Set(owned)
  return qualifyingBadges(c).filter((b) => !have.has(b))
}
