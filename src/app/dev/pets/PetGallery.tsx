'use client'
import { PetRig, PALETTES } from '@/components/pet/PetRig'
import { STAGE_IDS } from '@/lib/game/config'
import { MOODS } from '@/lib/game/mood'

export function PetGallery() {
  return (
    <main className="bg-cream p-4">
      {STAGE_IDS.map((s) => (
        <section key={s} className="mb-4">
          <h2 className="font-display text-lg">{s}</h2>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <figure key={m} className="rounded-xl bg-white p-1 text-center text-xs">
                <PetRig stage={s} mood={m} size={150} animated={false} />
                {m}
              </figure>
            ))}
          </div>
        </section>
      ))}
      <section className="flex flex-wrap gap-2">
        <PetRig stage="sprout" mood="happy" size={150} animated={false} cosmetics={{ hat: 'crown', neck: 'star_scarf', face: 'sunglasses', effect: 'gold_aura' }} />
        <PetRig stage="bloom" mood="content" size={150} animated={false} cosmetics={{ hat: 'leaf_cap' }} />
        {Object.keys(PALETTES).map((k) => (
          <PetRig key={k} stage="sprout" mood="happy" size={110} animated={false} palette={PALETTES[k]} />
        ))}
        <PetRig stage="grove" mood="content" size={150} animated={false} silhouette />
      </section>
    </main>
  )
}
