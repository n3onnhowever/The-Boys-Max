# ПОВОД — PRODUCT SPEC v1.1 DATA SAFETY PATCH
**Дата:** 17.09.2026  
**Причина:** результаты Moscow provider desk-gate.

## 1. PriceSnapshot

Заменить:

`price_kind = exact | from | range | free | unknown`

на:

`price_kind = exact | from | range | free | conditional | unknown`

Добавить обязательное сохранение:
- `raw_price_text`
- `mandatory_extra_min` nullable
- `is_free_claimed_by_source` nullable
- `parsed_confidence`

### Правило
`is_free=true` у provider не означает автоматически `total_cost=0`.

Пример:
`вход бесплатный, депозит на еду — 700 рублей`

Нормализация:
- `price_kind = conditional`
- `amount_min = 0`
- `mandatory_extra_min = 700`
- hard filter `budget_max=0` → **NO_PASS**

---

## 2. Occurrence end time

Если source не передал end:
- `ends_at = null`
- UI = `Время окончания не указано`
- hard condition `must_end_before=X` не получает confirmed PASS.

Не вычислять duration без подтверждённого источника.

---

## 3. Coordinates

Если place/coords отсутствуют:
- `venue_id` может быть null;
- `lat/lon = null`;
- map CTA скрывается или disabled;
- запрещено подставлять центр города/площадки как фактическую точку.

---

## 4. Provider status / cancellation

Если provider не передаёт надёжный explicit cancellation status:
- не заявлять `scheduled` как независимо подтверждённый факт сверх возможностей source;
- хранить `fetched_at`;
- использовать freshness TTL;
- всегда показывать source;
- перед критическим demo/pilot перепроверять occurrence у источника.

---

## 5. Event → Occurrence

Provider Event и Povod Occurrence — разные сущности.

`dates[]`:
- должны разбираться в occurrence-level records;
- exact dates нормализуются напрямую;
- recurring `schedules` разворачиваются только при детерминированной и протестированной логике;
- ambiguous schedule не получает confirmed hard-fit.

---

## 6. Source provenance

Для provider record обязательно хранить:
- provider;
- provider event ID;
- source URL;
- fetched_at;
- raw critical fields или receipt/hash для проверки.

---

## 7. P0 acceptance additions

Добавить к обязательным тестам:
- conditional price;
- `end_time=null`;
- `place/coords=null`;
- deliberate empty result;
- stale/source-unavailable;
- zero false PASS on hard constraints.
