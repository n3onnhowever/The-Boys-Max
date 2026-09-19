# T050 — Independent acceptance

> Historical task; inactive. Follow [ACTIVE_TASK](ACTIVE_TASK.md). The T101/T102 authorization supersedes this old work order.

Recommended: GPT-6 Astra / high (use GPT-5.6 Sol/high if Astra is unavailable or unnecessary)

Goal
Independently verify one exact integrated source commit after T010/T020/T030.

Do
- Pin source hash before checks.
- Run clean dependency install/build/tests.
- Run Docker build/compose and measure official build-time requirement.
- Run disposable PostgreSQL/Redis/BullMQ checks.
- Run API contract/OpenAPI/DATA-API checks.
- Run personal discovery end-to-end and optional collaborative flow.
- Check failure recovery, duplicate ingress/idempotency, unknown outbound outcome, past events, unknown price, geo failure and cancellation.
- Check web and mobile MAX when live integration is available.
- Secret/dependency/data/provenance scan.
- Produce a PASS/PARTIAL/BLOCKED matrix with evidence paths.

Do not
- fix the product while acting as independent acceptance unless explicitly switched to a repair task;
- count inherited logs as fresh passes.

Acceptance
Every official criterion claim maps to fresh evidence or an explicit blocker.
