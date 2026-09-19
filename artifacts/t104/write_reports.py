"""Build human-readable T104 evidence from immutable receipts, no network."""
import json,hashlib,statistics
from pathlib import Path
from datetime import datetime,timezone
from probe import OUT,BASELINE,meta,save
read=lambda n:json.loads((OUT/n).read_text(encoding='utf-8'))
receipts={p.name:read('receipts/'+p.name) for p in sorted((OUT/'receipts').glob('*.json'))}
index={**meta(),'receipts':{n:{'file_sha256':hashlib.sha256((OUT/'receipts'/n).read_bytes()).hexdigest(),'response_hash':r['response_hash'],'queried_at_utc':r['queried_at_utc'],'http_status':r['http_status'],'request_url':r['request_url']} for n,r in receipts.items()}}
save('RECEIPT_INDEX.json',index)
idxhash=hashlib.sha256((OUT/'RECEIPT_INDEX.json').read_bytes()).hexdigest()
start=min(r['queried_at_utc'] for r in receipts.values());end=max(r['queried_at_utc'] for r in receipts.values())
header=f'Baseline: `{BASELINE}`. Branch: `codex/t104-kudago-gate`. API: **v1.4**. Probe UTC: `{start}` — `{end}`.\n\nRaw-response SHA-256 and per-request provenance: [RECEIPT_INDEX.json](RECEIPT_INDEX.json), index file SHA-256 `{idxhash}`. This metadata applies to linked logs and derived evidence.\n\n'
def write(name,title,body): (OUT/name).write_text('# '+title+'\n\n'+header+body.strip()+'\n',encoding='utf-8',newline='\n')
gate=read('MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json');replay=read('NORMALIZER_REPLAY.json');prices=read('PRICE_SAMPLES.json');api=[r for r in receipts.values() if '/public-api/v1.4/' in r['request_url']]
unique={}
for n,r in receipts.items():
 if n.startswith('DG-'):
  for e in r.get('payload',{}).get('results',[]):unique[e['id']]=e
