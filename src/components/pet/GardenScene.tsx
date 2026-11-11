'use client'
// Garden backgrounds drawn in SVG (sticker style): one per stage, plus cosmetic backgrounds.
// The center-bottom stays clear for the pet.
import type { StageId } from '@/lib/game/config'

const INK = '#1B1B30'
type Theme = { skyTop: string; skyBottom: string; hill: string; hillTop: string; ground: string; night?: boolean }
const THEMES: Record<string, Theme> = {
  day: { skyTop: '#BFE4FA', skyBottom: '#EAF6E8', hill: '#9BD46B', hillTop: '#C4E68A', ground: '#D9EFB4' },
  soil: { skyTop: '#C7E6F8', skyBottom: '#F3EEDD', hill: '#B98552', hillTop: '#D3A26C', ground: '#E9CFA6' },
  moon_garden: { skyTop: '#3B3F7E', skyBottom: '#8C8CC9', hill: '#5E9C78', hillTop: '#7DBA8F', ground: '#9CCBA4', night: true },
  sakura_garden: { skyTop: '#FFD9E6', skyBottom: '#FFF1E8', hill: '#A9D37A', hillTop: '#CBE59A', ground: '#E3F1C4' },
  night_sky: { skyTop: '#141838', skyBottom: '#3A3F7A', hill: '#3E6B5A', hillTop: '#4F8570', ground: '#6A9C86', night: true },
}

