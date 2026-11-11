import { eq } from 'drizzle-orm'
import { inventory } from '@/lib/db/schema'
import { handle, json, requireUser } from '@/lib/server/api'
import { sparksBalance } from '@/lib/server/progress'
import { ITEMS } from '@/lib/game/cosmetics'

export const GET = handle(async () => {
  const { db, user } = await requireUser()
  const owned = new Set((await db.select({ i: inventory.itemId }).from(inventory).where(eq(inventory.userId, user.id))).map((r) => r.i))
  return json({ sparks: await sparksBalance(db, user.id), items: ITEMS.map((i) => ({ ...i, owned: owned.has(i.id) })) })
})
