#!/usr/bin/env python3
"""Render Lớp 9 pronunciation theory pages (one PDF page per SOUND).

Reads scripts/data/pronunciation-lop9-parsed.json (from _parse_lop9_pronunciation_docx.py).

Usage (from web/):
  py -3 scripts/data/_parse_lop9_pronunciation_docx.py
  py -3 scripts/data/_gen_lop9_pronunciation_baihoc_pdfs.py
  py -3 scripts/data/_gen_lop9_pronunciation_baihoc_pdfs.py --unit 1
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

try:
    import img2pdf
except ImportError:
    print("Missing img2pdf — pip install img2pdf", file=sys.stderr)
    sys.exit(1)

HERE = Path(__file__).resolve().parent
PARSED = HERE / "pronunciation-lop9-parsed.json"
OUT_DIR = HERE / "pronunciation-baihoc-lop9"
PDF_DIR = OUT_DIR / "pdfs"
PNG_DIR = OUT_DIR / "pages"

PAGE_W, PAGE_H = 1240, 1754  # ~A4 @ 150dpi
MARGIN = 72
LINE_GAP = 8


def find_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path(r"C:\Windows\Fonts\arial.ttf"),
        Path(r"C:\Windows\Fonts\segoeui.ttf"),
        Path(r"C:\Windows\Fonts\tahoma.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    ]
    for path in candidates:
        if path.is_file():
            return ImageFont.truetype(str(path), size=size)
    return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    if not words:
        return [""]
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def theory_lines_for_page(sound: dict, intro: list[str], include_intro: bool) -> list[str]:
    lines: list[str] = []
    if include_intro:
        lines.extend(intro[:3])
        if intro:
            lines.append("")
    lines.append(sound.get("heading") or sound.get("title") or "")
    lines.append("")
    for raw in sound.get("theory") or []:
        t = str(raw).strip()
        if not t:
            continue
        # Skip leftover table-ish noise
        if t in {"Từ vựng", "Từ loại", "Phiên âm", "Ý nghĩa"}:
            continue
        lines.append(t)
    return lines


def render_page(lines: list[str], title: str) -> Image.Image:
    img = Image.new("RGB", (PAGE_W, PAGE_H), "#fffdf8")
    draw = ImageDraw.Draw(img)
    title_font = find_font(36)
    body_font = find_font(26)
    small_font = find_font(20)

    y = MARGIN
    draw.text((MARGIN, y), title, font=title_font, fill="#0d2b6e")
    y += 52
    draw.line((MARGIN, y, PAGE_W - MARGIN, y), fill="#c5d0e6", width=2)
    y += 24

    max_w = PAGE_W - 2 * MARGIN
    for line in lines:
        if y > PAGE_H - MARGIN - 40:
            draw.text(
                (MARGIN, PAGE_H - MARGIN),
                "… (xem thêm trong tài liệu phát âm)",
                font=small_font,
                fill="#64748b",
            )
            break
        if not line:
            y += 14
            continue
        is_heading = line.upper().startswith("SOUND") or line.startswith("Âm /") or line[:2].isdigit()
        font = title_font if is_heading and len(line) < 40 else body_font
        fill = "#0d2b6e" if is_heading and len(line) < 40 else "#1e293b"
        for wrapped in wrap_text(draw, line, font, max_w):
            if y > PAGE_H - MARGIN - 40:
                break
            draw.text((MARGIN, y), wrapped, font=font, fill=fill)
            bbox = draw.textbbox((MARGIN, y), wrapped, font=font)
            y += (bbox[3] - bbox[1]) + LINE_GAP
    return img


def build_unit_pdf(unit: str, data: dict) -> Path:
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    unit_title = data.get("title") or f"UNIT {unit}"
    intro = data.get("intro") or []
    sounds = data.get("sounds") or []
    if not sounds:
        raise RuntimeError(f"Unit {unit} has no SOUND sections")

    png_paths: list[Path] = []
    for idx, sound in enumerate(sounds):
        slug = sound.get("slug") or f"S{idx+1}"
        lines = theory_lines_for_page(sound, intro, include_intro=(idx == 0))
        # Cap lines so page stays readable
        page_img = render_page(lines[:42], f"Lớp 9 · {unit_title}")
        png = PNG_DIR / f"unit-{unit}-{slug}.png"
        page_img.save(png, format="PNG")
        png_paths.append(png)
        print(f"  wrote {png.name}")

    pdf = PDF_DIR / f"unit-{unit}.pdf"
    pdf.write_bytes(img2pdf.convert([str(p) for p in png_paths]))
    print(f"  wrote pdfs/{pdf.name} ({pdf.stat().st_size} bytes, {len(png_paths)} pages)")
    return pdf


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--unit", type=int, default=None)
    parser.add_argument("--parsed", type=Path, default=PARSED)
    args = parser.parse_args()

    if not args.parsed.is_file():
        raise SystemExit(
            f"Missing {args.parsed}. Run: py -3 scripts/data/_parse_lop9_pronunciation_docx.py"
        )

    data = json.loads(args.parsed.read_text(encoding="utf-8"))
    units = [str(args.unit)] if args.unit is not None else sorted(data.keys(), key=lambda x: int(x))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for unit in units:
        if unit not in data:
            raise SystemExit(f"Unit {unit} missing in parsed JSON")
        print(f"\n=== Unit {unit} ===")
        build_unit_pdf(unit, data[unit])

    print("\nDone.")


if __name__ == "__main__":
    main()
