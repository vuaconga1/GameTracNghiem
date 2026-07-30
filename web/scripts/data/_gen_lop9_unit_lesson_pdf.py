#!/usr/bin/env python3
"""Extract Lớp 9 unit lesson pages from GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.docx.

The source docx stores each lesson page as an embedded full-page image.
This script walks `word/document.xml` in order, tracks the active `UNIT N`
heading, and groups subsequent images into that unit. It outputs:

- `scripts/data/lop9-unit-lessons/pages/unit-{n}-page-{m}.jpg`
- `scripts/data/lop9-unit-lessons/pdfs/unit-{n}.pdf`
- `scripts/data/lop9-unit-lessons/pdfs/GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.pdf`
- `scripts/data/lop9-unit-lessons/selection.json`

Usage:
  py -3 scripts/data/_gen_lop9_unit_lesson_pdf.py
  py -3 scripts/data/_gen_lop9_unit_lesson_pdf.py --docx "E:/.../GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.docx"
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from io import BytesIO
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
OUT_DIR = HERE / "lop9-unit-lessons"
PAGE_DIR = OUT_DIR / "pages"
PDF_DIR = OUT_DIR / "pdfs"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
UNIT_RE = re.compile(r"^UNIT\s+(\d+)\b", re.I)

DEFAULT_DOCX_CANDIDATES = [
    Path(r"E:\Wewin\Game Trắc Nghiệm\PDF\GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.docx"),
    HERE.parents[3] / "PDF" / "GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.docx",
    Path.cwd().parents[2] / "PDF" / "GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.docx",
]

EXPECTED_PAGE_COUNTS = {
    1: 7,
    2: 7,
    3: 4,
    4: 6,
    5: 5,
    6: 6,
}


def find_docx(explicit: str | None) -> Path:
    if explicit:
        path = Path(explicit)
        if not path.is_file():
            raise FileNotFoundError(path)
        return path
    for candidate in DEFAULT_DOCX_CANDIDATES:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError("GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.docx not found")


def clean_output_dir() -> None:
    PAGE_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    for path in PAGE_DIR.glob("*"):
        if path.is_file():
            path.unlink()
    for path in PDF_DIR.glob("*.pdf"):
        path.unlink()


def image_to_rgb(image_bytes: bytes) -> Image.Image:
    with Image.open(BytesIO(image_bytes)) as image:
        return image.convert("RGB")


def save_pdf(image_paths: list[Path], out_path: Path) -> None:
    images = [Image.open(path).convert("RGB") for path in image_paths]
    if not images:
        raise ValueError(f"No images for {out_path}")
    first, rest = images[0], images[1:]
    try:
        first.save(out_path, save_all=True, append_images=rest)
    finally:
        for image in images:
            image.close()


def extract(docx: Path) -> dict:
    with zipfile.ZipFile(docx) as archive:
        rels_root = ET.fromstring(archive.read("word/_rels/document.xml.rels"))
        doc_root = ET.fromstring(archive.read("word/document.xml"))

        rid_map: dict[str, str] = {}
        for rel in rels_root:
            rid = rel.attrib.get("Id")
            target = rel.attrib.get("Target")
            if rid and target:
                rid_map[rid] = target

        body = doc_root.find(W + "body")
        if body is None:
            raise RuntimeError("Missing document body")

        current_unit: int | None = None
        unit_pages: dict[int, list[dict]] = {unit: [] for unit in EXPECTED_PAGE_COUNTS}
        all_pages: list[dict] = []
        embed_index = 0

        for child in list(body):
            if child.tag != W + "p":
                continue

            text = "".join(node.text or "" for node in child.iter(W + "t")).strip()
            if text:
                match = UNIT_RE.match(text)
                if match:
                    current_unit = int(match.group(1))

            embeds = [
                node.attrib.get(R + "embed")
                for node in child.iter(A + "blip")
                if node.attrib.get(R + "embed")
            ]
            for rid in embeds:
                embed_index += 1
                if current_unit is None:
                    raise RuntimeError(f"Image #{embed_index} appears before any UNIT heading")
                target = rid_map[rid].replace("\\", "/")
                if not target.startswith("word/"):
                    target = "word/" + target.lstrip("/")
                image_bytes = archive.read(target)
                image = image_to_rgb(image_bytes)
                page_no = len(unit_pages[current_unit]) + 1
                out_name = f"unit-{current_unit}-page-{page_no}.jpg"
                out_path = PAGE_DIR / out_name
                image.save(out_path, format="JPEG", quality=95)
                image.close()

                record = {
                    "unit": current_unit,
                    "page": page_no,
                    "combinedPage": len(all_pages) + 1,
                    "heading": text if UNIT_RE.match(text or "") else None,
                    "embedIndex": embed_index,
                    "rId": rid,
                    "sourceMedia": target,
                    "outputImage": out_name,
                }
                unit_pages[current_unit].append(record)
                all_pages.append(record)

    for unit, expected in EXPECTED_PAGE_COUNTS.items():
        actual = len(unit_pages[unit])
        if actual != expected:
            raise RuntimeError(f"Unit {unit}: expected {expected} pages, found {actual}")

    for unit, records in unit_pages.items():
        paths = [PAGE_DIR / record["outputImage"] for record in records]
        save_pdf(paths, PDF_DIR / f"unit-{unit}.pdf")

    combined_paths = [PAGE_DIR / record["outputImage"] for record in all_pages]
    combined_pdf_name = "GLOBAL_GRADE_9_FINAL_Anh_Phu_Trang.pdf"
    save_pdf(combined_paths, PDF_DIR / combined_pdf_name)

    manifest = {
        "docx": str(docx),
        "combinedPdf": f"pdfs/{combined_pdf_name}",
        "totalPages": len(all_pages),
        "units": {
            str(unit): {
                "pageStart": records[0]["combinedPage"],
                "pageEnd": records[-1]["combinedPage"],
                "pageCount": len(records),
                "pages": records,
            }
            for unit, records in unit_pages.items()
        },
    }
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docx", default=None)
    args = parser.parse_args()

    docx = find_docx(args.docx)
    clean_output_dir()
    manifest = extract(docx)
    out_path = OUT_DIR / "selection.json"
    out_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"DOCX: {docx}")
    print(f"Combined PDF: {manifest['combinedPdf']}")
    print(f"Total pages: {manifest['totalPages']}")
    for unit, data in manifest["units"].items():
        print(f"Unit {unit}: {data['pageStart']}-{data['pageEnd']} ({data['pageCount']} pages)")
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass
    main()
