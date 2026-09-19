# Повод / The Boys — repository rules

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
