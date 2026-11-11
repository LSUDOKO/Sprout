import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { inventory, pets } from '@/lib/db/schema'
import { ApiError, body, handle, json, requireUser } from '@/lib/server/api'
import { PET_NAME_MAX } from '@/lib/game/config'
import { SLOTS, itemById } from '@/lib/game/cosmetics'

const schema = z.object({
  name: z.string().optional(),
  equip: z.object({ slot: z.enum(SLOTS), itemId: z.string().nullable() }).optional(),
})

/** Count user-perceived characters (emoji-safe) for the 16-char name limit. */
const graphemes = (s: string) => [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].length

export const PATCH = handle(async (req: Request) => {
  const { db, user, now } = await requireUser()
  const b = await body(req, schema)
  const [pet] = await db.select().from(pets).where(eq(pets.userId, user.id))

  if (b.name !== undefined) {
    const name = b.name.trim().replace(/\s+/g, ' ')
    const n = graphemes(name)
    if (n < 1 || n > PET_NAME_MAX) throw new ApiError(400, 'bad_name', `Name must be 1–${PET_NAME_MAX} characters`)
    // Stored as-is; always rendered as text (React escapes it).
    if (pet) await db.update(pets).set({ name, updatedAt: new Date(now) }).where(eq(pets.userId, user.id))
    else await db.insert(pets).values({ userId: user.id, name, updatedAt: new Date(now) })
  }

  if (b.equip) {
    if (!pet && b.name === undefined) throw new ApiError(400, 'no_pet', 'Hatch your Sprout first')
    const { slot, itemId } = b.equip
    if (itemId !== null) {
      const item = itemById(itemId)
      if (!item || item.slot !== slot) throw new ApiError(400, 'bad_item')
      const [owned] = await db.select().from(inventory).where(and(eq(inventory.userId, user.id), eq(inventory.itemId, itemId)))
      if (!owned) throw new ApiError(403, 'not_owned', 'Buy this item first')
    }
    await db.update(pets).set({ [slot]: itemId, updatedAt: new Date(now) }).where(eq(pets.userId, user.id))
  }

  const [fresh] = await db.select().from(pets).where(eq(pets.userId, user.id))
  return json({ pet: fresh })
})
