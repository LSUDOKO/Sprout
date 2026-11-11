'use client'
// The living pet: layered SVG parts + Motion transforms (docs/08). One 400×400 viewBox.
// Only transform + opacity animate; loops pause when the tab is hidden or motion is reduced.
import { motion, useReducedMotion, type Transition } from 'motion/react'
import { useEffect, useId, useState } from 'react'
import type { StageId } from '@/lib/game/config'
import type { Mood } from '@/lib/game/mood'
import { usePageVisible } from './usePageVisible'

export type Cosmetics = { hat?: string | null; neck?: string | null; face?: string | null; effect?: string | null }
export type PetPalette = { body: string; shade: string; light: string }

export const PALETTES: Record<string, PetPalette> = {
  gold: { body: '#F9B92C', shade: '#E59A14', light: '#FFD978' },
  sky: { body: '#7CC4F5', shade: '#4E9FD8', light: '#BFE4FF' },
  rose: { body: '#F49AB8', shade: '#D96C92', light: '#FFD0DF' },
  plum: { body: '#B48AE0', shade: '#8D63BF', light: '#DCC5F5' },
  mint: { body: '#7DD69A', shade: '#4FB36F', light: '#C2F0D0' },
  peach: { body: '#FBA36F', shade: '#E07B45', light: '#FFD2B5' },
}
/** Stable colour per user id for squad/leaderboard avatars (the viewer's own pet stays gold). */
export function paletteFor(seed: string, isMe = false): PetPalette {
  if (isMe) return PALETTES.gold!
  const keys = ['sky', 'rose', 'plum', 'mint', 'peach', 'gold']
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTES[keys[h % keys.length]!]!
}

const INK = '#1B1B30'
const SW = 9 // outline width in viewBox units

type Props = {
  stage: StageId
  mood: Mood
  cosmetics?: Cosmetics
  palette?: PetPalette
  /** Growth scale inside a stage: 1 … 1.15 */
  scale?: number
  size?: number | string
  animated?: boolean
  /** Tap → squash + giggle */
  onTap?: () => void
  onLongPress?: () => void
  className?: string
  title?: string
  silhouette?: boolean
}

const STAGE_SCALE: Record<StageId, number> = { seed: 0.92, sprout: 0.9, bloom: 0.95, grove: 1 }

