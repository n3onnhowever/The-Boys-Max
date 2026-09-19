# ПОВОД — MOSCOW DATA / PROVIDER GATE v1
**Дата:** 17.09.2026  
**Город:** Москва  
**Кандидат provider:** KudaGo API  
**Статус:** DESK-PASS / RUNTIME+LEGAL GATE NOT CLOSED

---

# 1. Что проверяем

По ранее принятому `PILOT_AND_SCALE` город нельзя включать просто потому, что provider «что-то отдаёт».

До допуска города нужны:
- 12 заранее фиксированных задач;
- разные категории, время и бюджеты;
- случаи UNKNOWN;
- условная/неоднозначная цена;
- отсутствие end time;
- отмена / stale data;
- отсутствие координат;
- честный no-result;
- минимум 8/12 задач с хотя бы одним независимо проверенным пригодным occurrence;
- ноль ложных PASS по критическим ограничениям.

**Важно:** этот документ закрывает desk research и формирует точный runtime gate.  
Он **не объявляет Москву прошедшей формальный gate**, пока нет сохранённых API responses/receipts.

---

# 2. Почему KudaGo технически подходит

Документированный API v1.4 предоставляет:
- города;
- категории событий;
- список событий;
- `actual_since` / `actual_until`;
- `is_free`;
- category filters;
- geo filter `lat/lon/radius`;
- текстовый search endpoint;
- поля `dates`, `title`, `place`, `location`, `categories`, `age_restriction`, `price`, `is_free`, `images`, `site_url`, `participants`;
- expand для `place`, `location`, `dates`, `participants`.

Это покрывает почти весь P0 data contract.

## Но
KudaGo отдаёт **Event**, а «Поводу» нужен **Occurrence**.

Поэтому `dates[]` нельзя хранить как декоративное поле Event:
каждая конкретная дата/сеанс должна нормализоваться в собственный occurrence.

---

# 3. Текущий live catalog — desk evidence

На 17.09.2026 публичная афиша KudaGo показывает реальное наполнение Москвы.

Примеры:
- бесплатные события на 17 сентября: страница показывает **19** событий;
- бесплатные события на 18 сентября: **16** событий;
- «Пробные занятия “Секретные актёрские техники…”»:
  - 17 сентября 20:00;
  - 19 сентября 17:00;
  - 800 ₽;
- «Мужчина на все руки»:
  - 19 сентября 19:00;
  - от 2000 ₽;
- «Стендап в темноте»:
  - пятница/суббота 21:30;
  - от 990 ₽;
- «Подыскиваю жену, недорого!»:
  - 20 сентября 19:00;
  - от 1500 ₽;
- «Серия культурных завтраков…»:
  - 19/20 сентября;
  - 3500 ₽;
- отдельный edge-case:
  - Stand Up Afisha формально имеет бесплатный вход,
  - но обязательный депозит на еду — 700 ₽.

Вывод desk-проверки:
**каталог выглядит достаточно широким для P0 Москвы**, но это ещё не API receipt.

---

# 4. Frozen 12-task matrix

## DG-01 — Сегодня, обучение, вечер, ≤ 1000 ₽
**Запрос:** Москва, 17.09, после 19:00, обучение/саморазвитие, до 1000 ₽.

Desk candidate:
- «Секретные актёрские техники…»
- 20:00
- 800 ₽

**Desk:** PASS-CANDIDATE  
**Runtime:** required

---

## DG-02 — Сегодня, театр, вечер, ≤ 2000 ₽
**Запрос:** Москва, 17.09, после 18:00, театр, до 2000 ₽.

Desk candidate:
- «Слишком женатый таксист»
- 19:00
- от 1500 ₽

**Desk:** PASS-CANDIDATE  
**Runtime:** required

---

## DG-03 — Сегодня, развлечение, вечер, ≤ 2000 ₽
**Запрос:** Москва, 17.09, 18:00–22:00, entertainment, до 2000 ₽.

Desk candidate:
- Good Night Show
- рабочий диапазон до 22:00
- 1800 ₽

**Desk:** PASS-CANDIDATE  
**Runtime:** required exact occurrence check

---

## DG-04 — Суббота, обучение/творчество, ≤ 1000 ₽
**Запрос:** Москва, 19.09, 15:00–19:00, обучение/творчество, до 1000 ₽.

Desk candidate:
- «Секретные актёрские техники…»
- 17:00
- 800 ₽

**Desk:** PASS-CANDIDATE  
**Runtime:** required

---

## DG-05 — Суббота, театр, после 18:00, ≤ 2500 ₽
Desk candidate:
- «Мужчина на все руки»
- 19:00
- от 2000 ₽

