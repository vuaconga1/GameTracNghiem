#!/usr/bin/env python3
"""Extract Lớp 8 Ngữ pháp (grammar) content pages from NguPhap_Lop8.docx.

Skips decorative UNIT / "PART I. THEORY" banner pieces (small PNGs/JPGs).
Keeps full-page theory content images only (Word pages ~2–3 per unit).

Output (under scripts/data/nguphap-baihoc-lop8/):
  - unit-{1..6}-page-{1,2}.{jpg|png}  — selected content images
  - pdfs/unit-{n}-page-{1,2}.pdf       — 1-page PDFs
  - pdfs/unit-{n}.pdf                  — 2-page combined PDF per unit
  - selection.json                     — selected + skipped inventory

Usage (from web/):
  py -3 scripts/data/_gen_lop8_nguphap_baihoc_pdfs.py
  py -3 scripts/data/_gen_lop8_nguphap_baihoc_pdfs.py --docx "E:/.../NguPhap_Lop8.docx"
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
from io import BytesIO
from pathlib import Path

try:
    import img2pdf
except ImportError:
    print("Missing img2pdf — pip install img2pdf", file=sys.stderr)
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("Missing Pillow — pip install pillow", file=sys.stderr)
    sys.exit(1)

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE / "nguphap-baihoc-lop8"
PDF_DIR = OUT_DIR / "pdfs"
SKIPPED_DIR = OUT_DIR / "skipped"

DEFAULT_DOCX_CANDIDATES = [
    Path(r"E:\Wewin\Game Trắc Nghiệm\PDF\NguPhap_Lop8.docx"),
    HERE.parents[3] / "PDF" / "NguPhap_Lop8.docx",
    Path.cwd().parents[2] / "PDF" / "NguPhap_Lop8.docx",
]

# Full theory pages are ~A4 portrait screenshots (~1000×1400+).
MIN_CONTENT_WIDTH = 900
MIN_CONTENT_HEIGHT = 1200
MIN_CONTENT_BYTES = 80_000


def find_docx(explicit: str | None) -> Path:
    if explicit:
        p = Path(explicit)
        if not p.is_file():
            raise FileNotFoundError(p)
        return p
    for cand in DEFAULT_DOCX_CANDIDATES:
        if cand.is_file():
            return cand
    raise FileNotFoundError("NguPhap_Lop8.docx not found — pass --docx PATH")


def image_meta(data: bytes) -> tuple[int, int]:
    with Image.open(BytesIO(data)) as im:
        return im.size


def is_content_page(width: int, height: int, nbytes: int) -> bool:
    return (
        width >= MIN_CONTENT_WIDTH
        and height >= MIN_CONTENT_HEIGHT
        and nbytes >= MIN_CONTENT_BYTES
    )


def extract_ordered_embeds(docx: Path) -> list[dict]:
    """Return embeds in document order with media path + bytes (dedupe by first occurrence of same bytes ok)."""
    with zipfile.ZipFile(docx) as z:
        rels = z.read("word/_rels/document.xml.rels").decode("utf-8")
        doc = z.read("word/document.xml").decode("utf-8")
        rid_map: dict[str, str] = {}
        for m in re.finditer(r"<Relationship[^>]+/>", rels):
            tag = m.group(0)
            idm = re.search(r'Id="(rId\d+)"', tag)
            tm = re.search(r'Target="([^"]+)"', tag)
            if idm and tm:
                rid_map[idm.group(1)] = tm.group(1)

        embeds = re.findall(r'a:blip[^>]*r:embed="(rId\d+)"', doc)
        ordered: list[dict] = []
        for i, rid in enumerate(embeds, start=1):
            target = rid_map[rid].replace("\\", "/")
            if not target.startswith("word/"):
                target = "word/" + target.lstrip("/")
            data = z.read(target)
            width, height = image_meta(data)
            ordered.append(
                {
                    "embedIndex": i,
                    "rId": rid,
                    "media": target,
                    "fileName": Path(target).name,
                    "bytes": len(data),
                    "width": width,
                    "height": height,
                    "data": data,
                    "ext": Path(target).suffix.lower() or ".jpg",
                }
            )
        return ordered


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docx", default=None)
    args = parser.parse_args()

    docx = find_docx(args.docx)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    SKIPPED_DIR.mkdir(parents=True, exist_ok=True)

    # Clean previous generated assets (keep dirs).
    for p in OUT_DIR.glob("unit-*-page-*"):
        p.unlink()
    for p in PDF_DIR.glob("*.pdf"):
        p.unlink()
    for p in SKIPPED_DIR.glob("*"):
        if p.is_file():
            p.unlink()

    print(f"DOCX: {docx}")
    embeds = extract_ordered_embeds(docx)
    print(f"Total embeds in document order: {len(embeds)}")

    selected: list[dict] = []
    skipped: list[dict] = []
    seen_content_bytes: set[int] = set()

    for item in embeds:
        content = is_content_page(item["width"], item["height"], item["bytes"])
        # Skip jpeg/png duplicate of the same content already selected (same byte size + dims).
        fingerprint = (item["bytes"], item["width"], item["height"])
        meta = {
            "embedIndex": item["embedIndex"],
            "rId": item["rId"],
            "media": item["media"],
            "fileName": item["fileName"],
            "bytes": item["bytes"],
            "width": item["width"],
            "height": item["height"],
            "reason": "",
        }
        if not content:
            meta["reason"] = "decorative/banner (not full theory page)"
            skipped.append(meta)
            dest = SKIPPED_DIR / f"embed{item['embedIndex']:02d}_{item['fileName']}"
            dest.write_bytes(item["data"])
            print(
                f"  SKIP #{item['embedIndex']} {item['fileName']} "
                f"{item['width']}x{item['height']} ({item['bytes']} B) — {meta['reason']}"
            )
            continue

        if fingerprint in seen_content_bytes:
            meta["reason"] = "duplicate of already-selected content page"
            skipped.append(meta)
            print(
                f"  SKIP #{item['embedIndex']} {item['fileName']} "
                f"— {meta['reason']}"
            )
            continue

        seen_content_bytes.add(fingerprint)
        selected.append(item)
        print(
            f"  KEEP #{item['embedIndex']} {item['fileName']} "
            f"{item['width']}x{item['height']} ({item['bytes']} B)"
        )

    if len(selected) != 12:
        raise RuntimeError(
            f"Expected 12 content pages (2×6 units), found {len(selected)}. "
            "Adjust size thresholds or inspect skipped/."
        )

    selection_records: list[dict] = []
    jpg_by_unit: dict[int, list[Path]] = {}

    for i, item in enumerate(selected):
        unit = i // 2 + 1
        page = i % 2 + 1
        # Normalize extension to .jpg when source is jpeg.
        ext = item["ext"]
        if ext == ".jpeg":
            ext = ".jpg"
        img_name = f"unit-{unit}-page-{page}{ext}"
        img_path = OUT_DIR / img_name
        img_path.write_bytes(item["data"])
        jpg_by_unit.setdefault(unit, []).append(img_path)

        pdf_path = PDF_DIR / f"unit-{unit}-page-{page}.pdf"
        pdf_path.write_bytes(img2pdf.convert(str(img_path)))

        selection_records.append(
            {
                "unit": unit,
                "page": page,
                "outputImage": img_name,
                "outputPdf": pdf_path.name,
                "sourceMedia": item["media"],
                "sourceFileName": item["fileName"],
                "embedIndex": item["embedIndex"],
                "rId": item["rId"],
                "bytes": item["bytes"],
                "width": item["width"],
                "height": item["height"],
            }
        )
        print(f"  wrote {img_name} + pdfs/{pdf_path.name}")

    for unit, paths in sorted(jpg_by_unit.items()):
        if len(paths) != 2:
            raise RuntimeError(f"Unit {unit} has {len(paths)} pages, expected 2")
        combined = PDF_DIR / f"unit-{unit}.pdf"
        combined.write_bytes(img2pdf.convert([str(p) for p in paths]))
        print(f"  wrote pdfs/{combined.name} (2 pages)")

    all_combined = PDF_DIR / "NguPhap_Baihoc_Lop8.pdf"
    all_paths = [p for u in range(1, 7) for p in jpg_by_unit[u]]
    all_combined.write_bytes(img2pdf.convert([str(p) for p in all_paths]))
    print(f"  wrote pdfs/{all_combined.name} (12 pages)")

    manifest = {
        "docx": str(docx),
        "selectedCount": len(selection_records),
        "skippedCount": len(skipped),
        "selected": selection_records,
        "skipped": skipped,
        "rule": {
            "keep": f"width>={MIN_CONTENT_WIDTH} AND height>={MIN_CONTENT_HEIGHT} AND bytes>={MIN_CONTENT_BYTES}",
            "skip": "PART I. THEORY coral banner pieces, UNIT decorations, icons, duplicates",
        },
    }
    (OUT_DIR / "selection.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  wrote selection.json ({len(selection_records)} selected, {len(skipped)} skipped)")
    print("Done.")


if __name__ == "__main__":
    # Avoid Windows cp1252 crashes on Vietnamese paths in print().
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except Exception:
        pass
    main()
