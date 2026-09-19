# ПОВОД — UI TRANSLATION v2
**Дата:** 17.09.2026  
**Основа:** POVOD_PRODUCT_SPEC_V1 + visual direction Poster Pop

---

# 1. UI goal

Перевести выбранную яркую айдентику в интерфейс, который:
- реально можно сверстать;
- выглядит как consumer event product;
- не превращается в постер на каждом экране;
- сохраняет solo-first;
- масштабируется на MAX mobile + web.

---

# 2. Navigation

## Mobile bottom bar
1. **Для тебя**
2. **Поиск**
3. **Сохранённые**

Профиль — avatar action в header.

## Active color
- active nav: `#C63B2B`
- inactive: `#6F6D68`

Social / shared-plan actions:
- `#6C54FF`

---

# 3. Global layout

## Base width
390 px

## Side padding
16 px

## Vertical grid
4 px base

## Header
56–64 px functional header.
Brand hero может быть выше только на onboarding/detail.

## Card radius
20 px

## Button
height 52 px
radius 16 px

## Chip
height 36–40 px
radius 999 px

## Tap targets
минимум 44×44 px

---

# 4. S00 — MAX launch

## Composition
Top:
- MAX mark / platform context, нейтрально.

Middle:
- compact wordmark «ПОВОД»
- headline:
  **Город ближе, когда есть Повод**
- short copy:
  `События под твои интересы, время и бюджет.`

Feature rows:
- `Персональная афиша`
- `Сохраняй и подписывайся`
- `Зови друзей, когда захочешь`

Bottom:
Primary red CTA:
**Продолжить**

Footer:
`Вход через MAX · без отдельного пароля`

## Brand intensity
60%.

---

# 5. S01 — interests

## Header
`Что тебе интересно?`

Sub:
`Выбери несколько тем — потом всё можно изменить.`

## Interest grid
2 columns, image-backed cards:
- Концерты
- Выставки
- Театр
- Спорт
- Стендап
- Лекции
- Фестивали
- Город

Selected state:
- violet outline/background accent
- check

## Optional preference strip
`Обычно до 2500 ₽`
`После 18:00`

Primary:
**Готово**

Secondary:
`Пропустить`

## Rule
Не заставлять выбрать минимум 3.

---

# 6. S02 — «Для тебя»

## Header
Left:
compact `ПОВОД`

Below:
city selector `Москва ▾`

Right:
avatar

## Context chips
- Сегодня
- Вечером
- До 2500 ₽
- Рядом

## Section title
**Подходит тебе**

Optional mono helper:
`12 поводов · обновлено недавно`

## EventCard v1

### Image
16:10
top-left category chip
top-right save icon

### Body
Title: max 2 lines

Metadata:
`24 МАЯ · 20:00`
in IBM Plex Mono

Venue:
`VK Stadium · Москва`

Price:
`от 1 800 ₽`
or
`Цена не указана`

Reasons:
small chips:
`Любимый жанр`
`После 19:00`
`В бюджете`

Source line:
`Источник: …`

No giant CTA inside each card.

## Section alternatives
- `Из твоих подписок`
- `Сегодня рядом`

Only when non-empty.

---

# 7. S03 — Search

## Header
Search input:
`Событие, артист или место`

## Quick filters
horizontal scroll:
- Сегодня
- Завтра
- Выходные
- Бесплатно
- До 1500 ₽

## Category row
- Все
- Музыка
- Искусство
- Театр
- Спорт
- Ещё

## Advanced filters sheet
Sections:
### Когда
date range + start-time window

### Бюджет
slider/input + free toggle

### Где
city / area
optional radius

### Категории
multi-select

Bottom sticky:
**Показать N событий**
`Сбросить`

## Empty
`По этим условиям ничего не нашли.`

Suggested actions:
- `Увеличить бюджет`
- `Изменить время`
- `Снять категорию`

Ничего не менять автоматически.

---

# 8. S04 — Event detail

## Hero
Large image 16:9 or 4:3.

Overlay:
category chip.

Below:
large title.

## Main fact block
Mono row:
`ПТ · 24 МАЯ · 20:00`

Venue:
`VK Stadium`

Address:
`Ленинградский пр-т, 80`

Price:
`от 1 800 ₽`

If unknown:
warning component:
**Цена не указана**
`Проверь условия у источника.`

## Why this
Title:
**Почему тебе**

Rows:
- `Любимый жанр`
- `Начинается после 19:00`
- `В пределах бюджета`

## Source block
`Источник`
provider name
optional checked-at metadata

## Actions
Primary red:
**Открыть источник**

Secondary:
`На карте`

Tertiary icon/action:
`Сохранить`

Social violet outline:
**Позвать друзей**

## Brand intensity
35–45%.
Можно sliced title accent / halftone edge, но только один акцент.

---

# 9. S05 — Map

## Full-screen map
No poster texture.

Top floating:
- back
- search area
- filters

Markers:
- normal: black / neutral
- selected: red
- followed-entity event optional violet dot/ring

