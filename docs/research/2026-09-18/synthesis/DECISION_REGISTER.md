# ПОВОД — DECISION REGISTER
**Version:** 2026-09-19 synthesis v1

| ID | Decision | Status | Scope | Rationale / gate |
|---|---|---|---|---|
| D-001 | Product name = «Повод»; The Boys = team | KEEP | Product | Team decision |
| D-002 | P0 remains solo-first | FROZEN | P0 | Official case rewards one complete priority flow |
| D-003 | Moscow is the mandatory live demo city | FROZEN | P0 | One proven city beats unverified breadth |
| D-004 | Second city only after separate data gate | DEFER | Stretch | Scale proof, not P0 blocker |
| D-005 | Event and Occurrence are separate | FROZEN | Data | Prevents date/time/session ambiguity |
| D-006 | UNKNOWN is first-class | FROZEN | Data/UX | Official case stresses source/freshness/honesty |
| D-007 | Conditional price and raw text are preserved | KEEP+PATCH | P0 | Free-entry/deposit edge case |
| D-008 | Source/provenance is mandatory | FROZEN | P0 | Product + official data guidance |
| D-009 | Freshness text is shown only with defensible timestamp semantics | CHANGE | P0 UX | Provenance != freshness |
| D-010 | PostgreSQL remains P0 source of truth | KEEP | Architecture | Simplest sufficient baseline |
| D-011 | PostgreSQL FTS/pg_trgm before external search | KEEP | P0 | Avoid unnecessary service |
| D-012 | PostGIS only if geo/map requires it | CONDITIONAL | P0/P1 | Geo capability without forcing scope |
| D-013 | No Kafka/Redpanda/Temporal in P0 | REJECT | P0 | Overengineering for current async needs |
| D-014 | Queue choice is repository-gated | CHANGE | Architecture | No queue / existing green BullMQ / conditional pg-boss |
| D-015 | Do not introduce Redis solely for queue/cache | REJECT | P0 | No measured need |
| D-016 | KudaGo = conditional primary, NOT APPROVED | OPEN GATE | Provider | Runtime + legal/manual approval required |
| D-017 | Do not implement multi-provider P0 | DEFER | P1/Stretch | No approved fallback; unnecessary complexity |
| D-018 | MAX Mini App is primary UI and must be attached to bot | KEEP | P0 | Exact official-case requirement |
| D-019 | Validate MAX launch data server-side | MUST | Security | Client launch data not authorization |
| D-020 | startapp/share payload is context, never authorization | MUST | Security | Prevent IDOR/tampering |
| D-021 | Current MAX API2/TLS path must be runtime-tested | MUST | P0 | Current platform compatibility |
| D-022 | Smart Povod = P1 after P0 green | FROZEN | P1 | Retention feature, not core |
| D-023 | Programmatic group-member add is not a foundation | REJECT | Social | Platform lifecycle + optional social |
| D-024 | Map does not block P0 | DEFER/COND | P1 | Core value works without map |
| D-025 | Save / Follow / commitment are distinct concepts | KEEP | UX/Data | Avoid semantic conflation |
| D-026 | Poster Pop brand + calm working UI | KEEP | Brand/UX | Chosen direction + UX research |
| D-027 | No AI match percentages/opaque AI claims | REJECT | UX | Explainable factual reasons only |
| D-028 | Minimal redacted observability, not a self-hosted observability platform | KEEP | Reliability | Hackathon-proportionate |
| D-029 | Public user research has not yet been run | FACT | Validation | Do not present desk research as interviews |
| D-030 | Official case PDF is now recovered and hashed | RESOLVED | Compliance | 22 pages, exact project-package file |
| D-031 | Own API implies HTTPS + OpenAPI 3.0/3.1 + test data + DATA-API.yaml | MUST | Submission | Official case page 10 |
| D-032 | Docker reproducible launch and <=5 min build are mandatory | MUST | Submission | Official case page 9 |
| D-033 | MAX mobile AND web functionality are mandatory | MUST | Submission | Official case page 7 |
| D-034 | Research archives are evidence, not source of truth | KEEP | Governance | Avoid contradictory “final” docs |
| D-035 | One writer agent; deterministic verification; small repo-local Skills | RECOMMEND | Codex | Research consensus |