export function PetRig({ stage, mood, cosmetics = {}, palette = PALETTES.gold!, scale = 1, size = 260, animated = true, onTap, onLongPress, className = '', title, silhouette }: Props) {
  const uid = useId().replace(/:/g, '')
  const reduced = useReducedMotion()
  const visible = usePageVisible()
  // Loops start after mount so server HTML and the first client render always match.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const live = mounted && animated && !reduced && visible && !silhouette
  const [blink, setBlink] = useState(false)
  const [giggle, setGiggle] = useState(false)

  // Blink: visual-only interval (never tied to any reward).
  useEffect(() => {
    if (!live || mood === 'sleepy') return
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true)
        setTimeout(() => setBlink(false), 120)
        loop()
      }, 2000 + Math.random() * 4000)
    }
    loop()
    return () => clearTimeout(t)
  }, [live, mood])

  const p = silhouette ? { body: '#2B2F55', shade: '#20244a', light: '#3a3f6b' } : palette
  const s = STAGE_SCALE[stage] * scale
  const breathe: Transition = { duration: mood === 'sleepy' ? 4 : mood === 'sad' ? 3.2 : 2.4, repeat: Infinity, ease: 'easeInOut' }
  const loop = <T,>(v: T) => (live ? v : undefined)

  const effectiveMood: Mood = giggle ? 'celebrating' : mood
  const eyes = blink ? 'closed' : eyeFor(effectiveMood)
  const mouth = giggle ? 'laugh' : mouthFor(effectiveMood)

  let press: ReturnType<typeof setTimeout> | undefined
  const handlers = onTap || onLongPress
    ? {
        onPointerDown: () => {
          press = setTimeout(() => {
            press = undefined
            onLongPress?.()
          }, 550)
        },
        onPointerUp: () => {
          if (press) {
            clearTimeout(press)
            press = undefined
            setGiggle(true)
            setTimeout(() => setGiggle(false), 600)
            onTap?.()
          }
        },
        onPointerLeave: () => press && clearTimeout(press),
      }
    : {}

  const hop = live && (mood === 'happy' ? { y: [0, 0, -10, 0, 0] } : mood === 'celebrating' ? { y: [0, -40, 0, -40, 0] } : undefined)

  return (
    <svg viewBox="0 0 400 400" width={size} height={size} className={className} role="img" aria-label={title ?? `${stage} pet, ${mood}`} style={{ overflow: 'visible', touchAction: 'manipulation', filter: silhouette ? 'brightness(0) invert(13%) sepia(30%) saturate(1500%) hue-rotate(205deg)' : undefined, opacity: silhouette ? 0.92 : undefined }}>
      <defs>
        <clipPath id={`body-${uid}`}>
          <path d={bodyPath(stage)} />
        </clipPath>
        <radialGradient id={`aura-${uid}`}>
          <stop offset="0" stopColor="#FFE58A" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFE58A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {cosmetics.effect === 'gold_aura' && !silhouette && (
        <motion.circle cx="200" cy="230" r="190" fill={`url(#aura-${uid})`} animate={loop({ scale: [1, 1.06, 1], opacity: [0.8, 1, 0.8] })} transition={{ duration: 2.6, repeat: Infinity }} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />
      )}

      {/* shadow: scales inversely to breathing */}
      <motion.ellipse cx="200" cy="378" rx={110 * s} ry="13" fill="#1F2348" opacity="0.13" animate={loop({ scaleX: [1, 0.94, 1] })} transition={breathe} style={{ transformBox: 'fill-box', transformOrigin: 'center' }} />

      <motion.g {...handlers} animate={hop || undefined} transition={mood === 'celebrating' ? { duration: 1.1, repeat: Infinity, repeatDelay: 0.8 } : { duration: 1.2, repeat: Infinity, repeatDelay: 4.8 }} whileTap={onTap ? { scaleY: 0.9, scaleX: 1.1 } : undefined} style={{ cursor: onTap ? 'pointer' : undefined, transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
        {/* stage scale anchored at the feet */}
        <g transform={`translate(200 372) scale(${s}) translate(-200 -372)`}>
          {mood === 'hungry' && !silhouette && <Bowl />}
          {stage !== 'seed' && <Feet p={p} />}

          <motion.g animate={loop({ scaleY: [1, 1.03, 1], scaleX: [1, 0.99, 1] })} transition={breathe} style={{ transformBox: 'fill-box', transformOrigin: 'center bottom' }}>
            {stage === 'grove' && <GroveCrownBack />}
            {stage !== 'seed' && <Arm side="l" p={p} mood={effectiveMood} live={live} />}
            {stage !== 'seed' && <Arm side="r" p={p} mood={effectiveMood} live={live} />}

            {/* body */}
            <path d={bodyPath(stage)} fill={p.body} />
            <g clipPath={`url(#body-${uid})`}>
              <ellipse cx="292" cy="300" rx="120" ry="140" fill={p.shade} opacity="0.55" />
              <ellipse cx="150" cy={stage === 'seed' ? 222 : 160} rx="30" ry="18" fill="#fff" opacity="0.45" transform={`rotate(-30 150 ${stage === 'seed' ? 222 : 160})`} />
            </g>
            <path d={bodyPath(stage)} fill="none" stroke={INK} strokeWidth={SW} strokeLinejoin="round" />

            {!silhouette && stage !== 'seed' && <Belly stage={stage} />}
            {!silhouette && (cosmetics.neck === 'star_scarf' ? <Scarf stars /> : stage === 'bloom' ? <Scarf /> : null)}

            {!silhouette && (
              <g>
                <Blush stage={stage} />
                <Eyes kind={eyes} stage={stage} mood={effectiveMood} />
                <Mouth kind={mouth} stage={stage} />
                {cosmetics.face === 'sunglasses' && <Sunglasses stage={stage} />}
              </g>
            )}

            {/* head top: leaf sways from its stem base */}
            <motion.g animate={loop({ rotate: mood === 'sad' ? [12, 14, 12] : [-6, 6, -6] })} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} style={{ transformBox: 'view-box', transformOrigin: `200px ${headTop(stage)}px` }}>
              <HeadTop stage={stage} silhouette={silhouette} />
            </motion.g>
            {!silhouette && cosmetics.hat === 'leaf_cap' && <LeafCap stage={stage} />}
            {!silhouette && cosmetics.hat === 'crown' && <Crown stage={stage} />}
          </motion.g>
        </g>
      </motion.g>

      {live && mood === 'sleepy' && <Zzz />}
      {live && mood === 'love' && <Hearts />}
      {live && (mood === 'celebrating' || mood === 'happy') && <Sparkles dense={mood === 'celebrating'} />}
    </svg>
  )
}

