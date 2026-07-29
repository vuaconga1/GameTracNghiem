#!/usr/bin/env python3
"""Parse Pronunciation_Lop9.docx into per-unit phoneme sections + vocab.

Usage (from web/):
  py -3 scripts/data/_parse_lop9_pronunciation_docx.py
  py -3 scripts/data/_parse_lop9_pronunciation_docx.py --unit 1 --json
"""
from __future__ import annotations

import argparse
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_DOCX = HERE.parents[2] / "PDF" / "Pronunciation_Lop9.docx"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

UNIT_RE = re.compile(r"^UNIT\s+(\d+)\b", re.I)
SOUND_RE = re.compile(r"^(\d+)\.\s*SOUND\s*/([^/]+)/\s*$", re.I)
SECTION_RE = re.compile(r"^\d+\.\d+")
WORD_RE = re.compile(r"^[A-Za-z][A-Za-z'\\-]*$")
POS_OK = {
    "n",
    "v",
    "adj",
    "adv",
    "prep",
    "conj",
    "pron",
    "interj",
    "det",
    "num",
    "phr.v",
    "n/v",
    "v/n",
    "n.,v.",
    "v.,n.",
}


def read_paras(docx: Path) -> list[str]:
    with zipfile.ZipFile(docx) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    paras: list[str] = []
    for p_el in root.iter(W + "p"):
        parts: list[str] = []
        for t in p_el.iter(W + "t"):
            if t.text:
                parts.append(t.text)
        line = "".join(parts).strip()
        if line:
            paras.append(line)
    return paras


def split_units(paras: list[str]) -> dict[int, list[str]]:
    units: dict[int, list[str]] = {}
    current: int | None = None
    buf: list[str] = []
    for line in paras:
        m = UNIT_RE.match(line)
        if m:
            if current is not None:
                units[current] = buf
            current = int(m.group(1))
            buf = [line]
            continue
        if current is not None:
            buf.append(line)
    if current is not None:
        units[current] = buf
    return units


def normalize_ipa(raw: str) -> str:
    s = raw.strip()
    if not s:
        return ""
    if not s.startswith("/"):
        s = "/" + s
    if not s.endswith("/"):
        s = s + "/"
    # fix missing leading slash after stress
    s = s.replace("//", "/")
    return s


def looks_like_ipa(s: str) -> bool:
    t = s.strip()
    if not t:
        return False
    if t.startswith("/") or t.startswith("ˈ") or t.startswith("ˌ"):
        return True
    return "ˈ" in t or "ˌ" in t or "æ" in t or "ɑ" in t or "ə" in t


def looks_like_pos(s: str) -> bool:
    t = s.strip().lower().strip("()").rstrip(".")
    if t in POS_OK:
        return True
    if t == "pronoun":
        return True
    if re.search(r"[,/]", t) and all(
        p.strip().strip("()").rstrip(".") in POS_OK
        for p in re.split(r"[,/]", t)
        if p.strip()
    ):
        return True
    return False


def extract_words(paras: list[str]) -> list[dict[str, str]]:
    words: list[dict[str, str]] = []
    seen: set[str] = set()
    i = 0
    while i < len(paras):
        if (
            paras[i] == "Từ vựng"
            and i + 3 < len(paras)
            and paras[i + 1] == "Từ loại"
            and paras[i + 2] == "Phiên âm"
        ):
            i += 4
            while i + 3 < len(paras):
                w, pos, ipa, meaning = paras[i], paras[i + 1], paras[i + 2], paras[i + 3]
                if (
                    SECTION_RE.match(w)
                    or SOUND_RE.match(w)
                    or UNIT_RE.match(w)
                    or w in {"Từ vựng", "Từ loại", "Phiên âm", "Ý nghĩa"}
                ):
                    break
                if WORD_RE.match(w) and looks_like_pos(pos) and looks_like_ipa(ipa):
                    key = w.lower()
                    if key not in seen:
                        seen.add(key)
                        words.append(
                            {
                                "word": w,
                                "pos": pos,
                                "ipa": normalize_ipa(ipa),
                                "meaning": meaning,
                            }
                        )
                    i += 4
                    continue
                i += 1
            continue
        i += 1
    if words:
        return words

    # Some later units use a merged sound label instead of the standard
    # "Từ vựng" header, or omit the part-of-speech column entirely.
    # Fall back only when the standard table parser found nothing so Unit 1's
    # reviewed word selection and ordering remain unchanged.
    for width in (4, 3):
        i = 0
        while i + width - 1 < len(paras):
            if width == 4:
                word, pos, ipa, meaning = paras[i : i + 4]
                valid = WORD_RE.match(word) and looks_like_pos(pos) and looks_like_ipa(ipa)
            else:
                word, ipa, meaning = paras[i : i + 3]
                pos = ""
                valid = WORD_RE.match(word) and looks_like_ipa(ipa)
            if valid:
                key = word.lower()
                if key not in seen:
                    seen.add(key)
                    item = {
                        "word": word,
                        "ipa": normalize_ipa(ipa),
                        "meaning": meaning,
                    }
                    if pos:
                        item["pos"] = pos
                    words.append(item)
                i += width
                continue
            i += 1
        if words:
            break
    return words


