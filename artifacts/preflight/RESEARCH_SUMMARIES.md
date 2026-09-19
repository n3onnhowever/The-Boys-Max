# architecture
## machine_summary.json
{
  "topic": "architecture",
  "date": "2026-09-18",
  "final_verdict": "Freeze the queue bake-off. Test whether P0 needs a generic queue; if durable jobs are required and Node>=22.12/PostgreSQL>=13 pass the runtime gate, pg-boss is the conditional default. Keep an already runtime-verified BullMQ path. Reject/defer Kafka, Redpanda and workflow platforms for P0.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [
    "No product scope change.",
    "Add a repository/runtime gate before queue implementation.",
    "Prefer no generic queue if one scheduled sync is sufficient.",
    "Otherwise conditional pg-boss adoption after runtime tests.",
    "Correct Occurrence identity so mutable time/place is not permanent identity.",
    "Treat retry/concurrency values as provider-dependent proposals."
  ],
  "p1_changes": [
    "Smart Povod notification queue/delivery ledger explicitly deferred to P1.",
    "Notification deduplication and MAX outbound rate/ambiguous-send handling belong to P1."
  ],
  "stretch_changes": [
    "Kafka/Redpanda only if real multi-consumer replayable event-stream requirements appear.",
    "Temporal only if true long-lived workflows with timers/signals/compensations appear."
  ],
  "keep": [
    "Frozen solo-first P0",
    "Event != Occurrence",
    "provenance/source",
    "honest UNKNOWN",
    "database business idempotency",
    "existing verified BullMQ if present"
  ],
  "change": [
    "pg-boss from unconditional-looking conclusion to conditional default",
    "occurrence identity contract",
    "retry/concurrency certainty",
    "notification scope classification"
  ],
  "defer": [
    "BullMQ PostgreSQL new adoption",
    "Temporal",
    "Trigger.dev",
    "Inngest",
    "Smart Povod notifications",
    "multi-provider event bus"
  ],
  "reject": [
    "Kafka for P0",
    "Redpanda for P0",
    "Graphile Worker for P0 versus pg-boss",
    "custom general-purpose SKIP LOCKED queue",
    "new Redis/Valkey solely for P0 queueing"
  ],
  "blockers": [
    "Current 2026-09-18 The-Boys-Max HEAD/runtime not accessible.",
    "Provider-specific quota/latency/rate-limit/occurrence-ID behavior not verified in this architecture pass."
  ],
  "open_questions": [
    "Current Node version and package/lock dependencies",
    "Current compose services and database version",
    "Whether Redis/Valkey/BullMQ already exists",
    "Whether P0 truly needs ad-hoc stale refresh",
    "Provider stable occurrence/session identifier",
    "Provider rate-limit contract",
    "PgBouncer/pooler mode and DB migration privileges"
  ],
  "runtime_checks": [
    "install/build",
    "migration clean/upgrade",
    "enqueue-restart",
    "kill before commit",
    "kill after commit before ack",
    "duplicate import",
    "partial pagination",
    "429 Retry-After",
    "timeout/503",
    "poison item",
    "terminal/DLQ",
    "graceful shutdown",
    "schedule restart",
    "stale response ordering"
  ],
  "manual_checks": [
    "current repository gate",
    "provider occurrence identity semantics",
    "provider quota docs",
    "hosting scheduler availability",
    "DB migration permissions",
    "pooler mode"
  ],
  "legal_checks": [
    "Only if selected later: Redpanda BSL/RCL",
    "Only if selected later: Inngest server SSPL/future license",
    "Record exact Redis version/license if Redis is intentionally adopted",
    "Hosted workflow-platform terms/data residency if later used"
  ],
  "recommended_actions": [
    "Run repository/runtime Gate 0.",
    "Choose no queue vs existing BullMQ vs pg-boss exactly once.",
    "Implement DB idempotency and partial-sync invariants independent of queue.",
    "Run failure suite and archive evidence.",
    "Lock ADR and stop queue comparison during P0 implementation."
  ],
  "sources_count": 43
}
## EXECUTIVE_VERDICT.md
# EXECUTIVE VERDICT

## Verdict

**RECOMMENDATION — freeze the queue comparison.**

For the frozen P0, the architecture should be the smallest durable design that preserves data correctness:

- **Option 0:** no generic queue if the actual P0 implementation needs only one periodic provider synchronization and can execute it as an idempotent scheduled command with durable PostgreSQL sync/checkpoint state.
- **Conditional default if a queue is truly needed:** PostgreSQL + `pg-boss`, provided the current repository/runtime gate confirms Node.js >=22.12, PostgreSQL >=13, and a kill/restart/duplicate smoke suite passes.
- **Exception:** if the current HEAD already has BullMQ + Redis/Valkey integrated and runtime-verified, keep it through the hackathon. Do not migrate just for architectural neatness.

## Do not introduce for P0

Kafka, Redpanda, Temporal, Trigger.dev, Inngest, custom full queue semantics, CDC/Debezium, or a new Redis/Valkey service solely to host background jobs.

## Why

The present P0 workloads are job/command shaped: provider fetch, retry, refresh and import deduplication. They are not yet a replayable multi-consumer event-stream problem or a long-lived durable workflow problem.

## Main blocker

The latest `The-Boys-Max` HEAD and live compose/runtime are not accessible in this verification context. The latest available project baseline is from 2026-09-16 and explicitly says it does not establish npm/build, Docker, PostgreSQL, Redis, browser, MAX, live-provider or E2E acceptance.

## Main action

Run the repository/runtime gate in `RUNTIME_VERIFICATION_REQUIRED.md`. That single gate decides between:
- no generic queue,
- pg-boss,
- or KEEP existing verified BullMQ.

Do not reopen the Kafka/Temporal/platform comparison after that gate unless the workload category itself changes.

## GAPS_AND_OPEN_QUESTIONS.md
# GAPS AND OPEN QUESTIONS

## BLOCKERS

### B1 — current repository HEAD/runtime
The connected GitHub context cannot see `The-Boys-Max`. The freshest accessible baseline is dated 2026-09-16 and has no remote. It explicitly does not prove runtime acceptance.

Needed:
- current Git SHA;
- `package.json` / lock;
- Node version;
- Compose services/images;
- current worker code;
- database and Redis/Valkey runtime;
- current migration state.

### B2 — provider-specific operational envelope
Needed from the selected provider/live gate:
- exact documented quota if any;
- observed 429 behavior;
- `Retry-After` behavior;
- timeout distribution;
- pagination/resume behavior;
- stable occurrence/session identifiers;
- partial response semantics.

## OPEN QUESTIONS

1. Is one periodic provider sync sufficient for P0?
2. Is stale-on-read refresh actually required for P0?
3. Is BullMQ already in current HEAD?
4. Is Redis/Valkey already required by another verified component?
5. Is Node >=22.12 in local and Docker runtime?
6. Is PostgreSQL >=13 and canonical?
7. Are DB credentials allowed to create/update job schema?
8. Is PgBouncer present and, if so, which pooling mode?
9. How should a provider without stable session IDs reconcile reschedules?
10. What is the freshness SLO for Moscow demo data?

## HUMAN / MANUAL DECISIONS

- Choose acceptable event freshness interval.
- Decide whether to remove an existing queue only if it is unverified/dead code; never rewrite a working P0 merely for preference.
- Approve provider-specific occurrence reconciliation rules.
- Confirm any hosting scheduler if the no-queue path is chosen.

## LEGAL CHECKS

Not a P0 blocker under the recommended design.

Only if later selected:
- Redpanda BSL/RCL;
- Inngest server SSPL/future license;
- Redis exact version/license option;
- hosted workflow-platform terms/data residency.


# codex-workflow
## machine_summary.json
{
  "topic": "codex-workflow",
  "date": "2026-09-18",
  "final_verdict": "Keep the one-writer, concise-AGENTS, small repo-local Skills, deterministic verification, runtime-evidence and independent-review model; simplify further by starting with no hooks/MCP/custom-prompt dependency and by staging Skills.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [
    "No product-scope change. Add only implementation-process guardrails after repository preflight."
  ],
  "p1_changes": [],
  "stretch_changes": [],
  "keep": [
    "concise root AGENTS.md",
    "one implementation writer",
    "read-only semantic review",
    "deterministic tests/lint/typecheck/build",
    "runtime evidence for runtime claims",
    "small repo-local custom Skills",
    "MCP default-off",
    "Playwright CLI/Test preference over MCP for routine runtime evidence"
  ],
  "change": [
    "stage 3 custom Skills before all 6",
    "no initial SessionStart hooks",
    "do not depend on legacy custom prompts",
    "subagents are quality/parallelism tools, not token-saving tools",
    "reviewer defaults read-only with normal on-request approval unless explicitly noninteractive",
    "allow_login_shell=false only after host compatibility smoke",
    "do not suggest WSL migration during hackathon",
    "correct Serena security statement: cited issues are patched in current v1.7.0"
  ],
  "defer": [
    "Playwright MCP",
    "GitGuardian skill unless existing scanning insufficient",
    "Context7 until version-specific docs pain",
    "Serena until post-hackathon",
    "Repomix except narrow emergency handoff",
    "Codex Cloud Code Review until GitHub remote/workflow is live",
    "Security Review except targeted eligible security PRs",
    "hooks until measured need",
    "ExecPlan files except genuinely long/multi-stage work"
  ],
  "reject": [
    "wholesale skill marketplaces/collections",
    "Superpowers framework adoption for P0",
    "docker/docker-agent as alternate harness",
    "multiple overlapping writer agents",
    "legacy custom prompt folder as project backbone",
    "WSL migration during hackathon",
    "automatic model pin/auto-upgrade without smoke",
    "yolo/danger-full-access as normal mode"
  ],
  "blockers": [
    "working tree not accessible in research environment",
    "direct byte-level canonical four Povod files not retrievable here",
    "actual package/test/build/CI/Playwright commands unknown",
    "installed Codex host version/config unknown",
    "no Povod runtime executed"
  ],
  "open_questions": [
    "existing AGENTS/.codex/.agents state",
    "actual active ticket and baseline HEAD",
    "authoritative verification commands",
    "existing secret/dependency scanning",
    "existing Playwright stack",
    "Git remote/Codex Cloud availability"
  ],
  "runtime_checks": [
    "Codex host/config smoke",
    "AGENTS scope smoke",
    "Skill trigger positive/negative tests",
    "sandbox/network/read-only reviewer behavior",
    "real deterministic repo gates",
    "Playwright local UI evidence where required",
    "MAX runtime separately where required",
    "live provider smoke when provider path changes",
    "third-party skill trigger/security smoke if installed"
  ],
  "manual_checks": [
    "review current AGENTS before editing",
    "review every external skill tree/scripts/hooks/network/secret access",
    "decide Codex version pin for final hackathon window",
    "confirm remote MCP data-sharing acceptability"
  ],
  "legal_checks": [
    "per-skill licence before vendoring",
    "CC-BY-SA implications for Trail of Bits content",
    "GPL implications before any Serena redistribution/integration",
    "mixed licence check for Anthropic skills"
  ],
  "recommended_actions": [
    "run Gate 0 repo preflight",
    "audit rather than replace AGENTS.md",
    "add Phase-1 custom Skills only",
    "run Skill trigger eval",
    "smoke minimal Codex permissions config",
    "use built-in /review before a custom reviewer",
    "add Phase-2 domain Skills after Phase-1 works",
    "derive runbooks/CI only from real commands",
    "use existing Playwright stack first",
    "write evidence-backed handoff"
  ],
  "sources_count": 42
}