// ---------- geometry ----------

const headTop = (stage: StageId) => (stage === 'seed' ? 188 : 114)

function bodyPath(stage: StageId) {
  if (stage === 'seed') return 'M200 188 C 258 188 292 230 292 282 C 292 336 254 368 200 368 C 146 368 108 336 108 282 C 108 230 142 188 200 188 Z'
  // Bean: a little narrower on top, rounder at the bottom.
  return 'M200 114 C 266 114 304 166 304 232 C 306 306 266 348 200 348 C 134 348 94 306 96 232 C 96 166 134 114 200 114 Z'
}

function eyeFor(m: Mood) {
  return m === 'celebrating' ? 'sparkle' : m === 'love' ? 'heart' : m === 'sad' ? 'teary' : m === 'sleepy' ? 'closed' : m === 'hungry' ? 'down' : 'open'
}
function mouthFor(m: Mood) {
  return m === 'celebrating' || m === 'love' ? 'laugh' : m === 'hungry' ? 'o' : m === 'sleepy' ? 'flat' : m === 'sad' ? 'frown' : 'smile'
}

const face = (stage: StageId) => (stage === 'seed' ? { y: 268, dx: 40, r: 0.8 } : { y: 200, dx: 42, r: 1 })

function Eyes({ kind, stage }: { kind: string; stage: StageId; mood: Mood }) {
  const f = face(stage)
  return (
    <g>
      {[-1, 1].map((side) => {
        const cx = 200 + side * f.dx
        const cy = f.y
        const k = `e${side}`
        if (kind === 'closed')
          return <path key={k} d={`M${cx - 16 * f.r} ${cy + 2} Q${cx} ${cy + 14 * f.r} ${cx + 16 * f.r} ${cy + 2}`} fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
        if (kind === 'heart')
          return <path key={k} transform={`translate(${cx} ${cy}) scale(${f.r})`} d="M0 16 C -26 -2 -22 -22 -9 -22 C -3 -22 0 -16 0 -12 C 0 -16 3 -22 9 -22 C 22 -22 26 -2 0 16 Z" fill="#EF4F6B" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
        if (kind === 'sparkle')
          return <path key={k} transform={`translate(${cx} ${cy}) scale(${f.r})`} d="M0 -24 C 3 -7 7 -3 22 0 C 7 3 3 7 0 24 C -3 7 -7 3 -22 0 C -7 -3 -3 -7 0 -24 Z" fill={INK} />
        const down = kind === 'down' ? 6 : 0
        return (
          <g key={k}>
            <ellipse cx={cx} cy={cy} rx={24 * f.r} ry={28 * f.r} fill={INK} />
            <circle cx={cx - 8 * f.r} cy={cy - 10 * f.r + down} r={9 * f.r} fill="#fff" />
            <circle cx={cx + 7 * f.r} cy={cy + 8 * f.r + down * 0.5} r={3.6 * f.r} fill="#fff" />
            {kind === 'teary' && <path d={`M${cx + 14} ${cy + 18} q 6 12 0 18 q -6 -6 0 -18 Z`} fill="#6CB8F2" stroke="#3E8FD0" strokeWidth={2} />}
          </g>
        )
      })}
      {kind === 'teary' && (
        <g stroke={INK} strokeWidth={5} strokeLinecap="round">
          <path d={`M${200 - f.dx - 18} ${f.y - 34} l 22 -7`} />
          <path d={`M${200 + f.dx + 18} ${f.y - 34} l -22 -7`} />
        </g>
      )}
    </g>
  )
}

