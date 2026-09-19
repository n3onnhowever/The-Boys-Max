# ADR-008 — Research archives are immutable evidence, not canonical specs
Status: ACCEPTED

Decision:
- Store raw research by date/topic under docs/research.
- Store current decisions separately under docs/current and docs/adr.
- Do not create one long-lived branch per research topic.
- A research recommendation changes canonical docs only through an explicit accepted decision/ADR.
- Preserve archive checksums.
