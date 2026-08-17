# PDF → question bank

Offline tooling that turns the official NIMI / DGT PDFs into
`prisma/data/question-bank.json`. It runs on a workstation, not in the app and
not during a deploy — the app only ever reads the generated JSON.

## Requirements

```bash
pip install pymupdf
```

## Regenerating the bank

Put the source PDFs in the folder named by `DOWNLOADS` in `build_bank.py`, then:

```bash
python scripts/pdf-import/build_bank.py
```

It writes `question-bank.json` next to itself; copy it to `prisma/data/` and
copy each source PDF to `public/study-material/<slug>.pdf` using the slug from
the `SOURCES` table. Then load it into the database:

```bash
npm run db:import-material
```

## The three PDF layouts

| Layout | Files | Parser | Notes |
| --- | --- | --- | --- |
| AITT sample paper (`2504`) | 9 Fitter / Electrician papers | `parse_nimi.py` | Bilingual. Answer key on the last page. Per-question page numbers. |
| Tabular trade bank | Electrician 1st year & 1st sem, Workshop Calculation | `parse_tables.py` | Carries topic, difficulty level and syllabus week. |
| Tabular Employability bank | Employability Skills 1st & 2nd year | `parse_tables.py` | Carries the lesson name as the topic. |

### Why some Hindi is dropped

The tabular banks embed Hindi in a legacy 8-bit ITI font that has no usable
Unicode mapping — extracting it yields mojibake (`BIS कापूण[ Ǿपहै`). Those rows
are imported as English-only. The `2504` sample papers use real Unicode
Devanagari and are the source of every bilingual question in the bank.

### Why some questions are skipped

Roughly 2% of questions in the sample papers refer to a figure ("the part
marked X") or use images as the options. Those have no usable text, so the
parser drops them rather than importing a question nobody can answer.

`Electrician2ndsemesterNSQF.pdf` uses a fourth layout that is not parsed; it is
published as reference reading only.
