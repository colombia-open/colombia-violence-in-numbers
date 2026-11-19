"""Genera las variantes responsive (AVIF/WebP/JPG x 640/1280/1920/2560) para
cada imagen en site/assets/img/originals/. No falla si falta un original: el
sistema de slots en el frontend muestra un placeholder para lo que no exista.

Uso: python scripts/optimize_images.py
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

try:
    import pillow_avif  # noqa: F401  (registra el plugin AVIF en Pillow)

    HAS_AVIF = True
except ImportError:
    HAS_AVIF = False

ROOT = Path(__file__).resolve().parent.parent
ORIGINALS_DIR = ROOT / "site" / "assets" / "img" / "originals"
OUT_DIR = ROOT / "site" / "assets" / "img"
WIDTHS = (640, 1280, 1920, 2560)
SOURCE_EXTS = (".png", ".jpg", ".jpeg", ".webp")

QUALITY = {"webp": 82, "jpg": 82, "avif": 55}


def variants_for(src: Path) -> list[tuple[str, int]]:
    """Formatos x anchos a generar, sin ampliar mas alla del ancho original."""
    with Image.open(src) as im:
        native_w = im.width
    formats = ["webp", "jpg"] + (["avif"] if HAS_AVIF else [])
    widths = [w for w in WIDTHS if w <= native_w] or [native_w]
    return [(fmt, w) for fmt in formats for w in widths]


def process(src: Path) -> None:
    slot = src.stem
    with Image.open(src) as im:
        im = im.convert("RGB")
        for fmt, width in variants_for(src):
            height = round(im.height * (width / im.width))
            resized = im.resize((width, height), Image.LANCZOS)
            out_path = OUT_DIR / f"{slot}-{width}.{fmt}"
            save_kwargs = {"quality": QUALITY[fmt]}
            if fmt == "jpg":
                resized.save(out_path, format="JPEG", optimize=True, **save_kwargs)
            elif fmt == "webp":
                resized.save(out_path, format="WEBP", method=6, **save_kwargs)
            elif fmt == "avif":
                resized.save(out_path, format="AVIF", **save_kwargs)
            print(f"  {out_path.relative_to(ROOT)} ({width}x{height})")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not ORIGINALS_DIR.exists():
        print(f"No existe {ORIGINALS_DIR}; nada que optimizar.")
        return

    sources = sorted(p for p in ORIGINALS_DIR.iterdir() if p.suffix.lower() in SOURCE_EXTS)
    if not sources:
        print(f"{ORIGINALS_DIR} esta vacio; nada que optimizar.")
        return

    if not HAS_AVIF:
        print("pillow-avif-plugin no disponible: se omite AVIF (WebP/JPG igual se generan).", file=sys.stderr)

    for src in sources:
        print(f"{src.relative_to(ROOT)}:")
        process(src)


if __name__ == "__main__":
    main()
