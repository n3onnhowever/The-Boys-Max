from capture import *
def put(path, text):
    p=ROOT/path; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(text.strip()+'\n',encoding='utf-8')
put('docs/tasks/ACTIVE_TASK.md','''# Active task

`101_SCOPE_GOVERNANCE.md` — the only active implementation ticket.
T101 then T102 are authorized by the 2026-09-19 user request. T102 starts only after T101 acceptance.
Stop after T102 for human review. T103–T113 are not authorized by this pass.
One integration owner controls shared contracts, routes, migrations, auth/session and root dependencies.
Previous T001 → T010 → T070 pointers are historical; see the preserved preflight and T101 baseline documents.
''')
put('docs/tasks/101_SCOPE_GOVERNANCE.md','''# T101 — Reconcile scope and governance

Status: ACTIVE (2026-09-19 user authorization after T070 review).
Owner: the single integration writer.

Inputs: root AGENTS.md; artifacts/preflight/{CURRENT_STATE_RECEIPT,IMPLEMENTATION_GAP_MATRIX,CONFLICTS,QUEUE_DECISION}.md; docs/current/POVOD_SOURCE_AUTHORITY.md and every canonical source linked there; accepted ADRs and synthesis; starting HEAD 4f9a198d4fa2b18686efa19a59b6ac78281d341d plus existing uncommitted preflight imports.

Scope: product Повод / team The Boys; frozen Moscow solo-first P0; repair active scope, paths and task pointers; preserve historical docs/imports. Queue BLOCKED, preserve BullMQ/Redis/outbox/governor pending T103. No UI branding or MAX nickname change.
No third-party tooling, MCP, hooks or second writer. Small local Skills are optional, not required.
Acceptance: no application behavior change; unambiguous P0 and queue policy; imports unchanged; history preserved; git diff --check passes; concise evidence/handoff.
On PASS, activate T102 only.
''')
put('docs/tasks/102_DEPENDENCY_BUILD_BASELINE.md','''# T102 — Dependency and build baseline

Status: PENDING T101 acceptance; authorized next by 2026-09-19 user request.
Owner: the single integration writer.
Inputs: T101 handoff; package.json/.npmrc; Dockerfile/compose; env examples; README; preflight receipts and canonical authority in docs/current/POVOD_SOURCE_AUTHORITY.md.

1. Review package.json; generate real lock using npm install --package-lock-only --ignore-scripts. On resolution conflict stop this subtask, record exact error and propose minimal fix. No force, fabricated lock or silent major upgrades.
2. Once valid, clean install from lock with lifecycle scripts disabled; inspect any scripts before enabling them.
3. Run existing verify:dependencies, syntax, test:unit, typecheck, build scripts with exact commands/exits/logs.
4. Repair local reproduction docs and safe env-example tracking. No fabricated provenance; unresolved donor evidence belongs to T112.
5. Run docker info first. If unavailable: BLOCKED_DOCKER_DAEMON; no system repair; continue independent work. If available: inspect config, separate base-image pull time, build/start/health/stop/restart/logs and actual versions. No T103 queue fault injection.
6. Record host versions, installed graph, exact source state, secret/prohibited-file scan, diff check and final status.

Do not change application/UI/auth/Event/Occurrence semantics or queue technology. Do not run provider gates/live ingestion, implement favorites/profile/Smart, add a city, PostGIS/pg_trgm/FTS migrations or new infrastructure.
Stop after evidence/handoff. No active next ticket until human review.
''')
put('AGENTS.md','''# Повод / The Boys — repository rules

## Product and authority
- Product: **Повод**. Team: **The Boys**. Old names are historical. Do not change the real MAX bot nickname; UI branding belongs to T110.
- Frozen P0: Moscow, solo-first, MAX identity, live events, structured filters, Occurrence detail, price/UNKNOWN/source, Save, basic «Мой Повод», MAX mobile + web. A group is never required.
- P1: Follow, Smart Povod, map. Stretch: second city, Shared Plan/social. Do not promote old P0 flags.
- Authority: official case → FINAL SCOPE FREEZE → Product Spec + Data Safety Patch → Product Contract → accepted ADR → identified runtime evidence → research. Exact paths and conflict overrides: [current authority](docs/current/POVOD_SOURCE_AUTHORITY.md).
- Imported specs/ADRs/synthesis and raw research stay byte-preserved. Old tasks, prompts and research instructions do not activate work.

## Architecture and safety
- TypeScript/Fastify + React/Vite; modular monolith with separate API and worker roles. PostgreSQL is durable business truth.
- Queue decision is **BLOCKED** pending T103 runtime verification. Preserve existing Redis/BullMQ/outbox/governor. No pg-boss migration, removal or new queue architecture in T101/T102.
- MAX Bot API is server-side; MAX Bridge is client-side. Keep durable ingress/outbox/idempotency and explicit external-delivery outcomes.
- Keep EventProvider, AiProvider and map/geocoding ports. No new infrastructure without measured need and accepted ADR.
- Event != Occurrence; Save != Follow != suitable/voted/committed. Commitments bind to current semantic terms; material changes require explicit re-confirmation.
- Preserve source, timestamps, territory, uncertainty and limitations. Unknown price/fee remains unknown. Never recommend ended events as future or invent facts, purchase, availability, coordinates or end time.
- LLM output is advisory; never decides authorization, commitment, hard eligibility or official facts. Label synthetic/test data.
- No spend without approval; never print/request secrets. Use env names and safe examples. No VPN/mirrors/TLS bypass/force shortcuts.
- Before reusing third-party code/assets, record pinned source, licence, adapted paths and notices. Closed products are UX references only. Donor acceptance requires actual licence/dependency/runtime evidence. Preserve The Boys logo separately from product brand.

## Work and evidence
- Read [ACTIVE_TASK](docs/tasks/ACTIVE_TASK.md); only one implementation ticket active. One writer; one integration owner for contracts/routes/migrations/dependencies/auth/session.
- Inspect git status and record starting SHA before edits; preserve pre-existing changes. Start from listed inputs, not the full archive. Prefer the smallest correct change; tests first for reproducible defects.
- No third-party skill collections, new MCP servers, hooks or marketplace tools in this pass.
- Run task-appropriate targeted checks and final existing typecheck/unit/build scripts, git diff --check, secret/prohibited-file scan and git status. Keep exact commands, exits and logs tied to source hashes.
- Docker/PG/Redis/MAX/provider/browser checks are PASS only if executed. Required unavailable dependencies get BLOCKED_* plus exact reproduction commands; complete independent work.
- End significant tasks with docs/handoffs/<task>.md: inputs/revision, files, actual checks, NOT_RUN/BLOCKED, contract deltas, risks and next action. Stop after T102 for human review.
''')
put('docs/current/POVOD_SOURCE_AUTHORITY.md','''# Повод — current source authority (2026-09-19)

Product: **Повод**. Team: **The Boys**. Implementation authorization is limited to T101 → T102 in this pass; [ACTIVE_TASK](../tasks/ACTIVE_TASK.md) is the sole execution pointer. Imported kickoff prompts remain inert references.

Precedence, highest first:
1. [Official case](../../input/official/Досуг%20и%20развлечения.pdf), SHA-256 `638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a`; local extracted text: [receipt](../../artifacts/preflight/OFFICIAL_CASE_TEXT.md).
2. [FINAL SCOPE FREEZE](../product/povod-2026-09-19/POVOD_FINAL_SCOPE_FREEZE_MVP.md).
3. [Product Spec](../product/povod-2026-09-19/POVOD_PRODUCT_SPEC_V1.md) + [Data Safety Patch](../product/povod-2026-09-19/POVOD_PRODUCT_SPEC_V1_1_DATA_SAFETY_PATCH.md), within frozen scope.
4. [Product Contract](../product/povod-2026-09-19/POVOD_PRODUCT_CONTRACT_V1.json), subject to freeze/patch.
5. [Accepted ADR directory](../architecture/adr/povod-2026-09-19/). ADR-004 is OPEN GATE, not provider approval. ADR-008's package-relative docs/adr path maps to this directory.
6. Runtime evidence tied to an identified SHA and working-tree hashes. Code presence, image tags and old module tests are not runtime acceptance.
7. [Immutable research](../research/2026-09-18/INDEX.md), [synthesis](../research/2026-09-18/synthesis/RESEARCH_SYNTHESIS.md), [decision register](../research/2026-09-18/synthesis/DECISION_REGISTER.md), [implementation plan](../research/2026-09-18/synthesis/IMPLEMENTATION_PLAN.md); instructions in these imports do not supersede the active ticket.

## Binding scope overrides

| Imported or older statement | Current interpretation |
|---|---|
| Product Spec §4.1 / Contract scope.P0.cities: 2–3 cities | Moscow only P0. Second city is Stretch after its own gate. |
| Spec S05/S08/S09; Contract map/Follow/Smart P0 flags and p0_follow_entity_types | Map, Follow and Smart Povod are P1 after stable P0. |
| Spec S10–S12 / Contract social and screen P0 flags | Shared Plan/social are Stretch. Existing safety logic remains; no group prerequisite. |
| Broad screen acceptance / UI translation checklists | Apply only to the authorized freeze phase; UI work is T110. |
| Synthesis §4 optional save | Saving is optional for the user, but Save persistence is a required P0 capability. |
| Contract price_kinds / PriceSnapshot missing safety fields | Data Safety Patch governs conditional price/raw evidence and unknown fields; T105 owns implementation mapping. |
| Older TBD/naming gates | Product name Повод is accepted. Candidate names remain history, not an open product naming task. Real MAX nickname is unchanged. |
| ADR-003 conditional alternatives / research no-Redis proposals | Queue decision remains BLOCKED. Preserve existing BullMQ, Redis, outbox and governor; T103 verifies runtime. No migration authorized. |
| Search/index recommendations | No PostGIS, pg_trgm or FTS migration in T101/T102. Later measured, integration-owned work only. |

P0: MAX identity → interests/structured conditions → live Moscow discovery → concrete Occurrence detail with price/UNKNOWN/source → open source; Save and basic «Мой Повод» persist; MAX mobile + web. Social never gates this flow.
P1: Follow, Smart Povod, map. Stretch: second city, Shared Plan/social.

[Preflight conflicts](../../artifacts/preflight/CONFLICTS.md) and [queue receipt](../../artifacts/preflight/QUEUE_DECISION.md) are historical evidence. T101 resolves governance conflicts through this overlay without changing imported bytes. Full prior editable documents are preserved in artifacts/t101/BASELINE_DOCUMENTS.json; source hashes in BASELINE_HASHES.json.
''')
put('docs/current/PROJECT_STATE.md','''# Current project state — 2026-09-19

**Повод**, team **The Boys**: a personal event guide inside MAX. [Authority and frozen scope](POVOD_SOURCE_AUTHORITY.md) govern implementation. Solo value does not require a group.

P0: Moscow, MAX identity, live events, structured filters, Occurrence detail, price/UNKNOWN/source, Save and basic «Мой Повод», mobile + web. P1: Follow/Smart Povod/map. Stretch: second city/social.

Code baseline: main, `4f9a198d4fa2b18686efa19a59b6ac78281d341d`, extracted result-26 implementation. The completed T070 imports/evidence were uncommitted when T101 started; this pass preserves them. [Preflight receipt](../../artifacts/preflight/CURRENT_STATE_RECEIPT.md) records 105/105 unit tests, missing root lock/tsc and unavailable Docker at that time, not current build acceptance.

Execution: follow [ACTIVE_TASK](../tasks/ACTIVE_TASK.md). Only T101 then T102 are authorized now; stop for human review afterward. T103 owns existing queue runtime verification; classification remains BLOCKED. No blanket merge of result archives or new broad research.

History: «Есть планы», «Договорились», «Туда» and other names were candidates; TBD was the old status. Result 27/29/30 module test counts are historical local evidence, not tests of this tree. Previous project-state text and work order are preserved in artifacts/t101/BASELINE_DOCUMENTS.json.
''')
put('docs/current/DECISIONS.md','''# Accepted current decisions

Authority: [POVOD_SOURCE_AUTHORITY](POVOD_SOURCE_AUTHORITY.md), including explicit overrides of immutable imported specs.

- Product **Повод**; team **The Boys**. MAX bot nickname is unchanged; UI branding is T110.
- Frozen P0: Moscow; solo-first MAX identity, live events, structured filters, Occurrence detail, price/UNKNOWN/source, Save, basic «Мой Повод», MAX mobile + web.
- P1: Follow, Smart Povod, map. Stretch: second city and Shared Plan/social. No group prerequisite.
- TypeScript/Fastify modular monolith, separate API/worker, React/Vite Mini App, PostgreSQL durable truth.
- Queue gate **BLOCKED** pending T103: keep existing Redis/BullMQ/outbox/governor. No migration or new queue architecture.
- Unknown fees/prices stay unknown; conditional price and provenance follow Data Safety Patch. AI is optional advice, never authorization or hard facts.
- KudaGo remains conditional / NOT APPROVED; no live ingestion or provider gate in T101/T102.
- One active implementation ticket; one integration owner for shared contracts/routes/migrations/dependencies/auth/session. Stop after T102 for human review.
- No new spend, third-party tooling, MCP or hooks in this pass.

Earlier decisions (including TBD and the old work order) are preserved in artifacts/t101/BASELINE_DOCUMENTS.json. Imported ADRs remain unchanged.
''')
put('docs/current/KNOWN_GAPS.md','''# Known gaps / gates

Current scope: [authority](POVOD_SOURCE_AUTHORITY.md). Execution: [active ticket](../tasks/ACTIVE_TASK.md). The preflight gap matrix is historical evidence, not permission to activate all proposed tickets.

- T102: dependency resolution/real lock, clean install, typecheck/build and Docker one-command reproduction need fresh evidence. Preflight Docker was BLOCKED_DOCKER_DAEMON; image tags are not observed versions.
- T103: PG/Redis/BullMQ/outbox/governor runtime verification; queue decision remains BLOCKED. Preserve all existing code.
- T104: KudaGo runtime + manual provider-use/rights gate; no approval or live importer currently established.
- T105: integration-owned safety mapping to Event/Occurrence and stable identifiers, conditional/unknown data.
- T106/T111: attached MAX Mini App, valid/repeat login and mobile/web/API2 runtime evidence.
- T107–T110: live ingestion, discovery, Save/basic profile persistence and frozen UI remain separate work. Existing UI says Афиша; branding changes are deferred to T110.
- T112: EventHive adapted paths/hashes referenced by licenses/module-22-NOTICES.md are absent (`analysis/REUSE_AND_LICENSES.csv`). Keep notices and unresolved provenance; do not invent missing evidence. Final HTTPS/OpenAPI/DATA-API, judge scenario and <=5-minute Docker timing remain submission gates.
- T113: presentation and user-research claims must follow actual evidence. Historical module/donor checks are not current app acceptance.

No pending map/Follow/Smart/social work blocks frozen P0. No blanket merge of older result ZIPs. Prior gap text is preserved in artifacts/t101/BASELINE_DOCUMENTS.json.
''')
put('docs/product/PRODUCT_FRAME.md','''# Повод — product frame

Team: The Boys. [Canonical authority](../current/POVOD_SOURCE_AUTHORITY.md) controls frozen scope.

Priority P0 path: open attached Mini App in MAX → server-validated MAX identity → interests and structured conditions → live Moscow events → concrete Occurrence detail → honest price/UNKNOWN, place and source → open source. Save and basic «Мой Повод» preferences persist across repeat login. Support MAX mobile and web.

P1: Follow, Smart Povod, map. Stretch: second city and optional Shared Plan / invite friends. Social is never required for personal value. Preserve existing distinctions between saved, suitable, voted and committed; material changes invalidate current commitment until explicit re-confirmation.

No ticket purchase/payment/live availability claims, obligatory LLM, multi-provider launch or nationwide coverage. Unknown data is never invented.

Candidate metrics remain hypotheses until measured: successful solo path, time to useful occurrence, source-open/save/repeat-login success and critical false-PASS count. Prior group-oriented metrics and product-frame text are historical and preserved in artifacts/t101/BASELINE_DOCUMENTS.json.
''')
p=ROOT/'docs/TARGET_ARCHITECTURE.md'
s=p.read_text(encoding='utf-8');s=s.replace('# Target architecture','# Target architecture — Повод\n\nCurrent authority: [scope and decisions](current/POVOD_SOURCE_AUTHORITY.md). Queue gate is **BLOCKED** until T103. Preserve Redis/BullMQ/outbox/governor; no queue migration or new infrastructure in T101/T102. The diagram shows module boundaries/target ports, not proof of a live provider or AI integration.')
put('docs/TARGET_ARCHITECTURE.md',s)
p=ROOT/'docs/design/BRAND_BRIEF.md';s=p.read_text(encoding='utf-8').replace('**Product brand: TBD**','**Product brand: Повод**');s=s.replace('## Required visual outputs','Current scope is governed by [authority](../current/POVOD_SOURCE_AUTHORITY.md). Brand implementation belongs to T110. Map/Follow/Smart are P1; plan/invite are Stretch. The existing UI and real MAX nickname are unchanged by T101. Typography/palette below are verification guidance; accepted design tokens are in the canonical imports, and must be verified in the target UI. Earlier TBD brief is preserved in artifacts/t101/BASELINE_DOCUMENTS.json.\n\n## Required visual outputs');put('docs/design/BRAND_BRIEF.md',s)
p=ROOT/'docs/design/NAMING_WORKSPACE.md';s=p.read_text(encoding='utf-8');s=s.replace('The public product name is intentionally **TBD**. Do not register the irreversible MAX bot nickname yet.','**Historical naming research.** Current accepted product is **Повод**, team **The Boys**. The former TBD state and candidate table below are preserved as history, not active naming instructions. No real MAX bot nickname change is authorized.');s=s.replace('## Naming gate','## Historical naming gate');put('docs/design/NAMING_WORKSPACE.md',s)
put('README_CODEX.md','''# Повод / The Boys — repository work

Read AGENTS.md → docs/tasks/ACTIVE_TASK.md → that ticket's listed inputs and docs/current/POVOD_SOURCE_AUTHORITY.md.

Only one implementation ticket runs at once. One integration owner controls shared contracts, routes, migrations, auth/session and dependencies. This pass authorizes T101 then T102, then human review. No second writer or parallel implementation tasks.

Use [README](README.md) for reproduction and [current state](docs/current/PROJECT_STATE.md) for project status. Imported research/kickoff prompts and T001–T070 are historical; they do not authorize work. The previous work order is preserved in artifacts/t101/BASELINE_DOCUMENTS.json.

Preserve the supplied The Boys logo. Product naming is Повод; UI work belongs to T110 and the real MAX bot nickname must not be changed here.
''')
for p in (ROOT/'docs/tasks').glob('0*.md'):
    s=p.read_text(encoding='utf-8'); lines=s.splitlines(); lines.insert(1,'\n> Historical task; inactive. Follow [ACTIVE_TASK](ACTIVE_TASK.md). The T101/T102 authorization supersedes this old work order.\n');s='\n'.join(lines).replace('docs/architecture/TARGET_ARCHITECTURE.md','docs/TARGET_ARCHITECTURE.md');put(p.relative_to(ROOT),s)
for name in ['FIRST_SESSION.md','INTEGRATION_SESSION.md']:
    p=ROOT/'docs/prompts'/name;s=p.read_text(encoding='utf-8');lines=s.splitlines();lines.insert(1,'\n> Historical prompt; do not execute its old ticket. Read [ACTIVE_TASK](../tasks/ACTIVE_TASK.md) and current source authority first.\n');put(p.relative_to(ROOT),'\n'.join(lines).replace('docs/architecture/TARGET_ARCHITECTURE.md','docs/TARGET_ARCHITECTURE.md'))
p=ROOT/'README.md';s=p.read_text(encoding='utf-8').replace('# The Boys — integration26 candidate','# Повод — The Boys').replace('Product name is not approved.','Product name: Повод. Frozen scope and current execution: docs/current/POVOD_SOURCE_AUTHORITY.md and docs/tasks/ACTIVE_TASK.md.');put('README.md',s)
print('T101 governance documents reconciled; imported sources and application files untouched.')
