import { and, desc, eq } from 'drizzle-orm'
import { pets, treats } from '@/lib/db/schema'
import { handle, json, requireUser } from '@/lib/server/api'
import { verifyTreatById } from '@/lib/server/treats'

export const GET = handle(async () => {
  const { db, user } = await requireUser()
  // Treats only show once verified on chain; give pending ones a chance to confirm now.
  const pending = await db.select({ id: treats.id }).from(treats).where(and(eq(treats.toUser, user.id), eq(treats.status, 'pending')))
  for (const p of pending) await verifyTreatById(db, p.id).catch((e) => console.error('[inbox verify]', e))
  const rows = await db
    .select({ id: treats.id, valueLuna: treats.valueLuna, note: treats.note, at: treats.confirmedAt, seenAt: treats.seenAt, thanked: treats.thanked, plantedSaveId: treats.plantedSaveId, fromUser: treats.fromUser, fromName: pets.name, fromStage: pets.stage, squadId: treats.squadId })
    .from(treats)
    .leftJoin(pets, eq(pets.userId, treats.fromUser))
    .where(and(eq(treats.toUser, user.id), eq(treats.status, 'confirmed')))
    .orderBy(desc(treats.confirmedAt))
    .limit(50)
  return json({ treats: rows.map((r) => ({ ...r, at: r.at?.getTime() ?? null, seen: !!r.seenAt, planted: !!r.plantedSaveId, fromName: r.fromName ?? 'A friend' })) })
})
