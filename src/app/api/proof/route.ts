import { and, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { pets, saves, users } from '@/lib/db/schema'
import { handle, json } from '@/lib/server/api'

// Public: latest verified real saves (never demo) + totals, for judges and users.
export const GET = handle(async () => {
  const db = await getDb()
  const real = and(eq(saves.status, 'confirmed'), eq(users.isDemo, false))
  const rows = await db
    .select({ petName: pets.name, valueLuna: saves.valueLuna, at: saves.confirmedAt, txHash: saves.txHash, kind: saves.kind })
    .from(saves)
    .innerJoin(users, eq(users.id, saves.userId))
    .leftJoin(pets, eq(pets.userId, saves.userId))
    .where(real)
    .orderBy(desc(saves.confirmedAt))
    .limit(100)
  const [t] = await db
    .select({ savers: sql<number>`count(distinct ${saves.userId})::int`, saves: sql<number>`count(*)::int`, total: sql<string>`coalesce(sum(${saves.valueLuna}), 0)` })
    .from(saves)
    .innerJoin(users, eq(users.id, saves.userId))
    .where(real)
  return json({
    rows: rows.map((r) => ({ ...r, petName: r.petName ?? 'Sprout', at: r.at?.getTime() ?? null })),
    totals: { savers: Number(t?.savers ?? 0), saves: Number(t?.saves ?? 0), totalLuna: t?.total ?? '0' },
  })
})