## EXECUTIVE_VERDICT.md
# EXECUTIVE VERDICT

**Status:** FINAL WITH OPEN BLOCKERS  
**Date:** 2026-09-18

## Verdict

Keep the existing direction, but simplify the implementation harness.

**Recommended operating model:**

`ticket → native repo context → minimal plan → one writer → targeted tests → deterministic gates → required runtime evidence → read-only review → diff check → commit → handoff`

### Adopt now

- concise root `AGENTS.md`;
- staged repo-local custom Skills:
  - phase 1: `scope-guard`, `test-and-verify`, `runtime-evidence`;
  - phase 2 after trigger smoke: `data-safety`, `provider-adapter`, `max-integration`;
- one writer by default;
- read-only reviewer (`/review` or narrow custom agent);
- existing Playwright Test/CLI for UI/runtime evidence if already present;
- network-off `workspace-write`/`on-request` posture for the implementation agent, subject to host smoke;
- durable evidence receipts and handoffs for substantial work.

### Do not adopt now

- whole skill marketplaces/collections;
- always-on Playwright MCP;
- Serena;
- Superpowers as a framework;
- Docker Agent as a replacement harness;
- Context7 auto-triggered for every code question;
- project hooks by default;
- legacy custom prompts as a project contract;
- multiple overlapping writer agents;
- a WSL migration during the hackathon.

## Main blocker

The actual Povod working tree and byte-level canonical files are not available to this research environment. Exact test/build/CI commands, current `AGENTS.md` and current Codex/Playwright setup therefore require a read-only Codex preflight on the host before any config or workflow file is changed.

## Next action

Run the baseline audit in `CODEX_ACTIONS.md`. Do not install third-party skills or change CI until that audit records the real repository commands and existing tooling.

## GAPS_AND_OPEN_QUESTIONS.md
# GAPS AND OPEN QUESTIONS

## BLOCKERS for exact rollout

1. **Working tree unavailable here.** The actual `The-Boys-Max` repository could not be read in this research environment.
2. **Canonical files unavailable byte-for-byte here.** The four named source-of-truth files were not found as direct File Library resources. Their current project constraints were supplied authoritatively in the user request, but Codex must still read the exact working-tree files before editing.
3. **Current `AGENTS.md` unknown.** The final file must be an edit/audit of the real existing file, not a blind replacement generated from this archive.
4. **Package/test commands unknown.** Package manager, scripts, test runner, build command and current CI must be discovered from manifests.
5. **Current Playwright state unknown.** Do not add a second browser stack before checking dependencies/config/tests.
6. **Current Codex host version/config unknown.** Research verified current upstream state, not the user's installed runtime.

## OPEN QUESTIONS

- Does the repository already contain `.agents/skills`, `.codex/config.toml`, `.codex/agents`, hooks, or third-party skill material?
- Is the repository currently a clean Git repository with a valid baseline/HEAD?
- What is the actual active ticket after baseline work (T010 or a later task)?
- Which deterministic commands are authoritative for unit tests, integration tests, lint, typecheck and build?
- Is Playwright Test already installed? If yes, which version and which project/browser config?
- Does CI/hosting already provide secret scanning, dependency auditing or CodeQL/Semgrep, making GitGuardian unnecessary?
- Is a GitHub remote connected and is Codex Cloud Code Review available to the team?
- Do any current tasks truly span enough time/sessions to justify an ExecPlan file?
- Are there repository directories whose local rules differ enough to justify nested `AGENTS.md` files?

## Human/manual decisions

- Approve any new third-party skill after preview, licence review and script/network/secret audit.
- Decide whether to pin the current Codex CLI version for the remaining hackathon window after a smoke test.
- Decide whether GitGuardian external account/network dependency is acceptable if existing scanning is insufficient.
- Decide whether any remote documentation MCP (Context7 or similar) may receive library queries from the repo context.

## Legal checks

No new product licensing dependency is required by the recommended core workflow. Manual licence review is required only if third-party skill content is copied/vendored:

- Playwright / Playwright CLI: Apache-2.0.
- GitGuardian agent skills: MIT.
- Trail of Bits skills: CC-BY-SA-4.0; share-alike implications matter if content is copied/adapted.
- Serena application: GPL-3.0-or-later; SolidLSP: MIT; combined distribution GPL.
- Anthropic skills: mixed/per-skill licences; do not infer root-level permission.

## What requires runtime verification

See `RUNTIME_VERIFICATION_REQUIRED.md`.

## What can be considered closed

- Native Codex locations/mechanics for `AGENTS.md`, repo-local Skills, custom agents, MCP and hooks.
- Progressive-disclosure model and skill discovery cap.
- Subagent token-cost caveat.
- Current upstream repo status/licences/releases listed in this archive.
- The decision **not** to install broad skill catalogues for P0.
- The decision **not** to introduce an alternate agent harness for P0.
- The decision **not** to claim MAX/provider/browser runtime behavior without runtime evidence.


# data-pipeline
## machine_summary.json
{
  "topic": "data-pipeline",
  "date": "2026-09-18",
  "final_verdict": "PostgreSQL 17.11/18.6 + stable PostGIS 3.6.x + PostgreSQL FTS/pg_trgm is the recommended P0 baseline. KudaGo must be treated as a page-based reconciliation source, not a documented update-cursor source. Runtime sufficiency and KudaGo/MAX legal fit remain unverified. No Redis or external search engine for P0.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [
    "Add provider sync-run completeness/checkpoint semantics; incomplete runs cannot drive deletion.",
    "Add/confirm source mappings separate from canonical Event/Occurrence/Venue IDs.",
    "Add price_scope EVENT|OCCURRENCE|UNKNOWN and retain raw price text.",
    "Separate exact raw_body when needed from parsed JSONB.",
    "Use one condition revision/fingerprint for condition changes.",
    "Use PostgreSQL FTS+GIN, pg_trgm and PostGIS as baseline, then benchmark.",
    "Add provider drift/UNKNOWN/freshness metrics.",
    "Record KudaGo legal/source-link gate in release readiness."
  ],
  "p1_changes": [
    "Calibrate ranking from evidence/follows when actually in scope.",
    "Add cross-provider dedup only when second provider exists.",
    "Consider richer synonyms/transliteration after labelled relevance tests.",
    "Consider caching only after benchmark."
  ],
  "stretch_changes": [
    "External search engine only after measured Postgres/search-product gap.",
    "Partition raw history only after volume/retention justifies it.",
    "More cities only after their own data gate."
  ],
  "keep": [
    "Event != Occurrence",
    "UNKNOWN first-class",
    "conditional price",
    "raw price text",
    "no fake coordinates",
    "no fake midnight",
    "hard constraints before ranking",
    "source/provenance mandatory",
    "solo-first frozen P0"
  ],
  "change": [
    "Downgrade exact hot indexes/cadences/TTLs/stale thresholds/retries/ranking weights from facts to proposals/config.",
    "Correct KudaGo actual_since semantics to start-after UTC.",
    "Add price evidence scope.",
    "Treat KudaGo occurrence continuity as conservative matching because dates lack IDs.",
    "Use raw_body when exact raw fidelity is required."
  ],
  "defer": [
    "Redis",
    "Meilisearch",
    "Typesense",
    "materialized views for live truth",
    "cross-provider fuzzy dedup",
    "Event/Occurrence partitioning",
    "complex recommendation models"
  ],
  "reject": [
    "PostgreSQL 19 Beta 3 for P0",
    "PostGIS 3.7.0rc2 for P0",
    "Elasticsearch/OpenSearch for P0",
    "Kafka/Redpanda for P0",
    "vector DB/LLM ranking/parser for P0",
    "fake geo/time/price defaults",
    "publication_date as update watermark"
  ],
  "blockers": [
    "NEEDS LEGAL VERIFICATION: KudaGo direct source-link/indexability requirement inside MAX and advertising-token restrictions.",
    "NEEDS RUNTIME VERIFICATION: current KudaGo payload/headers/edit/removal behavior.",
    "NEEDS RUNTIME VERIFICATION: Povod PostgreSQL feed/search/geo performance and search relevance.",
    "RESEARCH INTEGRATION GAP: seven named canonical files were not directly retrievable for line-level verification."
  ],
  "open_questions": [
    "Target PostgreSQL/PostGIS host versions and extension privileges.",
    "KudaGo rate limiting and cancellation/update behavior.",
    "Occurrence mutation patterns in live KudaGo data.",
    "Strict-budget semantics for FROM/conditional/fee-unknown/Event-level price.",
    "Raw retention horizon.",
    "Freshness and missing-withdrawal thresholds.",
    "Russian proper-name/transliteration search quality.",
    "Product acceptance SLOs."
  ],
  "runtime_checks": [
    "Current KudaGo v1.4 Moscow receipt with sanitized headers/payload.",
    "actual_since test against ongoing event started before now.",
    "complete pagination stability/reconcile behavior.",
    "database/extension version receipt.",
    "EXPLAIN (ANALYZE, BUFFERS) benchmark for feed/search/geo/detail.",
    "labelled search relevance fixtures.",
    "occurrence mutation reconciliation fixtures.",
    "price parser golden fixtures."
  ],
  "manual_checks": [
    "MAX mobile/web source-link rendering.",
    "Strict budget UNKNOWN UX.",
    "Stale/source-unavailable UX.",
    "Search relevance acceptance.",
    "Condition revision vs fingerprint simplification."
  ],
  "legal_checks": [
    "KudaGo source link open-for-indexing requirement inside MAX.",
    "KudaGo advertising materials/token handling.",
    "KudaGo future commercial transfer/monetization.",
    "Licence review if Redis/external search is later selected."
  ],
  "recommended_actions": [
    "Implement minimal source/run/reconcile/price-scope contract without new services.",
    "Run controlled provider runtime receipt.",
    "Run PostgreSQL/PostGIS benchmark and save plans.",
    "Perform KudaGo/MAX legal/manual source-link check.",
    "Freeze exact indexes/cadence/freshness only after evidence."
  ],
  "sources_count": 36
}

