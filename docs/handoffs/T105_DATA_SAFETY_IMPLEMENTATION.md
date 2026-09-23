# T105 data safety implementation

## Inputs and revision

- Base product trunk: `fd03d3a15157fcaa59e5574619725f366fd6185d`; branch `codex/t105-data-safety`; implementation result SHA `30a60928c58cd4be208b6ae097250a165de8ee0f`.
- Authority: current POVOD source authority, state/decisions/gaps/trunk, T104 handoff and T105 inputs, provider gate governance, and relevant accepted P0 domain design sections.
- T104 runtime gate remains FAIL; legal/manual gate remains OPEN. KudaGo is not approved; Moscow is not activated.

## Model and normalization

`Event` is conceptual content; each `Occurrence` is a separately identified timed/place realization. Anonymous aliases hash exact start/timezone/format and stable place anchor, not title or price. Verified native session IDs retain identity through reschedule/venue updates. Repeated anonymous fetches dedupe; an ambiguous time/venue change creates a new identity and leaves the older row un-cancelled. Conflicting duplicates are quarantined.

Price is explicit KNOWN/FREE/FROM/RANGE/CONDITIONAL/UNKNOWN with exact integer minor units, fee and free evidence paths, scope/basis, mandatory extras and raw bounded price evidence. Missing or uncertain price/fee/scope cannot become FREE or a proven affordable ceiling. Exact start is required; unknown end remains null; malformed time is quarantined or reduced to an explicitly unknown end. Place supports venue, partial address, online and unknown with optional coordinates; contradictory claims remain uncertain.

`SourceRecord` is a bounded provider-neutral projection. The isolated KudaGo adapter handles source fields and bounded 4 MiB pages; canonical domain modules import no KudaGo DTO. Runtime validation returns ACCEPT/PARTIAL_ACCEPT/QUARANTINE/REJECT reasons per record/fragment. The adapter ignores `actual_since` as an update cursor. Provider descriptions, images, HTML and raw response bodies are intentionally not persisted under the open rights gate.

## Persistence and reconciliation

The isolated `scripts/t105-upgrade-baseline.mjs` reproduces a trunk-to-0004 upgrade. Additive forward-only migration 0004 adds source, run/page, observation, Event, Venue, Occurrence, alias and quarantine tables. Git and runtime SQL hashes match at `d14cef7b400fc9eb78fac5f81a2cef8e78519afd448160ec8c0d8e6865cb829e`; existing migrations are untouched. Durable provenance stores provider/source/record/request identity, fetch time, safe source URL, response and critical-projection hashes, transform/rights revisions and bounded price/place/time evidence.

Page acceptance is atomic and ordered by dispatch sequence with source fencing. Partial, failed, 429, 5xx, zero-result and late responses cannot infer cancellation or tombstone a missing row. Repeated facts do not increment semantic revision; event-only updates do not refresh old occurrence provenance. Public presentation is provider-neutral and carries explicit price/place/source uncertainty without changing accepted Event Detail UI. No live ingestion, Save or My Povod persistence was added.

## Verification and limits

See `artifacts/t105/POSTGRES_18_6_REPRO.md`, `VERIFICATION_SUMMARY.md`, `TEST_MATRIX.md` and per-command logs/hashes. Focused unit 21/21; fresh and upgraded PostgreSQL 17.10 integration 11/11 each; existing UI safety 13/13; full unit 264/264; typecheck, pure typecheck, dependency check, build, clean/upgrade/no-op migrations, source scan and diff check pass. T104 deposit, null end/place/coordinates, anonymous identity, 399 dates, `actual_since`, duplicate row and bounded payload regressions are covered.

**BLOCKED_POSTGRES_18_6_RUNTIME:** `docker info` failed because the Docker daemon is unavailable. The target `postgres:18.6` migration/integration check was not run; Docker build was not run (Dockerfile/compose untouched). Full Redis/MAX/provider/browser suites were not run for this bounded ticket. Local PostgreSQL 17.10 results do not claim PostgreSQL 18.6 parity. The API/catalog runtime still uses its accepted legacy contracts; this implementation creates a safe canonical path and VM without publishing live provider data.

Gate v2 preparation receipt: `artifacts/t105/GATE_V2_READINESS.json` = **NOT_READY** until target PostgreSQL 18.6 verification. Gate v2 was not run; its future-date matrix remains to be frozen before provider requests. Legal/manual clearance and provider approval remain independent.

## Next action

Verify 0004 and T105 persistence on PostgreSQL 18.6, then prepare the frozen Gate v2 task/date matrix without issuing provider requests in this ticket.