function Mouth({ kind, stage }: { kind: string; stage: StageId }) {
  const f = face(stage)
  const y = f.y + 34 * f.r
  const r = f.r
  switch (kind) {
    case 'laugh':
      return (
        <g>
          <path d={`M${200 - 20 * r} ${y - 6} Q200 ${y + 34 * r} ${200 + 20 * r} ${y - 6} Z`} fill="#3A1621" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
          <path d={`M${200 - 11 * r} ${y + 12 * r} Q200 ${y + 2} ${200 + 11 * r} ${y + 12 * r} Q200 ${y + 22 * r} ${200 - 11 * r} ${y + 12 * r}Z`} fill="#F27C8C" />
        </g>
      )
    case 'o':
      return <ellipse cx="200" cy={y + 4} rx={8 * r} ry={10 * r} fill="#3A1621" stroke={INK} strokeWidth={4} />
    case 'flat':
      return <path d={`M${200 - 10 * r} ${y + 4} h ${20 * r}`} stroke={INK} strokeWidth={5} strokeLinecap="round" />
    case 'frown':
      return <path d={`M${200 - 11 * r} ${y + 9} Q200 ${y - 3} ${200 + 11 * r} ${y + 9}`} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
    default:
      return (
        <g>
          <path d={`M${200 - 13 * r} ${y - 3} Q200 ${y + 22 * r} ${200 + 13 * r} ${y - 3} Z`} fill="#3A1621" stroke={INK} strokeWidth={4.5} strokeLinejoin="round" />
          <path d={`M${200 - 7 * r} ${y + 8 * r} Q200 ${y + 2} ${200 + 7 * r} ${y + 8 * r} Q200 ${y + 14 * r} ${200 - 7 * r} ${y + 8 * r}Z`} fill="#F27C8C" />
        </g>
      )
  }
}

function Blush({ stage }: { stage: StageId }) {
  const f = face(stage)
  return (
    <g fill="#F48A86" opacity="0.75">
      <ellipse cx={200 - f.dx - 30 * f.r} cy={f.y + 28 * f.r} rx={15 * f.r} ry={10 * f.r} />
      <ellipse cx={200 + f.dx + 30 * f.r} cy={f.y + 28 * f.r} rx={15 * f.r} ry={10 * f.r} />
    </g>
  )
}

