# T104 — Price observations

Baseline: `5e4973f24fb74489387b3c29313cfcd1e8401ca7`. Branch: `codex/t104-kudago-gate`. API: **v1.4**. Probe UTC: `2026-09-19T07:32:05.613939+00:00` — `2026-09-19T07:43:09.112800+00:00`.

Raw-response SHA-256 and per-request provenance: [RECEIPT_INDEX.json](RECEIPT_INDEX.json), index file SHA-256 `8492a25ff24798859b87a66374875550b6fa1317c86aadedc7fc8ceacdd8aae0`. This metadata applies to linked logs and derived evidence.

| Kind | Actual source ID | Raw price | Scope |
|---|---|---|---|
| exact | 174060 | 850 рублей | EVENT |
| unknown | 193208 | индивидуальная прогулка — 4500 рублей | EVENT |
| from | 193233 | от 5500 рублей | EVENT |
| range | 197937 | от 3500 до 3900 рублей | EVENT |
| free | 198938 | (empty; is_free=true) | EVENT |
| conditional | 190707 | вход бесплатный, депозит на еду — 700 рублей | EVENT |

Это классификация source claims в **T104 experiment**, не изменение production enum/schema. `raw_price_text`, raw `is_free`, source URL, fetched_at и response hash сохранены в PRICE_SAMPLES.json и receipts. Отдельная `free` запись 198938 означает claimed free base, не доказанный total=0. `unknown` пример — сложная фраза вне узкой грамматики; неизвестность парсера не означает отсутствия цены у источника.

190707: «вход бесплатный, депозит на еду — 700 рублей» + is_free=true. Эксперимент: conditional, amount_min=0 (entry claim), mandatory_extra_min=700, raw preserved; total budget 0 → NO_PASS. Текущий `kudagoQuote` безопасно оставляет TEXT + FREE_LABEL_CONFLICT, payable total UNKNOWN, но не извлекает mandatory_extra_min и не выдаёт требуемый NO_PASS. Full record также превышает лимит dates. Это воспроизводимый gap для T105, не закрытый implementation fix.

Набора exact/from/range/free/conditional/unknown достаточно как набора состояний для наблюдённого sample. Сам enum не решает basis, mandatory fees, eligibility, confidence или EVENT→OCCURRENCE applicability. Нужны независимые UNKNOWN для этих полей. Нет API quote/session-price ID. Ни один observation не даёт оснований маркировать scope OCCURRENCE. `from` — lower bound, range по обеим границам; arbitrary numbers/discounts не парсятся как цена.

Текущий normalizer распознаёт узкую грамматику «руб.»/«₽», но фактические «800 рублей» остаются TEXT. T104 grammar experiment распознаёт этот source form, не обещает all-in/availability. No price migration, snapshot implementation or retention approval performed.
