// S18 Share card: 1080×1920 PNG rendered on the server with next/og.
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { SHARE_KINDS, headline, shareData, type ShareKind } from '@/lib/server/shareData'

export const runtime = 'nodejs'

const BG: Record<string, [string, string]> = { seed: ['#C7E6F8', '#F3EEDD'], sprout: ['#BFE4FA', '#DFF3C8'], bloom: ['#FFD9E6', '#E6F6CC'], grove: ['#1F2348', '#3A4072'] }

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string; userId: string }> }) {
  const { kind, userId } = await ctx.params
  if (!SHARE_KINDS.includes(kind as ShareKind)) return new Response('Not found', { status: 404 })
  const d = await shareData(userId)
  if (!d) return new Response('Not found', { status: 404 })
  const png = await readFile(path.join(process.cwd(), 'public/art/share', `stage-${d.stage}.png`))
  const art = `data:image/png;base64,${png.toString('base64')}`
  const [top, bottom] = BG[d.stage] ?? BG.sprout!
  const dark = d.stage === 'grove'
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: `linear-gradient(${top}, ${bottom})`, padding: '140px 80px 120px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: dark ? '#F6B221' : '#1F2348' }}>Sprout</div>
        <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, textAlign: 'center', color: dark ? '#FFFFFF' : '#12142B', lineHeight: 1.1 }}>{headline(kind as ShareKind, d)}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 760, height: 760, borderRadius: 999, background: dark ? 'rgba(255,214,90,.25)' : 'rgba(255,255,255,.55)' }}>
          <img src={art} width={560} height={560} style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ display: 'flex', fontSize: 52, fontWeight: 700, color: dark ? '#FFFFFF' : '#1F2348' }}>{d.name} · 🔥 {d.streak}</div>
        <div style={{ display: 'flex', fontSize: 40, color: dark ? '#D6ECFB' : '#3A4072' }}>Grow yours on Sprout · Nimiq Pay</div>
      </div>
    ),
    { width: 1080, height: 1920, headers: { 'cache-control': 'public, max-age=300' } },
  )
}
