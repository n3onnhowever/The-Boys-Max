import sys, re
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'t101'))
from capture import *
def put(path,text): (ROOT/path).write_text(text.strip()+'\n',encoding='utf-8')
put('README.md','''# Повод — The Boys

«Повод» — персональная афиша и навигатор событий внутри MAX. Продукт помогает выбрать конкретный сеанс по интересам, времени и бюджету, увидеть цену либо честный UNKNOWN, место и источник, открыть первоисточник и сохранить событие.

**Статус этого checkout:** dependency lock и clean install проверены; unit 105/105 и syntax прошли. `typecheck` и `build` падают на зафиксированных ошибках типов. Docker daemon недоступен. Это ещё не готовая к запуску/сдаче сборка. Точные команды, exit codes и blockers: [T102 handoff](docs/handoffs/T102_DEPENDENCY_BUILD_BASELINE.md), [command receipts](artifacts/t102/COMMAND_RESULTS.json).

## Замороженный сценарий

MAX → подключённая Mini App → серверная проверка MAX identity → интересы/структурные фильтры → живые события **Москвы** → detail конкретного Occurrence → цена/UNKNOWN/источник → открыть источник. Save и базовый «Мой Повод» сохраняются между входами. Основной путь должен работать в MAX mobile и web без группы.

Это целевой P0, не заявление о готовности функций. Live ingestion, Save и профиль ещё не завершены. Follow, Smart Povod и map относятся к P1; второй город и Shared Plan/social — Stretch. [Authority/overrides](docs/current/POVOD_SOURCE_AUTHORITY.md) разрешает старые противоречивые P0-флаги. [FINAL SCOPE FREEZE](docs/product/povod-2026-09-19/POVOD_FINAL_SCOPE_FREEZE_MVP.md) остаётся каноническим.

## Архитектура

TypeScript/Fastify API + React/Vite Mini App, модульный монолит с отдельным worker. API обслуживает собранную Mini App и HTTP routes; PostgreSQL хранит бизнес-состояние, durable ingress/outbox и результаты операций; Redis/BullMQ исполняет async-задачи. Redis также нужен outbound governor. MAX Bot API находится на сервере, MAX Bridge — на клиенте. Provider adapters отделены портами.

Queue decision **BLOCKED** до T103 runtime-verification. Существующие BullMQ/Redis/outbox/governor сохранены. [Схема](docs/TARGET_ARCHITECTURE.md) описывает границы, а не наличие работающего live provider.

## Установка и локальные проверки

Нужны Node **24.20.0**, npm **11.19.0** и доступ к npm registry. Это наблюдённые host-версии T102; они соответствуют package.json. Root lockfile создан npm штатно, прямые версии не обновлялись. `.npmrc` включает engine-strict и ignore-scripts.

В корне репозитория:

```powershell
npm ci --ignore-scripts
npm run verify:dependencies
npm run syntax
npm run test:unit
npm run typecheck
npm run build
```

`verify:dependencies` читает metadata закреплённых версий из registry и пишет локальный `dependency-preflight.json`; это не аудит безопасности. `syntax` выполняет транспиляцию, но не заменяет typecheck. `test:unit` не требует БД/MAX/provider. Отдельного lint script нет.

Lifecycle scripts зависимостей отключены. Root scripts просмотрены перед запуском. В lock есть install scripts у optional fsevents/msgpackr-extract; они не запускались. Их присутствие не является runtime-проверкой native путей. Установленный граф: [npm ls receipt](artifacts/t102/logs/installed-graph.txt).

Текущие `typecheck`/`build` воспроизводимо возвращают exit 2. [BUILD_BLOCKERS](artifacts/t102/BUILD_BLOCKERS.md) перечисляет ошибки и минимальные следующие действия. `build` остановился на tsc; copy-assets/Vite не выполнялись. Частичные файлы в игнорируемом dist не являются готовым build. Не обходить ошибки через `--force`, silent upgrades, type casts или ослабление compiler settings.

## Docker: одна команда для локальных компонентов

Предусловия: рабочий Docker Desktop Linux engine / Compose, доступ к registry/npm для сборки и исправленный compiler baseline. Сначала проверьте `docker info`. В T102 он вернул exit 1 (`dockerDesktopLinuxEngine` отсутствует); следующие build/start/health/stop/restart действия **NOT_RUN**. См. [Windows runbook](docs/runbooks/DOCKER_WINDOWS.md). Настройки системы автоматически не меняются.

Документированный запуск всей существующей изолированной test-конфигурации:

```powershell
docker compose up --build -d
```

`compose.yaml` поднимает PostgreSQL, Redis, init, migrate, prepare, API и worker. `checks` находится в отдельном profile и этой командой не запускается. Init генерирует случайные test-only значения в named volume; migrate применяет существующие миграции; prepare создаёт synthetic fixtures и инициализирует test-only outbound governor (включая ожидание 10 секунд). Outbound работает через TestTransport. Сеть `internal: true`; внешняя отправка и live-provider ingestion этим flow не подтверждаются. `.env` для него не требуется.

Объявленные image tags: `node:24.20.0-bookworm-slim`, `postgres:18.6`, `redis:8.2.9`. **Реальные container versions не наблюдались.** Сборка требует package-lock.json; Dockerfile уже использует `npm ci --ignore-scripts` и существующий build script.

Порты: API + собранная Mini App — `127.0.0.1:3000` (container 3000). PostgreSQL — внутренний 5432, Redis — внутренний 6379, host ports для них не опубликованы. Worker собственного HTTP-порта не имеет. PORT API по умолчанию 3000; смена PORT требует согласования compose mapping.

Проверка после будущего успешного запуска:

```powershell
docker compose ps
Invoke-RestMethod http://localhost:3000/health/live
Invoke-RestMethod http://localhost:3000/health/ready
Invoke-WebRequest http://localhost:3000/ -UseBasicParsing
docker compose logs --no-color --tail 100 api worker migrate prepare
```

Ожидается `/health/live`: `alive: true`; `/health/ready`: `database: UP` и поле `outboundHold`. Readiness проверяет БД/hold, но **не** удостоверяет Redis, worker delivery, MAX или provider. `/` должен отдавать собранный HTML после исправления build. В обычном браузере без MAX/действующей сессии ожидается просьба открыть Mini App в MAX; synthetic роли не дают обхода авторизации. Не публикуйте runtime config или логи с секретами.

Чтобы измерить официальное ограничение сборки ≤5 минут, после восстановления Docker отдельно запишите время первоначального pull базовых образов и время чистой build из конкретного SHA/working-tree hash. В T102 ни pull, ни build/start не выполнялись, времени Docker build нет. Локальное время tsc не заменяет эту проверку. Полный будущий runtime acceptance остаётся отдельным evidence gate.

Остановить без удаления данных:

```powershell
docker compose stop
```

Повторный запуск остановленных контейнеров:

```powershell
docker compose start postgres redis api worker
```

Такой restart сохраняет named volumes и не запускает повторно prepare. После него повторите health/log checks. При изменении source/config или после удаления контейнеров используйте `docker compose up --build -d`; это может повторно выполнить prepare и требует согласованного перезапуска worker. Удаление контейнеров/сети без удаления данных: `docker compose down`. `down --volumes` уничтожает локальные тестовые данные и не является обычным stop/restart.

## Окружение и внешние сервисы

[.env.example](.env.example) и [.env.release.example](.env.release.example) содержат только placeholders. Для будущего отдельно согласованного live-deploy локальный `.env.release` заполняется вне Git. Оба примера допускаются tracking policy, реальные `.env*` игнорируются. Наличие примера не открывает live gate.

| Переменные | Назначение |
|---|---|
| APP_MODE | test генерируется test-compose; release фиксирует live |
| PUBLIC_ORIGIN | Точный origin без trailing path; для live — утверждённый HTTPS |
| DATABASE_URL, REDIS_URL | Внешние PG/Redis для release; test-compose использует внутренние сервисы |
| SESSION_KEY, ESCROW_KEY | Серверные ключи; SESSION_KEY минимум 32 символа, ESCROW_KEY — 64 hex; значения не логировать |
| BOT_TOKEN, WEBHOOK_SECRET, CREDENTIAL_SCOPE | Приватный bot token, проверка webhook и область outbound governor; WEBHOOK_SECRET 32–256 разрешённых alphanumeric/underscore/hyphen символов |
| COOKIE_PROFILE | LAX_FIRST_PARTY либо PARTITIONED_EMBEDDED; требуется real-client проверка |
| MAX_INGRESS_MODE | WEBHOOK; POLLING сейчас fail-closed, runner не реализован |
| MAX_BOT_USERNAME | Существующий nickname бота; не регистрировать и не менять в T101/T102 |
| ALLOWED_SOURCE_ORIGINS | Явный список HTTPS origins через запятую, после допуска источников |
| AI_EXTERNAL_ENABLED, MAP_EXTERNAL_ENABLED | false; external admission не реализован |
| LIVE_GATE | Оставлен пустым до отдельного принятия release gates |
| RUNTIME_FILE | Генерируемая test-конфигурация `/runtime/test.json`; не публиковать содержимое |
| NODE_EXTRA_CA_CERTS | Только отдельно проверенный PEM при подтверждённой необходимости; TLS verification остаётся включённой |

`compose.release.yaml` описывает API/worker с внешними PostgreSQL/Redis и HTTPS reverse proxy. Он не поднимает зависимости, не seed-ит тестовые данные и не запускался в T102. Для реальной проверки нужны существующий бот с attached Mini App, безопасно переданные credentials, доступ MAX mobile/web, публичный HTTPS origin и отдельно принятые gates. MAX/PG/Redis reachability в release не установлена.

KudaGo — conditional candidate, **NOT APPROVED**: runtime/data и ручной provider-use gate относятся к T104. Live importer ещё не подключён; fallback provider не одобрен. LLM и карта не обязательны для P0; новые внешние сервисы сейчас не добавляются.

## Данные и тестовый сценарий

PostgreSQL — источник истины; Redis не заменяет durable бизнес-состояние. Event и Occurrence различаются; source/provenance, timestamps и ограничения должны сохраняться. Цена/fee UNKNOWN не становится нулём; conditional/free-with-extra не получает ложного budget PASS; завершившееся событие не рекомендуется как будущее. Save, Follow, suitable/voted и commitment — разные состояния.

Test seed создаёт три **synthetic** роли и один owned SYNTHETIC candidate, без реальных аккаунтов и без выдачи session. Freshness fixture истекает через час и отображается как UNKNOWN. Seed разрешён только для test-mode БД `max23_test`. Fixtures не подтверждают московский coverage, наличие билетов, реальный login или provider integration.

Порядок проверки сейчас: clean install → пять scripts выше → изучить compiler blockers. После исправления build и запуска Docker — health/HTML/log checks. Queue fault-injection и `test:integration` относятся к T103 и в этом pass не выполнялись. После provider/MAX gates проверяется frozen solo flow, UNKNOWN/empty/source-unavailable/ended states и Save после повторного входа; это будущий acceptance, не выполненная демонстрация.

## Ограничения и происхождение

- Нет завершённого P0 E2E, live ingestion, Favorites/basic profile или real-client screenshots. UI всё ещё использует старую надпись «Афиша»; T110 отвечает за изменение.
- Reminders/Smart Povod, map runtime, natural-language model endpoint, /start handler и polling runner не заявляются работающими.
- OpenAPI 3.0.3 generator существует (`npm run openapi`), но T102 его не запускал; DATA-API.yaml, HTTPS deployment и judge package относятся к T112.
- [EventHive notice](licenses/module-22-NOTICES.md) и [MIT licence](licenses/EventHive-LICENSE) сохранены. Указанный в старом notice `analysis/REUSE_AND_LICENSES.csv` отсутствует. Восстановление точных copied/adapted paths/hashes — blocker T112; donor runtime acceptance не выдумывается.
- Lock/registry metadata фиксируют версии и заявленные licences, но не заменяют полный third-party notice/donor audit.
- Текущие evidence: [T101](docs/handoffs/T101_SCOPE_GOVERNANCE.md), [T102](docs/handoffs/T102_DEPENDENCY_BUILD_BASELINE.md), [known gaps](docs/current/KNOWN_GAPS.md). Исторические импорты сохранены неизменными.
''')
p=ROOT/'.gitignore';s=p.read_text(encoding='utf-8');s+='\n# Safe release template only; real .env.release remains ignored.\n!.env.release.example\n';put('.gitignore',s)
p=ROOT/'licenses/module-22-NOTICES.md';s=p.read_text(encoding='utf-8');s=s.replace('Original source paths and file hashes: `analysis/REUSE_AND_LICENSES.csv`.','Historical source-path/hash reference: `analysis/REUSE_AND_LICENSES.csv`.\nT102 verified that this artifact is absent from this repository. Exact copied/adapted\npath/hash recovery remains BLOCKED_PROVENANCE_T112; no missing evidence is invented.\nThe original notice and licence below are retained.');put('licenses/module-22-NOTICES.md',s)
errors={}
for name in ['typecheck','build']:
    text=(ROOT/'artifacts/t102/logs'/f'{name}.txt').read_text(encoding='utf-8')
    rows=[{'path':m.group(1),'line':int(m.group(2)),'column':int(m.group(3)),'code':m.group(4),'message':m.group(5)} for m in re.finditer(r'^(.+?)\((\d+),(\d+)\): error (TS\d+): (.+)$',text,re.M)]
    errors[name]={'count':len(rows),'project_errors':[x for x in rows if not x['path'].startswith('node_modules/')],'dependency_error_count':len([x for x in rows if x['path'].startswith('node_modules/')]),'diagnostics':rows}
