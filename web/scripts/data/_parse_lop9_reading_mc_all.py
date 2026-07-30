#!/usr/bin/env python3
"""Parse ALL multiple-choice exercises from Reading_Lop9.docx for Lớp 9 units 1–6.

Includes: different-sound MC, sentence completion MC, error-identification MC,
preposition MC (when A–D), cloze/passage comprehension MC.

Skips: photo/writing, sound-column sorting, matching, T/F, open “do the tasks”.
"""
from __future__ import annotations

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
# data -> scripts -> web -> nextjs-migration -> .worktrees -> repo root
REPO_ROOT = HERE.parents[4]
DOCX = REPO_ROOT / "PDF" / "Reading_Lop9.docx"
OUT = HERE / "lop9-reading-content.json"
if not DOCX.exists():
    raise SystemExit(f"Missing Reading docx: {DOCX}")
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

UNIT_RE = re.compile(r"^UNIT\s+(\d+)\b", re.I)
EX_RE = re.compile(r"^Exercise\s+(\d+)[.:]\s*(.*)$", re.I)
QUESTION_RE = re.compile(r"^(\d+)\.\s*(.+)")
# Options often glued: "A. fooB. barC. bazD. qux"
OPTION_SPLIT_RE = re.compile(r"(?=[A-D]\.\s*)")
OPTION_ITEM_RE = re.compile(r"^([A-D])\.\s*(.*)$", re.S)

# Answer keys: unit -> exercise number -> list of A/B/C/D
ANSWERS: dict[int, dict[int, list[str]]] = {
    1: {
        # Overwritten from existing curated JSON when present
        1: ["C", "D", "B", "D", "A", "C", "B", "D", "C", "A"],
        6: ["A", "B", "A", "D", "B", "C", "B", "B", "B", "D", "D", "B", "C", "A", "B"],
        7: ["A", "B", "D", "C", "B", "D", "A", "C"],
        8: ["A", "C", "C", "C", "D", "A"],
        13: ["D", "C", "B", "A", "C", "D", "C", "A"],  # cloze blanks — see dump
    },
    2: {
        7: ["D", "B", "A", "D", "B", "A", "C", "B", "D", "A", "C", "D", "A", "C", "A"],
        9: ["A", "C", "D", "C", "B", "A", "A", "C"],
        10: ["C", "D", "A", "A", "D", "B", "D", "A", "B", "C"],
        12: ["D", "A", "C", "B", "C", "D"],
    },
    3: {
        5: [
            "C",
            "A",
            "A",
            "B",
            "D",
            "B",
            "B",
            "A",
            "B",
            "C",
            "B",
            "C",
            "B",
            "A",
            "A",
            "A",
            "C",
            "C",
            "C",
        ],
        7: ["C", "D", "B", "A", "C", "B"],
        13: ["C", "A", "B", "B", "C", "A", "D", "B", "A", "B"],
    },
    4: {
        8: ["A", "D", "B", "A", "D", "B", "D", "A", "B", "A", "C", "A", "C", "A", "B"],
        10: ["C", "A", "B", "C", "A", "B", "B", "A", "B", "B"],
        13: ["B", "C", "A", "A", "A", "D", "B", "A"],
    },
    5: {
        7: ["C", "A", "A", "D", "B", "A", "C", "A", "A", "A", "D", "B", "A", "C", "A", "C"],
        13: ["B", "A", "A", "D", "C", "B", "A", "C"],
        14: ["C", "A", "B", "B", "A", "B"],
    },
    6: {
        6: ["A", "D", "D", "C", "B", "A", "A", "C"],
        9: ["A", "C", "A", "A", "B", "A", "A", "C", "B", "B"],
        13: ["C", "A", "A", "C", "B", "B", "C", "A"],
    },
}

# Short display titles (more specific needles first)
TITLE_LABELS = [
    ("different underlined sound", "Phát âm khác"),
    ("correct prepositions", "Giới từ"),
    ("underlined part", "Tìm lỗi sai"),
    ("needs correcting", "Tìm lỗi sai"),
    ("fill in", "Đọc hiểu điền khuyết"),
    ("fill ill", "Đọc hiểu điền khuyết"),
    ("answer the questions", "Đọc hiểu"),
    ("read the text and choose", "Đọc hiểu"),
    ("read the passage", "Đọc hiểu"),
    ("complete the sentences", "Hoàn thành câu"),
    ("correct options", "Hoàn thành câu"),
    ("correct option", "Hoàn thành câu"),
]


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


