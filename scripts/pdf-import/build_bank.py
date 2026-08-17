# -*- coding: utf-8 -*-
"""
Builds prisma/data/question-bank.json from the 15 NIMI PDFs.

Output shape (one object per question):

    {
      "slug":        stable hash — lets a re-import update instead of duplicate
      "occupations": ["FITTER", ...]      # employability rows apply to all trades
      "subject":     "TRADE_THEORY" | "WORKSHOP_CALCULATION" |
                     "ENGINEERING_DRAWING" | "EMPLOYABILITY_SKILLS"
      "topic":       short topic label used for weak-area reporting
      "difficulty":  "EASY" | "MEDIUM" | "HARD"
      "question", "questionHi",
      "options":     [{ "en": ..., "hi": ... } x4]
      "answerIndex": 0-3
      "sources":     [{ "doc": <slug>, "page": n, "label": ..., "week": ... }]
    }

`sources` is a list because the same question is printed in more than one bank —
an Employability question appears in both the shared Employability bank and in
each trade's AITT paper. The importer picks, per occupation, the first source
whose document is actually published to that trade; without that, a Fitter could
be sent to revise from the Electrician paper, which they cannot open.
"""
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import parse_nimi
import parse_tables

DOWNLOADS = r"C:\Users\91975\Downloads"

