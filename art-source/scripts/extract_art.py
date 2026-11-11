#!/usr/bin/env python3
"""Extract Sprout art assets from the source sheets in art-source/.

Usage:  python3 art-source/scripts/extract_art.py [preview_dir]
Writes public/art/*.webp, public/icons/*.png, public/favicon.ico.
If preview_dir is given, also writes each output composited on sky blue there.

Background removal: the crop's background colour is the median of its border.
Pixels within `fuzz` (normalised RGB distance) of it that are connected to the
crop border (plus optional extra seed points) form the background region.
  soft mode: alpha ramps with distance inside that region and colour is
             un-mixed from the bg, so soft drop shadows and anti-aliased edges
             survive as semi-transparent pixels.
  hard mode: the region becomes fully transparent; alpha is eroded 1px and
             feathered (used where a tinted backdrop must go entirely).
Characters have thick dark outlines, so the region stops at them.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
CHAR = ROOT / "art-source/character"
MOCK = ROOT / "art-source/mockups"
ART = ROOT / "public/art"
ICONS = ROOT / "public/icons"
PREVIEW = Path(sys.argv[1]) if len(sys.argv) > 1 else None
SKY = (0x8E, 0xC9, 0xFF)
MAXD = np.sqrt(3) * 255

_cache = {}


def load(path):
    if path not in _cache:
        _cache[path] = np.asarray(Image.open(path).convert("RGBA")).astype(np.float32)
    return _cache[path]


def flood(mask, seeds=()):
    """Part of boolean `mask` connected to the image border or to seeds."""
    h, w = mask.shape
    m = np.full((h + 2, w + 2), 255, np.uint8)  # 1px frame joins all border regions
    m[1:-1, 1:-1] = np.where(mask, 255, 0)
    im = Image.fromarray(m, "L").copy()  # copy: floodfill is a no-op on array-backed images
    for x, y in [(0, 0)] + [(sx + 1, sy + 1) for sx, sy in seeds]:
        ImageDraw.floodfill(im, (x, y), 128)
    return np.asarray(im)[1:-1, 1:-1] == 128


def bg_region(rgb, bg, fuzz, seeds):
    """Boolean mask of bg-like pixels connected to the border or to seeds."""
    dist = np.linalg.norm(rgb - bg, axis=2) / MAXD
    return flood(dist < fuzz, seeds), dist


def cutout(src, box, mode="soft", fuzz=0.22, erase=(), seeds=(), alpha_src=False):
    x0, y0, x1, y1 = box
    a = load(src)[y0:y1, x0:x1].copy()
    if alpha_src:  # source already has a real alpha channel
        a[..., 3] = np.where(a[..., 3] < 8, 0, a[..., 3])
        return a
    rgb = a[..., :3]
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    for ex0, ey0, ex1, ey1 in erase:  # paint unwanted bits (arrows, bubbles) with bg
        rgb[max(ey0 - y0, 0):max(ey1 - y0, 0), max(ex0 - x0, 0):max(ex1 - x0, 0)] = bg
    region, dist = bg_region(rgb, bg, fuzz, [(sx - x0, sy - y0) for sx, sy in seeds])
    if mode == "soft":
        t = np.clip(dist / fuzz, 0, 1)
        alpha = np.where(region, t * t * (3 - 2 * t), 1.0)
        safe = np.maximum(alpha, 1e-3)[..., None]
        rgb[:] = np.where(region[..., None], np.clip(bg + (rgb - bg) / safe, 0, 255), rgb)
        a[..., 3] = alpha * 255
    else:
        al = Image.fromarray(np.where(region, 0, 255).astype(np.uint8), "L")
        al = al.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
        a[..., 3] = np.asarray(al)
    a[..., 3] = np.where(a[..., 3] < 6, 0, a[..., 3])
    return a


def finish(a, out, maxside, pad=0.04):
    """Trim to alpha bbox, pad, downscale, write WebP (+ preview)."""
    ys, xs = np.where(a[..., 3] > 0)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape[:2]
    p = round(max(w, h) * pad)
    canvas = np.zeros((h + 2 * p, w + 2 * p, 4), np.float32)
    canvas[p:p + h, p:p + w] = a
    im = Image.fromarray(canvas.round().astype(np.uint8), "RGBA")
    s = maxside / max(im.size)
    if s < 1:
        im = im.convert("RGBa").resize((round(im.width * s), round(im.height * s)), Image.LANCZOS).convert("RGBA")
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp.png")
    im.save(tmp)
    subprocess.run(["magick", tmp, "-quality", "88", "-define", "webp:alpha-quality=95",
                    "-define", "webp:method=6", out], check=True)
    tmp.unlink()
    if PREVIEW:
        PREVIEW.mkdir(parents=True, exist_ok=True)
        bgim = Image.new("RGBA", im.size, SKY + (255,))
        Image.alpha_composite(bgim, Image.open(out).convert("RGBA")).save(PREVIEW / f"{out.stem}.png")


# name: (source, box(x0,y0,x1,y1), options)
EVO = CHAR / "03_Sprout_Evolution_Stages.png"
EXPR = CHAR / "02_Sprout_Expression_Sheet.png"
POSES = CHAR / "04_Sprout_Six_Poses.png"
SHEET = CHAR / "01_Sprout_Character_Sheet.png"
JOBS = {
    # evolution stages (cream bg); orange arrows painted out
    "stage-seed": (EVO, (25, 405, 268, 695), {}),
    "stage-sprout": (EVO, (340, 270, 662, 695), {"erase": [(330, 490, 345, 570)]}),
    "stage-bloom": (EVO, (705, 190, 1142, 695), {"erase": [(660, 490, 735, 570)]}),
    "stage-grove": (EVO, (1140, 60, 1660, 695), {"erase": [(1135, 490, 1206, 570)]}),
    # expressions (white bg), label pills excluded by box bottom (feet end y407/897, pills start y410/900)
    "expr-happy": (EXPR, (20, 30, 380, 409), {}),
    "expr-excited": (EXPR, (400, 30, 760, 409), {}),
    "expr-proud": (EXPR, (775, 30, 1150, 409), {}),
    "expr-sleepy": (EXPR, (1165, 30, 1530, 409), {}),
    "expr-sad": (EXPR, (25, 515, 380, 899), {}),
    "expr-surprised": (EXPR, (395, 515, 760, 899), {}),
    "expr-love": (EXPR, (775, 515, 1150, 899), {}),
    "expr-determined": (EXPR, (1160, 515, 1530, 899), {}),
    # poses: source already has transparency, crop the 3x2 grid cells
    "pose-coin-jar": (POSES, (0, 0, 512, 512), {"alpha_src": True}),
    "pose-cheer": (POSES, (512, 0, 1024, 512), {"alpha_src": True}),
    "pose-sleep": (POSES, (1024, 0, 1536, 512), {"alpha_src": True}),
    "pose-wave": (POSES, (0, 512, 512, 1024), {"alpha_src": True}),
    "pose-gift": (POSES, (512, 512, 1024, 1024), {"alpha_src": True}),
    "pose-phone": (POSES, (1024, 512, 1536, 1024), {"alpha_src": True}),
    # character sheet front view
    "sprout-front": (SHEET, (20, 285, 385, 770), {}),
    # mockup illustrations
    "onboard-safe": (MOCK / "03_onboarding_money_stays_yours.png", (50, 420, 795, 1000), {}),
    "treat-love": (MOCK / "11_notification_treat.png", (250, 500, 548, 948),
                   {"erase": [(517, 470, 720, 616), (507, 470, 517, 505), (512, 567, 540, 595)]}),
    "withdraw-worried": (MOCK / "13_withdraw_screen.png", (240, 345, 610, 710), {"seeds": [(435, 403)]}),
    "streak-jar": (MOCK / "08_streak_screen.png", (180, 545, 665, 892),
                   {"erase": [(175, 540, 442, 582), (523, 540, 670, 616), (517, 573, 530, 582)]}),
}
BADGES = {  # tan backdrop disc removed (hard mode)
    "badge-seedling": (40, 935, 228, 1088),
    "badge-flame": (233, 935, 421, 1088),
    "badge-shield": (426, 935, 614, 1088),
    "badge-medal": (619, 935, 807, 1088),
}


def icons():
    src = MOCK / "15_app_icon_and_garden_backgrounds.png"
    # outline box of the rounded square is x 56..445, y 200..613 (390x414);
    # hard-cut the cream + drop shadow outside the navy outline
    a = cutout(src, (46, 190, 456, 640), mode="hard", fuzz=0.5)
    ys, xs = np.where(a[..., 3] > 0)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape[:2]
    side = max(h, w)
    sq = np.zeros((side, side, 4), np.float32)
    sq[(side - h) // 2:(side - h) // 2 + h, (side - w) // 2:(side - w) // 2 + w] = a
    im = Image.fromarray(sq.round().astype(np.uint8), "RGBA").convert("RGBa")
    ICONS.mkdir(parents=True, exist_ok=True)
    for n in (512, 192):
        im.resize((n, n), Image.LANCZOS).convert("RGBA").save(ICONS / f"icon-{n}.png", optimize=True)
    # apple touch: gold square from inside the outline (iOS rounds corners itself)
    # take the outline box, turn the navy outline + cream corners (non-gold, touching the
    # border) into gold, centre on a gold square
    goldc = np.array([0xF6, 0xB2, 0x21], np.float32)
    box = load(src)[200:614, 56:446, :3].copy()  # 390x414 outline box
    box[flood(np.linalg.norm(box - goldc, axis=2) / MAXD > 0.12)] = goldc
    gold = Image.new("RGB", (414, 414), "#F6B221")
    gold.paste(Image.fromarray(box.round().astype(np.uint8), "RGB"), (12, 0))
    gold.resize((180, 180), Image.LANCZOS).save(ICONS / "apple-touch-icon.png", optimize=True)
    tmp = ICONS / "_fav.png"
    im.resize((64, 64), Image.LANCZOS).convert("RGBA").save(tmp)
    subprocess.run(["magick", tmp, "-define", "icon:auto-resize=32,16", ROOT / "public/favicon.ico"], check=True)
    tmp.unlink()
    if PREVIEW:
        for f in ("icon-512.png", "icon-192.png", "apple-touch-icon.png"):
            i = Image.open(ICONS / f).convert("RGBA")
            Image.alpha_composite(Image.new("RGBA", i.size, SKY + (255,)), i).save(PREVIEW / f"icon_{f}")


def main():
    for name, (src, box, opts) in JOBS.items():
        finish(cutout(src, box, **opts), ART / f"{name}.webp", 640)
    for name, box in BADGES.items():
        a = cutout(MOCK / "12_collection_screen.png", box, mode="hard", fuzz=0.2)
        finish(a, ART / f"{name}.webp", 256)
    icons()


if __name__ == "__main__":
    main()
