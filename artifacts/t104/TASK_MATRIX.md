# T104 — Frozen task matrix

Baseline: `5e4973f24fb74489387b3c29313cfcd1e8401ca7`. Branch: `codex/t104-kudago-gate`. API: **v1.4**. Probe UTC: `2026-09-19T07:32:05.613939+00:00` — `2026-09-19T07:43:09.112800+00:00`.

Raw-response SHA-256 and per-request provenance: [RECEIPT_INDEX.json](RECEIPT_INDEX.json), index file SHA-256 `8492a25ff24798859b87a66374875550b6fa1317c86aadedc7fc8ceacdd8aae0`. This metadata applies to linked logs and derived evidence.

| Task | Result | Suitable counted | Source ID | Observation |
|---|---|---:|---|---|
| DG-01 | NO_PASS | no | 202293 | 17 сентября уже в прошлом. API сохраняет 20:00 и 800 ₽; это историческая, а не будущая пригодность. |
| DG-02 | NO_PASS | no | 199924 | 17 сентября уже в прошлом; «от 1500 ₽» не доказывает итог ≤2000 ₽. |
| DG-03 | NO_PASS | no | 210582 | 17 сентября уже в прошлом; Good Night Show — диапазон/режим работы, не подтверждённый сеанс 18–22. |
| DG-04 | UNKNOWN | no | 202293 | 19 сентября 18:00 (desk было 17:00), 800 ₽ на уровне Event. Итог с обязательными доплатами и привязка цены к сеансу UNKNOWN. |
| DG-05 | UNKNOWN | no | 203229 | 19 сентября 19:00; от 2000 ₽ — только нижняя граница, бюджет ≤2500 не подтверждён. |
| DG-06 | UNKNOWN | no | 209577 | Старт 21:30 указан внутри recurring schedule; «от 990 ₽». Точный сеанс не изобретён. |
| DG-07 | UNKNOWN | no | 210889 | CERAMANIA: многодневный диапазон 19–20 сентября, is_free=true, пустой price. Дневной сеанс и total spend 0 не доказаны. |
| DG-08 | UNKNOWN | no | 203209 | 20 сентября 19:00; от 1500 ₽ не доказывает итог ≤2000 ₽. |
| DG-09 | NO_PASS | no | 190707 | Бесплатный вход + депозит 700 ₽: experimental conditional, бюджет 0 → NO_PASS. Baseline: TEXT/UNKNOWN, не required NO_PASS. |
| DG-10 | PASS | no | 226169 | Safety PASS: живой null end → ends_at UNKNOWN, hard end-before UNKNOWN. Не пригодный occurrence. |
| DG-11 | PASS | no | 175330 | Safety PASS: живой place=null → coordinates=null, status UNKNOWN. UI/detail availability не тестировались. |
| DG-12 | PASS | no | none (empty) | Safety PASS: API count=0, next=null, results=[]; параметры не ослаблялись. Не пригодный occurrence. |

Все 12 финальных статусов используют только PASS / NO_PASS / UNKNOWN / ERROR. PASS у DG-10–12 означает успешную защитную проверку; это отдельно от suitability. Итого: PASS 3, NO_PASS 4, UNKNOWN 5, ERROR 0. Verified suitable tasks: **0**, порог **8** не достигнут.

Даты 17/19/20 сентября не сдвигались. DG-01–03 исполнены как frozen исторические API-запросы, но в текущем live gate не могут считаться будущим результатом. Для нового будущего окна потребуется явно согласованная новая frozen matrix, не подмена T104.

Бюджет трактуется как подтверждаемая стоимость с обязательными доплатами согласно Data Safety Patch и baseline `eligibility.ts`, а не как сравнение только advertised minimum. EVENT-level exact price может быть показана как source claim, но не становится OCCURRENCE all-in price.

Полные выбранные raw fields, normalized Event/Occurrence/price, constraints, URL, status, latency, headers и raw response SHA-256 находятся в MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json; все кандидаты и даты проверенных окон — CANDIDATE_AUDIT.json. Выборка DG-10/11: 100 из 310, ограниченная, не exhaustive. Остальные frozen запросы завершены целиком, каждый уместился в одну страницу.