## EXECUTIVE_VERDICT.md
# EXECUTIVE VERDICT

## Verdict

Use **PostgreSQL 17.11 or 18.6** as the single system of record for P0. Add a **stable PostGIS 3.6.x** line for geo and use PostgreSQL **FTS + GIN** plus **pg_trgm** for name/artist/venue typo support.

Keep the data flow explicit:

`Provider raw → source mapping → Event → Occurrence → Venue → Price/UNKNOWN → provenance → quality/freshness`

For KudaGo, use **page-based rolling/broad reconciliation plus periodic complete scoped reconciliation**. Do not describe `actual_since` as an update watermark: the official API defines it as a filter for events that **started after** the supplied moment.

## Keep

- Event != Occurrence.
- UNKNOWN is first-class.
- Conditional price remains conditional.
- Raw price text is retained.
- No fake coordinates and no fake midnight.
- Hard constraints run before ranking.
- Provenance/source is mandatory.
- PostgreSQL remains source of truth.
- PostGIS handles radius search.
- Ranking stays deterministic/explainable.

## Change

- Add `price_scope = EVENT | OCCURRENCE | UNKNOWN`.
- If exact raw evidence is required, store `raw_body` separately from parsed `jsonb`.
- Treat KudaGo occurrence continuity as conservative reconciliation, not a guaranteed provider occurrence identity.
- Treat covering/partial hot indexes as benchmark candidates, not proven exact indexes.
- Make stale thresholds, retries, cache TTLs and ranking weights configuration pending evidence.
- Prefer `text_format=text` from KudaGo for P0 unless formatted provider HTML is actually required.

## Do not recommend for P0

- Redis.
- Meilisearch / Typesense / Elasticsearch / OpenSearch.
- Kafka / Redpanda.
- Vector database / embeddings.
- LLM dedup/ranking/price parsing.
- Event/Occurrence partitioning.
- PostgreSQL 19 Beta 3.
- PostGIS 3.7.0rc2.

## Main blockers / gates

- **NEEDS LEGAL VERIFICATION:** KudaGo's direct-link “open for indexing” requirement inside MAX, plus advertising-token restrictions.
- **NEEDS RUNTIME VERIFICATION:** current KudaGo responses/pagination/edit/removal behavior.
- **NEEDS RUNTIME VERIFICATION:** PostgreSQL feed/search/geo latency and Russian search relevance on the real stack.
- **PROJECT ARTIFACT GAP:** seven canonical files were not directly retrievable for a line-level diff.

## Next actions

1. Codex implements the minimal reconciliation/raw/source-map/price-scope contract behind safe migrations.
2. Run one controlled KudaGo runtime receipt and store sanitized response/headers.
3. Run PostgreSQL `EXPLAIN (ANALYZE, BUFFERS)` + end-to-end benchmark on representative Moscow data.
4. Manually/legal-review KudaGo source-link implementation in MAX.
5. Only then freeze exact hot indexes, sync cadence and freshness thresholds.

## GAPS_AND_OPEN_QUESTIONS.md
# GAPS AND OPEN QUESTIONS

## Open questions

1. **Canonical source files:** the seven named files were not retrievable in File Library during this pass; no exact line-level agreement claim can be made.
2. **KudaGo + MAX legal fit:** does a clickable KudaGo source link inside the MAX Mini App / bot satisfy the licence requirement that the link be open for indexing and free of nofollow/noindex semantics?
3. **Advertising material:** how are KudaGo advertising materials/tokens represented in actual API responses, and which payloads must Povod exclude or specially handle?
4. **Current KudaGo runtime:** current v1.4 response shapes, headers, pagination stability, removals and cancellation/edit behavior were not captured here.
5. **Provider rate limit:** no documented rate-limit contract was found; unknown is not “unlimited”.
6. **`actual_since` overlap:** validate the practical behavior with a known ongoing event that started before the filter moment.
7. **Occurrence continuity:** KudaGo dates have no documented ID. What edit patterns occur when an event time/date changes?
8. **Target database host:** exact PostgreSQL/PostGIS/pg_trgm availability and extension privileges on the chosen deployment host.
9. **PostgreSQL benchmark:** real Moscow corpus size, concurrency, index sizes, feed/search/geo P95 and reconcile/write cost.
10. **Russian search quality:** names, Cyrillic/Latin, `ё/е`, punctuation, aliases/transliteration and venue/artist typos.
11. **Price semantics:** UX decision for strict budget with `FROM`, conditional deposits, unknown fees or Event-level-only price evidence.
12. **Raw retention:** required retention horizon after provider terms, storage cost and debugging/audit needs.
13. **Freshness policy:** product-level soft/hard freshness thresholds and behavior after provider outages.
14. **Missing policy:** how many completed reconciliations/time elapsed before a missing source object is withdrawn.
15. **SLOs:** team must set acceptance targets before benchmarks; do not retrofit success after measurement.
16. **Geocoding:** whether provider coordinate coverage is sufficient. If not, a separate provenance-bearing geocoder decision is required.
17. **Current source URL behavior:** whether KudaGo `site_url` opens reliably/safely on MAX web/mobile.
18. **Images:** image rights/attribution are mainly a provider/legal topic; the pipeline should carry source/author metadata and never invent rights.
19. **Cancellation:** whether KudaGo exposes a reliable explicit cancellation field/status in current runtime.
20. **Publication/update semantics:** `publication_date` exists but must not be treated as modification time without evidence.

## What requires runtime

- KudaGo live API receipt.
- Target Postgres/PostGIS extension/version check.
- Search relevance fixtures.
- Feed/search/geo benchmark.
- Pagination/edit/removal observation.
- Crash/checkpoint recovery test.

## What requires human/manual decision

- Freshness SLO and stale UI policy.
- Strict-budget UNKNOWN UX.
- Acceptable search relevance.
- Raw retention period.
- One condition revision/fingerprint versus dual revision counters.
- Timing of a second provider.

## What requires legal review

- KudaGo indexable source-link compliance inside MAX.
- Advertising-token handling.
- Future commercial use/transfer of KudaGo data.
- Any external cache/search licence selected later.

## What requires Codex/host

- Actual repo path mapping.
- Migrations/constraints.
- Provider runtime spike.
- Query plans/benchmarks.
- Sanitized evidence capture.
- Host extension/version check.

## What is closed enough for implementation

- Event and Occurrence stay distinct.
- Provider IDs and canonical IDs stay distinct.
- UNKNOWN/no-fabrication invariants stay.
- PostgreSQL is the initial source of truth.
- PostGIS is preferred geo implementation if supported.
- FTS + pg_trgm is the first text-search implementation.
- Redis/external search/Kafka/vector/LLM paths are deferred.
- KudaGo is not a documented cursor/change-feed source; reconciliation is required.


