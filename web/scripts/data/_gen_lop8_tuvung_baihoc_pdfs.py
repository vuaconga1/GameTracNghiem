#!/usr/bin/env python3
"""Extract 6 page images from Tuvung_Lop8.docx → JPGs + 1-page PDFs.

Usage (from web/):
  py -3 scripts/data/_gen_lop8_tuvung_baihoc_pdfs.py
  py -3 scripts/data/_gen_lop8_tuvung_baihoc_pdfs.py --docx "E:/.../Tuvung_Lop8.docx"
"""
from __future__ import annotations

import argparse
import re
import sys
import zipfile
from pathlib import Path

try:
    import img2pdf
except ImportError:
    print("Missing img2pdf — pip install img2pdf", file=sys.stderr)
    sys.exit(1)

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE / "tuvung-baihoc-lop8"
PDF_DIR = OUT_DIR / "pdfs"

DEFAULT_DOCX_CANDIDATES = [
    Path(r"E:\Wewin\Game Trắc Nghiệm\PDF\Tuvung_Lop8.docx"),
    HERE.parents[3] / "PDF" / "Tuvung_Lop8.docx",
    Path.cwd().parents[2] / "PDF" / "Tuvung_Lop8.docx",
]


def find_docx(explicit: str | None) -> Path:
    if explicit:
        p = Path(explicit)
        if not p.is_file():
            raise FileNotFoundError(p)
        return p
    for cand in DEFAULT_DOCX_CANDIDATES:
        if cand.is_file():
            return cand
    raise FileNotFoundError("Tuvung_Lop8.docx not found — pass --docx PATH")


def extract_ordered_images(docx: Path) -> list[tuple[str, bytes]]:
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
        if len(embeds) != 6:
            raise RuntimeError(f"Expected 6 embedded images, found {len(embeds)}")
        ordered: list[tuple[str, bytes]] = []
        for i, rid in enumerate(embeds, start=1):
            target = rid_map[rid].replace("\\", "/")
            if not target.startswith("word/"):
                target = "word/" + target.lstrip("/")
            data = z.read(target)
            ext = Path(target).suffix.lower() or ".jpg"
            ordered.append((f"image{i}{ext}", data))
        return ordered


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docx", default=None)
    args = parser.parse_args()

    docx = find_docx(args.docx)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)

    print(f"DOCX: {docx}")
    images = extract_ordered_images(docx)
    jpg_paths: list[Path] = []
    for name, data in images:
        dest = OUT_DIR / name
        dest.write_bytes(data)
        print(f"  wrote {dest.name} ({len(data)} bytes)")
        jpg_paths.append(dest)

    for i, jpg in enumerate(jpg_paths, start=1):
        pdf = PDF_DIR / f"unit-{i}.pdf"
        pdf.write_bytes(img2pdf.convert(str(jpg)))
        print(f"  wrote pdfs/{pdf.name} ({pdf.stat().st_size} bytes)")

    combined = PDF_DIR / "Tuvung_Baihoc_Lop8.pdf"
    combined.write_bytes(img2pdf.convert([str(p) for p in jpg_paths]))
    print(f"  wrote pdfs/{combined.name} ({combined.stat().st_size} bytes)")
    print("Done.")


if __name__ == "__main__":
    main()