function Belly({ stage }: { stage: StageId }) {
  const cy = stage === 'bloom' ? 314 : 304
  const r = stage === 'bloom' ? 27 : 30
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2
    return `${(200 + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return <polygon points={pts} fill="#232A52" stroke="#232A52" strokeWidth={12} strokeLinejoin="round" />
}

function Arm({ side, p, mood, live }: { side: 'l' | 'r'; p: PetPalette; mood: Mood; live: boolean }) {
  const dir = side === 'l' ? -1 : 1
  const x = 200 + dir * 96
  const up = mood === 'celebrating'
  return (
    <motion.g
      animate={live ? (up ? { rotate: [dir * -110, dir * -125, dir * -110] } : { rotate: [dir * 4, dir * -4, dir * 4] }) : { rotate: up ? dir * -110 : 0 }}
      transition={{ duration: up ? 0.6 : 2.4, repeat: live ? Infinity : 0, ease: 'easeInOut', delay: side === 'l' ? 0 : 0.3 }}
      style={{ transformBox: 'view-box', transformOrigin: `${x}px 240px` }}
    >
      <path d={`M${x} 226 q ${dir * 44} 6 ${dir * 42} 42 q ${dir * -4} 22 ${dir * -40} 14 Z`} fill={p.body} stroke={INK} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round" />
    </motion.g>
  )
}

function Feet({ p }: { p: PetPalette }) {
  return (
    <g fill={p.body} stroke={INK} strokeWidth={SW}>
      <ellipse cx="156" cy="356" rx="32" ry="18" />
      <ellipse cx="244" cy="356" rx="32" ry="18" />
    </g>
  )
}

const LEAF = '#62C252'
const LEAF_DARK = '#3E9A3A'
function Leaf({ d, vein }: { d: string; vein: string }) {
  return (
    <g>
      <path d={d} fill={LEAF} stroke={INK} strokeWidth={SW - 1} strokeLinejoin="round" />
      <path d={vein} fill="none" stroke={LEAF_DARK} strokeWidth={4} strokeLinecap="round" />
    </g>
  )
}

function HeadTop({ stage, silhouette }: { stage: StageId; silhouette?: boolean }) {
  const fill = silhouette ? '#2B2F55' : undefined
  if (stage === 'seed')
    return (
      <g style={fill ? { filter: 'brightness(0.2)' } : undefined}>
        <path d="M200 200 q -2 -14 2 -24" stroke={INK} strokeWidth={7} strokeLinecap="round" fill="none" />
        <Leaf d="M202 180 C 186 156 160 156 150 166 C 162 186 186 190 202 180 Z" vein="M200 180 C 184 172 170 168 158 168" />
        <Leaf d="M202 178 C 214 152 240 146 252 156 C 244 178 222 186 202 178 Z" vein="M204 178 C 218 168 232 162 244 160" />
      </g>
    )
  if (stage === 'sprout')
    return (
      <g style={fill ? { filter: 'brightness(0.2)' } : undefined}>
        <path d="M200 116 q 2 -16 8 -26" stroke={INK} strokeWidth={7} strokeLinecap="round" fill="none" />
        <Leaf d="M206 96 C 210 58 240 36 282 34 C 284 72 256 100 206 96 Z" vein="M210 92 C 232 76 252 60 270 46" />
      </g>
    )
  if (stage === 'bloom')
    return (
      <g style={fill ? { filter: 'brightness(0.2)' } : undefined}>
        <Leaf d="M198 110 C 180 76 146 68 118 80 C 128 108 160 120 198 110 Z" vein="M194 108 C 170 96 148 88 128 84" />
        <Leaf d="M204 108 C 212 68 244 50 280 52 C 278 90 248 114 204 108 Z" vein="M208 104 C 230 88 250 72 268 60" />
        <Flower cx={244} cy={110} />
      </g>
    )
  // grove: front crown leaves + coin fruit
  return (
    <g style={fill ? { filter: 'brightness(0.2)' } : undefined}>
      <Leaf d="M200 112 C 194 70 210 40 238 26 C 250 58 236 96 200 112 Z" vein="M204 106 C 214 78 224 54 234 36" />
      <Leaf d="M196 114 C 170 92 132 92 112 110 C 132 132 168 132 196 114 Z" vein="M192 114 C 168 110 144 110 122 112" />
      {[
        [138, 120],
        [196, 70],
        [256, 88],
        [292, 140],
      ].map(([x, y]) => (
        <Coin key={`${x}`} cx={x!} cy={y!} />
      ))}
    </g>
  )
}

function GroveCrownBack() {
  return (
    <g>
      <Leaf d="M150 130 C 120 96 124 60 150 40 C 172 72 172 106 150 130 Z" vein="M150 124 C 146 98 146 72 150 50" />
      <Leaf d="M252 128 C 260 88 290 64 326 66 C 320 104 292 130 252 128 Z" vein="M258 124 C 278 104 298 88 316 76" />
      <Leaf d="M290 170 C 314 144 348 140 368 156 C 350 182 318 186 290 170 Z" vein="M296 170 C 318 162 340 158 360 158" />
    </g>
  )
}

function Coin({ cx, cy }: { cx: number; cy: number }) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i
    return `${(cx + 9 * Math.cos(a)).toFixed(1)},${(cy + 9 * Math.sin(a)).toFixed(1)}`
  }).join(' ')
  return (
    <g>
      <circle cx={cx} cy={cy} r="22" fill="#F7C33A" stroke={INK} strokeWidth={7} />
      <circle cx={cx} cy={cy} r="14" fill="#FFD95E" stroke="#D99A12" strokeWidth={3} />
      <polygon points={pts} fill="none" stroke="#C88A0E" strokeWidth={3.5} strokeLinejoin="round" />
    </g>
  )
}

function Flower({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      {Array.from({ length: 5 }, (_, i) => {
        const a = ((Math.PI * 2) / 5) * i - Math.PI / 2
        return <circle key={i} cx={cx + 16 * Math.cos(a)} cy={cy + 16 * Math.sin(a)} r="12" fill="#FFF9EC" stroke={INK} strokeWidth={5} />
      })}
      <circle cx={cx} cy={cy} r="9" fill="#F6B221" stroke={INK} strokeWidth={4} />
    </g>
  )
}

function Scarf({ stars }: { stars?: boolean }) {
  const fill = stars ? '#2E3A7A' : '#F59A2A'
  const dark = stars ? '#1F2860' : '#D9781A'
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      <path d="M266 270 l 30 52 q -14 9 -32 2 l -12 -42 Z" fill={dark} />
      <path d="M104 250 Q 200 290 296 250 L 300 274 Q 200 318 100 274 Z" fill={fill} />
      {stars &&
        [
          [146, 282],
          [200, 294],
          [254, 280],
        ].map(([x, y]) => <path key={x} transform={`translate(${x} ${y}) scale(.5)`} d="M0 -14 L4 -4 L14 -4 L6 3 L9 13 L0 7 L-9 13 L-6 3 L-14 -4 L-4 -4 Z" fill="#FFD84A" stroke="none" />)}
    </g>
  )
}

function Sunglasses({ stage }: { stage: StageId }) {
  const f = face(stage)
  return (
    <g stroke={INK} strokeWidth={6}>
      <path d={`M${200 - f.dx + 22} ${f.y - 4} h ${2 * f.dx - 44}`} />
      <circle cx={200 - f.dx} cy={f.y} r={26 * f.r} fill="#1E2340" />
      <circle cx={200 + f.dx} cy={f.y} r={26 * f.r} fill="#1E2340" />
      <path d={`M${200 - f.dx - 12} ${f.y - 10} l 10 -6`} stroke="#fff" strokeOpacity=".7" strokeWidth={4} strokeLinecap="round" />
    </g>
  )
}

function LeafCap({ stage }: { stage: StageId }) {
  const y = headTop(stage) + 8
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      <path d={`M140 ${y + 14} Q200 ${y - 52} 260 ${y + 14} Q200 ${y + 2} 140 ${y + 14} Z`} fill="#4FB04A" />
      <path d={`M134 ${y + 16} Q200 ${y + 2} 272 ${y + 18}`} fill="none" />
      <circle cx="200" cy={y - 22} r="8" fill="#2F8A3E" />
    </g>
  )
}

function Crown({ stage }: { stage: StageId }) {
  const y = headTop(stage) + 2
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      <path d={`M160 ${y + 6} L156 ${y - 40} L182 ${y - 16} L200 ${y - 50} L218 ${y - 16} L244 ${y - 40} L240 ${y + 6} Z`} fill="#FFCB3D" />
      <circle cx="200" cy={y - 18} r="7" fill="#E5484D" strokeWidth={4} />
    </g>
  )
}

function Bowl() {
  return (
    <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
      <path d="M300 352 h 76 q -4 26 -38 26 q -34 0 -38 -26 Z" fill="#8EC9FF" />
    </g>
  )
}

function Zzz() {
  return (
    <g fontFamily="var(--font-display)" fontWeight="700" fill="#3E8FD0">
      {[0, 1, 2].map((i) => (
        <motion.text key={i} x={286 + i * 18} y={150 - i * 22} fontSize={26 + i * 6} initial={{ opacity: 0, y: 10 }} animate={{ opacity: [0, 1, 0], y: [10, -16, -34] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.9 }}>
          z
        </motion.text>
      ))}
    </g>
  )
}

function Hearts() {
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <motion.path
          key={i}
          d="M0 10 C -16 -1 -13 -14 -5 -14 C -2 -14 0 -10 0 -8 C 0 -10 2 -14 5 -14 C 13 -14 16 -1 0 10 Z"
          fill="#EF4F6B"
          initial={{ opacity: 0, x: 70 + i * 120, y: 200 }}
          animate={{ opacity: [0, 1, 0], y: [200, 110, 60] }}
          transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}
    </g>
  )
}

function Sparkles({ dense }: { dense?: boolean }) {
  const pts = dense
    ? [
        [70, 120],
        [330, 100],
        [52, 250],
        [350, 230],
        [110, 60],
        [300, 40],
      ]
    : [
        [80, 120],
        [330, 110],
      ]
  return (
    <g fill="#FFC93C">
      {pts.map(([x, y], i) => (
        <motion.path
          key={i}
          transform={`translate(${x} ${y})`}
          d="M0 -14 C 2 -4 4 -2 14 0 C 4 2 2 4 0 14 C -2 4 -4 2 -14 0 C -4 -2 -2 -4 0 -14 Z"
          animate={{ scale: [0.4, 1.1, 0.4], opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.35 }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      ))}
    </g>
  )
}