# hackathon-compliance
## machine_summary.json
{
  "topic": "hackathon-compliance",
  "date": "2026-09-18",
  "final_verdict": "Keep frozen solo-first Moscow P0. Research is verified where primary sources are accessible, but submission compliance cannot be certified until the exact official case is re-opened and one release SHA has Docker/API/MAX/provider evidence.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [
    "No feature-scope expansion.",
    "Treat chatbot attachment as structural MAX Mini App prerequisite; Smart Povod remains P1.",
    "Add primary-case recovery, MAX publishing/legal readiness, current API compatibility and evidence bundle as release gates.",
    "Remove any P0 dependency on automatic group-member addition."
  ],
  "p1_changes": [
    "Smart Povod only after P0 evidence is green.",
    "Final deck scope/claim corrections.",
    "Legal/privacy/support surfaces verified before placement."
  ],
  "stretch_changes": [
    "Second city only after independent data gate.",
    "Optional share/deeplink social continuation; no group-member-add dependency."
  ],
  "keep": [
    "solo-first",
    "Moscow-first",
    "occurrence-first",
    "honest UNKNOWN",
    "visible provenance/source",
    "optional save",
    "immutable evidence per SHA"
  ],
  "change": [
    "recover exact official case before final compliance claim",
    "current HEAD receipt",
    "lockfile if still absent",
    "exact DATA-API from case only",
    "real MAX mobile/web evidence",
    "deck scope corrections",
    "MAX legal/account verification"
  ],
  "defer": [
    "OpenAPI 3.2 migration",
    "GitHub Actions until remote/submission need is known",
    "Smart Povod until P0 green",
    "second city",
    "subscriptions/invite beyond frozen P0"
  ],
  "reject": [
    "group-first entry flow",
    "automatic group-member-add as P0",
    "Playwright as substitute for MAX evidence",
    "fabricated DATA-API.yaml",
    "runtime claims from source presence",
    "2–3 city MVP claim without gates"
  ],
  "blockers": [
    "Official case source unavailable",
    "Project Docker not runtime-proven",
    "Reproducibility lockfile absent at latest verified source baseline",
    "DATA-API.yaml absent at verified baseline",
    "Real MAX runtime evidence absent",
    "Moscow provider gate open",
    "MAX placement account/legal agreement not verified"
  ],
  "open_questions": [
    "Exact current official case revision/hash?",
    "Exact submission deadline/timezone/format/repository requirements?",
    "Exact DATA-API.yaml schema?",
    "MAX hackathon placement exception or ordinary licence path?",
    "Current repo HEAD and artifacts after 2026-09-16?",
    "Moscow provider runtime/legal approval?",
    "Judge account/access model?"
  ],
  "runtime_checks": [
    "RT-001: Current Git state",
    "RT-002: Deterministic dependency install",
    "RT-003: Docker build timing",
    "RT-004: Docker startup/readiness",
    "RT-005: HTTPS/API smoke",
    "RT-006: OpenAPI generation/validation",
    "RT-007: DATA-API validation",
    "RT-008: MAX initData valid",
    "RT-009: MAX initData tamper/duplicates",
    "RT-010: Replay/freshness hardening",
    "RT-011: MAX mobile 360",
    "RT-012: MAX mobile 390",
    "RT-013: MAX mobile 430",
    "RT-014: MAX Web",
    "RT-015: Occurrence/source",
    "RT-016: Empty/loading/error/source unavailable",
    "RT-017: UNKNOWN/conditional price",
    "RT-018: Save/repeat login",
    "RT-019: Provider receipt",
    "RT-020: MAX API current config",
    "RT-021: Webhook if Smart Povod attempted"
  ],
  "manual_checks": [
    "MAN-001: Recover exact official case PDF/revision and rerun all page checks",
    "MAN-002: Confirm exact submission deadline/timezone/portal/package/repo requirements",
    "MAN-004: Confirm actual publishing entity/account eligibility and active MAX licence agreement",
    "MAN-005: Review required developer identity/contact/privacy/terms/support and age classification if applicable",
    "MAN-007: Final deck claim-by-claim sign-off against evidence manifest",
    "MAN-008: Judge/test account path from clean device/incognito"
  ],
  "legal_checks": [
    "MAX licence agreement/publishing entity/hackathon path",
    "developer legal/contact/privacy/terms/support",
    "provider data/content/image/cache rights"
  ],
  "recommended_actions": [
    "Recover/hash/re-read exact official case.",
    "Generate current host repo receipt before edits.",
    "Close reproducibility artifacts without changing package manager.",
    "Run Docker/API/MAX/provider evidence on one release SHA.",
    "Update presentation only after evidence manifest exists."
  ],
  "sources_count": 21
}

## EXECUTIVE_VERDICT.md
# Executive Verdict — Povod Hackathon Compliance

**Date:** 2026-09-18  
**Status:** **FINAL WITH OPEN BLOCKERS**

## Verdict

Keep the frozen solo-first, Moscow-first P0. The implementation surface is substantial, but compliance is not yet judge-verifiable on one release build.

## Recommend

1. Recover/hash/re-read the exact official case before any more compliance guessing.
2. Get a current repository SHA/inventory receipt; fix reproducibility artifacts only if still missing.
3. Run release Docker/API/MAX/provider evidence and bind every output to one build ID.
4. Confirm MAX publishing/account/legal requirements and provider legal gate.
5. Rewrite the final deck to match the frozen P0 and evidence manifest.

## Do not recommend

- 2–3-city MVP without independent gates.
- Group-first flow or group-member auto-add API.
- OpenAPI 3.2 just because it is newest.
- Treating Playwright/browser captures as MAX proof.
- Fabricating DATA-API.yaml without the exact case.

## Main blockers

Official case unavailable for final re-read; project Docker/MAX/provider runtime evidence missing; lockfile/DATA-API absent at latest verified baseline; MAX placement/legal status and judge access not proven.

## GAPS_AND_OPEN_QUESTIONS.md
# Gaps and Open Questions

## Hard source gap

The exact official case PDF/revision was not available to this final pass. Previously extracted page mappings remain useful but cannot serve as final primary certification.

## Runtime gaps

- Current HEAD vs 2026-09-16 baseline.
- Frozen dependency install.
- Povod Docker build/start/time.
- HTTPS/API health/smoke.
- Generated OpenAPI/live-route match.
- Exact DATA-API validation.
- Real MAX mobile/Web and identity.
- Moscow provider/live occurrence/provenance.
- Save/relogin and abnormal UI states.

## Manual/legal gaps

- Exact submission portal/deadline/timezone/repo requirements.
- MAX publishing account/entity/licence agreement/hackathon exception.
- Mandatory developer legal/contact/privacy/terms/support content.
- Provider content/data rights.
- Judge/test account/access.

## Human decisions

- Whether to spend remaining time on P1 Smart Povod only after P0 evidence is green.
- Final presentation wording after evidence run.
- Whether/when to add a remote and CI.


# max-native
## machine_summary.json
{
  "topic": "max-native",
  "date": "2026-09-18",
  "final_verdict": "Keep Mini App as primary Povod surface, validate MAX identity server-side, keep product state on backend, and use Bot API only as a gated retention channel. Do not expand frozen solo-first P0.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [
    "No product-scope expansion",
    "Verify/implement raw initData validation",
    "Verify platform-api2 and certificate trust",
    "Webhook-first production",
    "Make MAX UI conditional on React compatibility",
    "Run manual partner/license/moderation/legal gate"
  ],
  "p1_changes": [
    "Explicit bot activation for Smart Povod",
    "Legal/contract gate for outbound Smart Povod messages",
    "open_app.payload source-confirmed but runtime-unverified"
  ],
  "stretch_changes": [
    "Shared Plan via backend plan + opaque invite + shareMaxContent/startapp + explicit join",
    "No group member-add dependency"
  ],
  "keep": [
    "solo-first",
    "Mini App primary",
    "server-side product state",
    "source/provenance CTA",
    "opaque startapp tokens",
    "MAX Bridge adapter",
    "webhook production"
  ],
  "change": [
    "Correct open_app payload conclusion",
    "Make MAX UI conditional",
    "Treat own session as proposal",
    "Add Smart Povod legal gate",
    "Fix stale test-deck MVP scope"
  ],
  "defer": [
    "Shared Plan until core stable",
    "device-only polish",
    "third-party frameworks without concrete gap",
    "general start_context service until needed"
  ],
  "reject": [
    "bot-first UI",
    "mandatory group flow",
    "ChatButton/start_payload architecture",
    "bot-managed group member addition",
    "initDataUnsafe as auth",
    "raw plan_id as capability",
    "device storage as core state",
    "long polling production",
    "forced React migration for MAX UI",
    "copying unlicensed external Mini App"
  ],
  "blockers": [
    "Manual MAX partner/license/bot moderation readiness unknown",
    "Canonical POVOD files and repo unavailable",
    "Smart Povod agreement permission unresolved",
    "No MAX runtime matrix executed"
  ],
  "open_questions": [
    "open_app payload client mapping",
    "shareMaxContent Web/Desktop",
    "proactive message to Mini-App-only user",
    "HttpOnly cookie lifecycle",
    "signed agreement permission",
    "current repo state"
  ],
  "runtime_checks": [
    "identity validation positive/negative",
    "startapp exact occurrence",
    "session strategy",
    "BackButton/openLink/openMaxLink",
    "open_app payload matrix",
    "share matrix",
    "webhook/idempotency",
    "platform-api2 TLS host test"
  ],
  "manual_checks": [
    "partner profile",
    "bot publication/moderation",
    "token availability",
    "privacy/terms/support",
    "account/data deletion",
    "Desktop acceptance need"
  ],
  "legal_checks": [
    "current License Agreement",
    "Smart Povod message permission",
    "project-specific personal-data basis/docs",
    "MAX UI vendoring licence only if vendoring considered"
  ],
  "recommended_actions": [
    "Run bounded MAX spike",
    "Codex repo audit via CODEX_ACTIONS.md",
    "Clear partner/license/moderation gate",
    "Correct stale presentation roadmap",
    "Recheck changelog/legal docs before submission"
  ],
  "sources_count": 35
}

## EXECUTIVE_VERDICT.md
# EXECUTIVE VERDICT

**Status: FINAL WITH OPEN BLOCKERS — 18.09.2026**

## Verdict

Архитектуру P0 менять не нужно.

Наиболее надёжная MAX-native форма «Повода»:

**Mini App → validated `initData` → Povod backend → personal feed → exact Occurrence → source**.

Bot остаётся отдельным каналом возврата и P1-retention. Social flow остаётся optional continuation.

## Keep

- solo-first P0;
- Mini App как главный UI;
- server-side validation raw `initData`;
- server-side product state;
- Bridge wrapper для BackButton/openLink/openMaxLink/share/platform;
- `startapp` как transport short opaque context token;
- webhook-first production;
- explicit source CTA.

## Change / correct

- `open_app.payload`: source-confirmed in official TS SDK v0.3.1, runtime still required.
- MAX UI: conditional only after current React compatibility check.
- own session: architecture choice, not MAX requirement.
- Smart Povod: `NEEDS LEGAL VERIFICATION` before real notification sending.
- ChatButton/start_payload: reject as stale/removed direction.

## Main blockers

1. Manual release readiness: eligible verified partner profile, active License Agreement, bot moderation/token.
2. Smart Povod legal permission under actual agreement.
3. Runtime: `open_app.payload`, `shareMaxContent` Web/Desktop, session cookies, exact navigation.
4. Canonical POVOD files and current repo unavailable to this research runtime.

## Next action

Run one bounded MAX spike on Android + iOS + Web and parallel release/legal checklist. Do not widen functional P0.

## GAPS_AND_OPEN_QUESTIONS.md
# GAPS AND OPEN QUESTIONS

## Runtime

1. Does `open_app.payload` become the expected exact Mini App context on current Android, iOS and MAX Web?
2. Does `shareMaxContent({text, link})` work on MAX Web/Desktop?
3. Does bot `link` → `https://max.ru/<bot>?startapp=...` stay native or introduce a new-tab/browser round trip?
4. Can proactive `POST /messages?user_id=` work for a user who only launched Mini App and never generated `bot_started`? Do not rely on it.
5. Do same-origin HttpOnly Secure cookies persist reliably in MAX mobile WebViews and MAX Web?
6. Exact BackButton/router/viewport behavior in current Povod implementation.
7. Does deployment runtime trust the certificate chain for `platform-api2.max.ru`?
8. Does webhook subscription persist/restore correctly after deploy failures?