**Desk:** PASS-CANDIDATE  
**Runtime:** required

---

## DG-06 — Суббота, поздний вечер, ≤ 2000 ₽
**Запрос:** Москва, 19.09, старт после 21:00, развлечение/стендап, до 2000 ₽.

Desk candidate:
- «Стендап в темноте»
- 21:30
- от 990 ₽

Дополнительный более поздний кандидат:
- «Ночной цирк»
- 23:30
- от 1700 ₽

**Desk:** PASS-CANDIDATE  
**Runtime:** required

---

## DG-07 — Суббота, бесплатное дневное событие
**Запрос:** Москва, 19.09, 11:00–20:00, free.

Desk candidate:
- фестиваль CERAMANIA
- 19–20 сентября 12:00–20:00
- находится в выдаче бесплатных событий

**Desk:** PASS-CANDIDATE  
**Runtime:** verify `is_free` + raw `price`

---

## DG-08 — Воскресенье, театр, после 18:00, ≤ 2000 ₽
Desk candidate:
- «Подыскиваю жену, недорого!»
- 20.09 19:00
- от 1500 ₽

**Desk:** PASS-CANDIDATE  
**Runtime:** required

---

## DG-09 — Условная цена: «бесплатно» != ноль расходов
**Запрос:** 20.09, стендап, 20:00, бюджет **0 ₽ total spend**.

Live edge case:
- Stand Up Afisha;
- вход бесплатный;
- **депозит на еду 700 ₽**.

### Expected Povod behavior
**NO PASS** для hard constraint `total_spend = 0`.

Нельзя:
- преобразовать `is_free=true` в `price=0`;
- показать reason `Бесплатно` без условия.

Нужно показать:
> Вход бесплатный · обязательный депозит 700 ₽

**Desk:** EDGE CONFIRMED  
**Runtime behavior:** required

---

## DG-10 — Неизвестное время окончания
**Запрос:** occurrence с известным start, но `end_time = null`.

Документация KudaGo явно допускает даты без `end_date/end_time`.

### Expected
- `starts_at` известен;
- `ends_at = UNKNOWN`;
- не выдумывать duration;
- если пользователь требует «закончится до 22:00», такой occurrence НЕ получает confirmed PASS.

**Desk:** API SEMANTICS CONFIRMED  
**Runtime current-record probe:** required

---

## DG-11 — Missing place/coordinates + cancellation/staleness safety
KudaGo API допускает `place = null` в event data.

Одновременно в документированном списке полей Events нет надёжного отдельного `cancelled` status.

### Expected
Если place/coords отсутствуют:
- detail остаётся usable;
- map CTA скрывается/disabled;
- `location_known=false`;
- не генерировать fake coordinates.

Если provider не даёт reliable cancellation:
- не изобретать `scheduled=true` как проверенный факт;
- использовать короткий TTL / fetched_at;
- всегда давать source;
- stale/cancellation gate требует отдельной проверки первоисточника или другого сигнала.

**Desk:** PROVIDER LIMITATION FOUND  
**Runtime:** required

---

## DG-12 — Честный no-result
**Запрос:** намеренно узкое окно, например:
Москва, конкретный день, театр, бесплатно, старт после 23:30.

### Expected
Если подходящего occurrence нет:
- `0 results`;
- никаких автоматически ослабленных фильтров;
- никаких похожих платных событий в основном result-set;
- UI предлагает пользователю самому изменить условие.

**Desk:** TEST DEFINED  
**Runtime:** required

---

# 5. Предварительный результат 12-task gate

## Desk result
Есть **как минимум 8 сильных live candidate scenarios** по текущей публичной афише.

Это хороший сигнал, что Москва + KudaGo достойны runtime-проверки.

## Formal result
**NOT PASSED YET.**

Причины:
1. в текущем окружении не сохранены реальные v1.4 API responses именно для 12 frozen задач;
2. не подтверждены current records для null end / null coords;
3. cancellation semantics не закрыта;
4. legal/attribution gate имеет открытые вопросы.

Нельзя записывать `8/12 PASS` до сохранённого runtime evidence.

---

# 6. Provider → Povod mapping

## Event
KudaGo:
- `id`
- `title`
- `description`
- `categories`
- `age_restriction`
- `images`
- `participants`

Povod:
- `Event.source_event_id`
- `Event.title`
- `Event.description`
- normalized categories
- age restriction metadata
- image provenance
- followable participants where usable

---

## Occurrence

KudaGo:
- `dates[]`

Povod:
**explode each usable date/session into Occurrence**

Fields:
- event_id
- source_occurrence_key
- starts_at
- ends_at/null
- timezone
- venue_id/null
- source_id
- source_url
- fetched_at

