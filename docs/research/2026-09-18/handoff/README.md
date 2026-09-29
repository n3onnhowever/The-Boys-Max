# POVOD SYNTHESIS HANDOFF — 2026-09-19

This package consolidates the ten final research archives into a single canonical implementation handoff.

## What was verified
- 10/10 supplied research ZIPs pass CRC.
- All machine summaries were parsed.
- Exact official 22-page case PDF from the project package was reopened.
- Official case SHA-256: `638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a`.

## Start here
1. `synthesis/RESEARCH_SYNTHESIS.md`
2. `synthesis/DECISION_REGISTER.md`
3. `synthesis/CASE_COMPLIANCE_MATRIX.md`
4. `synthesis/IMPLEMENTATION_PLAN.md`
5. `adr/`
6. `codex/CODEX_RESEARCH_IMPORT_AND_PREFLIGHT_PROMPT.md`

## Important
Do not send the implementation kickoff prompt first.

The correct next Codex action is:
**research import + read-only repository preflight + gap matrix**.

Only after reviewing that receipt should application code changes begin.

## Raw research
The original ten archives are preserved in `research_archives/`.
They are evidence/history, not the current source of truth.