## Legal/manual

1. Does the operator already have an eligible verified MAX partner profile?
2. Is the current License Agreement in force?
3. Is the bot already `Опубликован` and is the token available?
4. Does the actual agreement permit the Smart Povod message category?
5. Are Privacy Policy, terms/operator/support information already present?
6. Is there a free user-request path to delete local Povod account/data?

## Repository/source of truth

Unknown until Codex/host inspection:
- current React version;
- MAX UI installed or not;
- existing Bridge wrapper;
- auth/session implementation;
- Bot API base URL;
- webhook implementation;
- deep-link/token model;
- legal routes/screens;
- current P0 flags and social/Smart code.

## Closed enough

- startapp/start limits;
- server validation algorithm;
- `initDataUnsafe` not auth;
- platform values and Web storage limitations;
- current API base;
- webhook lifecycle;
- ChatButton removal direction;
- official TS `open_app.payload` source existence;
- group-member API removal;
- partner eligibility/moderation rules;
- contractual message restriction existence;
- account/data deletion requirement existence.


# presentation-content
## machine_summary.json
{
  "topic": "presentation-content",
  "date": "2026-09-18",
  "final_verdict": "Keep the evidence-first, solo-first presentation narrative, but narrow all MAX/provider/runtime claims to what is actually proven. Replace the obsolete interview/pilot section with public-evidence validation. The presentation package is ready as a content blueprint, but the product/demo claims remain blocked until runtime, provider/legal, MAX provisioning and exact-case compliance evidence are closed.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [],
  "p1_changes": [
    "Treat Smart Povod as P1 and require explicit bot-enrollment + proactive-message + exact-occurrence deep-link E2E evidence before demoing it as a closed loop."
  ],
  "stretch_changes": [
    "Keep optional user-driven sharing only; do not depend on group-member add API.",
    "Second city remains behind a separate data gate."
  ],
  "keep": [
    "solo-first narrative",
    "occurrence-level honesty",
    "UNKNOWN",
    "source/provenance",
    "live demo after scenario",
    "evidence scoreboard",
    "one concise architecture slide",
    "Moscow-only P0",
    "scale by provider/city gate"
  ],
  "change": [
    "replace interview/usability plan with public desk research",
    "narrow MAX retention claims to documented primitives + E2E requirement",
    "correct T002 latest located SHAs",
    "add MAX API2/certificate/onboarding/legal readiness checks",
    "keep provider name out of main proof until approved"
  ],
  "defer": [
    "Smart Povod hero demo until E2E",
    "map",
    "second city",
    "optional sharing until platform runtime",
    "provider branding in main deck"
  ],
  "reject": [
    "2–3 city MVP",
    "Moscow/SPb BETA without gates",
    "unrun pilot metrics as results",
    "social/group-first flow",
    "programmatic group-member add dependency",
    "all-Moscow/all-events claims",
    "production-ready claims without acceptance evidence"
  ],
  "blockers": [
    "exact official case PDF/rubric unavailable in this research environment",
    "current repository HEAD not verified on 2026-09-18",
    "MAX mobile/web P0 E2E not proven",
    "formal Moscow live-data gate not closed here",
    "provider exact legal/runtime gate not closed",
    "hackathon-specific MAX provisioning/onboarding exception not verified"
  ],
  "open_questions": [
    "What exact case/submission/rubric requirements are in the official PDF?",
    "What is current HEAD and current runtime state?",
    "Does the hackathon provide special MAX bot/mini-app provisioning for student teams?",
    "Is KudaGo exact use in MAX Mini App compliant for storage/cache/images/source-link/indexability?",
    "Is Smart Povod bot enrollment and proactive messaging proven from the chosen entry flow?"
  ],
  "runtime_checks": [
    "MAX mobile launch",
    "MAX web launch",
    "initData positive/tampered/stale",
    "live Moscow provider raw→normalized occurrence",
    "KNOWN + UNKNOWN price",
    "source opening",
    "hard filters",
    "save persistence",
    "provider unavailable state",
    "Docker clean build/start/health",
    "Smart Povod bot→message→startapp→exact occurrence if shown",
    "share platform matrix if shown"
  ],
  "manual_checks": [
    "read official case PDF and map page-level requirements",
    "verify current Git HEAD/source state",
    "confirm team roster/ownership",
    "confirm final screenshots are runtime rather than concept",
    "confirm hackathon MAX account/provisioning"
  ],
  "legal_checks": [
    "MAX placement/licence/onboarding status for hackathon team",
    "KudaGo exact reuse/caching/attribution/indexability/images/commercial interpretation"
  ],
  "recommended_actions": [
    "Host/Codex verifies current HEAD and official case first.",
    "Run the minimal P0 acceptance/evidence campaign before finalizing claims.",
    "Close Moscow/provider runtime+legal gate.",
    "Patch deck from this archive and only then capture final 90-second fallback recording."
  ],
  "sources_count": 16
}

## EXECUTIVE_VERDICT.md
# Executive Verdict

## Verdict

**FINAL WITH OPEN BLOCKERS.**

The presentation-content direction is retained, but its claims are narrowed to match the evidence actually available on 18.09.2026.

### Keep

- Solo-first as the primary product narrative.
- Moscow-only P0.
- Concrete `Occurrence`, not generic event, as the decision object.
- Honest `UNKNOWN`.
- Visible provenance/source and opening the original.
- Personalization as hard constraints first, ranking second.
- Live demo early in the deck.
- One architecture slide and one evidence-scoreboard slide.
- Scale story through repeatable provider/city gates, not pre-claimed geographic coverage.

### Change

- Replace the previous interview/usability plan with **public-information / desk-research validation** for this phase.
- Replace “MAX closes the retention loop” with: **MAX provides documented primitives for Mini App, identity, deep links, bot delivery and sharing; Povod’s exact loop still requires E2E evidence.**
- Correct Git evidence to the latest located T002 final pass: baseline `d48f01eafa23ef4a0a2b98cb20b74e5052423a74`, handoff `4f9a198d4fa2b18686efa19a59b6ac78281d341d`.
- Add MAX readiness checks for `platform-api2.max.ru`, trusted/Minцифры certificate chain, webhook HTTPS, partner verification/moderation/licence status.
- Keep KudaGo/provider branding out of the main proof until the exact runtime + legal gate is closed.

### Reject / defer

- `2–3 cities` in the hackathon MVP.
- Moscow/SPb marked `BETA` without passed data gates.
- Unrun pilot metrics as evidence.
- Mandatory group/social flow.
- Programmatic group-member addition as a future social primitive.
- “all Moscow events”, “always current price”, “production-ready”, or similar absolutes.
- Smart Povod as the hero live-demo ending until the exact bot→message→deeplink→occurrence path is proven.

## Main blocker

There is still no single accepted evidence bundle proving the frozen P0 end-to-end in MAX with live Moscow data and the required honesty states. The exact official case PDF/rubric is also unavailable in this research environment.

## Next actions

1. Host/Codex: verify current HEAD and read the official case PDF from the local project input.
2. Run the minimal P0 acceptance/evidence campaign.
3. Close Moscow/provider runtime + legal gates.
4. Confirm hackathon-specific MAX provisioning/onboarding.
5. Patch the final deck using `PRESENTATION_BLUEPRINT.md`; only verified claims graduate from `NEEDS EVIDENCE`.

## GAPS_AND_OPEN_QUESTIONS.md
# Gaps and Open Questions

## BLOCKERS

1. **Exact official case PDF/rubric** — not accessible in this research environment.
2. **Current repository HEAD and current app state** — connected GitHub did not expose `The-Boys-Max`; latest direct Git evidence found is from 16.09.2026.
3. **MAX P0 E2E** — no accepted receipt here for mobile + web launch, signed identity, feed, occurrence, UNKNOWN/source, save.
4. **Moscow live-data gate** — formal accepted gate receipt not available here.
5. **Provider exact legal gate** — KudaGo remains technical candidate, not approved.
6. **Hackathon-specific MAX provisioning** — public docs describe normal business-partner onboarding; organizer exception/path is unknown.

## OPEN QUESTIONS

- What exact scoring criteria, timing and mandatory submission artifacts are in the official case?
- Does the hackathon provide bot/Mini App tokens or bypass the normal public partner onboarding path?
- What is the final current HEAD/commit and are all screenshots produced from it?
- Which provider is formally approved for the defense build?
- How is source-link indexability interpreted inside the final MAX Mini App/WebView?
- What exact cache/retention/transformation rights are accepted for the chosen provider?
- Does the chosen Mini-App-first entry create the relationship needed for later bot messaging?
- Is `share` actually needed for the defense, or should it remain backup only?
- Is the final talk timing compatible with 14 slides + 90-second demo?

## Requires runtime test

- MAX mobile and web.
- initData positive/tampered/stale.
- Moscow provider live fetch/normalization.
- KNOWN and UNKNOWN price.
- exact source opening.
- filter eligibility.
- save persistence.
- provider unavailable/degraded state.
- Docker clean build/start/health.
- Smart Povod if shown.
- share platform path if shown.

## Requires human/manual decision

- final team roster/ownership slide;
- whether Smart Povod appears in main deck or backup after runtime;
- whether provider name/logo appears;
- final deck length after official timing check;
- which exact event IDs are frozen for demo.

## Requires legal/manual review

- MAX licence/onboarding state for the hackathon account;
- KudaGo exact reuse/caching/indexability/images/commercial interpretation.

## Requires Codex/host

- inspect current repo, HEAD and source-of-truth files;
- read `input/official/*.pdf` locally;
- run acceptance commands and save immutable evidence;
- patch presentation-content docs only after evidence status changes.

## Closed enough for synthesis

- solo-first P0 narrative;
- Moscow-only scope;
- Occurrence/UNKNOWN/source as core story;
- social optionality;
- old multi-city/pilot claims rejected;
- MAX startapp/share/initData public semantics;
- imminent group-add API removal;
- KudaGo attribution condition as an official fact;
- latest located T002 final SHAs.


