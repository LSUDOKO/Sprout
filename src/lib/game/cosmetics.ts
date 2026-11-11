// Cosmetic shop (docs/04 §6). Fixed prices, always visible, no random drops, no gameplay effect.
export const SLOTS = ['hat', 'neck', 'face', 'background', 'effect'] as const
export type Slot = (typeof SLOTS)[number]

export const ITEMS = [
  { id: 'leaf_cap', slot: 'hat', price: 50 },
  { id: 'crown', slot: 'hat', price: 150 },
  { id: 'star_scarf', slot: 'neck', price: 120 },
  { id: 'sunglasses', slot: 'face', price: 80 },
  { id: 'moon_garden', slot: 'background', price: 200 },
  { id: 'sakura_garden', slot: 'background', price: 200 },
  { id: 'night_sky', slot: 'background', price: 300 },
  { id: 'gold_aura', slot: 'effect', price: 400 },
] as const satisfies readonly { id: string; slot: Slot; price: number }[]

export type ItemId = (typeof ITEMS)[number]['id']
export const itemById = (id: string) => ITEMS.find((i) => i.id === id)

export type Equipped = Partial<Record<Slot, ItemId | null>>

export function canBuy(itemId: string, sparks: number, owned: Iterable<string>): { ok: true } | { ok: false; reason: 'unknown' | 'owned' | 'sparks' } {
  const item = itemById(itemId)
  if (!item) return { ok: false, reason: 'unknown' }
  if (new Set(owned).has(itemId)) return { ok: false, reason: 'owned' }
  if (sparks < item.price) return { ok: false, reason: 'sparks' }
  return { ok: true }
}
