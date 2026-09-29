# T104 — KudaGo runtime/data decision

Baseline: `5e4973f24fb74489387b3c29313cfcd1e8401ca7`. Branch: `codex/t104-kudago-gate`. API: **v1.4**. Probe UTC: `2026-09-19T07:32:05.613939+00:00` — `2026-09-19T07:43:09.112800+00:00`.

Raw-response SHA-256 and per-request provenance: [RECEIPT_INDEX.json](RECEIPT_INDEX.json), index file SHA-256 `8492a25ff24798859b87a66374875550b6fa1317c86aadedc7fc8ceacdd8aae0`. This metadata applies to linked logs and derived evidence.

**DATA_RUNTIME_GATE = FAIL. LEGAL_MANUAL_GATE = OPEN. Overall: CONDITIONAL_PRIMARY / NOT APPROVED. Moscow activation: NO.**

12/12 задач имеют финальные статусы; PASS 3 / NO_PASS 4 / UNKNOWN 5 / ERROR 0. Ни одна из восьми discovery-задач не имеет независимо подтверждённого подходящего будущего occurrence с доказанным бюджетом. Три PASS защитных тестов не считаются coverage. Это не утверждение об отсутствии событий в Москве: API вернул сотни записей, а gate оценивает достаточность доказательств строгого соответствия.

Critical false PASS = 0 в исполненных T104 safety assertions и baseline replay. Это ограниченный результат этой выборки, не универсальная сертификация production. Baseline conditional price остаётся TEXT/UNKNOWN; требуемый отказ NO_PASS реализован только в явно изолированном эксперименте. Скрывать этот gap успешным unit test нельзя.

29 HTTP observations: 26 public API v1.4 requests, одна official docs page, две secondary source pages. 24 API HTTP 200 и два намеренных, одиночных error-shape GET (400/404). No auth, scraping primary, Docker, queues, production ingestion или fallback. TLS validation сохранена. Запросы последовательные, между запросами пауза 1.2 секунды; нагрузочное тестирование и получение 429 не выполнялись.

Frozen 17 September tasks уже исторические. Среди будущих задач: source-level prices не доказывают occurrence-level payable total; from/range не дают гарантии потолка; recurring/range records не равны точному сеансу. `UNKNOWN` сохранён, фильтры не ослаблялись.

Baseline replay 205 уникальных Events: 79 нормализовались, 126 quarantined (35 ARRAY_REQUIRED:dates; 84 INTEGER_REQUIRED:integer; 7 NATIVE_TIME_CONFLICT). Full-record результаты не подменялись отдельными датами; single-date эксперименты явно маркированы. [Дефекты и точные входы](NORMALIZER_REPLAY.json).

Старый импортированный probe не изменён. Исправления в новом tooling: byte-level hash до JSON parsing; HTTP/latency/headers/error receipts; явный UTC/MSK; сохраняемые frozen dates; bounded pagination/completeness; no automatic relaxation; не сравнивать бюджет с нижней границей; не разворачивать недоказанный recurring; не брать sentinel end за известный конец; четыре разрешённых статуса; отдельный legal gate и suitable counter.

**Exact blockers**

- BLOCKED_FROZEN_LIVE_COVERAGE: 0/8 independently verified suitable; DG01–03 past; DG04–08 UNKNOWN.
- BLOCKED_NORMALIZER_COMPATIBILITY: limits/sentinel/conflicting dates quarantine many live records; conditional mapping missing. No production fix in T104.
- BLOCKED_OCCURRENCE_PRICE_BINDING: Event price has no observed date/session binding, no all-in fee completeness.
- BLOCKED_RECURRENCE_RECONCILIATION: no stable date/session ID observed; no actual reschedule transition; deterministic expansion not established.
- BLOCKED_UPDATE_CANCEL_SIGNAL: no reliable documented/runtime API lifecycle/update feed observed; short re-fetch is not cancellation verification.
- BLOCKED_TRANSPORT_ENVELOPE: observed bodies/latency exceed current provider transport settings; measurement attached, no limits changed here.
- BLOCKED_LEGAL_MANUAL: questions outstanding; no written provider/rightsholder clearance obtained.

Reproduction: from this worktree, `npm ci --ignore-scripts`; offline `python -X utf8 artifacts/t104/analyze.py`, `node --experimental-strip-types artifacts/t104/replay-normalizer.mjs`, `python -X utf8 -m unittest discover -s artifacts/t104 -p test_probe.py -v`. Network re-run, only when new receipts are needed: `python -X utf8 artifacts/t104/collect.py` then `python -X utf8 artifacts/t104/operational_probe.py`. These commands overwrite named probe receipts; preserve this committed run first. No live ingestion is started.

Runtime PASS with LEGAL OPEN would be a valid independent result, but this run is RUNTIME_FAIL_LEGAL_OPEN. Even a later runtime PASS alone cannot approve provider/Moscow.
