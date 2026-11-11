'use client'
// S14 Shop: fixed prices in Sparks, preview on the pet before buying. Cosmetic only.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/client/api'
import { meKey, useMe } from '@/lib/client/hooks'
import type { StageId } from '@/lib/game/config'
import type { Slot } from '@/lib/game/cosmetics'
import { useT, type TKey } from '@/lib/i18n'
import { useUi } from '@/stores/ui'
import { GardenScene } from '@/components/pet/GardenScene'
import { PetRig } from '@/components/pet/PetRig'
import { BackButton, Button, Skeleton } from '@/components/ui/kit'

type Item = { id: string; slot: Slot; price: number; owned: boolean }
const ICON: Record<string, string> = { leaf_cap: '🍃', crown: '👑', star_scarf: '🧣', sunglasses: '🕶️', moon_garden: '🌙', sakura_garden: '🌸', night_sky: '🌌', gold_aura: '✨' }

export default function ShopPage() {
  const t = useT()
  const qc = useQueryClient()
  const { data: me } = useMe()
  const toast = useUi((s) => s.toast)
  const shop = useQuery({ queryKey: ['shop'], queryFn: () => api<{ sparks: number; items: Item[] }>('/api/shop') })
  const [preview, setPreview] = useState<Item | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  if (!me?.pet) return null
  const pet = me.pet
  const equipped = (it: Item) => (pet as Record<string, string | null>)[it.slot] === it.id
  const look = { hat: pet.hat, neck: pet.neck, face: pet.face, effect: pet.effect, background: pet.background, ...(preview ? { [preview.slot]: preview.id } : {}) }

  async function act(it: Item) {
    setBusy(it.id)
    try {
      if (!it.owned) {
        await api('/api/shop/buy', { body: { itemId: it.id } })
        toast(`${ICON[it.id]} ${t(`item.${it.id}` as TKey)}`, 'success')
      }
      await api('/api/pet', { method: 'PATCH', body: { equip: { slot: it.slot, itemId: equipped(it) ? null : it.id } } })
      setPreview(null)
      await Promise.all([qc.invalidateQueries({ queryKey: meKey }), qc.invalidateQueries({ queryKey: ['shop'] })])
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="min-h-dvh bg-cream pb-6">
      <section className="relative h-[300px] overflow-hidden rounded-b-[36px] pt-[var(--safe-top)]">
        <GardenScene stage={me.growth.stage as StageId} background={look.background} />
        <div className="relative z-10 flex items-center justify-between px-4 pt-3">
          <BackButton href="/collection" label={t('common.back')} />
          <span className="rounded-full bg-white/85 px-4 py-1.5 font-display text-lg font-bold">✨ {shop.data?.sparks ?? me.sparks}</span>
        </div>
        <div className="relative z-10 flex justify-center">
          <PetRig stage={me.growth.stage as StageId} mood="happy" size={210} cosmetics={look} />
        </div>
      </section>
      <div className="px-4">
        <h1 className="mt-4 text-[34px] font-bold">{t('shop.title')}</h1>
        <p className="text-sm text-slate">{t('shop.note')}</p>
        {shop.isLoading && <Skeleton className="mt-4 h-60 w-full" />}
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {shop.data?.items.map((it) => {
            const on = equipped(it)
            const afford = (shop.data?.sparks ?? 0) >= it.price
            return (
              <li key={it.id}>
                <div className={`flex h-full flex-col items-center gap-1 rounded-[24px] border-[3px] bg-white p-3 text-center shadow-[var(--shadow-card)] ${preview?.id === it.id ? 'border-gold' : 'border-transparent'}`}>
                  <button type="button" onClick={() => setPreview(preview?.id === it.id ? null : it)} className="press flex flex-col items-center" aria-label={`${t(`item.${it.id}` as TKey)} preview`}>
                    <span className="text-4xl" aria-hidden>
                      {ICON[it.id]}
                    </span>
                    <span className="font-display text-lg font-semibold">{t(`item.${it.id}` as TKey)}</span>
                  </button>
                  <Button size="sm" variant={on ? 'outline' : it.owned ? 'leaf' : 'gold'} className="mt-auto w-full" disabled={!it.owned && !afford} loading={busy === it.id} onClick={() => act(it)}>
                    {on ? t('shop.unequip') : it.owned ? t('shop.equip') : t('shop.buy', { price: `✨${it.price}` })}
                  </Button>
                  {!it.owned && !afford && <span className="text-[11px] text-slate">{t('shop.notEnough')}</span>}
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
