# -*- coding: utf-8 -*-
"""
Parser for the tabular NIMI question banks.

Two shapes appear:

* Trade banks (Electrician 1st year, Workshop calculation) — 13/15 columns:
  serial, question EN, options A-D EN, question HI, options A-D HI,
  answer letter, level, [topic, syllabus week].
* Employability Skills banks — 8 columns:
  lesson name, Q.no, question, options A-D, answer letter.

The Hindi columns of the trade banks are encoded with a legacy 8-bit ITI font
that PyMuPDF cannot map to Unicode ("BIS कापूण[ Ǿपहै"), so those columns are
discarded and only the English text is kept.  The 2504 sample papers handled by
parse_nimi.py carry proper Unicode Hindi and are the bilingual source.
"""
import re
import unicodedata

import fitz

ANSWER = re.compile(r"^\s*([ABCD])\s*$")
MODULE = re.compile(r"Module(?:\s+\d+)?\s*(?:Name)?\s*[:\-]\s*(.+)", re.IGNORECASE)
# PUA glyphs left behind by the symbol fonts used for diagrams.
JUNK = re.compile(r"[-]")


def clean(text):
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", JUNK.sub("", text))
    return re.sub(r"\s+", " ", text).strip()


def usable(*values):
    return all(v and len(v) > 1 for v in values)


def module_for_page(page):
    match = MODULE.search(page.get_text())
    return clean(match.group(1))[:80] if match else None


def parse_trade_table(rows, page_no, module):
    """13/15-column bilingual trade bank. Returns a list of question dicts."""
    width = len(rows[0])
    has_meta = width >= 15
    topic_carry = None
    out = []

    for row in rows:
        cells = [clean(c) for c in row]
        if len(cells) < 13:
            continue
        letter = ANSWER.match(cells[11] or "")
        if not letter:
            continue  # header row, spacer row, or a wrapped continuation

        stem = cells[1]
        options = cells[2:6]
        if not usable(stem, *options):
            continue

        level = cells[12] if cells[12].isdigit() else None
        topic = clean(cells[13]) if has_meta and cells[13] else None
        week = clean(cells[14]) if has_meta and len(cells) > 14 else None
        topic_carry = topic or topic_carry

        out.append(
            {
                "page": page_no,
                "question": stem,
                "questionHi": None,
                "options": [{"en": o, "hi": None} for o in options],
                "answerIndex": "ABCD".index(letter.group(1)),
                "topic": topic or topic_carry,
                "level": int(level) if level else None,
                "week": week,
                "module": module,
            }
        )
    return out


def parse_employability_table(rows, page_no, module):
    """8-column Employability Skills bank; the lesson column is merged."""
    lesson = None
    out = []

    for row in rows:
        cells = [clean(c) for c in row]
        if len(cells) < 8:
            continue
        if cells[0]:
            lesson = cells[0]
        letter = ANSWER.match(cells[7] or "")
        if not letter:
            continue

        stem, options = cells[2], cells[3:7]
        if not usable(stem, *options):
            continue

        out.append(
            {
                "page": page_no,
                "question": stem,
                "questionHi": None,
                "options": [{"en": o, "hi": None} for o in options],
                "answerIndex": "ABCD".index(letter.group(1)),
                "topic": lesson or module,
                "level": None,
                "week": None,
                "module": module,
            }
        )
    return out


def parse(path):
    doc = fitz.open(path)
    out = []
    for page_no, page in enumerate(doc, start=1):
        module = module_for_page(page)
        for table in page.find_tables().tables:
            rows = table.extract()
            if not rows:
                continue
            width = len(rows[0])
            if width >= 13:
                out += parse_trade_table(rows, page_no, module)
            elif width == 8:
                out += parse_employability_table(rows, page_no, module)
    return out
