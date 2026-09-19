# T104 — Occurrence and T105 inputs

Baseline: `5e4973f24fb74489387b3c29313cfcd1e8401ca7`. Branch: `codex/t104-kudago-gate`. API: **v1.4**. Probe UTC: `2026-09-19T07:32:05.613939+00:00` — `2026-09-19T07:43:09.112800+00:00`.

Raw-response SHA-256 and per-request provenance: [RECEIPT_INDEX.json](RECEIPT_INDEX.json), index file SHA-256 `8492a25ff24798859b87a66374875550b6fa1317c86aadedc7fc8ceacdd8aae0`. This metadata applies to linked logs and derived evidence.

**У Event есть source event ID; стабильного occurrence/session ID в dates[] не обнаружено.** В default payload date содержит start/end; expand=dates добавляет start_date/start_time/end_date/end_time, recurrence/range flags, schedules и use_place_schedule. Default field-name receipt: receipts/detail_default_fields.json. Не переносить ID специализированных movie-showings на generic Events.

Реальные формы:

- 202293: 399 date entries, среди них exact 2026-09-19 18:00 MSK, null end_date/end_time, integer end равен start. Missing end остаётся UNKNOWN.
- 190707: 316 date records, включая startless recurring interval и schedules с 20:00; 209577: weekday schedules 21:30. T104 не утверждает недоказанную глобальную семантику weekday numbering и не создаёт сеансы из них.
- 210582: startless диапазон/режим работы, API actual-window match не делает его exact session.
- 210889: 19.09 12:00 → 20.09 20:00, flags false. Такой multi-day range не доказывает один конкретный дневной сеанс, ежедневное начало или непрерывность; experiment оставляет UNKNOWN.
- Sentinel start -62135433000 / end 253370754000 — не будущий/древний реальный сеанс. Их нужно интерпретировать вместе с flags, не безусловно превращать в business timestamps.

Повтор detail 202293 в одном коротком окне дал одинаковый raw hash. Это доказывает только равенство этих двух наблюдений. Реальный edit/reschedule/delete между двумя API fetch **NOT_OBSERVED**; производить изменения чужих мероприятий нельзя. Desk timestamp 17:00 против нынешнего API 18:00 показывает устаревание прежнего evidence, но не является доказанным API-to-API reschedule transition.

**Reconcile:** гарантированное стабильное сопоставление после переноса сейчас не доказано. Event ID — родительская identity. dates index, start/end, schedule, venue, title, raw fingerprint/hash, fetched_at и publication_date — evidence/matching hints, не immutable session identity. Start-derived ID в baseline меняется при переносе; это причина отдельного T105 решения. Хранить наблюдения и явную неопределённость, не молча создавать/удалять commitment/saved references. Semantic material change требует re-confirmation по existing contract.

**Reproduced baseline defects / inputs T105**

- Event 202293 → ARRAY_REQUIRED:dates (399 >50). Scope/filtering date arrays before normalizer must not discard evidence or silently truncate current sessions.
- Event 193208, dates[7] sentinel start → INTEGER_REQUIRED:integer. Treat flags/unknown per date; quarantine one bad date need not erase other supported sessions, subject to owner review.
- Event 203456, dates[0]: expanded end 2023-06-15 00:00 MSK differs from integer end 2023-06-16 00:00 MSK. Do not guess which is authoritative. Baseline rejects entire Event (NATIVE_TIME_CONFLICT). Need explicit conflict policy and preserved raw fields.
- Conditional price and raw «рублей» forms need mapping to accepted safety semantics, basis/fees/scope fields. Keep total UNKNOWN when unsupported.
- Choose canonical identity/reconciliation policy with these receipts and explicit transition fixtures; do not assert provider guarantees. No production ID model/schema changed in T104.

Exact unmodified input references and baseline outputs: NORMALIZER_REPLAY.json/reproducible_defects. Reproduce with `node --experimental-strip-types artifacts/t104/replay-normalizer.mjs`. T105 is not started.
