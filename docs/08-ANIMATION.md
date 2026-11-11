# 08 — Pet Animation (2D rig in code)

Goal: the pet feels alive at 60fps on a cheap Android phone inside the Nimiq Pay WebView.
Approach: layered SVG parts + Framer Motion transforms. No 3D, no heavy runtimes.

## 1. Rig structure
```tsx
<PetRig stage="bloom" mood="happy" scale={1.08} cosmetics={...}>
  <g id="shadow" />            // ellipse under the feet, scales with "bounce"
  <g id="foot_l" /> <g id="foot_r" />
  <g id="body">                // breathing transform origin: bottom center
    <g id="belly" />
    <g id="arm_l" /> <g id="arm_r" />   // origin: shoulder
    <g id="face">
      <g id="eyes" />          // swapped by mood + blink
      <g id="mouth" />         // swapped by mood
    </g>
    <g id="leaf" />            // origin: stem base; sways
    <g id="cosmetic_neck" /> <g id="cosmetic_face" /> <g id="cosmetic_hat" />
  </g>
  <g id="effect" />            // aura, sparkles, Zzz, hearts
</PetRig>
```
Each part is an `<image>`/inline SVG positioned in a fixed 400×400 viewBox per stage (anchor points in `pet/<stage>/rig.json`).

## 2. Idle animations (always on, per mood)
| Anim | Parts | Values | Duration |
|---|---|---|---|
| Breathe | body scaleY 1 → 1.03, scaleX 1 → 0.99 | ease-in-out, loop | 2.4s |
| Leaf sway | leaf rotate −6° → 6° | loop | 3.2s |
| Blink | eyes → closed for 120ms | random interval 2–6s (visual only, not a reward) | – |
| Arm swing | arms rotate ±4° | loop offset | 2.4s |
| Shadow | shadow scaleX inverse to breathe | loop | 2.4s |

## 3. Mood variants
| Mood | Eyes | Mouth | Extra |
|---|---|---|---|
| happy | open | smile | small hop every 6s (y −8px) |
| content | open | smile | – |
| hungry | open (looking down) | o | glances at empty bowl prop |
| sad | teary | frown | breathe slower (3.2s), leaf droops (rotate 12°) |
| sleepy | closed | flat | "Zzz" text floating up, breathe 4s |
| love | heart | laugh | hearts particles rising |
| celebrating | sparkle | laugh | jump y −40px ×2, arms up (rotate −120°/120°), confetti |

## 4. Interaction
- Tap pet → squash (scaleY 0.9, scaleX 1.1) → stretch → giggle mouth for 600ms + tap sfx.
- Long-press → pet "talks" (next speech-bubble line).
- Feed confirmed → coin drops from the top into the pet's mouth → chew (mouth o ↔ smile ×3) → celebrate.

## 5. Evolution sequence (Evolution screen)
1. 0–0.6s: old form shakes (x ±4px), screen dims.
2. 0.6–1.6s: white silhouette flash pulses ×3 (opacity 0→1), light rays rotate behind.
3. 1.6–2.0s: swap to new form at scale 0.6 → spring to 1.0 (stiffness 260, damping 14).
4. 2.0s+: confetti burst (canvas-confetti, gold + green), title text slides up.
Total ≤ 3s; skip button after 1s.

## 6. Growth within a stage
`scale = 1 + 0.15 * progress`, animated with spring when progress changes. "Grew overnight" → pulse 1.0 → 1.06 → target over 1.2s with sparkles.

## 7. Performance rules
- Animate only `transform` and `opacity`. No filters/blur on mobile.
- Keep ≤ 12 animated nodes at once. Particles ≤ 30 and short-lived.
- Pause idle loops when the tab is hidden (`document.visibilityState`).
- Preload the current stage's parts only; lazy-load others.
- `prefers-reduced-motion`: disable loops and confetti; keep instant state swaps.

## 8. Optional Lottie/Rive
Celebrations (coins, hearts) can use Lottie JSON from LottieFiles (Lottie Simple License).
Keep the pet itself on the SVG rig so cosmetics and moods stay controllable.
