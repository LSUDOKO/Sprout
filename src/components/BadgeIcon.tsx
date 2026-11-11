// Badge medallions: original art for four badges, emoji medallions for the rest.
import { BADGES } from '@/lib/game/badges'

const ART: Record<string, string> = {
  first_seed: '/art/badge-seedling.webp',
  on_a_roll: '/art/badge-flame.webp',
  squad_founder: '/art/badge-shield.webp',
  club_10k: '/art/badge-medal.webp',
}

export function BadgeIcon({ id, locked, size = 76 }: { id: string; locked?: boolean; size?: number }) {
  const icon = BADGES.find((b) => b.id === id)?.icon ?? '🏅'
  return (
    <span className={`flex items-center justify-center rounded-full bg-[#f4e3c3] ${locked ? 'opacity-45 grayscale' : ''}`} style={{ width: size, height: size }}>
      {ART[id] ? (
        <img src={ART[id]} alt="" className="h-[82%] w-auto" />
      ) : (
        <span className="flex h-[78%] w-[78%] items-center justify-center rounded-full border-[3px] border-ink bg-gold text-[30px]" style={{ fontSize: size * 0.38 }}>
          {icon}
        </span>
      )}
    </span>
  )
}
