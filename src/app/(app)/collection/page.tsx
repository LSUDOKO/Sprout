'use client'
// S13 Collection: stages (locked as silhouettes with their requirement), badges, wardrobe.
import Link from 'next/link'
import { useMe } from '@/lib/client/hooks'
import { STAGES, type StageId } from '@/lib/game/config'
import { BADGES } from '@/lib/game/badges'
import { stageIndex } from '@/lib/game/growth'
import { formatNim } from '@/lib/nimiq/luna'
import { useT, type TKey } from '@/lib/i18n'
import { PetRig } from '@/components/pet/PetRig'
import { BadgeIcon } from '@/components/BadgeIcon'
import { BackButton, Card } from '@/components/ui/kit'

export default function CollectionPage() {
  const t = useT()
  const { data: me } = useMe()
  if (!me) return null
  const reached = stageIndex(me.pet!.maxStage as StageId)
  const owned = new Set(me.badges.map((b) => b.id))
  return (
    <main className="min-h-dvh bg-cream px-4 pt-[calc(var(--safe-top)+12px)] pb-6">
      <div className="flex items-center gap-2">
        <BackButton href="/" label={t('common.back')} />
        <h1 className="flex-1 pr-10 text-center text-[40px] font-bold">{t('col.title')}</h1>
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-4">
        {STAGES.map((s, i) => {
          const unlocked = i <= reached
          const label = unlocked ? t(`stage.${s.id}`) : t('col.locked', { stage: t(`stage.${s.id}`) })
          return (
            <li key={s.id} className="relative flex flex-col items-center">
              <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[24px] bg-white shadow-[var(--shadow-card)]">
                {unlocked ? (
                  <>
                    <div className="absolute bottom-6 h-6 w-3/4 rounded-[50%] bg-[#bfe39a]" />
                    <img src={`/art/stage-${s.id}.webp`} alt="" className={`relative w-auto ${['h-20', 'h-28', 'h-32', 'h-36'][i]}`} />
                  </>
                ) : (
                  <>
                    <PetRig stage={s.id} mood="content" size={150} silhouette animated={false} title={label} />
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 pt-6 text-white">
                      <span className="text-3xl" aria-hidden>
                        🔒
                      </span>
                      <span className="rounded-full bg-navy/70 px-2 py-0.5 text-center font-display text-sm font-bold">{t('col.needs', { amount: formatNim(s.minStake, 0), weeks: s.minKept })}</span>
                    </span>
                  </>
                )}
              </div>
              <span className="-mt-4 rounded-full border border-gold/50 bg-cream px-4 py-1 font-display text-lg font-semibold shadow-sm">{label}</span>
            </li>
          )
        })}
      </ul>

      <h2 className="mt-7 text-center text-[28px] font-semibold">{t('col.badges')}</h2>
      <ul className="mt-3 grid grid-cols-4 gap-x-2 gap-y-4">
        {BADGES.map((b) => {
          const has = owned.has(b.id)
          return (
            <li key={b.id} className="flex flex-col items-center text-center" title={t(`badge.${b.id}.rule` as TKey)}>
              <BadgeIcon id={b.id} locked={!has} size={72} />
              <span className={`mt-1 font-display text-[13px] font-semibold leading-tight ${has ? 'text-ink' : 'text-slate'}`}>{t(`badge.${b.id}` as TKey)}</span>
              {!has && <span className="text-[11px] leading-tight text-slate">{t(`badge.${b.id}.rule` as TKey)}</span>}
            </li>
          )
        })}
      </ul>

      <Card className="mt-7 flex items-center gap-3">
        <PetRig stage={me.growth.stage as StageId} mood="happy" size={80} cosmetics={{ hat: me.pet?.hat, neck: me.pet?.neck, face: me.pet?.face, effect: me.pet?.effect }} animated={false} />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{t('col.cosmetics')}</h2>
          <p className="text-sm text-slate">✨ {t('shop.sparks', { n: me.sparks })}</p>
        </div>
        <Link href="/shop" className="press rounded-full bg-navy px-5 py-2.5 font-display font-semibold text-white">
          {t('col.shop')}
        </Link>
      </Card>
    </main>
  )
}
