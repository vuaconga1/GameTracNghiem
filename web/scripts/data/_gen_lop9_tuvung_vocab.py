#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Extract vocab from Tuvung_Lop9.docx → lop9-tuvung-vocab.json (scramble source).

Usage:
  py -3 web/scripts/data/_gen_lop9_tuvung_vocab.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph

HERE = Path(__file__).resolve().parent
# web/scripts/data → repo root is parents[2]
PDF_DIR = HERE.parents[2] / "PDF"
DOCX = PDF_DIR / "Tuvung_Lop9.docx"
OUT = HERE / "lop9-tuvung-vocab.json"

RE_UNIT = re.compile(r"^UNIT\s+(\d+)\s*:\s*(.+)$", re.I)


def cell_texts(row) -> list[str]:
    seen: set[int] = set()
    out: list[str] = []
    for cell in row.cells:
        cid = id(cell._tc)
        if cid in seen:
            continue
        seen.add(cid)
        out.append((cell.text or "").strip())
    return out


def is_example_row(cells: list[str]) -> bool:
    joined = " ".join(cells).strip()
    return joined.lower().startswith("e.g.")


def parse_vocab_row(cells: list[str]) -> dict | None:
    if len(cells) < 5:
        return None
    stt, word, _typ, _ipa, meaning = cells[0], cells[1], cells[2], cells[3], cells[4]
    if not word or word.lower() == "word":
        return None
    if is_example_row(cells):
        return None
    if not re.match(r"^\d+$", stt.strip()):
        return None
    hint = meaning.split("\n")[0].strip()
    if not hint:
        return None
    # A few source cells list an alias on a second line (for example
    # "rush hour\n= peak hour"). Scramble needs one unambiguous answer.
    canonical_word = word.splitlines()[0].strip()
    if not canonical_word:
        return None
    return {"word": canonical_word, "hint": hint}


def main() -> int:
    if not DOCX.is_file():
        print(f"Missing {DOCX}", file=sys.stderr)
        return 1

    doc = Document(str(DOCX))
    units: dict[str, list[dict]] = {}
    current: int | None = None

    for child in doc.element.body.iterchildren():
        if child.tag == qn("w:p"):
            text = Paragraph(child, doc).text.strip()
            m = RE_UNIT.match(text)
            if m:
                current = int(m.group(1))
                units.setdefault(str(current), [])
            continue
        if child.tag != qn("w:tbl") or current is None:
            continue
        tbl = Table(child, doc)
        for row in tbl.rows:
            item = parse_vocab_row(cell_texts(row))
            if item:
                units[str(current)].append(item)

    payload = {
        "source": "PDF/Tuvung_Lop9.docx",
        "units": units,
        "counts": {k: len(v) for k, v in units.items()},
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}")
    for k, n in sorted(payload["counts"].items(), key=lambda x: int(x[0])):
        print(f"  Unit {k}: {n} words")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
