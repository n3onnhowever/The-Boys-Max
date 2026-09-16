# The Boys / MAX leisure — Codex repository rules

## Permanent invariants

This repository develops a chatbot + mini-app in MAX for the hackathon track «Досуг и развлечения».

### Product
- Team: **The Boys**.
- Product name: **TBD**. Candidate names are research only. Do not register a MAX bot nickname or hard-code a public product name until the naming gate is accepted.
- Primary user value must exist **without creating a group**: personal event discovery / guide.
- Collaborative planning is an explicit optional continuation such as “Invite friends”.
- `saved`, `suitable`, `voted`, and `committed` are distinct states.
- A commitment is tied to the current semantic terms revision. Material changes require explicit re-confirmation.
- Never claim ticket purchase, attendance, live availability, exact price, or official fact unless the product has evidence for that claim.

### Architecture
- TypeScript + React mini-app.
- Modular monolith with separate API and worker runtime roles.
- PostgreSQL is the durable business source of truth.
- Redis + BullMQ is the async execution layer. Do not replace it with a custom PostgreSQL queue.
- MAX Bot API is server-side. MAX Bridge is client-side.
- Durable ingress/outbox/idempotency and explicit external-delivery outcomes are required where applicable.
- Provider adapters must sit behind stable ports (`EventProvider`, `AiProvider`, map/geocoding boundary as needed).
- Do not introduce Kafka, Kubernetes, microservices, or new infrastructure without measured need and an ADR.

### Data / AI / external services
- Keep provenance, source timestamp, territory, uncertainty, and provider limitations with event data.
- Unknown price/fee remains unknown; never coerce to zero.
- Finished events must not be recommended as future options.
- LLM output is advisory. It must never decide authorization, commitment, hard eligibility, official facts, or unknown price.
- Synthetic/test data must be explicitly labelled. Never present it as a live integration.
- Do not spend money without explicit user approval.
- Do not ask for or print secrets. Use environment-variable names and `.env.example` only.
- Do not bypass access restrictions with VPNs, unsafe mirrors, disabled TLS verification, `--force`, or equivalent shortcuts.

### Third-party code and design
- Before reusing external code/assets, record repository, pinned revision, licence, copied/adapted paths, and notices.
- Closed products may be UX references only; do not copy their code/assets.
- EventHive or any other donor is not approved by reputation alone: run the pinned donor, inspect licence and dependencies, capture evidence, then decide.
- Team logo and product brand are separate layers. Preserve the supplied The Boys logo; product palette/type may be compatible without blindly copying it.

## Source authority

Read the minimum necessary authority for the task:
1. `input/official/Досуг и развлечения.pdf` — official hackathon case.
2. `docs/current/*` — accepted current project state.
3. `docs/architecture/*`, `docs/product/*`, `docs/design/*` — current project contracts and decisions.
4. Relevant `input/results/*` ZIPs — implementation/research evidence, not automatically current.
5. `input/reviews/*` — audits and known gaps.
6. Older nested material — historical evidence only.

When sources conflict, do not silently merge assumptions. Record the conflict in the task handoff and follow the highest applicable authority.

## Task discipline

- Work only on the active task in `docs/tasks/`.
- Do not reread the entire archive for every task. Start from the task's listed inputs.
- Before editing, inspect `git status --short` and record the baseline commit if Git is initialized.
- Prefer the smallest correct change over a parallel implementation.
- Shared contracts, root dependencies, migrations, API routes, and session/auth rules have one owner: the integration task.
- A module task may propose a contract delta, but must not fork the repository-wide contract silently.
- Use tests first for reproducible defects.
- Keep evidence fresh for the final changed code.
- A passing unit test never upgrades an unexecuted Docker/MAX/live-provider/browser check to PASS.

## Completion

For code-affecting work, run the strongest checks available for the active task:
- targeted tests during development;
- final typecheck/tests/build;
- Docker/PG/Redis only when the task requires them and the daemon/services really run;
- browser screenshots only from the actual target build;
- `git diff --check`;
- secret/prohibited-file scan;
- `git status --short`.

If a required external dependency is unavailable, complete the independent work and record `BLOCKED_*` with exact reproduction commands. Do not replace execution with another broad review.

Every significant task ends with a concise `docs/handoffs/<task>.md` containing:
- exact input/source revision;
- files changed;
- checks actually executed and their results;
- checks NOT_RUN/BLOCKED;
- contract deltas;
- residual risks and the next concrete action.