stats={'unique_events':len(unique),'null_place':sum(e.get('place') is None for e in unique.values()),'missing_venue_coordinates':sum(not isinstance((e.get('place') or {}).get('coords'),dict) or (e.get('place') or {}).get('coords',{}).get('lat') is None or (e.get('place') or {}).get('coords',{}).get('lon') is None for e in unique.values()),'empty_price':sum(not e.get('price') for e in unique.values()),'missing_source_url':sum(not e.get('site_url') for e in unique.values()),'event_with_null_end_time':sum(any(d.get('end_time') is None for d in e.get('dates',[])) for e in unique.values()),'event_with_schedule':sum(any(d.get('schedules') for d in e.get('dates',[])) for e in unique.values()),'dates_over_50':sum(len(e.get('dates',[]))>50 for e in unique.values())}
save('OPERATIONAL_STATS.json',{**meta(),'response_hashes':{n:r['response_hash'] for n,r in receipts.items()},'request_count':len(receipts),'api_request_count':len(api),'http_status_counts':{str(s):sum(r['http_status']==s for r in api) for s in [200,400,404,429]},'latency_ms':{'min':min(r['latency_ms'] for r in api),'median':statistics.median(r['latency_ms'] for r in api),'max':max(r['latency_ms'] for r in api)},'responses_over_10_seconds':sum(r['latency_ms']>10000 for r in api),'responses_over_256_KiB':sum(r.get('response_bytes',0)>262144 for r in api),'largest_response_bytes':max(r.get('response_bytes',0) for r in api),'nonrepresentative_frozen_and_bounded_sample':stats})
notes={
'DG-01':'17 сентября уже в прошлом. API сохраняет 20:00 и 800 ₽; это историческая, а не будущая пригодность.',
'DG-02':'17 сентября уже в прошлом; «от 1500 ₽» не доказывает итог ≤2000 ₽.',
'DG-03':'17 сентября уже в прошлом; Good Night Show — диапазон/режим работы, не подтверждённый сеанс 18–22.',
'DG-04':'19 сентября 18:00 (desk было 17:00), 800 ₽ на уровне Event. Итог с обязательными доплатами и привязка цены к сеансу UNKNOWN.',
'DG-05':'19 сентября 19:00; от 2000 ₽ — только нижняя граница, бюджет ≤2500 не подтверждён.',
'DG-06':'Старт 21:30 указан внутри recurring schedule; «от 990 ₽». Точный сеанс не изобретён.',
'DG-07':'CERAMANIA: многодневный диапазон 19–20 сентября, is_free=true, пустой price. Дневной сеанс и total spend 0 не доказаны.',
'DG-08':'20 сентября 19:00; от 1500 ₽ не доказывает итог ≤2000 ₽.',
'DG-09':'Бесплатный вход + депозит 700 ₽: experimental conditional, бюджет 0 → NO_PASS. Baseline: TEXT/UNKNOWN, не required NO_PASS.',
'DG-10':'Safety PASS: живой null end → ends_at UNKNOWN, hard end-before UNKNOWN. Не пригодный occurrence.',
'DG-11':'Safety PASS: живой place=null → coordinates=null, status UNKNOWN. UI/detail availability не тестировались.',
'DG-12':'Safety PASS: API count=0, next=null, results=[]; параметры не ослаблялись. Не пригодный occurrence.'}
table='| Task | Result | Suitable counted | Source ID | Observation |\n|---|---|---:|---|---|\n'+'\n'.join(f"| {t['task_id']} | {t['result']} | {'yes' if t['suitable_occurrence_verified'] else 'no'} | {t['source_event_id'] or 'none (empty)'} | {notes[t['task_id']]} |" for t in gate['tasks'])
write('TASK_MATRIX.md','T104 — Frozen task matrix',table+'''

Все 12 финальных статусов используют только PASS / NO_PASS / UNKNOWN / ERROR. PASS у DG-10–12 означает успешную защитную проверку; это отдельно от suitability. Итого: PASS 3, NO_PASS 4, UNKNOWN 5, ERROR 0. Verified suitable tasks: **0**, порог **8** не достигнут.

Даты 17/19/20 сентября не сдвигались. DG-01–03 исполнены как frozen исторические API-запросы, но в текущем live gate не могут считаться будущим результатом. Для нового будущего окна потребуется явно согласованная новая frozen matrix, не подмена T104.

Бюджет трактуется как подтверждаемая стоимость с обязательными доплатами согласно Data Safety Patch и baseline `eligibility.ts`, а не как сравнение только advertised minimum. EVENT-level exact price может быть показана как source claim, но не становится OCCURRENCE all-in price.

Полные выбранные raw fields, normalized Event/Occurrence/price, constraints, URL, status, latency, headers и raw response SHA-256 находятся в MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json; все кандидаты и даты проверенных окон — CANDIDATE_AUDIT.json. Выборка DG-10/11: 100 из 310, ограниченная, не exhaustive. Остальные frozen запросы завершены целиком, каждый уместился в одну страницу.
''')
write('DATA_GATE_REPORT.md','T104 — KudaGo runtime/data decision','''**DATA_RUNTIME_GATE = FAIL. LEGAL_MANUAL_GATE = OPEN. Overall: CONDITIONAL_PRIMARY / NOT APPROVED. Moscow activation: NO.**

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
''')
price_table='| Kind | Actual source ID | Raw price | Scope |\n|---|---|---|---|\n'+'\n'.join(f"| {k} | {v['source_event_id']} | {v['raw_price'] or '(empty; is_free=true)'} | EVENT |" for k,v in prices['samples'].items())
write('PRICE_EDGE_CASES.md','T104 — Price observations',price_table+'''

Это классификация source claims в **T104 experiment**, не изменение production enum/schema. `raw_price_text`, raw `is_free`, source URL, fetched_at и response hash сохранены в PRICE_SAMPLES.json и receipts. Отдельная `free` запись 198938 означает claimed free base, не доказанный total=0. `unknown` пример — сложная фраза вне узкой грамматики; неизвестность парсера не означает отсутствия цены у источника.

190707: «вход бесплатный, депозит на еду — 700 рублей» + is_free=true. Эксперимент: conditional, amount_min=0 (entry claim), mandatory_extra_min=700, raw preserved; total budget 0 → NO_PASS. Текущий `kudagoQuote` безопасно оставляет TEXT + FREE_LABEL_CONFLICT, payable total UNKNOWN, но не извлекает mandatory_extra_min и не выдаёт требуемый NO_PASS. Full record также превышает лимит dates. Это воспроизводимый gap для T105, не закрытый implementation fix.

Набора exact/from/range/free/conditional/unknown достаточно как набора состояний для наблюдённого sample. Сам enum не решает basis, mandatory fees, eligibility, confidence или EVENT→OCCURRENCE applicability. Нужны независимые UNKNOWN для этих полей. Нет API quote/session-price ID. Ни один observation не даёт оснований маркировать scope OCCURRENCE. `from` — lower bound, range по обеим границам; arbitrary numbers/discounts не парсятся как цена.

Текущий normalizer распознаёт узкую грамматику «руб.»/«₽», но фактические «800 рублей» остаются TEXT. T104 grammar experiment распознаёт этот source form, не обещает all-in/availability. No price migration, snapshot implementation or retention approval performed.
''')
write('OCCURRENCE_OBSERVATIONS.md','T104 — Occurrence and T105 inputs','''**У Event есть source event ID; стабильного occurrence/session ID в dates[] не обнаружено.** В default payload date содержит start/end; expand=dates добавляет start_date/start_time/end_date/end_time, recurrence/range flags, schedules и use_place_schedule. Default field-name receipt: receipts/detail_default_fields.json. Не переносить ID специализированных movie-showings на generic Events.

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
''')
ops=read('OPERATIONAL_STATS.json')
write('API_OPERATIONAL_OBSERVATIONS.md','T104 — API operations and T107 inputs',f'''**Observed sample only:** {len(api)} API requests; latency min {ops['latency_ms']['min']} ms, median {ops['latency_ms']['median']} ms, max {ops['latency_ms']['max']} ms. No uptime/SLA/global-rate/P95 claim. Full metrics: OPERATIONAL_STATS.json.

Pagination uses page/page_size and count/next/previous/results. Requested page_size=2 gave IDs 73961,162669 then 162670,162671; page1 re-fetch byte hash identical. Provider page_size maximum 100 is documented; runtime requests at 100 returned up to 100. All ten frozen query sets DG01–09/DG12 fit in one page; bounded DG10/11 scan intentionally stopped at 100/310. `next != null` means incomplete. `next=null` plus received/count check provides query-exhaustion evidence only, never snapshot consistency. Re-fetch consistency in this short sample does not guarantee stable ordering across updates. Do not tombstone on partial traversal, quarantine, HTTP errors or changed page counts.

actual_since/actual_until: focused event 210582 returned inside 2026-09-19 18:00–18:01, although its date is a startless interval, and was absent on October 1 beyond its September end. Therefore runtime behavior includes overlapping/current spans, not solely exact starts after the boundary. Lists retain historical dates[]. Compare receipts/actual_overlap.json and actual_after_end.json. Documentation describes event-date filtering; it supplies no update/change-cursor guarantee. `publication_date` is not an update timestamp. Never use actual_since as incremental modified-since cursor. Boundary inclusivity, server-wide semantics and mutation races not exhaustively tested.

HTTP errors: one invalid category → 400 JSON detail; one event ID 0 lookup → 404 JSON detail. Bodies preserved in sanitized receipts. These are deliberate read-only shape probes, not observed real event cancellation. No natural timeout, 429, 5xx or transport failure occurred. Timeout=25s in collector, no retry storm. No aggressive load / timeout injection against provider. Synthetic malformed input, stale observation and incomplete-page behavior are explicitly separate offline checks.

Responses used application/json; charset=UTF-8, server ddos-guard, Date, Content-Length and Vary: Accept-Language, Cookie. No API ETag, Last-Modified, Cache-Control, Expires, Age, Retry-After or rate-limit header observed in this sample. Their absence is not a guarantee or caching permission. Full available relevant headers recorded; cookies deliberately not retained.

{ops['responses_over_10_seconds']} responses exceeded baseline 10s transport deadline; {ops['responses_over_256_KiB']} exceeded 262144-byte cap; largest {ops['largest_response_bytes']} bytes. `modules/search/core/provider.ts` sets these bounds. T104 probe intentionally uses a separate 25s collector. These are T107 compatibility inputs, not evidence that production transport passed or a reason to silently increase limits.

Unique frozen/bounded sample (nonrandom, not Moscow population rates): {json.dumps(stats,ensure_ascii=False)}. Counts for null-end/schedules mean at least one such date per Event and include historical dates, not exclusively future sessions.

Secondary source cross-check: current HTML JSON-LD for 202293 gives first series start 2023-01-17 and last date 2026-09-26; CERAMANIA gives 2024-09-21 through 2026-09-20. These are aggregate surfaces, unsuitable as a current exact session. Both contain source-level schema.org EventScheduled. It is NOT promoted to a reliable occurrence cancellation signal. API receipts + fetched_at are runtime evidence priority; source link stays visible. Raw HTML/images/body text were discarded after hashing and extracting only short factual date/status values.

Default Events field names (live receipt) contain no cancelled/updated_at/occurrence ID; expanded samples also provide no per-date ID. No reliable cancellation/update notification mechanism established. Short repeated detail unchanged; no actual update/delete transition witnessed. A 404 alone must not invent cancellation.

**Inputs T107:** keep provider/city disabled until both gates close; use reviewed factual minimal fields and exact source attribution; tune page size/timeouts/byte bounds from these measurements with bounded retries and retained raw hashes; normalize each supported date under T105's approved policy; reject partial-delete inference; reconcile full observations; choose reviewed freshness TTL and recheck before demo; keep source-unavailable distinct from empty. Do not cache provider images/body; do not implement sync now. T107 is not started.
''')
write('KUDAGO_MANUAL_QUESTIONS.md','T104 — Manual/legal gate OPEN','''**Для ответственного человека и письменного ответа KudaGo/правообладателя. Это перечень вопросов, не юридическое заключение. Сообщения не отправлялись.**

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
''')
write('KUDAGO_MINIMAL_SAFE_DATASET.md','T104 — Conservative factual P0 proposal','''**Предлагаемый минимальный набор для согласования, не подтверждение права использования. LEGAL_MANUAL_GATE остаётся OPEN.**

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
''')
write('README.md','T104 — Evidence usage','''Это isolated runtime/data ticket. Изменения только artifacts/t104 и docs/handoffs/T104_KUDAGO_RUNTIME_GATE.md. Production code/schema/dependencies/imported inputs не изменены; T103/T105/T106/T107/main не затронуты; push не выполнялся.

Evidence metadata наследуется из шапок отчётов, RECEIPT_INDEX.json и COMMAND_RESULTS.json. API receipt response_hash — SHA-256 исходных HTTP entity bytes до JSON parsing; file_sha256 — hash sanitized receipt file. Не смешивать эти хэши. Full raw bytes не хранятся; это deliberate minimal-retention evidence, не legal determination. SOURCE_HASHES/command manifests описывают проверенную revision.

- MOSCOW_DATA_GATE_RECEIPT_RUNTIME.json: 12 task receipts + independent decisions.
- TASK_MATRIX.md, DATA_GATE_REPORT.md: результат и границы утверждений.
- NORMALIZER_REPLAY.json: unmodified baseline full records, отдельно single-date experiments и synthetic stale/partial checks.
- PRICE_SAMPLES.json, PRICE_EDGE_CASES.md, OCCURRENCE_OBSERVATIONS.md: T105 inputs.
- API_OPERATIONAL_OBSERVATIONS.md, OPERATIONAL_STATS.json: T107 inputs.
- KUDAGO_MANUAL_QUESTIONS.md, KUDAGO_MINIMAL_SAFE_DATASET.md: manual decision inputs, not sent.
- receipts/: factual sanitized HTTP receipts and raw response hashes.
- COMMAND_RESULTS.json/logs/: exact argv, exit codes, timings, source manifests. Bootstrap/collection summaries reconstructed from recorded receipts are labelled, not claimed as original stdout.
- FINAL_VERIFICATION.json: checks and preservation; FILES_CHANGED.md: file list.

Network scripts use only Python stdlib, sequential requests with 1.2s spacing, 25s timeout, max four pages/query (one page for bounded edge scan), no automatic retry. Execution cost: no paid services. Repeat only when fresh evidence is needed, preserving existing committed receipts first. Code is project-owned original probe tooling; no third-party code/assets imported. Command logs are normalized to UTF-8/LF with trailing whitespace removed; original captured-output hashes remain in COMMAND_RESULTS.json. Local .gitattributes pins LF for evidence integrity. Local dependencies installed by npm ci --ignore-scripts in this worktree only, versions unchanged; existing T102 Drizzle declaration patch invoked by baseline scripts.

NOT_RUN: Docker/PG/Redis/MAX/browser/UI checks, actual importer, production transport acceptance, real timeout/429/5xx, API edit/cancel/delete transitions, long-term stability, legal clearance. These are not mislabeled PASS.
''')
# Handoff uses paths relative to docs/handoffs.
handoff='''# T104 — KudaGo Runtime + Provider Gate\n\n'''+header.replace('(RECEIPT_INDEX.json)','(../../artifacts/t104/RECEIPT_INDEX.json)')+'''**Work complete; DATA_RUNTIME_GATE FAIL; LEGAL_MANUAL_GATE OPEN; provider NOT APPROVED; Moscow not activated.**

User explicitly authorized this separate worktree runtime/data ticket after T102. Branch and exact baseline verified, starting tree clean. Legacy no-active-implementation pointer unchanged. Source inputs/revisions: ../../artifacts/t104/STARTING_STATE.json; frozen documents/provider archive remain byte-preserved. Only artifacts/t104 plus this handoff added. No contract/schema/dependency/queue/auth/UI delta; no production import, fallback, main/T103/T106 changes or push.

12 final results: DG01 NO_PASS, DG02 NO_PASS, DG03 NO_PASS, DG04 UNKNOWN, DG05 UNKNOWN, DG06 UNKNOWN, DG07 UNKNOWN, DG08 UNKNOWN, DG09 NO_PASS, DG10 PASS, DG11 PASS, DG12 PASS. PASS 3 (safety tests only), NO_PASS 4, UNKNOWN 5, ERROR 0. Verified suitable tasks 0/8; critical false PASS 0 within executed checks. Dates remain frozen; Sept17 is past, source-level prices do not prove session total, recurrence/ranges not expanded inventively.

Runtime: 26 v1.4 API receipts plus official docs/two secondary source receipts; HTTP/latency/headers/raw-byte hashes retained with sanitized factual payload. Conditional deposit 700 observed; null end/place observed; strict empty count0/nextnull verified. 205 unique baseline replay Events: 79 normalized, 126 quarantined. Exact defect input/output references in NORMALIZER_REPLAY.json. Separate single-date projections are experiments, never claimed full-record acceptance. No legal conclusions from HTTP success.

Checks actually run: npm ci --ignore-scripts; npm run verify:dependencies; npm run syntax; npm run test:unit (115/115); npm run typecheck; npm run build; 12 Python probe safety tests; baseline normalizer replay; final git diff --check and secret/prohibited-file/preservation scan. Exact argv/exits/times/source hashes/logs: ../../artifacts/t104/COMMAND_RESULTS.json; authoritative final outcomes: ../../artifacts/t104/FINAL_VERIFICATION.json. npm/node 11.19.0/24.20.0, Python 3.14.7. NOT_RUN: Docker/PG/Redis/MAX/browser/UI/importer; actual reschedule/delete/cancellation/timeout/429/5xx; no need to launch Docker for T104.

Blockers: strict suitable coverage under frozen dates; price scope/fee completeness; production normalizer date-count/sentinel/conflicting dates and conditional mapping; no established stable occurrence identity/cancellation/update signal; measured latency/body sizes exceed provider transport defaults; legal/manual rights unresolved.

T105 inputs: PRICE_EDGE_CASES.md, OCCURRENCE_OBSERVATIONS.md, NORMALIZER_REPLAY.json and raw fields; decide identity/reconciliation and conservative date/price mapping, without inferring status or fee completeness. T107 inputs: API_OPERATIONAL_OBSERVATIONS.md; bounded pagination/retry/transport, partial never tombstones, fetched_at/TTL/source and legal minimal dataset. Neither ticket started.

Next action: human review of this FAIL and evidence; obtain written KudaGo/rightsholder answers via KUDAGO_MANUAL_QUESTIONS.md and explicit gate-owner decision. If a new live coverage window is desired, authorize a new frozen matrix; do not overwrite the historical date result. Review T105/T107 inputs before separately authorizing those tickets. Stop here.
'''
(OUT.parents[1]/'docs/handoffs/T104_KUDAGO_RUNTIME_GATE.md').write_text(handoff,encoding='utf-8',newline='\n')
print('reports written',stats)
