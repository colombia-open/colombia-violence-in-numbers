"""Genera la imagen Open Graph (1200x630) a partir de la foto del hero y el
titular de la pieza, para que los enlaces compartidos en redes se vean bien.

Uso: python scripts/generate_og_image.py
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
HERO = ROOT / "site" / "assets" / "img" / "originals" / "hero.webp"
OUT = ROOT / "site" / "assets" / "og-image.jpg"

OG_SIZE = (1200, 630)
TITLE = "Dos Colombias violentas"
SUBTITLE = "Homicidios, hurto y lesiones personales en Colombia, 2018\u20132025"
KICKER = "PERIODISMO DE DATOS \u00b7 COLOMBIA"


# Rutas candidatas por plataforma (Windows local, Ubuntu en CI con
# fonts-dejavu-core instalado por el workflow). Si ninguna existe, se cae a
# la fuente bitmap por defecto de Pillow en vez de fallar el build.
FONT_CANDIDATES = {
    "bold": [
        Path("C:/Windows/Fonts/seguisb.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
    ],
    "regular": [
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
    ],
}

BG = (10, 10, 10)
ACCENT = (57, 135, 229)  # --series-grandes (dark step)


def cover_crop(im: Image.Image, target_w: int, target_h: int) -> Image.Image:
    src_ratio = im.width / im.height
    target_ratio = target_w / target_h
    if src_ratio > target_ratio:
        new_h = im.height
        new_w = round(new_h * target_ratio)
    else:
        new_w = im.width
        new_h = round(new_w / target_ratio)
    left = (im.width - new_w) // 2
    top = (im.height - new_h) // 2
    return im.crop((left, top, left + new_w, top + new_h)).resize((target_w, target_h), Image.LANCZOS)


def font(kind: str, size: int) -> ImageFont.ImageFont:
    for p in FONT_CANDIDATES[kind]:
        if p.exists():
            return ImageFont.truetype(str(p), size)
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)

    if HERO.exists():
        with Image.open(HERO) as src:
            base = cover_crop(src.convert("RGB"), *OG_SIZE)
    else:
        base = Image.new("RGB", OG_SIZE, BG)

    # Duotono oscuro + degrade inferior para que el texto sea legible,
    # consistente con el tratamiento de foto del resto de la pieza.
    base = base.convert("L").convert("RGB")
    overlay = Image.new("RGB", OG_SIZE, BG)
    base = Image.blend(base, overlay, 0.55)

    gradient = Image.new("L", (1, OG_SIZE[1]), 0)
    for y in range(OG_SIZE[1]):
        t = y / OG_SIZE[1]
        gradient.putpixel((0, y), int(255 * max(0, (t - 0.25) / 0.75)))
    gradient = gradient.resize(OG_SIZE)
    black = Image.new("RGB", OG_SIZE, (0, 0, 0))
    base = Image.composite(black, base, gradient)

    draw = ImageDraw.Draw(base)
    margin = 64

    kicker_font = font("bold", 24)
    title_font = font("bold", 64)
    subtitle_font = font("regular", 28)

    y = OG_SIZE[1] - 260
    draw.text((margin, y), KICKER, font=kicker_font, fill=ACCENT)
    y += 40
    draw.text((margin, y), TITLE, font=title_font, fill=(246, 245, 242))
    y += 84
    draw.text((margin, y), SUBTITLE, font=subtitle_font, fill=(195, 194, 183))

    base.save(OUT, format="JPEG", quality=88, optimize=True)
    print(f"escrito {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