## Bottom sheet
Image thumbnail
Title
Time
Venue
Price
Reasons 1–2
`Открыть`

Toggle:
`Карта | Список`

---

# 10. S06 — Saved

## Header
**Сохранённые**

Segment:
- События
- Подписки

### Events list
compact cards.

Possible badges:
- `Время изменилось`
- `Цена изменилась`
- `Завершено`
- `Источник недоступен`

### Empty
**Сохрани Повод на потом**
`Нажми ♡ на событии, чтобы быстро к нему вернуться.`

CTA:
`Найти события`

---

# 11. S07 — «Мой Повод»

## Header
Avatar
Name
MAX username if available

City:
`Москва`

## Block 1 — Интересы
chips + edit

## Block 2 — Подписки
summary:
`12 подписок`
preview avatars/logos/names

CTA:
`Управлять`

## Block 3 — Обычно подходит
- `до 2500 ₽`
- `после 18:00`
- `до 45 мин`
- `Москва`

## Block 4 — Умные поводы
toggle:
`Сообщать, когда появляется подходящее событие`

Small copy:
`Только по твоим подпискам и настройкам.`

## Block 5 — Settings
privacy/settings
about

---

# 12. S08 — Follow entity sheet

Triggered from:
artist/topic on event detail.

## Example
Avatar/image

**Сироткин**

`Получать новые события в твоём городе`

Primary violet:
**Подписаться**

Optional toggle:
`Умные поводы по этой подписке`

After:
`Вы подписаны`

---

# 13. S09 — Smart Povod in MAX

This is not a mini-app screen first; this is a bot/message surface.

## Message visual hierarchy
Brand mini-icon.

**Есть Повод 🔴**

`Сироткин выступает в пятницу в 20:00.`

Mono metadata:
`1900 ₽ · Москва`

Reason:
`Подходит под твои условия: после 18:00 · до 2500 ₽`

CTA:
**Посмотреть**

Small:
`Уведомления можно изменить в «Мой Повод».`

---

# 14. S10 — Invite friends

From event detail.

## Sheet
**Позвать друзей?**

Event compact snapshot:
title
date/time
venue
price / UNKNOWN
source

Copy:
`Друзья увидят только выбранное событие и его текущие условия.`

Primary violet:
**Создать план**

Secondary:
`Поделиться без плана`

No raw query/history.

---

# 15. S11 — Shared plan

## Header
Event title
current revision indicator

## Conditions block
- occurrence
- venue
- price
- source
- warnings

## Participants
Rows:
avatar/name

Preference:
- Подходит
- Может быть
- Не могу

Explicit commitment:
separate button:
**Подтверждаю текущие условия**

## Material change banner
Violet/red warning:
**Условия изменились**
`Время: 20:00 → 21:00`

CTA:
**Проверить и подтвердить заново**

---

# 16. Component inventory

## Branded
- PovodWordmarkCompact
- PovodHero
- HalftoneAccent
- SliceAccent

## Product
- EventCard
- EventCompactCard
- OccurrenceMeta
- PriceLabel
- UnknownWarning
- MatchReasonChip
- SourceProvenance
- CitySelector
- FilterChip
- InterestCard
- FollowButton
- SmartPovodToggle
- SavedStateBadge
- PlanSnapshot
- CommitmentControl

## Platform/basic
- Button
- Input
- Sheet
- Spinner
- Avatar
- Tabs
- Toast

---

# 17. Copy rules

## Tone
Коротко.
Живо.
Без рекламного пафоса в служебных состояниях.

## Good
- `Цена не указана`
- `Открыть источник`
- `Подходит по времени`
- `Позвать друзей`
- `Условия изменились`

## Avoid
- `Идеально для тебя`
- `100% подходит`
- `Купить билет`, если это external source
- `Лучшее событие`
- `Все места доступны`

---

# 18. Content density

## Feed
1 expressive visual + compact factual body.

## Detail
most information-rich screen.

## Map
minimum decorative content.

## Profile
list-first, not poster.

## Shared plan
clarity > brand.

---

# 19. Desktop / MAX web

## Feed/detail
Centered 720 px max content.

## Search
Optional 2-column:
left filters / right results.

## Map
Can expand to 960–1200 px.

## Profile
620–720 px.

Do not stretch mobile card to browser width.

---

# 20. Visual QA checklist

Each screen must pass:
- one clear primary action;
- no more than one strong Poster Pop decorative zone;
- title readable at 360 px;
- no metadata below 12 px;
- source/UNKNOWN discoverable without hidden modal;
- active filters visible;
- social action not visually stronger than primary solo action;
- red and violet semantics consistent;
- no accidental The Boys branding inside product UI.

---

# 21. Next design artifacts

1. Final compact product wordmark.
2. App icon.
3. 390 px high-fidelity master for S01/S02/S04/S07/S11.
4. Adapt to remaining screens.
5. 360/430 responsive pass.
6. MAX web pass.
7. Component/token handoff.