# ---------------------------------------------------------------------------
# Source catalogue
# ---------------------------------------------------------------------------
# kind: "paper"  -> parse_nimi (bilingual sample papers, per-question page refs)
#       "table"  -> parse_tables (tabular banks, English only)
#       "reading"-> published as study material but not mined for questions
SOURCES = [
    # -- Electrician ---------------------------------------------------------
    dict(kind="table", file="Electrician 1st year Eng-Hin (1).pdf",
         slug="electrician-1st-year-bank", title="Electrician 1st Year Question Bank",
         titleHi="इलेक्ट्रीशियन प्रथम वर्ष प्रश्न बैंक",
         occupations=["ELECTRICIAN"], subject="TRADE_THEORY", year="1st Year"),
    dict(kind="table", file="Electrician - 1st Sem (Hindi) (1).pdf",
         slug="electrician-1st-sem-bank", title="Electrician 1st Semester Question Bank",
         titleHi="इलेक्ट्रीशियन प्रथम सेमेस्टर प्रश्न बैंक",
         occupations=["ELECTRICIAN"], subject="TRADE_THEORY", year="1st Year"),
    dict(kind="reading", file="Electrician2ndsemesterNSQF.pdf",
         slug="electrician-2nd-sem-nsqf", title="Electrician 2nd Semester NSQF Question Bank",
         titleHi="इलेक्ट्रीशियन द्वितीय सेमेस्टर NSQF प्रश्न बैंक",
         occupations=["ELECTRICIAN"], subject="TRADE_THEORY", year="1st Year"),
    dict(kind="paper", file="Electrician - 1st Year (Set - 3) (2504).pdf",
         slug="electrician-1st-year-set-3", title="Electrician 1st Year AITT Paper (Set 3)",
         titleHi="इलेक्ट्रीशियन प्रथम वर्ष AITT प्रश्नपत्र (सेट 3)",
         occupations=["ELECTRICIAN"], year="1st Year"),
    dict(kind="paper", file="Electrician - 2nd Year (Set - 1) (2504).pdf",
         slug="electrician-2nd-year-set-1", title="Electrician 2nd Year AITT Paper (Set 1)",
         titleHi="इलेक्ट्रीशियन द्वितीय वर्ष AITT प्रश्नपत्र (सेट 1)",
         occupations=["ELECTRICIAN"], year="2nd Year"),
    dict(kind="paper", file="Electrician - 2nd Year (Set - 3) (2504).pdf",
         slug="electrician-2nd-year-set-3", title="Electrician 2nd Year AITT Paper (Set 3)",
         titleHi="इलेक्ट्रीशियन द्वितीय वर्ष AITT प्रश्नपत्र (सेट 3)",
         occupations=["ELECTRICIAN"], year="2nd Year"),
    # -- Fitter --------------------------------------------------------------
    dict(kind="paper", file="Fitter - 1st Year (Set - 1) (2504).pdf",
         slug="fitter-1st-year-set-1", title="Fitter 1st Year AITT Paper (Set 1)",
         titleHi="फिटर प्रथम वर्ष AITT प्रश्नपत्र (सेट 1)",
         occupations=["FITTER"], year="1st Year"),
    dict(kind="paper", file="Fitter - 1st Year (Set - 2) (2504).pdf",
         slug="fitter-1st-year-set-2", title="Fitter 1st Year AITT Paper (Set 2)",
         titleHi="फिटर प्रथम वर्ष AITT प्रश्नपत्र (सेट 2)",
         occupations=["FITTER"], year="1st Year"),
    dict(kind="paper", file="Fitter - 1st Year (Set - 3) (2504).pdf",
         slug="fitter-1st-year-set-3", title="Fitter 1st Year AITT Paper (Set 3)",
         titleHi="फिटर प्रथम वर्ष AITT प्रश्नपत्र (सेट 3)",
         occupations=["FITTER"], year="1st Year"),
    dict(kind="paper", file="Fitter - 2nd Year (Set - 1) (2504).pdf",
         slug="fitter-2nd-year-set-1", title="Fitter 2nd Year AITT Paper (Set 1)",
         titleHi="फिटर द्वितीय वर्ष AITT प्रश्नपत्र (सेट 1)",
         occupations=["FITTER"], year="2nd Year"),
    dict(kind="paper", file="Fitter - 2nd Year (Set - 2) (2504).pdf",
         slug="fitter-2nd-year-set-2", title="Fitter 2nd Year AITT Paper (Set 2)",
         titleHi="फिटर द्वितीय वर्ष AITT प्रश्नपत्र (सेट 2)",
         occupations=["FITTER"], year="2nd Year"),
    dict(kind="paper", file="Fitter - 2nd Year (Set - 3) (2504).pdf",
         slug="fitter-2nd-year-set-3", title="Fitter 2nd Year AITT Paper (Set 3)",
         titleHi="फिटर द्वितीय वर्ष AITT प्रश्नपत्र (सेट 3)",
         occupations=["FITTER"], year="2nd Year"),
    # -- Shared subjects -----------------------------------------------------
    dict(kind="table", file="Workshop 2nd year  (Hindi).pdf",
         slug="workshop-calculation-2nd-year",
         title="Workshop Calculation & Science, 2nd Year",
         titleHi="वर्कशॉप कैलकुलेशन एवं साइंस, द्वितीय वर्ष",
         occupations=["FITTER", "ELECTRICIAN"], subject="WORKSHOP_CALCULATION",
         year="2nd Year"),
    dict(kind="table", file="Employability Skills 2022 - 1st year.pdf",
         slug="employability-skills-1st-year", title="Employability Skills 1st Year",
         titleHi="रोज़गार कौशल प्रथम वर्ष",
         occupations=["*"], subject="EMPLOYABILITY_SKILLS", year="1st Year"),
    dict(kind="table", file="Employability Skills - 2nd year.pdf",
         slug="employability-skills-2nd-year", title="Employability Skills 2nd Year",
         titleHi="रोज़गार कौशल द्वितीय वर्ष",
         occupations=["*"], subject="EMPLOYABILITY_SKILLS", year="2nd Year"),
]

ALL_OCCUPATIONS = ["FITTER", "ELECTRICIAN", "SOLAR_TECHNICIAN", "BASIC_COSMETOLOGY"]

SECTION_SUBJECT = {
    "Trade Theory": "TRADE_THEORY",
    "Workshop Calculation and Science": "WORKSHOP_CALCULATION",
    "Engineering Drawing": "ENGINEERING_DRAWING",
    "Employability Skills": "EMPLOYABILITY_SKILLS",
}

