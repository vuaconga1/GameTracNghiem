#!/usr/bin/env python3
"""Slice Grade 6/7 FINAL PDFs into per-(unit, skill) lesson PDFs + manifest.

Usage (from web/):
  py -3 scripts/data/_gen_middle_grade_skill_lesson_pdfs.py --grade 6
  py -3 scripts/data/_gen_middle_grade_skill_lesson_pdfs.py --grade 7
  py -3 scripts/data/_gen_middle_grade_skill_lesson_pdfs.py --all
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parents[4]
PDF_ROOT = REPO_ROOT / "PDF"

GRADE_CONFIG = {
    6: {
        "out": HERE / "lop6-skill-lessons",
        "source": PDF_ROOT / "GRADE 6 GLOBAL SUCCESS FINAL.pdf",
        "label": "lop6",
    },
    7: {
        "out": HERE / "lop7-skill-lessons",
        "source": PDF_ROOT / "GRADE 7 HK1 (GS) FINAL.pdf",
        "label": "lop7",
    },
}
UNITS = [1, 2, 3, 4, 5, 6]
SKILL_ORDER = ["vocabulary", "writing", "speaking", "reading"]


def write_pages(reader: PdfReader, ranges: list[tuple[int, int]], out_path: Path) -> int:
    writer = PdfWriter()
    for page_start, page_end in ranges:
        for idx in range(page_start - 1, page_end):
            writer.add_page(reader.pages[idx])
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("wb") as fh:
        writer.write(fh)
    return len(writer.pages)


def build_grade(grade: int) -> None:
    cfg = GRADE_CONFIG[grade]
    out_dir: Path = cfg["out"]
    source_pdf: Path = cfg["source"]
    page_map_path = out_dir / "page-map.json"
    unit_pdf_dir = out_dir / "unit-pdfs"
    manifest_path = out_dir / "manifest.json"

    if not page_map_path.is_file():
        raise FileNotFoundError(page_map_path)
    if not source_pdf.is_file():
        raise FileNotFoundError(source_pdf)

    page_map = {int(k): v for k, v in json.loads(page_map_path.read_text(encoding="utf-8")).items()}
    reader = PdfReader(str(source_pdf))
    total = len(reader.pages)

    unit_pdf_dir.mkdir(parents=True, exist_ok=True)
    for stale in unit_pdf_dir.glob("*.pdf"):
        stale.unlink()

    manifest_units: dict[str, dict] = {}
    rel_source = str(source_pdf.relative_to(REPO_ROOT)).replace("\\", "/")

    for unit in UNITS:
        entries = page_map.get(unit)
        if not entries:
            raise RuntimeError(f"Missing page map for grade {grade} unit {unit}")

        # Merge ranges by skillId (preserve first-seen order, then SKILL_ORDER)
        by_skill: dict[str, list[tuple[int, int]]] = {}
        for entry in entries:
            skill = str(entry["skillId"])
            start, end = int(entry["pageStart"]), int(entry["pageEnd"])
            if start < 1 or end > total or end < start:
                raise RuntimeError(f"Invalid range U{unit} {entry}")
            by_skill.setdefault(skill, []).append((start, end))

        skills_out = []
        ordered_skills = [s for s in SKILL_ORDER if s in by_skill] + [
            s for s in by_skill if s not in SKILL_ORDER
        ]
        for skill in ordered_skills:
            ranges = by_skill[skill]
            unit_pdf = unit_pdf_dir / f"unit-{unit}-{skill}.pdf"
            page_count = write_pages(reader, ranges, unit_pdf)
            src_start = min(r[0] for r in ranges)
            src_end = max(r[1] for r in ranges)
            print(
                f"G{grade} U{unit} {skill}: source {ranges} -> {unit_pdf.name} ({page_count}p)"
            )
            skills_out.append(
                {
                    "skillId": skill,
                    "sourcePdf": rel_source,
                    "unitPdf": str(unit_pdf.relative_to(HERE)).replace("\\", "/"),
                    "sourcePageStart": src_start,
                    "sourcePageEnd": src_end,
                    "pageCount": page_count,
                }
            )
        manifest_units[str(unit)] = {"unit": unit, "skills": skills_out}

    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourcePdf": rel_source,
        "units": manifest_units,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {manifest_path}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--grade", type=int, choices=[6, 7])
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()
    grades = [6, 7] if args.all or not args.grade else [args.grade]
    for grade in grades:
        build_grade(grade)
    return 0


if __name__ == "__main__":
    sys.exit(main())
