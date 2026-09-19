# T104 — Manual/legal gate OPEN

Baseline: `5e4973f24fb74489387b3c29313cfcd1e8401ca7`. Branch: `codex/t104-kudago-gate`. API: **v1.4**. Probe UTC: `2026-09-19T07:32:05.613939+00:00` — `2026-09-19T07:43:09.112800+00:00`.

Raw-response SHA-256 and per-request provenance: [RECEIPT_INDEX.json](RECEIPT_INDEX.json), index file SHA-256 `8492a25ff24798859b87a66374875550b6fa1317c86aadedc7fc8ceacdd8aae0`. This metadata applies to linked logs and derived evidence.

**Для ответственного человека и письменного ответа KudaGo/правообладателя. Это перечень вопросов, не юридическое заключение. Сообщения не отправлялись.**

Описываемый use case: бесплатный solo-first MAX Mini App «Повод», Москва, показ фактических Events/Occurrences, фильтры, Save, точная ссылка «Источник: KudaGo», собственные визуальные материалы. Коммерческая монетизация не входит в frozen P0. Официальный актуальный документ: [KudaGo API / licence](https://docs.kudago.com/api/), дата/hash в receipts/official_docs.json. Разъяснения нужны по этому конкретному use case.

1. **Attribution внутри MAX Mini App.** Достаточен ли видимый кликабельный текст «Источник: KudaGo» с точным event site_url на карточке/detail внутри MAX WebView? Какие обязательные места, текст и способ открытия ссылки нужны?
2. **Open for indexing.** Как исполнить требование открытых для индексации ссылок, если MAX Mini App сам не индексируется? Нужна ли публичная индексируемая страница «Повода», и может ли она закрыть требование для закрытого WebView?
3. **Нормализованное durable storage.** Разрешено ли сохранять provider/event ID, title, factual dates, place/address/coordinates, raw/normalized price, category, exact source URL, fetched_at и response hashes в PostgreSQL? Какие поля/условия исключить?
4. **Cache.** Разрешены ли серверный, browser, Redis и CDN cache, с какими TTL, refresh и purge условиями? Нужно ли разделить временный response cache и durable normalized records?
5. **PriceSnapshot/history.** Можно ли хранить предыдущую цену, raw_price_text, условия депозита и дату наблюдения после изменения upstream, включая связку с Save? Допустимы ли derived price states?
6. **Retention/purge.** Каковы сроки хранения после окончания/удаления события, прекращения API доступа или отзыва лицензии? Что требуется для backups, logs, hashes и пользовательских сохранений?
7. **Images.** Разрешены ли display, proxy, resize, cache/CDN API images; какая attribution требуется? Пока ответа нет, provider images не используются и не загружаются.
8. **Descriptions/body text.** Разрешено ли показывать, хранить, сокращать или перерабатывать description/body/tagline? Какие лимиты и ссылки обязательны? До clearance не включаем.
9. **Third-party images/content.** Покрывает ли разрешение сторонние материалы и авторов, или нужны отдельные права и source credits? Как определить непокрытые материалы машинно?
10. **Advertising materials/tokens.** Может ли Events API выдавать рекламу с чужими токенами; какой документированный надёжный признак/список исключений использовать до показа? Как обрабатывать factual-only projection рекламной записи?
11. **Commercial use/monetization.** Допустим ли описанный бесплатный app? Какие отдельные условия применимы к будущей рекламе, спонсорству, affiliate links или продаже сервиса? P0 монетизацию не предполагает.
12. **Logo/trademark.** Разрешена ли текстовая source attribution «KudaGo» без логотипа; нужно ли отдельное согласие на logo/trademark? Бренд продукта остаётся «Повод», команды — The Boys.
13. **Cancellation/update signal.** Есть ли документированные modified_at, cancellation status, stable session ID, deletion/change feed, уведомления или обязательная политика повторной проверки? Что означает исчезновение записи/404 и как корректно сигнализировать пользователю?
14. **Fair-use/rate limits.** Каковы разрешённые частота, burst/concurrency, polling/page-size объём, retry-after/backoff? Нужны ли регистрация/согласование для production; есть ли официальный канал изменения API/условий?

Для CLEARED требуется сохранить письменный ответ/решение уполномоченного владельца юридического gate с датой, конкретным use case, полями, display/cache/history/purge/ad условиями и сроком review. Отсутствие ответа не является разрешением. Codex не переводит OPEN в CLEARED. Даже минимальный dataset ниже не имеет автоматического legal approval.
