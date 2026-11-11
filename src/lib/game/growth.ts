// Pet stage + progress from verified stake and kept weeks (docs/04 §2). Pure.
import { MIN_STAKE } from '../nimiq/invariants'
import { SCALE_GROWTH, STAGES, type StageDef, type StageId } from './config'

export type Growth = {
  stage: StageId
  stageIndex: number
  planted: boolean
  next: StageDef | null
  /** 0..1 progress of stake toward the next stage. */
  progress: number
  scale: number
  /** What blocks evolving right now. */
  blocker: { kind: 'stake'; needLuna: bigint } | { kind: 'weeks'; needWeeks: number } | null
}

export function stageFor(stakeLuna: bigint, keptWeeksTotal: number): StageDef {
  let s = STAGES[0]!
  for (const st of STAGES) if (stakeLuna >= st.minStake && keptWeeksTotal >= st.minKept) s = st
  return s
}

export const stageIndex = (id: StageId) => STAGES.findIndex((s) => s.id === id)

export function growth(stakeLuna: bigint, keptWeeksTotal: number): Growth {
  const cur = stageFor(stakeLuna, keptWeeksTotal)
  const idx = stageIndex(cur.id)
  const next = STAGES[idx + 1] ?? null
  let progress = 1
  let blocker: Growth['blocker'] = null
  if (next) {
    const span = next.minStake - cur.minStake
    const into = stakeLuna - cur.minStake
    // integer math first, then one division for display
    const permille = span > 0n ? Number(((into < 0n ? 0n : into) * 1000n) / span) : 1000
    progress = Math.min(1, Math.max(0, permille / 1000))
    if (stakeLuna < next.minStake) blocker = { kind: 'stake', needLuna: next.minStake - stakeLuna }
    else if (keptWeeksTotal < next.minKept) blocker = { kind: 'weeks', needWeeks: next.minKept - keptWeeksTotal }
  }
  return {
    stage: cur.id,
    stageIndex: idx,
    planted: stakeLuna >= MIN_STAKE,
    next,
    progress,
    scale: 1 + SCALE_GROWTH * progress,
    blocker,
  }
}