# providers
## machine_summary.json
{
  "topic": "providers",
  "date": "2026-09-18",
  "final_verdict": "KudaGo remains CONDITIONAL_PRIMARY / NOT_APPROVED. Approval requires canonical runtime receipt PASS and written legal/use clarification. No production-approved fallback is currently established.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [
    "No scope expansion.",
    "Make provider approval explicitly depend on independent runtime and legal gates.",
    "Record cancellation/update, rate-limit, ad-filter and storage capabilities as UNKNOWN until evidenced.",
    "Keep provider images/descriptions/PriceSnapshot history disabled until rights are confirmed."
  ],
  "p1_changes": [
    "Only implement Timepad or Radario fallback after rights/access/source-link verification."
  ],
  "stretch_changes": [
    "Multi-provider precedence/dedup/conflict resolution remains deferred."
  ],
  "keep": [
    "KudaGo as primary technical candidate",
    "Moscow P0",
    "Event != Occurrence",
    "honest UNKNOWN",
    "exact provenance/source",
    "solo-first",
    "thin ProviderAdapter boundary",
    "own visuals in P0"
  ],
  "change": [
    "Downgrade Timepad legal confidence because current official legal endpoint was inaccessible.",
    "Correct robots.txt interpretation: crawler policy is not API licence evidence.",
    "Strengthen PRO.Культура rejection for emergency P0 based on current standard partner terms.",
    "Add explicit KudaGo cancellation/update-signal gap.",
    "Add explicit Radario public source/deep-link gap."
  ],
  "defer": [
    "PRO.Культура custom partnership",
    "Radario full adapter before access/rights",
    "Ticketscloud",
    "Moscow Open Data until current dataset verification",
    "multi-provider dedup engine",
    "sports providers",
    "provider media pipeline"
  ],
  "reject": [
    "scraping as primary/fallback",
    "undocumented private endpoints",
    "silent fallback to unapproved provider",
    "KudaGo logo under open-data licence assumption",
    "unapproved provider-image caching",
    "invented PriceSnapshot permission"
  ],
  "blockers": [
    "KudaGo canonical runtime receipt not closed 12/12",
    "KudaGo MAX Mini App/indexability interpretation",
    "KudaGo advertising-material exclusion/permission",
    "KudaGo storage/cache/retention if implementation requires persistence",
    "No production-approved fallback"
  ],
  "open_questions": [
    "KudaGo cache/storage/retention/purge/PriceSnapshot",
    "KudaGo images and third-party rights",
    "KudaGo rate limits",
    "KudaGo cancellation/update signal",
    "Timepad current content reuse terms",
    "Radario canonical public source URL and contract scope",
    "current Moscow Open Data event feed",
    "byte-for-byte conflict check against unavailable POVOD canonical files"
  ],
  "runtime_checks": [
    "Run exact frozen KudaGo canonical 12-test data gate and preserve raw evidence + hashes",
    "Only after legal confirmation: Timepad runtime spike",
    "Only after credentials/rights: Radario runtime spike"
  ],
  "manual_checks": [
    "Obtain written provider responses",
    "Decide organizational evidence threshold for release",
    "Reconcile canonical POVOD files during synthesis"
  ],
  "legal_checks": [
    "KudaGo MAX/indexability",
    "KudaGo cache/storage/PriceSnapshot/purge",
    "KudaGo images/ad materials/monetization",
    "Timepad reuse rights",
    "Radario rights/attribution/source-link"
  ],
  "recommended_actions": [
    "Send exact KudaGo questionnaire",
    "Run canonical KudaGo receipt",
    "Ask Timepad narrow metadata-reuse question",
    "Ask Radario access/source-link/rights question",
    "Do not implement multi-provider P0"
  ],
  "sources_count": 18
}
## EXECUTIVE_VERDICT.md
# EXECUTIVE VERDICT

**Status:** FINAL WITH OPEN BLOCKERS  
**Date:** 2026-09-18

- **Primary:** KudaGo remains `CONDITIONAL_PRIMARY / NOT_APPROVED`.
- **Why:** documented Moscow-suitable event schema and source URL, but canonical v1.4 runtime receipt is still open and material legal/use questions remain.
- **Main blocker:** KudaGo written clarification for MAX/indexable attribution + storage/cache/ad handling, together with 12/12 canonical runtime PASS.
- **Fallback:** no production-approved fallback exists today. Timepad is the first technical candidate but current reuse terms are unverified; Radario requires keys/rights/source-link clarification.
- **Reject for emergency P0:** standard PRO.Культура partnership path, Ticketscloud without partnership, scraping, undocumented private endpoints.
- **P0 content:** factual minimal metadata + exact source; own visuals; no provider images/descriptions/history until rights are cleared.
- **Architecture:** no multi-provider engine in P0; retain only thin ProviderAdapter/provenance boundary.
- **Important delta:** robots.txt is not licence evidence; Timepad legal confidence was downgraded; PRO.Культура P0 rejection strengthened; KudaGo cancellation/update gaps made explicit.
- **Next action:** send the exact KudaGo questions and run the frozen runtime receipt; in parallel ask Timepad and Radario only the minimal rights/access questions.

## GAPS_AND_OPEN_QUESTIONS.md
# GAPS AND OPEN QUESTIONS

## Still open

1. KudaGo written interpretation for MAX Mini App/WebView and indexability.
2. KudaGo permission/limits for normalized durable storage and caching.
3. KudaGo PriceSnapshot/history and purge/retention policy.
4. KudaGo image reuse, third-party source handling and transformations.
5. KudaGo reliable advertising-content exclusion.
6. KudaGo global rate/fair-use limit.
7. KudaGo authoritative cancellation/update mechanism.
8. Frozen KudaGo runtime receipt 12/12.
9. Timepad current legal terms/reuse permission.
10. Timepad cancellation/update semantics.
11. Radario credentials, reuse rights, canonical source/deep link, rate limits.
12. Current 2026 Moscow Open Data event-feed existence and dataset-specific terms.
13. Byte-for-byte reconciliation with canonical POVOD project files that were unavailable in File Library.

## Human/manual decision

- Whether the team is willing to ship only after written KudaGo clarification or wants to pursue a different contractual provider even if integration time increases.
- Which legal evidence standard the team/organizer accepts for hackathon submission.

## Legal consultation

A lawyer is useful if the rightsholder will not answer the indexability, monetization or content-right questions. This research does not replace legal advice.

## Codex/host

Codex can implement provider gates, evidence capture, schema restrictions and failure states. Codex cannot resolve licence meaning or invent permission.

## Considered closed

- KudaGo licence does require per-material direct source links.
- KudaGo trademark rights are excluded from the open licence.
- KudaGo open licence can change/be revoked.
- API v1.4 is the latest version listed in the official KudaGo changelog.
- Timepad GET /v1/events is documented as public/unauthenticated, while the general rate limit is 60 responses/IP/min.
- Standard PRO.Культура partner route is not a zero-onboarding hackathon fallback.
- No reason was found to expand frozen P0 into multi-provider aggregation.


# security-reliability
## machine_summary.json
{
  "topic": "security-reliability",
  "date": "2026-09-18",
  "final_verdict": "Controlled hackathon demo: CONDITIONAL GO after explicit code/runtime gates. Public MAX placement: NO-GO until auth/API2/TLS/object-auth/data-deletion/provider/runtime blockers close.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [
    "Verify/patch MAX initData validator against current official algorithm and <=1h freshness baseline.",
    "Verify all outbound MAX transport uses platform-api2.max.ru and exact release TLS trust works.",
    "Verify object authorization/session security and startapp is never authorization.",
    "Verify partial provider runs cannot tombstone/withdraw data; preserve UNKNOWN/provenance/raw price evidence.",
    "Add/verify structured redacted logging, health/readiness, bounded metrics and user-safe correlation ID.",
    "If public placement rule trigger applies, add minimum safe account/data deletion path as a compliance exception, not product expansion."
  ],
  "p1_changes": [
    "Notifications/Smart Povod require durable delivery ledger with semantic uniqueness and unknown outcome.",
    "Do not rely on POST /chats/{chatId}/members after announced 30.09.2026 removal.",
    "Webhook replay/idempotency becomes a hard gate for bot retention/notifications."
  ],
  "stretch_changes": [],
  "keep": [
    "Frozen solo-first P0 and Moscow-first data gate.",
    "Event != Occurrence.",
    "UNKNOWN/provenance/source first-class.",
    "PostgreSQL-centered architecture.",
    "KudaGo NOT APPROVED until separate gate.",
    "Targeted failure injection/security abuse tests."
  ],
  "change": [
    "Replace BullMQ/Redis-default language with inspect-first pg-boss/PostgreSQL canonical direction.",
    "Add MAX API2/certificate migration as explicit blocker.",
    "Use official ~1h initData freshness baseline; 15m only optional hardening.",
    "Do not assume universal webhook update_id.",
    "Promote deletion from defer to public-placement compliance gate when trigger applies.",
    "Reduce observability from mandatory self-host Prometheus/Grafana to instrumentation + existing backend."
  ],
  "defer": [
    "OpenTelemetry Collector/Tempo/Loki full stack",
    "Self-hosted Prometheus/Grafana if not already available",
    "SIEM/SOC",
    "Kubernetes/service mesh/Vault",
    "advanced abuse scoring",
    "browser OTel",
    "external pentest",
    "multi-region queue/DB"
  ],
  "reject": [
    "New Redis solely for queue",
    "Kafka/Redpanda/Temporal for P0",
    "startapp as authorization",
    "undocumented global one-time query_id blocker",
    "full raw provider archive by default",
    "provider HTML in P0",
    "fake price/place/end/coordinates",
    "static repo evidence as runtime proof",
    "approving KudaGo from security research"
  ],
  "blockers": [
    "Current bodies/hashes of four canonical source-of-truth files not directly re-read.",
    "Current auth/ingress/transport/persistence/worker source bodies not directly inspected.",
    "Current Node/lockfile/queue compatibility unknown.",
    "No release-container platform-api2 TLS receipt.",
    "No real MAX mobile/web runtime receipt.",
    "KudaGo runtime/legal gate open.",
    "Public-placement deletion/privacy/legal checks open."
  ],
  "open_questions": [
    "Actual Node and queue versions?",
    "Current session storage/cookie/SameSite/CSP design?",
    "DB unique constraints and transaction helper?",
    "Webhook semantic dedupe strategy?",
    "Current analytics/log/Sentry payload?",
    "Unsafe HTML/fetch/redirect sinks?",
    "Exact retention/legal policy?",
    "KudaGo attribution/indexability inside MAX?"
  ],
  "runtime_checks": [
    "MAX initData mutation suite",
    "MAX mobile/web session matrix",
    "platform-api2 TLS/auth call from release image",
    "Webhook secret/replay/durable ACK",
    "Provider timeout/malformed/429/partial/stale/price/time/place",
    "DB failure/pool/deadlock",
    "Duplicate job/worker kill/ambiguous notification send",
    "Observability redaction/metrics/alert test"
  ],
  "manual_checks": [
    "Re-open/hash canonical project documents",
    "Review actual dependency/runtime inventory",
    "Choose exact retention window",
    "Decide whether existing BullMQ path is already green",
    "Confirm alert owner/channel"
  ],
  "legal_checks": [
    "MAX placement/licence/privacy/support obligations",
    "Account/data deletion and personal-data legal basis/retention",
    "KudaGo direct indexable attribution/material-use applicability",
    "Sentry/analytics data-processing implications"
  ],
  "recommended_actions": [
    "Codex inspect-first pass using CODEX_ACTIONS.md",
    "Close current MAX API2/TLS/auth gates",
    "Run security abuse and failure-injection tests",
    "Keep observability minimal and redacted",
    "Preserve frozen P0 and provider gate"
  ],
  "sources_count": 44
}

