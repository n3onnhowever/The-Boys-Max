# Amvera bot webhook diagnosis and package — 2026-09-29

## Evidence and root cause

- User's live `/health/ready` response: `{"database":"UP","outboundHold":true}`. This confirms PostgreSQL access and the global outbound hold; it does not prove webhook delivery or worker activity.
- Current `amvera.yaml` started only `dist/apps/api/main.js`. Inbound `POST /api/v1/max/webhook` commits a `BOT_WELCOME` outbox row but never sends it. `apps/worker/main.ts` is the sender through BullMQ/Redis/MAX transport.
- Migration `0001_foundation.sql` initializes `outbound_control.hold=true`. The existing arm script is deliberately test-only and cannot run against live/hybrid.
- Last historical MAX read-only evidence (2026-09-20) found zero subscriptions. Current subscriptions were not accessible to this task because the user's bot token is private. An API-only local checker was prepared.

## Changes

- `amvera.yaml` now runs `dist/scripts/amvera-runtime.js` after existing migration/import/seed steps. It supervises API and worker in one hackathon container; loss of either stops both for Amvera restart.
- `POVOD_OUTBOUND_ARM_ID` is optional and absent by default. A new explicit ID reinitializes the Redis governor with a 10-second hold and only then releases the database hold. The same ID on later restarts does not rearm after Redis state loss. UNKNOWN delivery attempts prevent arming pending review.
- Sanitized logs indicate accepted webhook, worker delivery state, and process failure without message text, actor IDs, chat IDs, token or secret.
- Local PowerShell scripts check or configure MAX subscriptions through the official API, prompting for the token and webhook secret without embedding them in source or chat. The configuration script refuses to modify a subscription on another URL.

## Checks

- Red then green tests for one-time outbound arm, no automatic arm, UNKNOWN hold, and worker/API joint lifecycle.
- `npm run typecheck`: PASS.
- `npm run test:unit`: PASS, 317/317 after the logging changes.
- `npm run build`: PASS after the logging changes.
- PowerShell parser accepted both local scripts.
- Live MAX subscriptions, Amvera worker start, webhook POST, outbound send, network/TLS and browser acceptance: NOT_RUN. The user must run the API scripts with the bot token locally and deploy this package.

## Contract and operational sequence

1. Upload/rebuild full bot package with arm ID unset. Confirm `outboundHold:true` and process logs.
2. Check current MAX subscriptions with `GET https://platform-api2.max.ru/subscriptions` using the bot token only in a local Authorization header.
3. If absent, register the exact HTTPS URL `/api/v1/max/webhook` with update types `bot_started`, `message_created`, `bot_stopped`, `dialog_removed` and the same `MAX_WEBHOOK_SECRET` as Amvera.
4. Set a new `POVOD_OUTBOUND_ARM_ID` startup variable, restart, confirm `outboundHold:false`, then send `/app` in a personal MAX dialog.

## Limits

- One-container API + worker is a hackathon deployment tradeoff; resource starvation of either restarts both. The canonical architecture keeps separate roles.
- This package does not register a live MAX subscription or send a message on its own. It requires the user's token and explicit operator steps.
- Opening the Mini App alone does not prove a `bot_started` or `message_created` event occurred. The verification sends `/app` after the subscription is active.
