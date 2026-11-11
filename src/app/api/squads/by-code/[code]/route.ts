import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { pets, squadMembers, squads } from '@/lib/db/schema'
import { ApiError, handle, json } from '@/lib/server/api'

// Public preview for the join page: name, member count, pet avatars. No addresses.
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = await ctx.params
  const db = await getDb()
  const [squad] = await db.select().from(squads).where(eq(squads.inviteCode, code.toUpperCase()))
  if (!squad) throw new ApiError(404, 'not_found', 'This invite code does not exist')
  const members = await db
    .select({ name: pets.name, stage: pets.stage, hat: pets.hat })
    .from(squadMembers)
    .leftJoin(pets, eq(pets.userId, squadMembers.userId))
    .where(eq(squadMembers.squadId, squad.id))
  return json({ name: squad.name, memberCount: members.length, members: members.map((m) => ({ name: m.name ?? 'Seed', stage: m.stage ?? 'seed', hat: m.hat })), isDemo: squad.isDemo })
})