def exercise_blocks(lines: list[str]) -> list[tuple[int, str, list[str]]]:
    starts: list[tuple[int, int, str]] = []
    for i, line in enumerate(lines):
        match = EX_RE.match(line)
        if match:
            starts.append((i, int(match.group(1)), match.group(2).strip()))
    blocks: list[tuple[int, str, list[str]]] = []
    for idx, (start, num, title) in enumerate(starts):
        end = starts[idx + 1][0] if idx + 1 < len(starts) else len(lines)
        blocks.append((num, title, lines[start:end]))
    return blocks


def parse_options(text: str) -> dict[str, str]:
    text = re.sub(r"\s+", " ", text).strip()
    parts = [p.strip() for p in OPTION_SPLIT_RE.split(text) if p.strip()]
    choices: dict[str, str] = {}
    for part in parts:
        match = OPTION_ITEM_RE.match(part)
        if not match:
            continue
        letter, value = match.group(1), re.sub(r"\s+", " ", match.group(2)).strip(" .")
        if value:
            choices[letter] = value
    return choices


def has_abcd_options(text: str) -> bool:
    # Options are often glued: "A. fooB. barC. bazD. qux" (letter before B/C/D is lowercase).
    found = set(re.findall(r"(?<![A-Z])([A-D])\.", text))
    return found >= {"A", "B", "C", "D"}


def is_mc_exercise(title: str, block: list[str]) -> bool:
    low = title.lower()
    joined = " ".join(block)
    if not has_abcd_options(joined):
        return False
    skip_bits = (
        "correct column",
        "look at the photo",
        "look at the photos",
        "match the",
        "true or false",
        "do the tasks",
        "write down",
        "write the correct",
        "underline the",
        "double underline",
        "practise",
        "practice",
    )
    if any(bit in low for bit in skip_bits) and "answer the questions" not in low:
        return False
    include_bits = (
        "choose the correct",
        "choose the underlined",
        "different underlined sound",
        "answer the questions",
        "read the text and choose",
        "read the passage",
        "choose the correct options",
        "choose the correct option",
        "choose the correct prepositions",
    )
    return any(bit in low for bit in include_bits)


def type_label_for(title: str) -> str:
    low = title.lower()
    if "different underlined sound" in low:
        return "Trắc nghiệm"
    if "underlined" in low or "correcting" in low:
        return "Tìm lỗi sai"
    if "sound" in low:
        return "Trắc nghiệm"
    if "preposition" in low:
        return "Trắc nghiệm"
    if "passage" in low or "read the text" in low or "answer the questions" in low or "fill" in low:
        return "Đọc hiểu"
    return "Trắc nghiệm"


def display_exercise_name(unit: int, ex_num: int, title: str) -> str:
    low = title.lower()
    for needle, label in TITLE_LABELS:
        if needle in low:
            return label
    return f"Unit {unit} — Exercise {ex_num}"


def extract_passage(block: list[str]) -> tuple[str, list[str]]:
    """Return (passage, remaining lines starting at first numbered Q)."""
    body = block[1:]
    first_q = next((i for i, line in enumerate(body) if QUESTION_RE.match(line)), None)
    if first_q is None:
        return "", body
    # Passage only if substantial prose before questions
    before = body[:first_q]
    passage = "\n".join(before).strip()
    if len(passage) < 80:
        return "", body
    return passage, body[first_q:]


def iter_questions(lines: list[str], *, odd_one_out: bool = False) -> list[tuple[str, dict[str, str]]]:
    """Parse numbered stems + A-D options (options may be same line or following)."""
    items: list[tuple[str, dict[str, str]]] = []
    i = 0
    while i < len(lines):
        match = QUESTION_RE.match(lines[i])
        if not match:
            i += 1
            continue
        stem = match.group(2).strip()
        # Case: stem is already "A. ..." (odd-one-out OR cloze blank options)
        if stem.startswith("A."):
            choices = parse_options(stem)
            j = i + 1
            while j < len(lines) and not QUESTION_RE.match(lines[j]) and not EX_RE.match(lines[j]):
                more = parse_options(lines[j])
                choices.update(more)
                j += 1
            if set(choices) == {"A", "B", "C", "D"}:
                if odd_one_out:
                    words = " / ".join(choices[letter] for letter in "ABCD")
                    q = f"Chọn từ có phần nguyên âm / âm khác: {words}"
                else:
                    q = f"Chọn đáp án đúng cho chỗ trống ({match.group(1)})."
                items.append((q, choices))
            else:
                items.append((f"Chọn đáp án đúng cho chỗ trống ({match.group(1)}).", choices))
            i = j
            continue

        choices = parse_options(stem)
        if set(choices) == {"A", "B", "C", "D"}:
            # Stem had options glued on same line — strip options from stem
            stem_only = OPTION_SPLIT_RE.split(stem, maxsplit=1)[0].strip()
            items.append((stem_only or stem, choices))
            i += 1
            continue

        # Options on following lines until next question
        j = i + 1
        opt_chunks: list[str] = []
        while j < len(lines) and not QUESTION_RE.match(lines[j]) and not EX_RE.match(lines[j]):
            opt_chunks.append(lines[j])
            j += 1
        choices = parse_options(" ".join(opt_chunks))
        # Also try stem+opts if options partially in stem
        if set(choices) != {"A", "B", "C", "D"}:
            choices = parse_options(stem + " " + " ".join(opt_chunks))
            stem_only = OPTION_SPLIT_RE.split(stem, maxsplit=1)[0].strip()
            stem = stem_only or stem
        items.append((stem, choices))
        i = j
    return items


