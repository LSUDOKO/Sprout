import 'server-only'
import { eq } from 'drizzle-orm'
import { getDb } from '../db'
import { pets, streaks } from '../db/schema'

export const SHARE_KINDS = ['evolved', 'streak', 'saved'] as const
export type ShareKind = (typeof SHARE_KINDS)[number]

/** Public share data: pet name, stage and streak only. No amounts, no addresses. */
export async function shareData(userId: string) {
  const db = await getDb()
  const [pet] = await db.select().from(pets).where(eq(pets.userId, userId))
  if (!pet) return null
  const [st] = await db.select().from(streaks).where(eq(streaks.userId, userId))
  return { name: pet.name, stage: pet.maxStage, streak: st?.current ?? 0 }
}

export function headline(kind: ShareKind, d: { name: string; stage: string; streak: number }) {
  const stage = d.stage[0]!.toUpperCase() + d.stage.slice(1)
  if (kind === 'evolved') return `${d.name} evolved into ${stage}!`
  if (kind === 'streak') return `I kept a ${d.streak}-week saving streak 🔥`
  return `I'm growing my savings with Sprout 🌱`
}