def extract_theory(paras: list[str]) -> list[str]:
    """Keep instructional lines; drop vocab table cells."""
    out: list[str] = []
    skip_table = False
    i = 0
    while i < len(paras):
        line = paras[i]
        if line == "Từ vựng" and i + 1 < len(paras) and paras[i + 1] == "Từ loại":
            skip_table = True
            i += 4  # skip header
            continue
        if skip_table:
            if SECTION_RE.match(line) or SOUND_RE.match(line) or UNIT_RE.match(line):
                skip_table = False
            elif looks_like_pos(line) or looks_like_ipa(line) or WORD_RE.match(line):
                # likely still in table — skip row-ish content conservatively
                i += 1
                continue
            else:
                skip_table = False
        if not skip_table:
            out.append(line)
        i += 1
    return out


def parse_unit(paras: list[str]) -> dict:
    title = paras[0] if paras else ""
    intro: list[str] = []
    sounds: list[dict] = []
    current: dict | None = None
    for line in paras[1:]:
        m = SOUND_RE.match(line)
        if m:
            if current is not None:
                current["words"] = extract_words(current["_raw"])
                current["theory"] = extract_theory(current["_raw"])
                del current["_raw"]
                sounds.append(current)
            current = {
                "index": int(m.group(1)),
                "ipa": m.group(2),
                "title": f"Âm /{m.group(2)}/",
                "heading": line,
                "_raw": [],
            }
            continue
        if current is None:
            if line.upper().startswith("IV."):
                continue
            intro.append(line)
            continue
        current["_raw"].append(line)
    if current is not None:
        current["words"] = extract_words(current["_raw"])
        current["theory"] = extract_theory(current["_raw"])
        del current["_raw"]
        sounds.append(current)
    return {"title": title, "intro": intro, "sounds": sounds}


def ipa_slug(ipa: str) -> str:
    """Stable ASCII slug for externalId segments."""
    mapping = {
        "æ": "AE",
        "ɑː": "AA",
        "ɑ": "AA",
        "e": "E",
        "aʊ": "AW",
        "əʊ": "OW",
        "eə": "EA",
        "h": "H",
        "r": "R",
        "l": "L",
        "m": "M",
        "j": "J",
        "w": "W",
        "fl": "FL",
        "fr": "FR",
    }
    if ipa in mapping:
        return mapping[ipa]
    # fallback: strip non-alnum
    raw = re.sub(r"[^A-Za-z0-9]+", "", ipa.upper()) or "X"
    return raw[:8]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--docx", type=Path, default=DEFAULT_DOCX)
    parser.add_argument("--unit", type=int, default=None)
    parser.add_argument("--json", action="store_true")
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "pronunciation-lop9-parsed.json",
    )
    args = parser.parse_args()

    paras = read_paras(args.docx)
    units = split_units(paras)
    parsed = {str(u): parse_unit(lines) for u, lines in sorted(units.items())}
    for u, data in parsed.items():
        for sound in data["sounds"]:
            sound["slug"] = ipa_slug(sound["ipa"])

    if args.unit is not None:
        key = str(args.unit)
        if key not in parsed:
            raise SystemExit(f"Unit {args.unit} not found")
        data = {key: parsed[key]}
    else:
        data = parsed

    if args.json or args.out:
        args.out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"wrote {args.out}")

    for u, unit in data.items():
        print(f"\n=== UNIT {u}: {unit['title']} ===")
        print(f"intro lines: {len(unit['intro'])}")
        for s in unit["sounds"]:
            print(f"  {s['heading']} slug={s['slug']} words={len(s['words'])} theory={len(s['theory'])}")
            for w in s["words"][:5]:
                print(f"    - {w['word']} {w['ipa']} ({w['meaning']})")
            if len(s["words"]) > 5:
                print(f"    ... +{len(s['words']) - 5} more")


if __name__ == "__main__":
    main()