export function GardenScene({ stage, background, className = '' }: { stage: StageId; background?: string | null; className?: string }) {
  const theme = THEMES[background ?? ''] ?? (stage === 'seed' ? THEMES.soil! : THEMES.day!)
  const id = `g-${stage}-${background ?? 'x'}`
  return (
    <svg viewBox="0 0 390 440" preserveAspectRatio="xMidYMax slice" className={`absolute inset-0 h-full w-full ${className}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={theme.skyTop} />
          <stop offset="1" stopColor={theme.skyBottom} />
        </linearGradient>
        <radialGradient id={`${id}-sun`} cx="0.5" cy="0.35" r="0.55">
          <stop offset="0" stopColor="#FFF7D6" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFF7D6" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="390" height="440" fill={`url(#${id}-sky)`} />
      {!theme.night && <circle cx="200" cy="150" r="190" fill={`url(#${id}-sun)`} />}

      {theme.night ? <NightSky moon={background === 'moon_garden'} /> : <Clouds />}
      {background === 'sakura_garden' && <SakuraTree />}

      {/* back hill + bush */}
      <path d="M-20 300 C 40 250 120 262 170 290 L -20 340 Z" fill={theme.hill} stroke={INK} strokeWidth="3" opacity="0.9" />
      {stage !== 'seed' && <Bush x={30} y={286} />}
      {stage !== 'seed' && !background && <CoinTree x={318} y={250} coins={stage === 'grove' ? 7 : stage === 'bloom' ? 5 : 3} />}
      {stage === 'grove' && !background && <SmallTree x={72} y={262} />}
      {stage !== 'seed' && <Fence x={250} y={296} />}

      {/* main hill */}
      <path d="M-30 316 C 80 278 300 276 420 312 L 420 440 L -30 440 Z" fill={theme.hill} stroke={INK} strokeWidth="3.5" />
      <path d="M-30 330 C 80 296 300 294 420 328 L 420 440 L -30 440 Z" fill={theme.hillTop} />
      <path d="M-30 372 C 90 350 300 350 420 372 L 420 440 L -30 440 Z" fill={theme.ground} opacity="0.7" />

      {stage === 'seed' ? <SoilBits /> : <GrassBits flowers={stage === 'bloom' || stage === 'grove' ? 7 : 3} />}
      {stage === 'seed' && <Fence x={40} y={300} small />}
    </svg>
  )
}

function Clouds() {
  return (
    <g fill="#FFF" stroke={INK} strokeWidth="2.5" opacity="0.9">
      <path d="M52 92 a 18 18 0 0 1 30 -10 a 22 22 0 0 1 40 6 a 14 14 0 0 1 4 26 H 56 a 12 12 0 0 1 -4 -22 Z" fill="#FFEFF0" />
      <path d="M270 150 a 14 14 0 0 1 24 -8 a 18 18 0 0 1 32 6 a 11 11 0 0 1 2 20 h -52 a 10 10 0 0 1 -6 -18 Z" fill="#FFEFF0" />
      <path d="M24 186 a 12 12 0 0 1 20 -6 a 14 14 0 0 1 26 6 a 9 9 0 0 1 0 16 H 28 a 8 8 0 0 1 -4 -16 Z" fill="#FFEFF0" />
    </g>
  )
}

function NightSky({ moon }: { moon: boolean }) {
  const stars = [
    [40, 60],
    [110, 120],
    [170, 40],
    [240, 90],
    [320, 50],
    [360, 140],
    [70, 180],
    [290, 190],
  ]
  return (
    <g>
      {stars.map(([x, y], i) => (
        <path key={i} transform={`translate(${x} ${y}) scale(${0.4 + (i % 3) * 0.15})`} d="M0 -14 C 2 -4 4 -2 14 0 C 4 2 2 4 0 14 C -2 4 -4 2 -14 0 C -4 -2 -2 -4 0 -14 Z" fill="#FFE58A" />
      ))}
      {moon && (
        <g>
          <circle cx="318" cy="88" r="34" fill="#FFF3C4" stroke={INK} strokeWidth="3" />
          <circle cx="306" cy="80" r="6" fill="#F1DE9C" />
          <circle cx="326" cy="100" r="4" fill="#F1DE9C" />
        </g>
      )}
    </g>
  )
}

function CoinTree({ x, y, coins }: { x: number; y: number; coins: number }) {
  const spots = [
    [-30, -96],
    [12, -112],
    [40, -78],
    [-44, -60],
    [0, -70],
    [-14, -128],
    [34, -120],
  ].slice(0, coins)
  return (
    <g>
      <path d={`M${x - 10} ${y + 52} C ${x - 6} ${y + 10} ${x - 14} ${y - 16} ${x - 24} ${y - 34} M${x + 8} ${y + 52} C ${x + 6} ${y + 10} ${x + 14} ${y - 20} ${x + 30} ${y - 36}`} stroke="none" />
      <path d={`M${x - 12} ${y + 56} L ${x - 8} ${y - 20} L ${x + 8} ${y - 20} L ${x + 12} ${y + 56} Z`} fill="#8B5A3C" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
      <path
        d={`M${x - 70} ${y - 60} a 34 34 0 0 1 30 -56 a 40 40 0 0 1 70 -6 a 34 34 0 0 1 34 48 a 30 30 0 0 1 -20 50 a 36 36 0 0 1 -60 6 a 32 32 0 0 1 -54 -42 Z`}
        fill="#4FAE52"
        stroke={INK}
        strokeWidth="3.5"
      />
      <path d={`M${x - 56} ${y - 70} a 26 26 0 0 1 24 -40 a 30 30 0 0 1 50 -4`} fill="none" stroke="#7DD36D" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      {spots.map(([dx, dy], i) => (
        <g key={i} transform={`translate(${x + dx!} ${y + dy!})`}>
          <circle r="10" fill="#F7C33A" stroke={INK} strokeWidth="2.5" />
          <text y="4" textAnchor="middle" fontSize="11" fontWeight="800" fill="#B07A08" fontFamily="var(--font-display)">
            N
          </text>
        </g>
      ))}
    </g>
  )
}

function SmallTree({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x - 6} y={y - 6} width="12" height="40" fill="#8B5A3C" stroke={INK} strokeWidth="3" />
      <circle cx={x} cy={y - 26} r="30" fill="#5DBA5A" stroke={INK} strokeWidth="3.5" />
    </g>
  )
}

function SakuraTree() {
  return (
    <g>
      <path d="M70 330 L 76 220 L 88 220 L 92 330 Z" fill="#8B5A3C" stroke={INK} strokeWidth="3" />
      <circle cx="82" cy="196" r="56" fill="#F9B7CC" stroke={INK} strokeWidth="3.5" />
      <circle cx="60" cy="180" r="10" fill="#FFD9E6" />
      <circle cx="104" cy="210" r="8" fill="#FFD9E6" />
    </g>
  )
}

function Bush({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 40} ${y + 10} a 22 22 0 0 1 24 -30 a 26 26 0 0 1 46 0 a 20 20 0 0 1 20 30 Z`} fill="#6CC05A" stroke={INK} strokeWidth="3" />
      <circle cx={x - 12} cy={y - 6} r="4" fill="#F4A3A8" />
      <circle cx={x + 18} cy={y - 10} r="4" fill="#FFF" />
    </g>
  )
}

function Fence({ x, y, small }: { x: number; y: number; small?: boolean }) {
  const n = small ? 3 : 5
  return (
    <g transform={`translate(${x} ${y}) rotate(${small ? 0 : 8})`} stroke={INK} strokeWidth="3" strokeLinejoin="round">
      <rect x="-4" y="10" width={n * 22 + 4} height="8" fill="#B07A4C" />
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={`M${i * 22} 34 V 4 L ${i * 22 + 7} -6 L ${i * 22 + 14} 4 V 34 Z`} fill="#C48B57" />
      ))}
    </g>
  )
}

function GrassBits({ flowers }: { flowers: number }) {
  const blooms = [
    [40, 360, '#F49AB8'],
    [352, 352, '#FFFFFF'],
    [90, 400, '#A8B7F5'],
    [300, 404, '#F49AB8'],
    [24, 418, '#FFD45E'],
    [372, 410, '#FFFFFF'],
    [140, 420, '#FFD45E'],
  ].slice(0, flowers) as [number, number, string][]
  return (
    <g>
      {[
        [70, 340],
        [330, 336],
        [120, 380],
        [270, 384],
      ].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} q -6 -12 -14 -14 q 10 0 14 8 q 4 -8 14 -8 q -8 2 -14 14`} fill="#3E9A3A" stroke={INK} strokeWidth="2" />
      ))}
      {blooms.map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <circle key={a} cx={7 * Math.cos((a * Math.PI) / 180)} cy={7 * Math.sin((a * Math.PI) / 180)} r="5" fill={c} stroke={INK} strokeWidth="1.5" />
          ))}
          <circle r="3.5" fill="#F6B221" />
        </g>
      ))}
    </g>
  )
}

function SoilBits() {
  return (
    <g fill="#9C6B3E">
      <ellipse cx="80" cy="370" rx="10" ry="4" />
      <ellipse cx="310" cy="360" rx="14" ry="5" />
      <ellipse cx="250" cy="410" rx="9" ry="3" />
      <path d="M330 340 q 0 -12 6 -18 q 8 8 2 18 Z" fill="#5BC26A" stroke={INK} strokeWidth="2" />
    </g>
  )
}