# ---------------------------------------------------------------------------
# Topic classification
# ---------------------------------------------------------------------------
# The sample papers carry no topic column, so a topic is inferred from the
# wording. Rules are grouped per subject: a Workshop Calculation question must
# never be labelled "Wiring & Installation" just because it mentions a cable.
# Within a group the first pattern that hits wins, so specific topics precede
# general ones.
TRADE_TOPICS = [
    ("Safety & First Aid", r"\b(safety|hazard|accident|first aid|ppe|protective|fire|extinguish|"
                           r"5s|housekeeping|electric shock|artificial respiration)\b"),
    ("Measurement & Marking", r"\b(vernier|micrometer|gauge|gage|caliper|least count|scriber|"
                              r"punch|surface plate|try square|protractor|marking|dividers?)\b"),
    ("Files & Bench Work", r"\b(file|filing|chisel|chipping|hacksaw|saw blade|vice|vise|hammer|"
                           r"bench work|scraping|lapping)\b"),
    ("Drilling & Reaming", r"\b(drill|reamer|reaming|counterbor|countersink|spot facing|tapping)\b"),
    ("Threads & Fasteners", r"\b(thread|tap|die|screw|bolt|nut|pitch|whitworth|metric thread|rivet)\b"),
    ("Fits, Limits & Tolerance", r"\b(tolerance|allowance|clearance fit|interference|transition fit|"
                                  r"limits|basic size|deviation|h7|hole basis|shaft basis)\b"),
    ("Sheet Metal & Welding", r"\b(sheet metal|weld|soldering|brazing|arc|electrode|gas cutting|"
                               r"forging|smithy)\b"),
    ("Lathe & Machining", r"\b(lathe|milling|shaper|grinding wheel|planer|slotting|chuck|"
                           r"cutting speed|feed rate|tool signature)\b"),
    ("Power Transmission", r"\b(bearing|gear|pulley|belt drive|chain drive|coupling|clutch|"
                            r"lubricat|shaft alignment)\b"),
    ("Engineering Materials", r"\b(cast iron|mild steel|carbon steel|alloy|brass|bronze|"
                               r"annealing|hardening|tempering|normalising|heat treatment|"
                               r"ferrous|non-ferrous)\b"),
    ("Transformers", r"\b(transformer|primary winding|secondary winding|tap changing|"
                      r"turns ratio|no load current|core loss)\b"),
    ("Motors & Generators", r"\b(motor|generator|alternator|armature|commutator|slip|rotor|"
                             r"stator|starter|synchronous speed|induction)\b"),
    ("Wiring & Installation", r"\b(wiring|conduit|casing|capping|cable|conductor|socket|switch|"
                               r"distribution board|earthing|earth electrode|joint)\b"),
    ("Batteries & Charging", r"\b(battery|batteries|cell|electrolyte|specific gravity|charging|"
                              r"lead acid|ampere hour)\b"),
    ("Illumination", r"\b(lamp|lumen|illumination|lux|luminous|fluorescent|led|filament|choke)\b"),
    ("AC Fundamentals", r"\b(alternating current|frequency|power factor|resonance|impedance|"
                         r"reactance|capacitor|inductor|rms|phasor|three phase|star|delta)\b"),
    ("Basic Electricity", r"\b(ohm|voltage|current|resistance|resistor|ampere|volt|watt|"
                           r"kirchhoff|circuit|conductor|insulator|magnet)\b"),
    ("Measuring Instruments", r"\b(ammeter|voltmeter|multimeter|megger|wattmeter|energy meter|"
                               r"tong tester|galvanometer|oscilloscope)\b"),
    ("Electronics", r"\b(diode|transistor|rectifier|scr|thyristor|semiconductor|zener|"
                     r"capacitor charging|ic\b|logic gate)\b"),
]

WORKSHOP_TOPICS = [
    ("Friction & Lubrication", r"\b(friction|frictional|lubricat|coefficient of friction)\b"),
    ("Heat & Temperature", r"\b(temperature|heat|thermal|celsius|fahrenheit|specific heat|"
                            r"expansion|calorie)\b"),
    ("Estimation & Costing", r"\b(estimat|cost|labour charge|rate per|expenditure|profit|"
                              r"discount|wages)\b"),
    ("Mensuration", r"\b(area|volume|perimeter|circumference|surface area|cylinder|cone|"
                     r"sphere|frustum|prism)\b"),
    ("Levers & Machines", r"\b(lever|fulcrum|mechanical advantage|velocity ratio|pulley system|"
                           r"screw jack|inclined plane|efficiency of machine)\b"),
    ("Speed, Feed & Power", r"\b(cutting speed|feed|rpm|spindle speed|power|horse ?power|"
                             r"torque|work done|energy)\b"),
    ("Centre of Gravity", r"\b(centre of gravity|center of gravity|centroid|equilibrium)\b"),
    ("Strength of Materials", r"\b(stress|strain|elasticity|young'?s modulus|tensile|"
                               r"compressive|shear force|factor of safety)\b"),
    ("Algebra & Mensuration Basics", r"\b(algebra|equation|square root|logarithm|indices|"
                                      r"trigonometry|sine|cosine|tangent|angle of)\b"),
    ("Ratio, Percentage & Averages", r"\b(ratio|proportion|percentage|average|fraction|"
                                      r"decimal|mixture)\b"),
    ("Density & Weight", r"\b(density|specific gravity|mass|weight of|kg/m|gm/cm)\b"),
    ("Electrical Calculation", r"\b(ohm|voltage|current|resistance|ampere|volt|watt|kwh|"
                                r"electron|conductor)\b"),
]