## EXECUTIVE_VERDICT.md
# Executive Verdict

**Controlled hackathon demo:** **CONDITIONAL GO** after the explicit security/data/runtime acceptance gates pass.  
**Public MAX placement/open pilot:** **NO-GO until open blockers close**.

Keep the frozen solo-first P0, Event ≠ Occurrence, honest UNKNOWN/provenance, PostgreSQL-centered architecture, and the separate provider gate.

Highest-value actions now:
1. inspect/test current MAX `initData` validation;
2. prove `platform-api2.max.ru` + TLS trust from the exact release runtime;
3. prove object authorization, session hygiene and startapp capability semantics;
4. prove partial provider sync cannot rewrite truth;
5. prove webhook/worker/idempotency behavior if async/bot flow is shipped;
6. close the minimum account/data-deletion and legal-placement gate before public placement;
7. keep observability minimal and redacted.

Do **not** add Redis, Kafka, Temporal, Kubernetes, a full OTel stack, provider HTML, another city/provider, or a mandatory social flow because of this research.

Main blocker: **current code/runtime/legal receipts are missing**, not a missing architecture design.

## GAPS_AND_OPEN_QUESTIONS.md
# Gaps and Open Questions

## Blockers
1. Exact current bodies/hashes of the four canonical project source-of-truth files were not directly re-opened in this pass.
2. Current source bodies for auth/ingress/transport/persistence/worker were not directly inspected.
3. Current Node version, lockfile and chosen queue package/version were not directly read.
4. Real MAX mobile/web runtime receipt is absent.
5. `platform-api2.max.ru` TLS/API receipt from the exact release runtime is absent.
6. KudaGo runtime/legal data gate remains open.
7. Public-placement deletion/privacy/legal gate remains open.

## Open questions
- Does `auth.ts` exactly follow current MAX HMAC/duplicate-param/freshness rules and use constant-time compare?
- Where is the application session stored/transmitted? Does the chosen SameSite/CSP/frame policy work in both MAX mobile and web?
- Is `platform-api.max.ru` still referenced anywhere? Does the release image trust the required chain?
- Is `User.name`, removed `GET /chats`, or the soon-removed member-add endpoint used anywhere?
- Which DB unique constraints protect occurrences, saves, memberships and delivery semantics?
- What makes an ingestion run `complete` rather than `partial`? Can stale responses overwrite newer data?
- What happens if the worker dies after MAX accepts a send but before local completion?
- Are raw initData, cookies, tokens, MAX IDs, IPs, source URLs or search text sent to logs/Sentry/analytics?
- Does the backend fetch arbitrary/provider-controlled URLs or expose a generic redirect endpoint?
- Is any provider HTML rendered through `dangerouslySetInnerHTML`/`innerHTML`?
- Does a user-data deletion path exist today, and what retention policy has been approved?
- Does KudaGo’s direct open indexable attribution condition work legally/technically inside the exact MAX Mini App flow?

## Requires runtime test
MAX auth mutations; MAX mobile/web session launch/reload; API2 TLS; webhook replay; DB/worker crash; provider partial/429/malformed/stale cases; duplicate suppression; telemetry redaction.

## Requires human/manual decision
Retention windows; public-placement timing; whether an already-real BullMQ path is sufficiently green to preserve; operational alert owner/channel.

## Requires legal check
MAX placement/licence/privacy/support obligations; deletion/legal basis/retention; KudaGo attribution/material-use applicability; analytics/error-vendor data processing.

## Requires Codex/host
Source-of-truth hash receipt; dependency/runtime inventory; source greps; test implementation; runtime receipts; scanner reports.

## Closed by this research
Official MAX initData algorithm; `initDataUnsafe` non-authority; ~1h auth_date guidance; API2 domain change; webhook transport/retry contract; deletion-rule existence; `User.name` deprecation; `/chats` breaking changes; KudaGo HTML/price/null-end/licence facts; OTel JS signal maturity; BullMQ v6 PostgreSQL-backend fact; pg-boss current runtime floor/repository activity; rejection of enterprise-security/observability expansion for P0.


# user-validation
## machine_summary.json
{
  "topic": "user-validation",
  "date": "2026-09-18",
  "final_verdict": "Keep frozen solo-first P0 unchanged. Public evidence supports occurrence-level logistics, honest missing data/source/save and optional messenger continuation, but does not prove PMF, Smart Povod demand, MAX-specific event-search demand or actual usability.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [],
  "p1_changes": [
    "No scope increase: retain follow artist/topic as opt-in P1.",
    "Retain Smart Povod only as a bounded P1 scenario after P0 stability; interaction precedent verified, demand not verified."
  ],
  "stretch_changes": [
    "Keep map and richer group/shared planning deferred/non-blocking.",
    "Optional MAX share/deep-link continuation remains acceptable after runtime verification."
  ],
  "keep": [
    "solo-first",
    "Moscow-first demo scope",
    "validated MAX identity",
    "Event != Occurrence",
    "hard constraints before ranking",
    "honest UNKNOWN/conditional/raw price",
    "no fabricated coordinates/time/value",
    "provenance/source + open primary source",
    "optional save",
    "loading/empty/error/source-unavailable states",
    "social as optional continuation"
  ],
  "change": [
    "Research wording: call it Public Evidence Validation / Desk Research, not interviews/usability study.",
    "Use human-readable UI copy for internal UNKNOWN without changing contract semantics.",
    "Use current MAX API domain and avoid deprecated group-member add dependency.",
    "Qualify all public statistics by population/geography."
  ],
  "defer": [
    "map",
    "second city until separate data gate",
    "rich group planning",
    "generic notifications",
    "Smart Povod beyond one bounded P1 scenario"
  ],
  "reject": [
    "mandatory group-first flow",
    "new provider based only on UX/public-evidence research",
    "presenting desk research as actual user testing",
    "using MAX reach as proof of user demand",
    "mapping unknown price to free/zero",
    "trusting initDataUnsafe/startapp as authorization"
  ],
  "blockers": [
    "MAX exact E2E runtime on target clients not verified in this archive.",
    "MAX eligible partner profile/licence agreement/moderation/privacy path must be confirmed.",
    "Provider legal/runtime approval remains a separate project blocker.",
    "Named source-of-truth files were not byte-accessible for final diff.",
    "No actual usability metrics exist under the chosen public-only research approach."
  ],
  "open_questions": [
    "Current team MAX partner verification/licence/moderation status.",
    "Actual Povod Android/iOS/web runtime.",
    "Provider source/legal/coverage gate.",
    "Brand/trademark/name clearance for 'Повод' given Yandex 'Повод для поездки'.",
    "Actual current UI wording/comprehension for UNKNOWN.",
    "Byte-level consistency with four canonical source-of-truth files."
  ],
  "runtime_checks": [
    "server-side MAX launch validation + own session",
    "tampered/stale launch rejection",
    "Android/iOS/web P0 E2E",
    "external source open after explicit click",
    "save persistence",
    "known/free/conditional/UNKNOWN states",
    "loading/empty/error/source-unavailable",
    "hard constraint PASS/FAIL/UNKNOWN",
    "platform-api2 usage",
    "optional share",
    "no dependency on removed group-member API"
  ],
  "manual_checks": [
    "MAX partner profile and moderation readiness",
    "final deck claim wording and source qualifiers",
    "source-of-truth actual-file diff",
    "brand/name positioning review"
  ],
  "legal_checks": [
    "MAX licence agreement and privacy/personal-data obligations",
    "provider licence/attribution/storage/caching/content rights",
    "trademark/name clearance for 'Повод'"
  ],
  "recommended_actions": [
    "Do not expand P0.",
    "Run current MAX device/runtime matrix.",
    "Confirm MAX publication/legal path.",
    "Finish provider legal/runtime gate in provider stream.",
    "Preserve UNKNOWN/provenance/source semantics.",
    "Keep Smart Povod/follow outside P0.",
    "Perform naming clearance.",
    "Use public evidence only with population/geography qualifiers."
  ],
  "sources_count": 38
}

## EXECUTIVE_VERDICT.md
# Executive Verdict — Povod User Validation

**Status:** FINAL WITH OPEN BLOCKERS  
**Date:** 2026-09-18

## Verdict

Keep the frozen solo-first P0 unchanged.

Public evidence strongly supports:
- concrete occurrence rather than abstract event-only output;
- date/time/place/price as decision-critical fields;
- honest missing-data states and visible source;
- save as a conventional low-risk action;
- optional messenger share as a continuation after solo discovery.

