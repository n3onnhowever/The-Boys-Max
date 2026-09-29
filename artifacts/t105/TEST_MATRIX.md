# T105 test matrix

| Requirement | Evidence | Result |
| --- | --- | --- |
| Event distinct from Occurrence; multiple sessions | focused unit and PostgreSQL | PASS |
| Native/anonymous identity; repeated fetch; duplicate and conflicting source rows | focused unit and PostgreSQL | PASS |
| Known, explicit FREE, FROM, RANGE, CONDITIONAL, UNKNOWN | focused unit; SQL FREE constraint | PASS |
| T104 mandatory 700 RUB deposit is CONDITIONAL, not FREE | focused unit | PASS |
| Unknown fee/scope and lower-bound-only budget | focused unit | PASS |
| Null end, malformed end/start, impossible date and timezone | focused unit; SQL end constraint | PASS |
| Null place, no coordinates, online/venue conflict | focused unit | PASS |
| Source URL and HTML rejection; unavailable source view | focused unit | PASS |
| 399 sessions, 4 MiB page bound, 500 records/5000 fragments | focused unit | PASS |
| KudaGo actual_since excluded from proven update cursor | focused unit and adapter inspection | PASS |
| Provenance (request, provider ID, source URL, hashes, transform, field evidence) | PostgreSQL | PASS |
| Partial page, timeout, 429, 5xx, late response and zero-result run | PostgreSQL | PASS |
| Provider update, stale dispatch, event-only observation separation | PostgreSQL | PASS |
| No absence-derived tombstone or cancellation | PostgreSQL | PASS |
| Existing UI price/detail safety | detail-view-model and http-price tests | PASS |
| PostgreSQL 18.6 target image | Docker daemon unavailable | BLOCKED |

Synthetic fixtures use deterministic future 2027 dates. Focused unit: 21/21. PostgreSQL: 11/11 on fresh and 11/11 on upgraded PostgreSQL 17.10. Full unit: 264/264. No live provider requests were made.