DRAWING_TOPICS = [
    ("Projection & Views", r"\b(projection|orthographic|isometric|first angle|third angle|"
                            r"sectional view|elevation|plan view|auxiliary)\b"),
    ("Lines, Symbols & Dimensioning", r"\b(dimension|hatching|line type|hidden line|centre line|"
                                       r"symbol|abbreviation|tolerance sign|surface finish)\b"),
    ("Drawing Standards", r"\b(scale|title block|sheet size|a[0-4] size|lettering|bis|"
                           r"drawing sheet|layout of)\b"),
    ("Geometrical Construction", r"\b(bisect|polygon|hexagon|ellipse|tangent|arc|"
                                  r"circle construction|conic)\b"),
]

EMPLOYABILITY_TOPICS = [
    ("English & Grammar", r"\b(vowel|verb|tense|sentence|grammar|preposition|adjective|noun|"
                           r"pronoun|singular|plural|spelling|synonym|antonym)\b"),
    ("Communication at Work", r"\b(communication|listening|body language|feedback|"
                               r"presentation|greeting|etiquette|telephone|email writing)\b"),
    ("Career & Job Readiness", r"\b(resume|cv\b|interview|cover letter|job portal|"
                                r"apprentice|naps|vacancy|employer|recruit)\b"),
    ("Entrepreneurship & Finance", r"\b(entrepreneur|business plan|investor|loan|bank|budget|"
                                    r"savings|insurance|upi|gst|start[- ]?up|customer|"
                                    r"trademark|profit)\b"),
    ("Digital Skills", r"\b(internet|computer|password|cyber|digital|online|browser|"
                        r"spreadsheet|search engine|social media)\b"),
    ("Environment & Sustainability", r"\b(pollution|environment|recycle|waste|deforest|"
                                      r"sustainab|energy conservation|climate)\b"),
    ("Constitutional Values & Ethics", r"\b(constitution|citizen|fundamental right|duty|"
                                        r"gender|values and ethics|integrity|harassment|"
                                        r"diversity)\b"),
    ("Health & Wellbeing", r"\b(hygiene|nutrition|exercise|stress|mental health|yoga|"
                            r"first aid at work|posture)\b"),
]

TOPIC_RULES = {
    "TRADE_THEORY": TRADE_TOPICS,
    "WORKSHOP_CALCULATION": WORKSHOP_TOPICS,
    "ENGINEERING_DRAWING": DRAWING_TOPICS,
    "EMPLOYABILITY_SKILLS": EMPLOYABILITY_TOPICS,
}
TOPIC_RULES = {
    subject: [(name, re.compile(pattern, re.IGNORECASE)) for name, pattern in rules]
    for subject, rules in TOPIC_RULES.items()
}

SUBJECT_FALLBACK_TOPIC = {
    "TRADE_THEORY": "General Trade Theory",
    "WORKSHOP_CALCULATION": "General Workshop Calculation",
    "ENGINEERING_DRAWING": "General Engineering Drawing",
    "EMPLOYABILITY_SKILLS": "General Employability Skills",
}


def classify_topic(text, subject):
    for name, pattern in TOPIC_RULES[subject]:
        if pattern.search(text):
            return name
    return SUBJECT_FALLBACK_TOPIC[subject]


def tidy_topic(raw, text, subject):
    """Trust the bank's own topic column when it looks like a real label."""
    if raw:
        label = re.sub(r"\s+", " ", raw).strip(" -–—")
        if 2 < len(label) <= 48 and not label.isdigit():
            return label[:1].upper() + label[1:]
    return classify_topic(text, subject)


DIFFICULTY = {1: "EASY", 2: "MEDIUM", 3: "HARD"}


