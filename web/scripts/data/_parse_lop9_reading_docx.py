#!/usr/bin/env python3
"""Curate deterministic Lớp 9 reading MC exercises from Reading_Lop9.docx.

The quiz payload has no separate passage field, so each generated question
includes its source passage. Photo, sound-sorting, matching, T/F, and open
answer layouts are recorded as skipped instead of being guessed.
"""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOCX = HERE.parents[2] / "PDF" / "Reading_Lop9.docx"
OUT = HERE / "lop9-reading-content.json"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

UNIT_RE = re.compile(r"^UNIT\s+(\d+)\b", re.I)
QUESTION_RE = re.compile(r"^(\d+)\.\s*(.+)")
OPTION_RE = re.compile(r"([A-D])\.\s*(.*?)(?=[A-D]\.\s*|$)")

TARGETS = {
    2: ("Exercise 12:", ["D", "A", "C", "B", "C", "D"], False),
    3: ("Exercise 13.", ["C", "A", "B", "B", "C", "A", "D", "B", "A", "B"], True),
    4: ("Exercise 13:", ["B", "C", "A", "A", "A", "D", "B", "A"], False),
    5: ("Exercise 13.", ["B", "A", "A", "D", "C", "B", "A", "C"], True),
    6: ("Exercise 13:", ["C", "A", "A", "C", "B", "B", "C", "A"], False),
}


def read_paragraphs() -> list[str]:
    with zipfile.ZipFile(DOCX) as archive:
        root = ET.fromstring(archive.read("word/document.xml"))
    return [
        text
        for paragraph in root.iter(W + "p")
        if (text := "".join(node.text or "" for node in paragraph.iter(W + "t")).strip())
    ]


def split_units(paragraphs: list[str]) -> dict[int, list[str]]:
    units: dict[int, list[str]] = {}
    current: int | None = None
    for line in paragraphs:
        match = UNIT_RE.match(line)
        if match:
            current = int(match.group(1))
            units[current] = []
        elif current is not None:
            units[current].append(line)
    return units


def target_block(lines: list[str], heading_prefix: str) -> list[str]:
    start = next(i for i, line in enumerate(lines) if line.startswith(heading_prefix))
    end = next(
        (
            i
            for i in range(start + 1, len(lines))
            if re.match(r"^Exercise\s+\d+[.:]", lines[i], re.I)
        ),
        len(lines),
    )
    return lines[start:end]


def options_from(lines: list[str]) -> dict[str, str]:
    joined = " ".join(lines).replace("\t", " ")
    return {
        letter: re.sub(r"\s+", " ", value).strip(" .")
        for letter, value in OPTION_RE.findall(joined)
    }


def make_item(
    exercise: str,
    passage: str,
    question: str,
    choices: dict[str, str],
    answer_letter: str,
) -> dict:
    if set(choices) != {"A", "B", "C", "D"}:
        raise ValueError(f"{exercise}: expected A-D options, got {choices}")
    answer = choices[answer_letter]
    return {
        "game": "quiz",
        "type": "multiple_choice",
        "typeLabel": "Đọc hiểu",
        "skill": "reading",
        "exercise": exercise,
        "question": f"{passage}\n\n{question}",
        "options": [choices[letter] for letter in "ABCD"],
        "answer": answer,
        "accept": [answer, answer_letter, answer_letter.lower()],
        "fillMode": False,
    }


def parse_target(unit: int, lines: list[str]) -> list[dict]:
    heading_prefix, answers, is_cloze = TARGETS[unit]
    block = target_block(lines, heading_prefix)
    exercise = f"Unit {unit} — {block[0]}"

    first_numbered = next(i for i, line in enumerate(block[1:], 1) if QUESTION_RE.match(line))
    passage = "\n".join(block[1:first_numbered])
    items: list[dict] = []

    if is_cloze:
        starts = [
            i
            for i, line in enumerate(block)
            if (match := QUESTION_RE.match(line)) and match.group(2).startswith("A.")
        ]
        for ordinal, start in enumerate(starts):
            end = starts[ordinal + 1] if ordinal + 1 < len(starts) else len(block)
            number = ordinal + 1
            choices = options_from([QUESTION_RE.match(block[start]).group(2), *block[start + 1 : end]])
            items.append(
                make_item(
                    exercise,
                    passage,
                    f"Chọn đáp án đúng cho chỗ trống ({number}).",
                    choices,
                    answers[ordinal],
                )
            )
    else:
        starts = [
            i
            for i, line in enumerate(block)
            if (match := QUESTION_RE.match(line)) and not match.group(2).startswith("A.")
        ]
        for ordinal, start in enumerate(starts):
            end = starts[ordinal + 1] if ordinal + 1 < len(starts) else len(block)
            match = QUESTION_RE.match(block[start])
            choices = options_from(block[start + 1 : end])
            items.append(
                make_item(exercise, passage, match.group(2), choices, answers[ordinal])
            )

    if len(items) != len(answers):
        raise ValueError(f"Unit {unit}: expected {len(answers)} items, got {len(items)}")
    return items


def main() -> None:
    existing = json.loads(OUT.read_text(encoding="utf-8"))
    source_units = split_units(read_paragraphs())
    units = {"1": existing["units"]["1"]}
    for unit in sorted(TARGETS):
        units[str(unit)] = parse_target(unit, source_units[unit])

    skipped = [entry for entry in existing.get("skipped", []) if entry.get("unit") == 1]
    skipped.extend(
        {
            "unit": unit,
            "reason": "photo, sound sorting, matching, T/F, or open-answer layout is unsupported by quiz payload",
            "item": "all non-MC reading layouts deliberately skipped",
        }
        for unit in sorted(TARGETS)
    )
    OUT.write_text(
        json.dumps(
            {"source": "PDF/Reading_Lop9.docx", "units": units, "skipped": skipped},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {OUT}")
    for unit, items in units.items():
        print(f"  Unit {unit}: {len(items)} reading quiz items")


if __name__ == "__main__":
    main()
