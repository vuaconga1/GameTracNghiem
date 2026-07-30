#!/usr/bin/env python3
"""Build per-unit Lop 9 skill lesson PDFs from the combined Grade 9 PDF.

Slices `PDF/GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.pdf` using the verified
Unit 1-6 skill page map, then writes one PDF per (unit, skill) plus a manifest:

- scripts/data/lop9-skill-lessons/unit-pdfs/unit-<n>-<skill>.pdf
- scripts/data/lop9-skill-lessons/manifest.json

Usage:
  py -3 scripts/data/_gen_lop9_skill_lesson_pdfs.py
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[4]
PDF_ROOT = REPO_ROOT / "PDF"
OUT_DIR = HERE / "lop9-skill-lessons"
UNIT_PDF_DIR = OUT_DIR / "unit-pdfs"
MANIFEST_PATH = OUT_DIR / "manifest.json"
PAGE_MAP_PATH = OUT_DIR / "page-map.json"
SOURCE_PDF = PDF_ROOT / "GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.pdf"
UNITS = [1, 2, 3, 4, 5, 6]


def load_page_map() -> dict[int, list[dict[str, int | str]]]:
    if not PAGE_MAP_PATH.is_file():
        raise FileNotFoundError(PAGE_MAP_PATH)
    raw = json.loads(PAGE_MAP_PATH.read_text(encoding="utf-8"))
    return {int(unit): entries for unit, entries in raw.items()}


def ensure_dirs() -> None:
    UNIT_PDF_DIR.mkdir(parents=True, exist_ok=True)
    for stale_pdf in UNIT_PDF_DIR.glob("*.pdf"):
        stale_pdf.unlink()


def validate_page_map(reader: PdfReader, page_map: dict[int, list[dict[str, int | str]]]) -> None:
    total_pages = len(reader.pages)
    for unit in UNITS:
        entries = page_map.get(unit)
        if not entries:
            raise RuntimeError(f"Missing page map for Unit {unit}")
        last_end = 0
        for entry in entries:
            page_start = int(entry["pageStart"])
            page_end = int(entry["pageEnd"])
            if page_start < 1 or page_end > total_pages or page_end < page_start:
                raise RuntimeError(f"Invalid range for Unit {unit}: {entry}")
            if page_start <= last_end:
                raise RuntimeError(f"Overlapping range for Unit {unit}: {entry}")
            last_end = page_end


def write_unit_pdf(reader: PdfReader, page_start: int, page_end: int, out_path: Path) -> int:
    writer = PdfWriter()
    for page_index in range(page_start - 1, page_end):
        writer.add_page(reader.pages[page_index])
    with out_path.open("wb") as fh:
        writer.write(fh)
    return len(writer.pages)


def build_manifest() -> dict:
    ensure_dirs()
    if not SOURCE_PDF.is_file():
        raise FileNotFoundError(SOURCE_PDF)

    page_map = load_page_map()
    reader = PdfReader(str(SOURCE_PDF))
    validate_page_map(reader, page_map)
    manifest_units: dict[str, dict] = {str(unit): {"unit": unit, "skills": []} for unit in UNITS}

    for unit in UNITS:
        for entry in page_map[unit]:
            skill_id = str(entry["skillId"])
            page_start = int(entry["pageStart"])
            page_end = int(entry["pageEnd"])
            unit_pdf = UNIT_PDF_DIR / f"unit-{unit}-{skill_id}.pdf"
            page_count = write_unit_pdf(reader, page_start, page_end, unit_pdf)
            print(f"Unit {unit} {skill_id}: pages {page_start}-{page_end} -> {unit_pdf.name} ({page_count} pages)")
            manifest_units[str(unit)]["skills"].append(
                {
                    "skillId": skill_id,
                    "sourcePdf": str(SOURCE_PDF.relative_to(REPO_ROOT)).replace("\\", "/"),
                    "unitPdf": str(unit_pdf.relative_to(HERE)).replace("\\", "/"),
                    "sourcePageStart": page_start,
                    "sourcePageEnd": page_end,
                    "pageCount": page_count,
                }
            )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourcePdf": str(SOURCE_PDF.relative_to(REPO_ROOT)).replace("\\", "/"),
        "units": manifest_units,
    }


def main() -> None:
    manifest = build_manifest()
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {MANIFEST_PATH}")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
