'use client'
import confetti from 'canvas-confetti'

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Short, ≤ 30-particle bursts (docs/08 §7). Disabled for reduced motion. */
export function burst(colors = ['#F6B221', '#5BC26A', '#8EC9FF', '#F49AB8', '#FFFFFF']) {
  if (reduced()) return
  const opts = { particleCount: 30, spread: 75, startVelocity: 42, ticks: 160, colors, scalar: 1.1, disableForReducedMotion: true }
  confetti({ ...opts, origin: { x: 0.2, y: 0.35 }, angle: 60 })
  confetti({ ...opts, origin: { x: 0.8, y: 0.35 }, angle: 120 })
}