def fold_ascii(value: str) -> str:
    import unicodedata

    normalized = unicodedata.normalize("NFD", value)
    return "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn").lower()


# DOCX/Telex corruptions seen in Reading_Lop9 (option text ≠ sentence text).
KNOWN_ERROR_OPTION_FIXES = {
    "rêpating": "repeating",
    "repating": "repeating",
}


def repair_error_option(sentence: str, option: str, cursor: int) -> tuple[str, int]:
    """Align a possibly corrupted option to the actual span in the sentence."""
    plain = sentence
    opt = KNOWN_ERROR_OPTION_FIXES.get(option, option).strip()
    if not opt:
        return option, -1

    # Whole-word / phrase match first (avoid "th" matching inside "the").
    boundary = re.compile(rf"(?<![A-Za-z']){re.escape(opt)}(?![A-Za-z'])", re.I)
    match = boundary.search(plain, cursor)
    if match:
        return plain[match.start() : match.end()], match.start()

    search = plain[cursor:]
    words = list(re.finditer(r"[A-Za-z']+", search))
    folded_opt = fold_ascii(opt)

    for start_i, _word_match in enumerate(words):
        for end_i in range(start_i, min(start_i + 4, len(words))):
            span = search[words[start_i].start() : words[end_i].end()]
            if fold_ascii(span) == folded_opt:
                abs_idx = cursor + words[start_i].start()
                return plain[abs_idx : cursor + words[end_i].end()], abs_idx

    # Truncation: "th" → "the"
    for word_match in words:
        word = word_match.group(0)
        if word.lower().startswith(opt.lower()) and len(word) > len(opt):
            abs_idx = cursor + word_match.start()
            return word, abs_idx

    return option, -1


def repair_error_choices(sentence: str, choices: dict[str, str]) -> dict[str, str]:
    repaired: dict[str, str] = {}
    cursor = 0
    for letter in "ABCD":
        fixed, idx = repair_error_option(sentence, choices[letter], cursor)
        repaired[letter] = fixed
        if idx >= 0:
            cursor = idx + len(fixed)
    return repaired


def make_item(
    *,
    unit: int,
    ex_num: int,
    title: str,
    passage: str,
    question: str,
    choices: dict[str, str],
    answer_letter: str,
) -> dict:
    if set(choices) != {"A", "B", "C", "D"}:
        raise ValueError(f"U{unit} Ex{ex_num}: bad options {choices} for {question[:60]}")
    answer_letter = answer_letter.upper()
    if answer_letter not in choices:
        raise ValueError(f"U{unit} Ex{ex_num}: answer {answer_letter} not in {choices}")
    stem = question.strip()
    label = type_label_for(title)
    exercise = display_exercise_name(unit, ex_num, title)
    is_find_mistake = label == "Tìm lỗi sai" and exercise != "Phát âm khác" and not passage
    if is_find_mistake:
        choices = repair_error_choices(stem, choices)
    answer = choices[answer_letter]
    # Embed underlines for error-identification items (A/B/C/D parts in the sentence).
    if is_find_mistake:
        opts = [choices[letter] for letter in "ABCD"]
        plain = stem
        cursor = 0
        chunks: list[str] = []
        for opt in opts:
            fixed, idx = repair_error_option(plain, opt, cursor)
            if idx < 0:
                continue
            chunks.append(plain[cursor:idx])
            chunks.append(f'<u class="quiz-error-opt">{fixed}</u>')
            cursor = idx + len(fixed)
        chunks.append(plain[cursor:])
        stem = "".join(chunks)
    if passage:
        stem = f"{passage}\n\n{stem}"
    return {
        "game": "quiz",
        "type": "multiple_choice",
        "typeLabel": label,
        "skill": "reading",
        "exercise": exercise,
        "question": stem,
        "options": [choices[letter] for letter in "ABCD"],
        "answer": answer,
        "accept": [answer, answer_letter, answer_letter.lower()],
        "fillMode": False,
    }