### Important
KudaGo `dates[]` may contain:
- exact start/end;
- null end;
- schedules;
- ranges/recurrence flags.

Do not assume one `dates[]` item always equals one simple one-off session.

For P0:
- exact explicit dates → normalize directly;
- recurring schedule → expand deterministically only if rules are understood/tested;
- ambiguous schedule → UNKNOWN / exclude from confirmed-fit logic.

---

# 7. Price contract PATCH

Current Povod model
`exact | from | range | free | unknown`

is insufficient.

## Required v1.1
Add:
- `conditional`

And always preserve:
- `raw_price_text`

Recommended:

```text
price_kind:
  exact
  from
  range
  free
  conditional
  unknown

amount_min
amount_max
currency
mandatory_extra_min
raw_price_text
is_free_claimed_by_source
parsed_confidence
```

Example:
`вход бесплатный, депозит на еду — 700 рублей`

normalizes to:
- `price_kind = conditional`
- `amount_min = 0`
- `mandatory_extra_min = 700`
- `raw_price_text = ...`
- NOT valid for total budget 0.

This is now a required P0 data-safety patch.

---

# 8. Search / filters strategy

KudaGo provider-side filters can safely be used for:
- city;
- category;
- broad actual date window;
- is_free discovery;
- geo radius;
- search query.

Povod backend should perform final hard checks after normalization:
- exact occurrence time;
- user time window;
- normalized budget;
- conditional fees;
- UNKNOWN;
- stale state.

**Do not treat provider-side filtering alone as final suitability.**

---

# 9. Source / attribution

KudaGo terms require a direct link to the concrete source material when their data is used.

Therefore every Povod event originating from KudaGo must retain:
- source provider;
- concrete `site_url`;
- visible source label;
- open-source action.

## Open legal question
The license wording requires links open for indexing and also restricts use of certain advertising materials/tokens.

A MAX mini-app is not an ordinary public indexable webpage, and the documented Events field set does not obviously expose a reliable advertising-material flag.

### Therefore
KudaGo = **technical candidate**, not yet legal-approved provider.

Before public submission/pilot:
- clarify whether attribution inside a closed MAX mini-app satisfies the licence;
- clarify/filter advertising materials safely;
- store licence/terms snapshot date.

Until then:
**do not say “provider legal gate passed”.**

---

# 10. Image/content policy

For lowest risk P0:
- prefer factual metadata;
- title;
- date/time;
- place;
- price raw text;
- category;
- source link.

Images/descriptions should be treated separately:
- retain their provenance;
- do not assume every source image can be re-used independently;
- avoid copying long body text.

A polished P0 can work with provider image only after licence review, or with minimal/no-image fallback.

---

# 11. Runtime probe — exact evidence required

For each DG-01…DG-12 save:

```text
task_id
queried_at_utc
provider
request_url_or_parameters
http_status
response_hash
source_event_id
source_url
raw_dates
raw_place
raw_price
raw_is_free
normalized_occurrence
normalized_price
hard_constraints
result = PASS / NO_PASS / UNKNOWN / ERROR
verifier
notes
```

## Also save
- first raw response sample;
- one null/UNKNOWN sample;
- one empty response;
- one malformed/source-error simulation;
- provider latency;
- pagination behavior.

---

# 12. Go / No-Go rule

## GO Москва
Only when:
- ≥8/12 tasks have an independently verified suitable occurrence;
- critical constraints have **zero false PASS**;
- edge cases are handled honestly;
- attribution/legal gate accepted;
- provider runtime stable enough for demo.

## NO-GO / fallback
If:
- <8/12;
- price parsing creates false PASS;
- cancellation/staleness risk is unacceptable;
- licence cannot be satisfied inside MAX;
- runtime API is unstable.

Then:
1. do not manufacture cards;
2. test another provider/combination;
3. or keep Moscow but reduce claims/categories.

---

# 13. Current decision

## KudaGo
**TECHNICAL FIT: HIGH**

## Moscow live-catalog evidence
**PROMISING**

## Runtime API gate
**OPEN**

## Legal/attribution gate
**OPEN**

## Overall provider status
**CANDIDATE — DO NOT MARK APPROVED YET**

---

# 14. Immediate next step

No more provider research is needed before the runtime probe.

Next engineering task:
1. request KudaGo v1.4 for the frozen matrix;
2. persist raw responses;
3. normalize Event → Occurrence;
4. implement conservative Price parser v1;
5. run DG-01…DG-12;
6. produce `MOSCOW_DATA_GATE_RECEIPT.json`;
7. only then set:
   - `City.status = beta/active`
   - or reject/replace the provider.
