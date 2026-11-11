'use client'
// Tiny UI sounds synthesized with WebAudio (no audio files to license). Off by default; never autoplay.
type Sfx = 'tap' | 'coin' | 'success' | 'evolve' | 'error'
let ctx: AudioContext | null = null

const NOTES: Record<Sfx, [number, number][]> = {
  tap: [[660, 0.06]],
  coin: [[988, 0.08], [1319, 0.16]],
  success: [[523, 0.1], [659, 0.1], [784, 0.2]],
  evolve: [[392, 0.12], [523, 0.12], [659, 0.12], [1047, 0.32]],
  error: [[220, 0.18]],
}

export function playSfx(kind: Sfx) {
  try {
    ctx ??= new AudioContext()
    let t = ctx.currentTime
    for (const [freq, dur] of NOTES[kind]) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = kind === 'error' ? 'sawtooth' : 'triangle'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + dur + 0.02)
      t += dur * 0.8
    }
  } catch {}
}