def refine_answers_from_existing(existing: dict) -> None:
    """Keep Unit 1 curated answers from prior content when exercise names match."""
    # Map old exercise display names -> answers already in JSON
    u1 = existing.get("units", {}).get("1", [])
    by_ex: dict[str, list[str]] = {}
    for item in u1:
        ex = item["exercise"]
        # recover letter from accept if present
        letter = None
        for a in item.get("accept", []):
            if str(a).upper() in {"A", "B", "C", "D"}:
                letter = str(a).upper()
                break
        if not letter:
            # find which option matches answer
            opts = item.get("options") or []
            ans = item.get("answer")
            if ans in opts:
                letter = "ABCD"[opts.index(ans)]
        if letter:
            by_ex.setdefault(ex, []).append(letter)
    name_to_exnum = {
        "Phát âm khác": 1,
        "Wh + to-V": 6,
        "Phrasal prep": 7,
        "Tìm lỗi sai": 8,
    }
    for name, exnum in name_to_exnum.items():
        if name in by_ex and len(by_ex[name]) >= 1:
            ANSWERS[1][exnum] = by_ex[name]


def parse_unit(unit: int, lines: list[str]) -> tuple[list[dict], list[dict]]:
    items: list[dict] = []
    skipped: list[dict] = []
    for ex_num, title, block in exercise_blocks(lines):
        if not is_mc_exercise(title, block):
            skipped.append(
                {
                    "unit": unit,
                    "reason": "non-MC layout (photo/column/matching/T-F/open tasks)",
                    "item": f"Exercise {ex_num}: {title}",
                }
            )
            continue
        answers = ANSWERS.get(unit, {}).get(ex_num)
        if not answers:
            skipped.append(
                {
                    "unit": unit,
                    "reason": "missing answer key",
                    "item": f"Exercise {ex_num}: {title}",
                }
            )
            continue
        passage, q_lines = extract_passage(block)
        odd = "different underlined sound" in title.lower()
        # For cloze, questions may start with "1. A. ..."
        parsed = iter_questions(q_lines if passage else block[1:], odd_one_out=odd)
        if len(parsed) != len(answers):
            # try whole block without passage split
            parsed = iter_questions(block[1:], odd_one_out=odd)
            passage = ""
        if len(parsed) != len(answers):
            skipped.append(
                {
                    "unit": unit,
                    "reason": f"question/answer count mismatch ({len(parsed)} vs {len(answers)})",
                    "item": f"Exercise {ex_num}: {title}",
                }
            )
            continue
        for (question, choices), letter in zip(parsed, answers):
            # Cloze blanks: if question is generic and no passage, keep as-is
            items.append(
                make_item(
                    unit=unit,
                    ex_num=ex_num,
                    title=title,
                    passage=passage,
                    question=question,
                    choices=choices,
                    answer_letter=letter,
                )
            )
    return items, skipped


def solve_and_fill_obvious_answers(units_lines: dict[int, list[str]]) -> None:
    """Overwrite placeholder answer lists by re-parsing and using curated SOLVED maps only.

    Real keys live in ANSWERS above — this helper only validates parse counts.
    """
    for unit, lines in units_lines.items():
        for ex_num, title, block in exercise_blocks(lines):
            if not is_mc_exercise(title, block):
                continue
            passage, q_lines = extract_passage(block)
            odd = "different underlined sound" in title.lower()
            parsed = iter_questions(q_lines if passage else block[1:], odd_one_out=odd)
            if not parsed:
                parsed = iter_questions(block[1:], odd_one_out=odd)
            key = ANSWERS.get(unit, {}).get(ex_num)
            if key and len(key) != len(parsed):
                print(f"WARN U{unit} Ex{ex_num}: answers {len(key)} != questions {len(parsed)} — {title[:60]}")


def main() -> None:
    existing = json.loads(OUT.read_text(encoding="utf-8"))
    refine_answers_from_existing(existing)
    source_units = split_units(read_paragraphs())
    solve_and_fill_obvious_answers(source_units)

    units_out: dict[str, list[dict]] = {}
    skipped_all: list[dict] = []
    for unit in sorted(source_units):
        items, skipped = parse_unit(unit, source_units[unit])
        units_out[str(unit)] = items
        skipped_all.extend(skipped)
        print(f"Unit {unit}: {len(items)} MC items, skipped {len(skipped)}")

    OUT.write_text(
        json.dumps(
            {"source": "PDF/Reading_Lop9.docx", "units": units_out, "skipped": skipped_all},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    main()
