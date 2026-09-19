# T104 — Conservative factual P0 proposal

Baseline: `5e4973f24fb74489387b3c29313cfcd1e8401ca7`. Branch: `codex/t104-kudago-gate`. API: **v1.4**. Probe UTC: `2026-09-19T07:32:05.613939+00:00` — `2026-09-19T07:43:09.112800+00:00`.

Raw-response SHA-256 and per-request provenance: [RECEIPT_INDEX.json](RECEIPT_INDEX.json), index file SHA-256 `8492a25ff24798859b87a66374875550b6fa1317c86aadedc7fc8ceacdd8aae0`. This metadata applies to linked logs and derived evidence.

**Предлагаемый минимальный набор для согласования, не подтверждение права использования. LEGAL_MANUAL_GATE остаётся OPEN.**

- title;
- factual dates/time только в подтверждённом объёме, UNKNOWN end отдельно;
- factual place/address и coordinates, только если provider их дал; location unknown без fake point;
- factual raw_price_text + normalized exact/from/range/free/conditional/unknown, fee/basis/scope UNKNOWN сохраняются;
- category;
- source event ID;
- exact source URL с видимой attribution;
- техническая provenance: provider/API version, fetched_at UTC, response hash, transform version и минимальный receipt, если разрешено;
- только собственные visuals/placeholders.

**До отдельного clearance:** не показывать/сохранять provider images, descriptions/body text/tagline; не загружать media; не присваивать права на сторонний контент; не использовать KudaGo logo/trademark без согласования. Не создавать долгосрочный raw-body cache или PriceSnapshot/history автоматически. Storage/retention/advertising clearance нужны даже для factual-only режима.

T104 receipts — изолированная проверка, не production catalog. Из expanded place сохранены только фактические id/title/address/coords/location/subway/is_stub; phone/site descriptions/images удалены. Из location сохранён factual city metadata; city centroid не используется как venue point. Полные Event body_text/description/images и HTML не retained; сохранён SHA-256 исходного HTTP entity body до parsing и минимальная projection. Default-field probe фиксирует названия ключей, не их исключённое содержимое. Hash без full bytes не позволяет восстановить тело; reproducibility использует сохранённые critical fields, а не притворяется полной raw-body replay.

Публикация/production ingestion/публичный demo остаются запрещены до явного закрытия обоих gates и применимых runtime/MAX/client требований.