write_json(ROOT/'artifacts/t102/COMPILER_DIAGNOSTICS.json',errors)
put('artifacts/t102/BUILD_BLOCKERS.md','''# T102 compiler baseline — FAIL, not dependency-resolution failure

Starting HEAD: 4f9a198d4fa2b18686efa19a59b6ac78281d341d plus unchanged application working-tree hashes in artifacts/t101/BASELINE_HASHES.json.

`npm install --package-lock-only --ignore-scripts`, `npm ci --ignore-scripts` and `npm ls --all --json` all exited 0. No ERESOLVE/engine conflict or direct version change. Metadata review passed. The lock is valid for installation; this does not mean the source builds.

`npm run typecheck` and `npm run build` both exited 2. Exact file/line/code diagnostics: COMPILER_DIAGNOSTICS.json; complete logs: logs/typecheck.txt and logs/build.txt. The build's chained copy-assets/Vite stages did not run. Partial ignored dist output from tsc is not a valid build.

## Confirmed error families

- `apps/api/app.ts:40–41`: Fastify handler error is inferred as unknown (TS18046).
- `apps/api/app.ts:80`: HTTP price schema inference does not match domain Command/Extra/Money/Amount discriminated unions (TS2345). A cast would hide a real contract mismatch; no price/Occurrence semantics change is authorized in this pass.
- `apps/worker/main.ts`, `packages/platform/governor.ts`, scripts/arm-test-outbound.ts and integration test helpers: ioredis default import is treated as a namespace under current NodeNext settings (TS2351/TS2709). Installed ioredis 5.11.1 exports the named Redis class.
- `modules/maps/component/leaflet-renderer.ts:29`: array access can be undefined under noUncheckedIndexedAccess (TS2345).
- Installed `drizzle-orm@0.45.2` declaration graph: missing optional dialect types (including gel/mysql2) and internal type/interface errors in non-PG and PG declarations (TS2307, TS2344, TS2515, TS2420 etc.). These are compiler failures despite npm peer resolution succeeding. Full list is in the diagnostic receipt.

## Minimum next correction proposed for human review

1. Bound source-only typing fix: narrow Fastify errors safely; use the documented installed named Redis export; prove the Leaflet array-bound case. Add targeted regression only when behavior changes/reproducible defects require it.
2. Integration owner aligns HTTP price validation and domain discriminated union with tests proving accepted/rejected payloads. Preserve UNKNOWN and existing semantic rules; no unchecked cast.
3. Isolate Drizzle declarations with the installed TypeScript 5.9.3 and choose a demonstrated compatible pin or minimal reviewed upstream declaration fix with provenance. No compatible replacement version is claimed without testing. Installing unrelated DB drivers alone would not repair internal type errors.
4. Re-run the existing syntax/unit/typecheck/build scripts, then Docker. Keep skipLibCheck=false/strict/noUncheckedIndexedAccess; do not suppress diagnostics, patch node_modules or upgrade majors silently.

These corrections are proposals, not applied changes. This pass preserves application/config/contract bytes and finishes independent documentation/evidence work. T102 is PARTIAL; compiler baseline and Docker are not accepted. No T103+ work started.
''')
print(json.dumps({k:{'errors':v['count'],'dependency_errors':v['dependency_error_count']} for k,v in errors.items()},indent=2))
