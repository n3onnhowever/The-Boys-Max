# T105 accepted inputs from T104

T105 is not started by this document. This is an accepted implementation-input list only; it introduces no schema, code, provider approval or live ingestion.

## A. Price

- Model conditional price and mandatory extras/deposits without turning `is_free` into zero total cost.
- Preserve `raw_price_text`.
- Preserve evidence scope as `EVENT`, `OCCURRENCE` or `UNKNOWN`; T104 did not establish occurrence-level price binding.
- Keep strict budget semantics: `FROM` is a lower bound, not proof of an affordable ceiling; unknown fees/basis/scope cannot produce confirmed PASS.
- Cover exact/from/range/free/conditional/unknown plus parser confidence and honest fee uncertainty.

## B. Dates / occurrences

- Handle large `dates[]` without silent truncation or loss of supported sessions.
- Define conservative behavior for recurring/range schedules and sentinel/out-of-range timestamps.
- Preserve and resolve, or explicitly quarantine, conflicts between expanded date/time fields and epoch timestamps; do not guess.
- Keep `ends_at = null` when no end is established.
- Do not assume a stable provider occurrence/session ID; T104 established only provider Event identity.
- Define reschedule/reconciliation behavior and material-change handling before deriving stable internal identity.

## C. Place

- Support `place = null` and missing coordinates.
- Keep venue/coordinates unknown and never synthesize a city-centre or venue point.

## D. Transport

- Use T104 body-size and latency observations when choosing page size, byte bounds, timeouts and bounded retry policy.
- Preserve bounded pagination and explicit completeness/partial-state metadata.
- Do not base timeout or response-size policy on the old assumptions that T104 measurements exceeded.

## E. Sync

- `actual_since` is a time-window overlap filter, not an update/change cursor.
- Incomplete or partial sync cannot infer deletion or tombstone missing records.
- Cancellation/update signaling remains unknown; a missing record or 404 alone is not cancellation proof.
- Define durable checkpoint plus observation reconciliation before live sync.

## F. Provenance

- Preserve exact source URL and provider Event ID.
- Preserve `fetched_at`.
- Preserve a receipt/hash tied to the source observation and transform version.
- Retain only lawful minimal raw evidence; legal/manual storage, cache, history, image and body-text questions remain open.

Primary evidence: `artifacts/t104/PRICE_EDGE_CASES.md`, `OCCURRENCE_OBSERVATIONS.md`, `NORMALIZER_REPLAY.json`, `API_OPERATIONAL_OBSERVATIONS.md`, `KUDAGO_MINIMAL_SAFE_DATASET.md`, and the receipt index. T105 must not weaken the T104 FAIL or imply KudaGo/Moscow approval.
