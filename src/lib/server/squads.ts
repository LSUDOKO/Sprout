// Squad views: members with pets and weekly status, squad streak, membership checks.
import 'server-only'
import { and, eq, inArray } from 'drizzle-orm'
import type { Db } from '../db'
import { pets, squadMembers, squadWeeks, squads, streaks, users, weeks } from '../db/schema'
import { computeStreak, weekKey } from '../game/streak'
import { ApiError } from './api'

export async function requireMember(db: Db, squadId: string, userId: string) {
  const [m] = await db.select().from(squadMembers).where(and(eq(squadMembers.squadId, squadId), eq(squadMembers.userId, userId)))
  if (!m) throw new ApiError(403, 'not_member', 'You are not in this squad')
  return m
}

export async function squadView(db: Db, squadId: string, meId: string, now: number) {
  const [squad] = await db.select().from(squads).where(eq(squads.id, squadId))
  if (!squad) throw new ApiError(404, 'not_found')
  const members = await db
    .select({ userId: squadMembers.userId, role: squadMembers.role, joinedAt: squadMembers.joinedAt, address: users.primaryAddress, name: pets.name, stage: pets.stage, hat: pets.hat, neck: pets.neck, face: pets.face })
    .from(squadMembers)
    .innerJoin(users, eq(users.id, squadMembers.userId))
    .leftJoin(pets, eq(pets.userId, squadMembers.userId))
    .where(eq(squadMembers.squadId, squadId))
  const ids = members.map((m) => m.userId)
  const wk = weekKey(now)
  const thisWeek = ids.length ? await db.select().from(weeks).where(and(inArray(weeks.userId, ids), eq(weeks.weekKey, wk))) : []
  const st = ids.length ? await db.select().from(streaks).where(inArray(streaks.userId, ids)) : []
  const perfect = await db.select({ weekKey: squadWeeks.weekKey }).from(squadWeeks).where(and(eq(squadWeeks.squadId, squadId), eq(squadWeeks.perfect, true)))
  const squadStreak = computeStreak(perfect.map((p) => p.weekKey), now)
  return {
    id: squad.id,
    name: squad.name,
    inviteCode: squad.inviteCode,
    createdBy: squad.createdBy,
    streak: squadStreak.current,
    bestStreak: squadStreak.best,
    perfectWeeks: perfect.length,
    members: members
      .map((m) => {
        const w = thisWeek.find((x) => x.userId === m.userId)
        return {
          userId: m.userId,
          name: m.name ?? 'Seed',
          stage: m.stage ?? 'seed',
          cosmetics: { hat: m.hat, neck: m.neck, face: m.face },
          role: m.role,
          address: m.address,
          keptThisWeek: !!w?.kept,
          savedThisWeek: !!w && w.savedLuna > 0n,
          streak: st.find((s) => s.userId === m.userId)?.current ?? 0,
          isMe: m.userId === meId,
          joinedAt: m.joinedAt.getTime(),
        }
      })
      .sort((a, b) => Number(b.isMe) - Number(a.isMe) || a.joinedAt - b.joinedAt),
  }
}

export const inviteUrl = (code: string) => {
  const host = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/^https?:\/\//, '').replace(/\/$/, '')
  return { deepLink: `https://nimpay.app/miniapps/open/${host}/join/${code}`, web: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/join/${code}` }
}
