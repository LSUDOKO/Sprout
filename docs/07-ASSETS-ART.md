# 07 — Art & Assets

## 1. Style
Bold sticker illustration: thick black outlines (4–6px at 1x), flat colors + one soft cel shade,
chunky rounded shapes, huge glossy eyes. Cozy and cheerful, for young adults (not childish).
Palette: gold `#F6B221`, navy `#1F2348`, leaf `#5BC26A`, sky `#8EC9FF`, cream `#FFF6E5`, white, black outlines.
Inspiration: thick-outline mascot finance concepts on Dribbble — take the *style* only; the character,
layouts and art must be original.

## 2. The mascot: Sprout
Small round bean-shaped creature, gold body, navy hexagon belly patch (a nod to Nimiq's hexagon),
one green leaf on top of the head, stubby arms/feet, big black glossy eyes with white highlights, rosy cheeks.

## 3. Image-generation workflow (ChatGPT or any image model)
1. Paste the **style lock** prompt in a new chat.
2. Generate the **character sheet**. Iterate until perfect. Save it.
3. Attach the character sheet to every later prompt + "use this exact character".
4. Export PNGs; remove backgrounds (if needed) with any background remover; trace to SVG where possible (cleaner animation, smaller files).
5. Keep all prompts and outputs in `/art-source` (not deployed) and note the tool used in `CREDITS.md`.

### Prompt 0 — style lock
```
For this whole conversation, every image follows one style guide:
- Bold, playful sticker illustration: thick black outlines, flat colors with one soft cel-shade, chunky rounded shapes, big expressive eyes.
- Palette: Nimiq gold #F6B221, deep navy #1F2348, leaf green #5BC26A, sky blue #8EC9FF, cream #FFF6E5, white. Black outlines.
- UI: heavy rounded grotesk headings, clean sans body, rounded cards (24px), pill buttons, soft shadows, mobile-first.
- Mood: cozy, cheerful, motivating, for young adults (18–30), not childish.
- Never include real brand logos or existing characters.
Reply "Style locked" and wait.
```
### Prompt 1 — character sheet
```
Design an original mascot called "Sprout": a small, round, bean-shaped creature with a gold body (#F6B221), a navy hexagon-shaped belly patch, a single bright green leaf sprouting from the top of its head, tiny stubby arms and feet, huge glossy black eyes with white highlights, rosy cheeks. Friendly and a little mischievous.
Character sheet on a plain cream background: front, 3/4, side and back views, same size and proportions, labeled.
```
### Prompt 2 — expressions
```
Using this exact character: expression sheet, 8 headshots in a 4x2 grid on white, labeled: happy, celebrating (sparkle eyes), content, sleepy, sad (small tear), hungry (looking at an empty bowl), love (heart eyes), surprised. Identical proportions, colors, outlines.
```
### Prompt 3 — evolution stages
```
Using this exact character, 4 evolution stages left to right on cream, labeled:
1 "Seed": tiny round gold seed with eyes and a small leaf bud.
2 "Sprout": the base character.
3 "Bloom": a bit bigger, two leaves and a small flower on the head, a gold scarf.
4 "Grove": largest, small leafy crown with glowing gold coins hanging like fruit, confident pose.
Clearly the same character growing.
```
### Prompt 4 — animation parts (one per stage)
```
Using the "<STAGE>" form in front view, create an animation parts sheet on a transparent background: separate body, head leaf/crown, left arm, right arm, left foot, right foot, belly patch; eye states: open, closed, sparkle, heart, teary; mouths: smile, open laugh, small o, flat, frown. Same scale, no overlaps, generous spacing.
```
### Prompt 5 — poses (for celebrations and empty states)
```
Using this exact character, 6 full-body poses on transparent background, labeled: dropping a gold coin into a glass jar; jumping and cheering with confetti; sleeping curled up with "Zzz"; waving hello; hugging a heart-shaped gift box; holding a phone and pointing at it.
```
### Prompt 6 — backgrounds (no characters)
```
4 wide garden background scenes, one per stage, no characters, same style, 1170x1400:
(1) bare soil with a tiny pot, (2) small grassy garden with a fence, (3) blooming flower garden, (4) lush grove with a coin tree. Leave the center-bottom clear for the pet.
```
### Prompt 7 — cosmetics (transparent, front-facing, sized for the base character)
```
Using this exact character for scale, draw these items alone on transparent background, front view: leaf cap, tiny gold crown, star scarf, round sunglasses. Same outline style.
```
### Prompt 8 — app icon
```
App icon: Sprout's head with its leaf on a gold rounded-square background, thick outline, no text, 1024x1024.
```
### Screen mockups (optional, for design reference only)
Generate onboarding/home/feed/evolution/streak/squad screens with the same style for reference;
**build the real UI in code** (generated text in images is unreliable).

## 4. Asset list & naming
```
public/pet/<stage>/body.svg  leaf.svg  arm_l.svg  arm_r.svg  foot_l.svg  foot_r.svg  belly.svg
public/pet/<stage>/eyes_{open,closed,sparkle,heart,teary}.svg
public/pet/<stage>/mouth_{smile,laugh,o,flat,frown}.svg
public/pet/poses/{coin_jar,cheer,sleep,wave,gift,phone}.png
public/bg/{seed,sprout,bloom,grove}.webp   (+ cosmetics backgrounds)
public/cosmetics/{leaf_cap,crown,star_scarf,sunglasses}.svg
public/sfx/{tap,coin,success,evolve,error}.ogg
public/icons/icon-192.png icon-512.png apple-touch-icon.png
```
Targets: SVG parts < 20 KB each; backgrounds WebP < 150 KB; total first load < 1.5 MB.

## 5. Fallback (if AI art isn't ready)
Use CC0 sprites (e.g. LuizMelo Pet Cats, Kenney packs) temporarily — see `12-REFERENCES.md`.
Ship with the original Sprout art.

## 6. Sounds
Kenney Interface Sounds / UI Audio (CC0). Map: tap, coin (save), success (week kept), evolve (evolution), error.
Sound off by default; toggle in Me. Never autoplay.

## 7. CREDITS.md template
```
# Credits
- Sprout character and backgrounds: original, created by <you> with <tool> (prompts in /art-source).
- UI sounds: Kenney (CC0) — kenney.nl
- Fonts: Bricolage Grotesque (OFL), Inter (OFL) — Google Fonts
- Confetti: canvas-confetti (ISC)
- <any other asset>: <author> — <license> — <link>
```