Public evidence does **not** prove:
- Russia-wide fragmentation pain;
- demand for Smart Povod;
- demand for event search specifically inside MAX;
- actual Povod usability/task success;
- exact mobile/web runtime.

## Recommend
1. Keep P0 frozen.
2. Verify MAX runtime on target clients.
3. Clear MAX partner/licence/moderation/privacy gate.
4. Preserve UNKNOWN/provenance/source semantics.
5. Keep Smart Povod/follow in P1.
6. Keep social optional.
7. Perform naming/trademark clearance for “Повод.”

## Do not recommend
- mandatory group planning;
- map as required P0;
- new provider because of this research;
- generic AI agent in P0;
- presenting desk research as user interviews.

## Main blockers
- exact MAX E2E runtime not verified here;
- MAX publication/legal path must be confirmed;
- live provider legal/runtime gate remains separate;
- byte-level reconciliation with named source-of-truth files remains open;
- no primary usability metrics exist by design.

## GAPS_AND_OPEN_QUESTIONS.md
# Gaps and Open Questions

## Critical open items

1. **Named source-of-truth files not byte-accessible in this pass.**  
   No byte-level diff against `POVOD_FINAL_SCOPE_FREEZE_MVP.md`, `POVOD_PRODUCT_SPEC_V1.md`, `POVOD_PRODUCT_SPEC_V1_1_DATA_SAFETY_PATCH.md`, `POVOD_PRODUCT_CONTRACT_V1.json` was possible. The supplied canonical project context was preserved.

2. **MAX exact runtime.**  
   Official docs verify capabilities, not the Povod implementation. Android/iOS/web runtime evidence remains required before claiming support.

3. **MAX publication/legal gate.**  
   Confirm eligible verified partner profile, active licence agreement, moderation path, privacy/terms/support documentation and personal-data basis.

4. **Provider/data legal gate.**  
   This archive does not approve KudaGo, Timepad, Fever or any other provider. Provider rights, coverage, source URLs, retention/caching and image/text use belong to the provider research stream.

5. **Brand/name clearance.**  
   Yandex operates an adjacent feature called “Повод для поездки.” This may be harmless, but requires a manual trademark/naming/positioning check.

6. **No primary usability evidence.**  
   Public research cannot produce task-success rates, hesitation, comprehension or trust metrics for the current Povod UI.

## Non-blocking questions

- Is follow artist/topic already implemented or only planned?
- Is Smart Povod already implemented? If not, do not let it displace P0.
- Is optional MAX share already functional on web as well as native clients?
- Which human-readable copy is currently used for UNKNOWN price/time/place?
- Are saved events durable across re-login or only local/session state?
- Do current source links point to exact event pages and handle source-unavailable gracefully?

## What is closed

- No P0 scope expansion from this research.
- Event != Occurrence stays.
- Hard constraints stay before ranking.
- UNKNOWN/provenance/source stay.
- Save stays.
- Group-first is rejected for hackathon P0.
- Map is deferred.
- Smart Povod/follow stay outside P0.
- Public desk evidence must not be presented as interviews/usability tests.


# ux-patterns
## machine_summary.json
{
  "topic": "ux-patterns",
  "date": "2026-09-18",
  "final_verdict": "Keep the frozen solo-first occurrence-first UX and brand direction. Tighten source/freshness semantics, keep Save/Follow/Going separate, keep map and social outside mandatory P0, and use MAX-native primitives only after runtime verification.",
  "status": "FINAL WITH OPEN BLOCKERS",
  "p0_changes": [
    "Source mandatory but freshness evidence-gated",
    "Explicit typed UNKNOWN",
    "Material-change state when data supports it",
    "Map/social must not block core",
    "No deprecated MAX group-member API"
  ],
  "p1_changes": [
    "Factual Smart Povod reason",
    "Artist/topic follow after core",
    "MAX bot/deeplink flow requires runtime spike",
    "Map conditional after core"
  ],
  "stretch_changes": [
    "Invite/share after event selection",
    "Minimal shared-plan RSVP only",
    "Second city after separate data gate"
  ],
  "keep": [
    "Повод",
    "solo-first",
    "MAX Mini App",
    "Poster Pop / Urban Event Poster",
    "#FFFDF8 #0E0E0E #C63B2B #6C54FF",
    "Onest + IBM Plex Mono",
    "calm working UI",
    "Event != Occurrence",
    "UNKNOWN first-class",
    "provenance/source",
    "Moscow-first P0",
    "Для тебя / Поиск / Сохранённые"
  ],
  "change": [
    "Do not universally show checked today",
    "Treat share/deeplink as runtime-required",
    "Treat MAX UI as selective/conditional",
    "Supersede old 2–3 city deck scope"
  ],
  "defer": [
    "map if it slows core",
    "full scheduling poll",
    "team/venue follow",
    "Group Reminder model",
    "second city until data gate"
  ],
  "reject": [
    "mandatory group flow",
    "MAX group-member add foundation",
    "one heart for Save/Follow/Going",
    "fake freshness",
    "fake coordinates",
    "unknown price as 0/free",
    "AI match percentages",
    "Map/Social bottom tab",
    "full ticketing"
  ],
  "blockers": [
    "Exact canonical files not directly accessible",
    "No Povod MAX client runtime evidence",
    "MAX UI compatibility unverified",
    "MAX partner/legal status requires manual confirmation",
    "Provider/legal approval separate"
  ],
  "open_questions": [
    "Current repo files/dependencies",
    "shareMaxContent client matrix",
    "deep-link/startapp occurrence flow",
    "provider timestamp semantics",
    "event revision history",
    "map coordinate quality threshold"
  ],
  "runtime_checks": [
    "MAX BackButton",
    "MAX openLink",
    "MAX shareMaxContent",
    "deep-link/startapp",
    "MAX UI v0.5.0 compatibility",
    "P0 state matrix",
    "save persistence",
    "responsive/accessibility"
  ],
  "manual_checks": [
    "Map go/no-go",
    "Poster Pop intensity",
    "P1 activation",
    "MAX account readiness"
  ],
  "legal_checks": [
    "MAX platform/licence",
    "MAX UI licence evidence if adopted",
    "provider rights/attribution"
  ],
  "recommended_actions": [
    "Occurrence-first cards/detail",
    "Typed UNKNOWN + tests",
    "Separate source from freshness",
    "Separate Save/Follow/Going",
    "Run Bridge client spike",
    "Run MAX UI spike if needed",
    "Keep social share-first and optional"
  ],
  "sources_count": 38
}

## EXECUTIVE_VERDICT.md
# EXECUTIVE VERDICT

## Verdict

**Keep the current product and brand direction. Do not expand P0.**

The final verified P0 UX target is:

**MAX → validated identity → interests/conditions → live Moscow events → concrete Occurrence → date/time/place → price or honest UNKNOWN → provenance/source → original source → optional save.**

## Recommend

1. Occurrence-first cards and detail hierarchy.
2. Typed UNKNOWN states.
3. Mandatory source/provenance; freshness only when evidence exists.
4. `Save != Follow != Going`.
5. Structured search/filters in P0.
6. Factual recommendation reasons only.
7. Explicit changed/cancelled/moved states when the data layer can prove them.
8. Poster Pop strongest at emotional moments; calmer feed/search/filter/settings.
9. MAX native Back/share primitives only after runtime verification.
10. Keep map optional after stable core.

## Do not recommend

- mandatory group scenario;
- full Partiful/Rallly scheduling poll in hackathon scope;
- map as a new primary bottom-navigation destination;
- fake freshness (“checked today”) without a defensible timestamp;
- `0 ₽` for unknown price;
- fake coordinates;
- one heart for save + follow + RSVP;
- “AI recommends” or match percentages without evidence;
- group-member automation via MAX API;
- claiming MAX UI compatibility without a build/client spike.

## Main blockers

- direct canonical spec files were not retrievable in this session;
- no Povod runtime test was run;
- MAX share/deeplink cross-client behavior remains runtime-required;
- MAX UI v0.5.0 compatibility is unproven;
- MAX platform/legal readiness needs manual confirmation;
- provider/legal approval remains outside this UX archive.

## Next actions

- finish/verify P0 feed/search/detail/source/save/states;
- run MAX Bridge client spike before P1/Stretch social;
- run MAX UI compatibility spike only if the library is being adopted;
- add tests for UNKNOWN, state separation, source link, occurrence identity and save persistence.

## GAPS_AND_OPEN_QUESTIONS.md
# GAPS AND OPEN QUESTIONS

## Evidence gaps

1. **Canonical files not directly available.** Exact named files were searched but not returned. Current 18 Sep instruction is the authority boundary for this archive.
2. **Repository HEAD not inspected here.** Exact component paths, dependency versions, flags and implementation status are unknown.
3. **No Povod runtime executed.** No device/client screenshots, logs or E2E evidence were produced.
4. **Provider timestamp semantics are not verified in this UX archive.** Freshness UI cannot be finalized beyond “only evidence-backed freshness”.
5. **User validation is not run.** Current test deck explicitly says `NOT RUN`.

## Open product questions

- Is map worth remaining hackathon time after P0 is stable?
- Which P1 subjects have stable identifiers: artist/topic only or more?
- Should recommendation reasons appear in the feed, Smart Povod only, or both?
- Does the data pipeline retain prior values/revisions for material-change diffs?
- What exact Poster Pop intensity is desired on detail hero vs feed?

## Open MAX questions requiring runtime

- `shareMaxContent` behavior on Android / iOS / Desktop / Web;
- exact startapp/deep-link return to one Occurrence;
- fallback when mobile-only share/haptic APIs are unavailable;
- BackButton lifecycle with app routing;
- `openLink` behavior for provider URLs.

## Manual/legal questions

- Is the team’s MAX partner/legal account eligible and verified?
- Is the required MAX licence agreement accepted?
- If MAX UI is bundled, is package/repository licensing evidence sufficient for release?
- Provider rights/attribution/storage/images: consume provider/legal research.

## Codex/host questions

- real component/file paths;
- current React/runtime versions;
- current Event/Occurrence/Source/Save state model;
- existing feature flags;
- existing Bridge wrapper.
