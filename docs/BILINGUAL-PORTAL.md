# Hindi and English portal

The header language switch persists on this browser and applies to the interface,
test questions, answer options, answer review and `/study` notes. It does not invoke
Chrome Translate. Switching language does not change answer keys or test timing.

Original PDF files retain their published language. `/study` provides bilingual
question-based study notes alongside the original source links.

Missing Hindi was generated locally with the Argos English-Hindi model. Technical
wording should be reviewed by institute staff. Existing Hindi is preserved.
Run `npm run db:translate` with the intended database configured to fill missing
translations from `prisma/data/hindi-translations.json`; this does not replace
existing Hindi, English text, correct-answer keys or learner records.

Admins can edit Hindi fields in question management. CSV imports optionally accept
`question_hi`, `option_a_hi`, `option_b_hi`, `option_c_hi`, `option_d_hi`,
and `explanation_hi`. New content without Hindi falls back to English.

Login and repeat tests no longer require administrator approval. Authentication,
disabled-user checks and administrator-only mutations remain enforced. Historical
approval records are retained. Deleting a user requires the confirmation dialog;
the server prevents self-deletion and checks administrator access. Deleted or
disabled accounts are rejected on the next protected request.
