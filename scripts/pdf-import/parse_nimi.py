# -*- coding: utf-8 -*-
"""
Parser for the NIMI "All India Trade Test" sample question papers (the *2504*
files).  Every question in those PDFs is laid out as

    <Section>
    <serial no>
    <question id>
    <question, English>
    <question, Hindi>
    A1 : <option 1 English> <option 1 Hindi>
    ... A2 A3 A4 ...

with a "Correct Answer Key" table on the final page.  Page furniture (running
heads, the marks column, the page banner) is interleaved unpredictably because
PyMuPDF emits text in visual order, so the parser anchors on the section header
plus the ``A1..A4`` markers rather than on position.
"""
import json
import re
import sys
import unicodedata

import fitz

SECTIONS = [
    "Trade Theory",
    "Workshop Calculation and Science",
    "Engineering Drawing",
    "Employability Skills",
]

# Lines that belong to the page, not to a question.
NOISE = re.compile(
    r"^(?:"
    r"2\.0|0\.00|"
    r"Max Marks\s*:.*|"
    r"ALL INDIA TRADE TEST.*|"
    r"TRAINING SCHEME.*|"
    r"Trade Name\s*:.*|"
    r"Year\s*:.*|"
    r"Exam (?:Date|Time)\s*:.*|"
    r"Note\s*:|"
    r"\d+\.\s*(?:Tick the correct|All questions carry|There is no negative).*|"
    r"SAMPLE QUESTION PAPER SET.*|"
    r"KEY ANSWER SET.*|"
    r"Sr\.|No\.|Q ID|Question Body and Alternatives|Marks|Negative|"
    r"S\.No\.?|Correct Answer Key|"
    r"www\.[^\s]+"
    r")\s*$",
    re.IGNORECASE,
)

DEVANAGARI = re.compile(r"[ऀ-ॿ]")


def is_hindi(line: str) -> bool:
    return bool(DEVANAGARI.search(line))


def clean_hindi(text: str) -> str:
    """
    The source PDFs embed subset fonts that duplicate combining marks, so
    "स्पिंडल" comes out as "स्पिंंडल".  Collapse any run of the same combining
    character down to one, then normalise.
    """
    text = unicodedata.normalize("NFC", text)
    out = []
    for ch in text:
        if out and ch == out[-1] and unicodedata.combining(ch):
            continue
        out.append(ch)
    return re.sub(r"\s+", " ", "".join(out)).strip()


def clean_english(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def split_lang(lines):
    """Split a run of lines into (english, hindi) on the first Devanagari line."""
    first = next((i for i, l in enumerate(lines) if is_hindi(l)), None)
    if first is None:
        # No Hindi at all — the paper repeats the English text in both columns.
        parts, seen = [], None
        for l in lines:
            if l == seen:
                continue
            seen = l
            parts.append(l)
        return clean_english(" ".join(parts)), None
    return clean_english(" ".join(lines[:first])), clean_hindi(" ".join(lines[first:]))


def page_lines(doc):
    """All non-noise lines as (line, page_number), page numbers 1-based."""
    rows = []
    for number, page in enumerate(doc, start=1):
        for raw in page.get_text().split("\n"):
            line = raw.strip()
            if not line or NOISE.match(line):
                continue
            rows.append((line, number))
    return rows


def parse_answer_key(doc):
    """
    The final page holds a two-column `S.No -> A<n>` table.  Only pages that
    actually carry the key header are scanned: question pages contain plenty of
    "<number> ... A1" text that would otherwise produce phantom entries.
    """
    key = {}
    for page in doc:
        text = page.get_text()
        if "Correct Answer Key" not in text:
            continue
        for serial, option in re.findall(r"(?m)^\s*(\d{1,3})\s*\n\s*A([1-4])\s*$", text):
            key.setdefault(int(serial), int(option))
    return key


def parse(path):
    doc = fitz.open(path)
    rows = page_lines(doc)
    key = parse_answer_key(doc)

    # Anchor indices: a section header immediately followed by two integers
    # (the serial number and the question id).
    anchors = []
    for i, (line, page) in enumerate(rows):
        if line not in SECTIONS:
            continue
        if i + 2 >= len(rows):
            continue
        serial, qid = rows[i + 1][0], rows[i + 2][0]
        if serial.isdigit() and qid.isdigit() and 1 <= int(serial) <= 200:
            anchors.append((i, line, int(serial), page))

    questions = []
    for n, (start, section, serial, page) in enumerate(anchors):
        end = anchors[n + 1][0] if n + 1 < len(anchors) else len(rows)
        body = [line for line, _ in rows[start + 3 : end]]

        # Locate the A1..A4 markers.  A marker is the literal "A1" followed by
        # a ":" on the next line.
        marks = {}
        for i, line in enumerate(body):
            m = re.fullmatch(r"A([1-4])", line)
            if m and i + 1 < len(body) and body[i + 1].strip() == ":":
                marks.setdefault(int(m.group(1)), i)
        if sorted(marks) != [1, 2, 3, 4]:
            continue

        stem_en, stem_hi = split_lang(body[: marks[1]])
        if not stem_en and not stem_hi:
            continue

        options = []
        for slot in (1, 2, 3, 4):
            begin = marks[slot] + 2
            finish = marks[slot + 1] if slot < 4 else len(body)
            en, hi = split_lang(body[begin:finish])
            options.append((en, hi))

        answer = key.get(serial)
        if answer is None or not options[answer - 1][0]:
            continue
        # Every option needs text, otherwise the question is unusable.
        if any(not en for en, _ in options):
            continue

        questions.append(
            {
                "section": section,
                "serial": serial,
                "page": page,
                "question": stem_en,
                "questionHi": stem_hi,
                "options": [
                    {"en": en, "hi": hi} for en, hi in options
                ],
                "answerIndex": answer - 1,
            }
        )

    return questions


if __name__ == "__main__":
    for path in sys.argv[1:]:
        items = parse(path)
        print(f"{path}: {len(items)} questions")
        if items:
            print(json.dumps(items[0], ensure_ascii=False, indent=2))
            print(json.dumps(items[-1], ensure_ascii=False, indent=2))