def normalise(text):
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def slug_for(question, options):
    digest = hashlib.sha1(
        (normalise(question) + "|" + "|".join(normalise(o["en"]) for o in options)).encode()
    )
    return digest.hexdigest()[:16]


def build():
    bank = {}
    documents = []
    stats = []

    for source in SOURCES:
        path = os.path.join(DOWNLOADS, source["file"])
        if not os.path.exists(path):
            print(f"  ! missing: {source['file']}")
            continue

        documents.append(
            {
                "slug": source["slug"],
                "title": source["title"],
                "titleHi": source["titleHi"],
                "file": source["file"],
                "occupations": (
                    ALL_OCCUPATIONS if source["occupations"] == ["*"] else source["occupations"]
                ),
                "year": source["year"],
                "subject": source.get("subject", "TRADE_THEORY"),
                "minedForQuestions": source["kind"] != "reading",
            }
        )
        if source["kind"] == "reading":
            stats.append((source["file"], 0, 0))
            continue

        raw = (
            parse_nimi.parse(path) if source["kind"] == "paper" else parse_tables.parse(path)
        )
        occupations = (
            ALL_OCCUPATIONS if source["occupations"] == ["*"] else source["occupations"]
        )

        added = 0
        for item in raw:
            subject = (
                SECTION_SUBJECT.get(item.get("section"), "TRADE_THEORY")
                if source["kind"] == "paper"
                else source.get("subject", "TRADE_THEORY")
            )
            # A question reaches exactly the trades the document it came from is
            # published to. Employability Skills is shared across all four
            # trades because its own banks are published to all four — not
            # because of the subject. Broadening it by subject would offer a
            # Fitter a question whose only source is the Electrician paper,
            # which a Fitter cannot open, leaving "where to learn this" blank.
            targets = occupations

            key = slug_for(item["question"], item["options"])
            label = (
                f"Q{item['serial']} · {item['section']}"
                if source["kind"] == "paper"
                else (item.get("module") or source["title"])
            )
            reference = {
                "doc": source["slug"],
                "page": item["page"],
                "label": label[:80],
                "week": item.get("week"),
            }

            if key in bank:
                existing = bank[key]
                existing["occupations"] = sorted(set(existing["occupations"]) | set(targets))
                # Record this printing too: the trade a question is offered to
                # may only have access to one of the documents it appears in.
                if all(s["doc"] != source["slug"] for s in existing["sources"]):
                    existing["sources"].append(reference)
                # A later source may supply the Hindi the first one lacked.
                if not existing["questionHi"] and item.get("questionHi"):
                    existing["questionHi"] = item["questionHi"]
                    existing["options"] = item["options"]
                continue

            haystack = item["question"] + " " + " ".join(o["en"] for o in item["options"])

            bank[key] = {
                "slug": key,
                "occupations": sorted(targets),
                "subject": subject,
                "topic": tidy_topic(item.get("topic"), haystack, subject),
                "difficulty": DIFFICULTY.get(item.get("level") or 0, "MEDIUM"),
                "question": item["question"],
                "questionHi": item.get("questionHi"),
                "options": item["options"],
                "answerIndex": item["answerIndex"],
                "sources": [reference],
            }
            added += 1

        stats.append((source["file"], len(raw), added))

    return documents, list(bank.values()), stats


if __name__ == "__main__":
    documents, questions, stats = build()

    print("Source                                              parsed  new")
    for name, parsed, added in stats:
        print(f"  {name[:50]:<50} {parsed:>6} {added:>4}")

    from collections import Counter

    print("\nBy subject:", dict(Counter(q["subject"] for q in questions)))
    per_occupation = Counter()
    for q in questions:
        for occupation in q["occupations"]:
            per_occupation[occupation] += 1
    print("By occupation:", dict(per_occupation))
    print("Bilingual:", sum(1 for q in questions if q["questionHi"]))
    print("Distinct topics:", len({q["topic"] for q in questions}))
    print("TOTAL:", len(questions))

    target = os.path.join(os.path.dirname(os.path.abspath(__file__)), "question-bank.json")
    with open(target, "w", encoding="utf-8") as handle:
        json.dump(
            {"documents": documents, "questions": questions},
            handle,
            ensure_ascii=False,
            indent=1,
        )
    print("wrote", target)
