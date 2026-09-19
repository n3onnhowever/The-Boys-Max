from pathlib import Path
r=Path.cwd()
def write(p,s):
 p=r/p;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(s.rstrip()+'\n',encoding='utf-8')
write('artifacts/preflight/CONFLICTS.md','''# Conflicts and preserved stale documents

Baseline: 4f9a198d4fa2b18686efa19a59b6ac78281d341d. No listed source document or application file was deleted or rewritten. Precedence is the user's exact case → freeze → spec+patch → contract → accepted ADRs → runtime → research order.

| Location | Conflict / observation | Governing resolution for future tickets |
|---|---|---|
| AGENTS.md Product; docs/current/DECISIONS.md; docs/current/PROJECT_STATE.md; docs/design/BRAND_BRIEF.md; docs/design/NAMING_WORKSPACE.md; README.md | CONFLICT WITH CURRENT SOURCE OF TRUTH: TBD/unapproved name vs current user and D-001 Повод | Treat Повод as product in preflight docs. Do not register a bot nickname in this pass. Preserve old files and team logo. |
| docs/current/PROJECT_STATE.md:6 | Contains «Есть планы» and «Договорились» explicitly as historical candidates, not current brand | List as stale naming context; do not claim current code uses Есть планы. |
| apps/miniapp/src/App.tsx; apps/miniapp/index.html | Visible brand is Афиша, not Повод | T110 future UI mapping; untouched now. |
| imported POVOD_PRODUCT_SPEC_V1.md §4.1, S05, S08–S12 and metrics; POVOD_PRODUCT_CONTRACT_V1.json scope.P0, screens, p0_follow_entity_types | CONFLICT WITH CURRENT SOURCE OF TRUTH: 2–3-city P0, map, Follow, Smart Povod and shared plans are labelled P0 | Freeze overrides: Moscow P0; Follow/Smart/map P1; second city/social Stretch. No promotion by JSON p0 flags. |
| imported POVOD_SCREEN_ACCEPTANCE_V1.md S08 and broad screen list; POVOD_UI_TRANSLATION_V2_SPEC.md broader screen coverage | CONFLICT WITH CURRENT SOURCE OF TRUTH if interpreted as mandatory P0 | Apply screen checklists only to the scope phase authorized by Freeze. |
| imported Product Contract price_kinds / PriceSnapshot; Product Spec original PriceSnapshot | CONFLICT WITH CURRENT SOURCE OF TRUTH: conditional and safety fields absent | Safety Patch controls; T105 maps onto existing rich fee/price model without silently replacing it. |
| imported RESEARCH_SYNTHESIS.md §4 says optional save | CONFLICT WITH CURRENT SOURCE OF TRUTH if implementation treats persistence as optional scope | Saving is an optional user action but a required P0 capability under Freeze §3.7, §8.1. |
| AGENTS.md Architecture; docs/current/DECISIONS.md; docs/TARGET_ARCHITECTURE.md; docs/tasks/010_INTEGRATION_V2.md vs ADR-003/D-014 | Fixed Redis+BullMQ policy vs new repository-gated alternatives | No migration. Existing runtime unavailable; gate BLOCKED. Reconcile policy through integration-owned ADR after tests; no silent pg-boss adoption. |
| architecture raw research conditional pg-boss default; data-pipeline raw research no Redis/stated PG/PostGIS versions | CONFLICT WITH CURRENT SOURCE OF TRUTH if treated as mandatory adoption/removal/version upgrade | ADR-002/003 and actual runtime govern. Redis already supports outbound governor and BullMQ; PostGIS conditional; image declarations are not version validation. |
| docs/tasks old work order; docs/current/PROJECT_STATE.md priorities | Merge old module deltas, donor runtime and naming precede new frozen P0 in old order | New active T070 only. Future T101+ tickets assess useful deltas; no blanket archive merge. |
| docs/tasks/010_INTEGRATION_V2.md references docs/architecture/TARGET_ARCHITECTURE.md | File absent; actual architecture doc is docs/TARGET_ARCHITECTURE.md | Repair references during T101, not an architecture rewrite. |
| README.md ../../RUN_ELSEWHERE.md and ../../README.md; donor notices analysis/REUSE_AND_LICENSES.csv | Referenced reproduction/provenance artifacts are absent from current repository tree | T102/T112 recover exact evidence, preserving licence notice. |
| modules/integration/projections.ts cities includes msk and spb | Technical two-city mapping; no city activation gate | Not itself a claim of two-city MVP. T107/T108 restrict release availability to independently gated cities. |
| source files/group-heavy persistence and docs/product/PRODUCT_FRAME.md optional plan steps | Existing social machinery is extensive, but personal catalog is explicit and group creation is opt-in | No evidence of mandatory group-first launch. Preserve safety; defer social development. NAMING_WORKSPACE mentions group-first only as a candidate-name criticism. |

Official case match is exact; no PDF revision conflict found. Research reports saying the PDF/repository were unavailable remain immutable historical evidence; this receipt resolves availability, not runtime compliance. The supplied Moscow gate receipt is dated September 17 and explicitly lacks complete v1.4 receipts and code false-PASS verification; it is not current approval.

No external legal/platform claims were freshly certified here. Provider rights, MAX placement permissions and submission portal details remain manual gates, not conclusions inferred from research.
''')
write('artifacts/preflight/QUEUE_DECISION.md','''# Queue decision gate

**Classification: BLOCKED** (2026-09-19, HEAD 4f9a198d4fa2b18686efa19a59b6ac78281d341d).

Actual evidence:
- package.json pins bullmq 6.3.4 and ioredis 5.11.1; no lockfile, installed graph, pg-boss or Valkey.
- compose.yaml declares redis:8.2.9 with durable AOF/everysec and noeviction; postgres:18.6. Release compose expects external Redis/PG.
- apps/worker/main.ts constructs Queue/Worker `max-effects`, concurrency 4, and runs PostgreSQL outbox reconciliation every second.
- packages/persistence/delivery.ts owns durable attempts, deduplication and explicit UNKNOWN outcomes. Redis also backs packages/platform/governor.ts/governor.lua; it is not merely a proposed new cache.
- tests/integration/foundation.test.ts includes real PG/BullMQ duplicate, Redis loss and worker-kill scenarios; tests/helpers/kill-worker.ts supports them.
- Fresh pure unit suite PASS 105/105. Integration NOT_RUN. Typecheck/build fail before compilation because tsc is absent. Docker info fails because dockerDesktopLinuxEngine is unavailable. PostgreSQL version/extensions not inspectable.

Why not the other classifications:
- NO_QUEUE_NEEDED would require proof that required work is one scheduled idempotent sync and a reviewed treatment of existing outbound functionality. Neither is established.
- KEEP_EXISTING_BULLMQ under ADR-003 requires runtime-green evidence; static code and unit tests do not satisfy that condition.
- EVALUATE_PG_BOSS requires runtime prerequisites and a justified need. Node version alone does not establish PostgreSQL/migration/hosting conditions or justify replacing implemented BullMQ.

Disposition: preserve existing BullMQ/Redis and outbox code. T103 verifies it first after T102 dependency reproducibility and daemon availability. Do not convert this BLOCKED result into permission to migrate.

Reproduction (future integration task, isolated test stack only; NOT executed here):
```powershell
docker info
npm ci --ignore-scripts
npm run typecheck
npm run test:unit
npm run build
docker compose build
docker compose up -d postgres redis prepare
docker compose stop worker
docker compose --profile checks run --rm checks
```
The suite owns its worker and uses TestTransport; never set a live gate to make it pass. Record build duration separately, excluding only initial base-image download. Any dependency compatibility failure is recorded before choosing a replacement. If Docker cannot start, record BLOCKED_DOCKER_DAEMON and follow docs/runbooks/DOCKER_WINDOWS.md; no system repair in this preflight.
''')
write('artifacts/preflight/CODEX_WORKFLOW_AUDIT.md','''# Codex workflow audit

Read: root AGENTS.md, README_CODEX.md, docs/tasks/ACTIVE_TASK.md, T010, current docs and global AGENTS.md (empty). Root rules already cover source hierarchy, one integration owner, tests-first for defects, runtime truthfulness and concise handoffs. Archive/SOURCE26_AGENTS.md is historical, not active scope authority.

Observed:
- No repo .agents or .codex directory, no repo skills/hooks/MCP configuration.
- .git/hooks contains only sample hooks; core.hooksPath unset.
- Global ~/.codex/config.toml exists; only section names were inspected. Explicit MCP section: mcp_servers.node_repl. Plugin tools are also available through this Codex session; no change to their settings.
- Requested custom scope-guard, test-and-verify and runtime-evidence skills absent from repo and inspected user skill roots/session catalog.
- package.json provides test:unit, test:integration, typecheck, build, syntax and verification helpers, but no lint command. No CI or configured remote. No committed dedicated secret scanner found.
- Old ACTIVE_TASK pointed to a nonexistent T001-prefixed filename. Updated only to the current documentation preflight; previous pointer retained as history.
- Sandbox launch failed; approved external shell read worked. This is environment evidence, not grounds to weaken sandbox/approval settings.

Minimal staged recommendation (not installed):
1. T101: reconcile concise AGENTS source pointers/name/scope/queue-gate language after human review. Preserve durable-state/auth/UNKNOWN invariants. One writer owns shared contracts, routes, migrations and dependencies.
2. Add repo-local scope-guard only if recurring scope checks warrant it: read freeze/patch/current ticket, classify P0/P1/Stretch, print exact conflicts; never auto-edit canonical files.
3. Add test-and-verify: discover real package scripts, run targeted then final checks, distinguish FAIL/BLOCKED/NOT_RUN, verify diff and scan; never generate a lock through unsafe flags.
4. Add runtime-evidence: bind receipts to source SHA and runtime build, record actual commands/screenshots/client and versions, redact secrets; unit PASS never upgrades Docker/MAX/provider evidence.
5. Later only when repeated work needs it: provider-adapter, max-integration, data-safety. Reuse contracts and invariants rather than fork engines.

Repository skills can live under .agents/skills and use a SKILL.md with a precise name/description and task-specific instructions. Official documentation was fetched at https://learn.chatgpt.com/docs/build-skills (via developers.openai.com/codex/skills/). This audit recommends organization, not reliance on unverified host settings.

Do not install marketplace collections, add MCP servers, hooks or extra agents just for this project. External skills require repository + pinned revision + licence + manual/security review before use. Defer new tooling until an observed workflow gap justifies it. No third-party skills installed, no hooks enabled, no Codex settings altered.
''')
# Requirement mapping: every decision D-001..D-035 represented.
rows=[
('D-001 / ADR-001: Повод brand','apps/miniapp/src/App.tsx; index.html; AGENTS.md','Афиша UI / TBD docs','App header and title; CONFLICTS.md','Reconcile name and references','P1','T101,T110','No'),
('D-002 / ADR-001: solo-first','packages/persistence/catalog.ts; apps/miniapp/src/App.tsx','PERSONAL catalog; explicit newPlan required','catalogService.ensure/add; 105 unit tests','Preserve; complete personal P0','P0','T108–T111','Yes for no-group invariant'),
('D-003 / ADR-001: Moscow live','modules/integration/projections.ts; catalog.ts','msk/spb map; no live sync','city constants; SYNTHETIC/LIVE query','Moscow activation + data gate absent','P0','T104,T107','No'),
('D-004: second city gated','modules/integration/projections.ts','spb technical mapping only','No city lifecycle table in migrations','Prevent ungated public activation; defer launch','P1','T107','Yes: no extra city implementation'),
('D-005: Event != Occurrence','normalizers.ts; migrations/0002_integration.sql','Separate refs; start-derived occurrence ID; JSONB observations','normalizeKudaGoRecord; catalog_occurrences','Stable canonical ID/source mapping/reschedule handling','P0','T105,T107','Partial: reuse refs'),
('D-006: typed UNKNOWN','modules/search/core/price.ts; eligibility.ts; candidate.ts','Typed states and strict eligibility present','unit suite; quote/candidate parsers','Missing-data acceptance on live normalized fixtures','P0','T105,T111','Yes: preserve existing model'),
('D-007 / Safety Patch: conditional price','modules/search/core/types.ts; normalizers.ts','Raw label + fees/extras; conflicting free label becomes TEXT','kudagoQuote; FREE_LABEL_CONFLICT','Map conditional, mandatory_extra_min, free claim, confidence and price evidence scope','P0','T105','No'),
('D-008: provenance','modules/search/core/types.ts; normalizers.ts; ui.ts','Provider refs, URL, timestamps/hash/data_mode and rights','blank normalizer; UI sourceLabel','Wire real receipts and durable lawful retention','P0','T104,T107','Partial'),
('D-009: defensible freshness','packages/persistence/ui.ts:34; normalizers.ts','UI says Наблюдение + observed_at; observed_at equals fetch time','No checked-today claim found','Agree fetch/source-update semantics and stale policy','P1','T105,T110','Yes for no fake checked label'),
('D-010 / ADR-002: PostgreSQL truth','packages/persistence; migrations; compose.yaml','Durable sessions/plans/ledger/catalog','postgres:18.6 declaration','Runtime unavailable','P0','T102,T103','Yes: preserve architecture'),
('D-011 / ADR-002: PG search first','packages/persistence/catalog.ts','Latest 100 observations, TypeScript filtering','browse SQL LIMIT 100; no FTS/GIN/trgm migrations','Query/filter correctness beyond 100; measured PG search','P0','T108','No'),
('D-012 / ADR-002: conditional PostGIS','modules/maps; migrations','Maps/geo boundary exists; no extension','CREATE EXTENSION absent','No forced extension; measure if map/geo later needed','P2','Deferred P1','Yes for P0'),
('D-013: reject extra infrastructure','package.json; compose.yaml','No Kafka/Redpanda/Temporal','Dependency/service inventory','None','None','None','Yes'),
('D-014 / ADR-003: queue gate','apps/worker/main.ts; delivery.ts','Implemented BullMQ, unverified runtime','QUEUE_DECISION.md; docker-runtime log','BLOCKED; do not migrate','P0','T103','Preserve code now'),
('D-015: no new Redis just for queue/cache','governor.ts; worker/main.ts; compose.yaml','Existing Redis governor + queue','Three Redis connections in worker','Research no-Redis rule cannot silently remove these','P1','T103','Yes: no new service'),
('D-016 / ADR-004: KudaGo conditional','core/provider.ts; normalizers.ts; imported data receipt','Adapter primitives; gate NOT APPROVED','Receipt lacks complete v1.4/raw/false-PASS proof','Runtime+manual rights gate, stable occurrence semantics','P0','T104','No'),
('D-017: no multi-provider P0','core/normalizers.ts; provider.ts','KudaGo/Timepad helpers exist','HOSTS and two normalizers','Keep helpers; wire one approved provider only','P2','T107','Yes: no expansion'),
('D-018 / ADR-005: attached Mini App','apps/miniapp/index.html; bridge.ts; API','Bridge script/UI/Bot API source present','No real bot attachment receipt','Provision/verify actual MAX attachment','P0','T106,T111','No'),
('D-019 / ADR-005/006: server identity','packages/platform/auth.ts; sessions.ts','HMAC + time + strict parser; sessions','security.test.ts; unit PASS','Fresh signed client/repeat-session runtime proof','P0','T106,T111','Yes for implemented boundary'),
('D-020: context != auth','sessions.ts; ui.ts; plans.ts; miniapp launch.ts','Session/object checks separate from route context','auth helper, assertRead and session binding','Regression IDOR and tampering on final routes','P0','T106,T111','Yes: preserve'),
('D-021: API2/TLS runtime','packages/platform/transport.ts:19','platform-api2.max.ru; standard verified HTTPS','8s deadline; no custom disabled TLS','Release-image TLS/MAX proof absent','P0','T106,T111','Yes endpoint present; runtime gap'),
('D-022: Smart Povod P1','worker/main.ts; README.md','Plan notifications exist; Smart flow absent','README states reminder scheduling absent','Do not implement as P0','P2','Deferred P1','Yes'),
('D-023: no programmatic group-add foundation','catalog.ts; plans.ts; ingress.ts','Optional explicit plan/invite','No automatic group creation in personal path','None for frozen solo path','None','None','Yes'),
('D-024: map nonblocking','modules/maps; PlacePanel.tsx','Optional renderMap and disclosure gates','App optional renderMap prop','Map runtime deferred; detail still needs place/address','P2','T110','Yes for deferral'),
('D-025 / ADR-007: Save != Follow != commitment','migrations; ui contracts; domain/plan.ts','Commitment revision exists; Favorites missing','No favorite/profile tables/routes; README explicit','Persist independent Save and profile without social state','P0','T109','No'),
('D-026 / ADR-007: Poster Pop/calm UI','apps/miniapp/src/styles.css; App.tsx','Existing donor-adapted UI; no frozen navigation','No Saved/For-you/profile surfaces','Token/component mapping + actual screenshots','P1','T110,T111','No'),
('D-027: no AI percentages','modules/ai; core/ai.ts; ui.ts','Advisory model boundary; structured manual path','eligibilityLabel factual checks','Preserve and keep LLM outside required P0','None','T110','Yes'),
('D-028 / ADR-006: minimal observability','apps/api/app.ts; worker/main.ts','Request IDs, sparse structured logs, health routes','http_end; health ready checks DB only','Provider sync visibility/worker dependency evidence; privacy deletion review','P1','T111','Partial'),
('D-029: no fabricated user research','research user-validation; presentation-content','Desk/public evidence only','machine summaries','No measured usability/PMF claims; actual small study optional later','P2','T113','Yes for claim policy'),
('D-030: exact official case','input/official/Досуг и развлечения.pdf','22 pages; exact synthesis hash matches','Receipt authority; OFFICIAL_CASE_TEXT.md','None for source availability','None','None','Yes'),
('D-031: HTTPS/OpenAPI/DATA-API','apps/api/app.ts; scripts/openapi.ts','Swagger 3.0.3 generator; test fixtures; no generated bundle','No DATA-API.yaml or live deployment receipt','Generate/validate submission API package and judge scenario','P0','T112','Partial: reuse generator'),
('D-032: reproducible Docker <=5min','Dockerfile; compose*.yaml; README.md','Docker COPY requires absent lock; daemon down','typecheck/build/docker logs','Reviewed lock, clean image/start/timing, README','P0','T102,T112','No'),
('D-033: MAX mobile+web','apps/miniapp; no screenshots','Source only; target build unavailable','Build blocked; no client runtime checks','360/390/430 + MAX web full scenario evidence','P0','T111','No'),
('D-034 / ADR-008: immutable research','docs/research/2026-09-18/raw; INDEX','10 ZIPs preserved; 39 supplied manifest entries verified','IMPORT_MANIFEST/VERIFICATION; CRC inventory','None; old internal paths mapped externally','None','Done T070','Yes'),
('D-035: staged Codex workflow','AGENTS.md; docs/tasks; no .agents skills','Existing guardrails; no custom skills/CI','CODEX_WORKFLOW_AUDIT.md','Recommend 3 skills after review, no automatic installation','P2','T101','Partial'),
('Phase 2.2: sync checkpoint/partial safety','core/observations.ts; migrations; worker','Observation semantics exist; no durable sync-run importer','Worker only reconciles MAX outbox','Partial pagination/error must never tombstone; retry/checkpoint','P0','T107','No'),
('Phase 3: profile/interests/save','actors/search_contexts; ui contracts','Actor identity/private search filters only','migrations 0001–0003; App routes','Persist preferences and favorites across login/ended/unavailable','P0','T109,T110','No'),
('Phase 4: failure/security suite','tests/unit; tests/integration; no provider E2E','105 pure tests PASS; real-dependency suite unrun','COMMAND_RESULTS.json','Run provider/DB/queue/auth/idempotency failures; exact release evidence','P0','T111','No'),
('Phase 6: final presentation','research presentation-content; licences','Content blueprint; no accepted runtime screenshots','Imported verdict and notices','Claims to SHA evidence; full technical slide; donor provenance','P1','T112,T113','No')]
# Expand shorthand paths used in rows to a compact location legend.
text=['# Implementation gap matrix','', 'Source: HEAD 4f9a198d4fa2b18686efa19a59b6ac78281d341d and byte-preserved synthesis. All 35 D decisions, eight ADRs and implementation phases covered. P0 severity = mandatory delivery gate; P1 = quality/governance follow-up, not an instruction to expand product scope; P2 = deferred. A code-presence result is not runtime PASS.','', 'Path shorthand: core/ and unqualified normalizers.ts/types.ts/provider.ts refer to modules/search/core/; ui.ts/catalog.ts/sessions.ts/plans.ts/delivery.ts refer to packages/persistence/ unless explicitly qualified.','', '| Requirement / decision | Actual file / component | Current state | Evidence | Gap | Severity | Proposed task | No-change-needed |','|---|---|---|---|---|---|---|---|']
text += ['| '+' | '.join(x)+' |' for x in rows]
write('artifacts/preflight/IMPLEMENTATION_GAP_MATRIX.md','\n'.join(text))
write('artifacts/preflight/ORDERED_IMPLEMENTATION_TICKETS.md','''# Ordered proposed implementation tickets

**NOT STARTED.** Human review of this preflight is the prerequisite for every ticket below. T101–T113 are proposed IDs, not active tasks. One integration owner controls root dependencies, routes, contracts, session/auth and migrations. No blanket merge of old module archives.

| Order / ID | Concrete work and file boundary | Prerequisites | Acceptance / evidence |
|---|---|---|---|
| 1 / T101 — Reconcile scope and governance | AGENTS.md, docs/current, tasks and canonical overlay; correct stale TBD, breadth and broken authority paths without rewriting immutable imports. Optionally author the three reviewed repo skills. | Human review | Freeze overrides all old P0 flags; queue policy explicit; one active ticket; no feature changes. |
| 2 / T102 — Dependency and build baseline | package.json, reviewed package-lock.json, Dockerfile/compose only as necessary; README reproduction. Inspect pinned dependency metadata/peer compatibility and licences; recover required env example tracking. | T101 | Safe npm ci, unit/typecheck/build, real clean Docker build and one-command startup. No --force/unsafe overrides. Docker daemon must actually run. |
| 3 / T103 — Verify existing queue once | apps/worker/main.ts, packages/persistence/delivery.ts, governor, tests/integration/foundation.test.ts | T102 + working isolated PG/Redis | Duplicate, Redis loss, worker kill, UNKNOWN outcome/restart receipts. Close BLOCKED to KEEP_EXISTING_BULLMQ if green; any alternate decision needs workload/host evidence and reviewed ADR. No automatic migration. |
| 4 / T104 — Close provider runtime/manual gate | Canonical KudaGo probe/data gate, lawful sanitized artifacts; no approval by desk research | T102; manual provider-use clarification | All 12 tasks evaluated, threshold >=8 suitable tasks under frozen gate, zero critical false PASS, required v1.4 receipts. Resolve storage/cache/images/attribution/indexability/advertising use. No City=active or fallback before approval. |
| 5 / T105 — Integrate data safety contract | modules/search/core, packages/contracts, projections and integration-owned migration proposal | T101; T104 payload evidence for exact mapping | Stable Event/Occurrence identity and reschedule rules; conditional/unknown/free/raw evidence + scope; null end/geo; tests first for reproducible defects. Preserve equivalent existing fee logic. |
| 6 / T106 — Verify MAX bootstrap/API2 | platform auth/transport/ingress, sessions, miniapp bridge/client, API boundary | T102; real bot/attached Mini App provisioned | Valid/tampered/stale payloads, repeat login, cookie lifecycle, object authorization; API2 verified TLS from release image. No auth rewrite merely to match draft route names; credentials remain local. |
| 7 / T107 — Implement gated single-provider ingestion | Adapter transport, sync service/worker entry point, persistence/migrations under integration owner | T104 rights/runtime gate + T105 + T103 decision | Durable sync runs/checkpoints/source maps; duplicate-safe upsert; stale ordering; partial/429/timeout/malformed/poison runs cannot infer deletion; Moscow activation only with receipt. No Timepad P0 wiring. |
| 8 / T108 — PostgreSQL discovery and filters | persistence/catalog.ts, search core/API | T107 | Query representative corpus including >100 observations; date/category/budget/time filters; ended exclusion; strict UNKNOWN; benchmark PG FTS/pg_trgm where needed. No external search service, no unconditional PostGIS. |
| 9 / T109 — Personal persistence | Integration-owned migrations/contracts/API; favorites and preference services | T105,T106,T108 | Save/remove/replay/relogin stable refs; ended/unavailable saved item preserved; home city/interests/budget/time profile persists; Save remains separate from plan/Follow. |
| 10 / T110 — Frozen P0 UI | apps/miniapp/src components/styles/ports | T108,T109; T106 API contract | Для тебя / Поиск / Сохранённые + Мой Повод; occurrence detail/source primary CTA; honest conditional/unknown/source-unavailable/empty/loading/error. Apply Повод tokens, preserve team logo. Map/social/Follow not mandatory. |
| 11 / T111 — Failure and real-client acceptance | tests, proportional observability/privacy review and artifacts | T102–T110 | Final typecheck/unit/build; provider/DB/queue/auth/IDOR/idempotency failure suites; MAX mobile 360/390/430 + MAX web; saved/relogin/source opening and honest states. Screenshots from exact target build. No skip-as-PASS. |
| 12 / T112 — Submission reproducibility and provenance | README, OpenAPI 3.0/3.1, DATA-API.yaml, fixture/judge docs, licences | T111 | Docker build <=5min excluding initial base image pull; live HTTPS and attached MAX entry; exact portal schema/access checks; source SHA/hash/evidence manifest; recover EventHive copied-path/hash notice evidence. No working secrets committed. |
| 13 / T113 — Evidence-backed presentation | Claim/evidence register, designer handoff and final deck/demo | T112 | Real accepted screenshots; service slide per case; no fabricated interviews, provider approval or speed/PMF claims; disclose fallback data. |

After P0 is green: separate optional tickets for Follow/one Smart Povod loop/map (P1), then second city and shared plan (Stretch). Existing safe social code is retained; it is not a reason to promote its unfinished integration to P0.

Manual/external gates: Docker engine; KudaGo legal/use decisions; MAX account/attachment/client access; hosting HTTPS and submission portal schema/access. Complete independent code work within approved future tickets, but do not substitute a review for missing runtime execution.
''')
# Correct import count in prose.
p=r/'artifacts/preflight/CURRENT_STATE_RECEIPT.md';p.write_text(p.read_text('utf-8').replace('all 39 imported files','all 40 imported files'),encoding='utf-8')
print('Wrote conflicts, queue decision, workflow audit, 39-row gap matrix and 13 ordered proposed tickets.')
