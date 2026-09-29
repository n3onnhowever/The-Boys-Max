# MAX production E2E implementation — owner checkpoint

## Inputs and boundary

- Date: 2026-09-29. Branch `codex/max-production-e2e`; dedicated worktree `D:\Dev\Codex\Worktrees\max-production-e2e\The-Boys-Max`. Verified clean starting HEAD `f19ab5762b035cca17f70918af03af940fca7a4a` before edits. The separate source checkout was left untouched.
- Authority: `AGENTS.md`, `docs/tasks/ACTIVE_TASK.md`, `docs/current/POVOD_SOURCE_AUTHORITY.md`, the read-only **POVOD | MAX | Production E2E Audit** at that SHA, accepted UI V2 and backend-hardening handoffs, and the scoped `docs/current/REAL_CATALOG_HYBRID_POLICY.md`. Current official [MAX Bridge](https://dev.max.ru/docs/webapps/bridge), [Update schema](https://dev.max.ru/docs-api/objects/Update), [keyboard use case](https://dev.max.ru/docs-api/use-cases/sending-messages/keyboard), and [API changelog](https://dev.max.ru/docs-api/changelog-api) were checked. No LLM selection, map, provider expansion, live MAX operation, deployment, commit, or push was performed.
- The accepted V2 styling/assets, raw server-side MAX initData verification, session/CSRF/origin checks, canonical Event/Occurrence identity, BullMQ/Redis/outbox, and UNKNOWN delivery fence remain in place.

## Implementation and contract deltas

| Area | Result |
| --- | --- |
| Launch | `start_param` now chooses the visible V2 surface as well as the route. Signed MAX context takes precedence over browser query navigation. `catalog`, canonical `e_` event, short `x_` event, `p_` plan, `i_` invite, and expiring `f_` friend references resolve after authenticated session establishment. Invalid syntax, unavailable event, expired invitation, and inaccessible plan use existing error/recovery screens; an invitation never performs join/commit. Exact browser route is normalized after validation for reload. |
| Links | MAX-facing links use `https://max.ru/<bot-nickname>?startapp=<payload>`. Locators use allowed characters and at most 512 characters; oversized canonical event locators get a random server-resolved `x_` reference. Locators carry no secrets or actor IDs and do not grant access. Loopback browser URLs remain for local test/demo. |
| Native share | Accepted V2 Event, Plan, and Friend actions invoke `WebApp.shareMaxContent({text,link})` from click handlers. Event text uses verified title only; Plan and Friend text is generic. Explicit Copy Link stays available; no success claim is made for a failed Bridge call. The Bridge/real share picker and recipient handoff require client tests. |
| Revocation | `bot_stopped` and `dialog_removed` are parsed, stored and applied through the existing durable ingress. Destination state is fenced by MAX source milliseconds: older revocations cannot replace newer starts; duplicate updates are idempotent; conflicting equal-time evidence quarantines/fails closed. Delivery requires an active current destination and rechecks before wire submission. A failed send alone never revokes consent. |
| Bot notices | Durable factual Plan invitation, material change/reconfirmation, and meeting-time reminder outbox records use recipient/revision/purpose keys. In-app notification remains available. Delivery rechecks preference, invitation validity or plan membership/revision and current destination. A transport hook accepts a later, explicitly created recommendation for a currently admitted occurrence; no AI creator or selection exists. UNKNOWN remains terminal to blind resend. |
| Buttons | Bot attachments use documented MAX keyboard `link` buttons to the exact `startapp` URL; no undocumented `open_app` fields are added. Serialization and delivery tests cover the button. |
| Cookie/TLS | Existing exact-origin, secure host cookie, CSRF and two supported profiles (`LAX_FIRST_PARTY`, `PARTITIONED_EMBEDDED`) are preserved. Profile selection needs actual MAX Android/iOS/Web acceptance. Scoped MAX transport still targets `https://platform-api2.max.ru` with `Authorization`; the checked-in scoped Russian trust root successfully verified the current public chain, so it was not changed. |

Three append-only migrations: `0013_max_destination_revocation.sql` adds destination active state; `0014_max_event_launch_refs.sql` adds expiring opaque event references; `0015_max_notification_outbox.sql` adds factual notification kinds, fields and unique key. They were applied in the isolated PostgreSQL 18.6 test databases through migration 0015. No existing domain migration was rewritten.

## Local validation

Evidence files are under `.run-evidence/max-production-e2e/` in this worktree; they are ignored local run artifacts. Commands used synthetic credentials and isolated PostgreSQL 18.6 (`127.0.0.1:55491`) and Redis 8.2.9 (`127.0.0.1:56391`). Test-only URLs `DATABASE_URL`, `T105_TEST_DATABASE_URL`, `REAL_CATALOG_TEST_DATABASE_URL`, `P0_SAVE_TEST_DATABASE_URL`, and `DEMO_TEST_DATABASE_URL` pointed respectively to isolated `max23_test`, `povod_t105_test`, `povod_real_catalog_verify`, `povod_save_fresh`, and `povod_demo_verify`. No real MAX message or subscription was used.

| Check | Exact command / result |
| --- | --- |
| Dependencies | `npm.cmd ci --ignore-scripts`, exit 0. |
| Migrations | `npm.cmd run migrate` per isolated database; 0001–0015 applied, exit 0; `migrate-*.log`. |
| Types | `npm.cmd run typecheck` and `npm.cmd run typecheck:pure`, both exit 0; `typecheck-final.log`, `pure-final.log`. |
| Unit | `npm.cmd run test:unit`, exit 0, 295/295; `unit-final.log`. Includes MAX auth/locators, Bridge adapter, bot schema, and source/identity checks. |
| Integration | `npm.cmd run test:integration` with the isolated database URL variables and `RUN_MAX23_INTEGRATION=1`, exit 0, 75/75; `integration-final3.log`. Includes webhook fencing, mismatched-dialog stop quarantine, bot notices/outbox, authenticated launch, real catalog, Save, UI/backend. An earlier invocation omitted four required test database URL variables and failed those isolation guards; the corrected full rerun is the authoritative result. |
| Build | `npm.cmd run build`, exit 0; 202 Vite modules; `build-final.log`. Frozen V2 CSS emitted as `index-De2ka6wG.css`, matching the accepted owner-preview asset. |
| Owner preview | Isolated hybrid local preview with migrations, demo seed and curated official import started on `127.0.0.1:3001`. `/health/live`, `/health/ready`, `/`, and origin-checked `POST /dev/owner-session` returned 200. The preview process was stopped afterward. This is a startup/asset regression check, not a real MAX client visual acceptance. |
| MAX TLS | Read-only unauthenticated `GET https://platform-api2.max.ru/me` via `maxTlsOptions()` completed TLS validation and returned expected HTTP 401. Leaf `*.max.ru`, issuer `Russian Trusted Sub CA`, SHA-256 fingerprint `78:C8:54:E2:B4:F2:24:80:B1:CA:8E:2E:0C:2A:2A:27:7C:23:79:21:98:AD:8B:34:D1:95:90:59:9D:FD:29:25`; `tls-smoke.log`. No trust or global TLS setting changed. |

Final `git diff --check` exited 0. The changed/untracked path scan found zero prohibited paths (`.env`, `.secrets`, private keys, generated assets) and zero files matching the private-key/credential-assignment scan. `git status --short --branch` confirms only this worktree's uncommitted source, migrations, tests and handoff. Docker/PG/Redis/browser checks mean only the explicitly executed local checks above; no real MAX client PASS is claimed.

Source SHA-256 samples tying the results to this uncommitted revision: `packages/platform/launch.ts` `88D582274C473A5094DFA01BEA7A43145E46DB8A061E6593C7DD62ED3E0DF9CB`; `packages/platform/ingress.ts` `16E610C85AB6EE3B1DD26683C47C3A96FE3A5705D67C2A0CE855401CCAF08F9D`; `packages/persistence/delivery.ts` `AFA14913B11CE70DC21361920DD395ECFC755422FE2DDC8AD7BAD27E58F55D0C`; `apps/miniapp/src/main.tsx` `9DF5E063DBF53E587605C5EF8E14C3A1B5E28AD898566424C870C00A74236D18`; `tests/integration/max-bot.test.ts` `63B57B3335DD8E4C1575D1912F3E4C0E12716B1373461BC5D92C8C8A02E13CB6`. Evidence SHA-256: `unit-final.log` `1CEDD4AEDE588645DE5A08FD0CB802A68C0FCCF0AA15E769790DA366052D40B4`; `integration-final3.log` `48F0D6558270CE9FA22A82B08D292C71091979A57846EE1B1F7C0F4E1771E60D`; `build-final.log` `52748AC0D618EB5ADD015ECB1C3C7A7DF8596A2F56E765107C29DCAFE94BD503`.

## Production configuration contract — preparation only

The existing `compose.ru-https.yaml` has PostgreSQL 18.6, Redis/BullMQ, one-shot migration, separate API and worker, restart policies, read-only mounts, healthchecks, and Caddy HTTP→HTTPS/public 443. Its runtime file stays outside Git and is mounted read-only. The owner/operator must review the current `docs/handoffs/RU_HTTPS_DEPLOYMENT.md` before any separate deployment authorization.

- Compose inputs: `POVOD_IMAGE` (immutable image from the reviewed source), `POVOD_RUNTIME_FILE` (absolute protected runtime JSON), `POVOD_PG_PASSWORD_FILE` (absolute protected password file), `PUBLIC_HOSTNAME` (controlled DNS). Compose sets `RUNTIME_FILE=/run/povod/runtime.json`, `APP_MODE=live`, `NODE_ENV=production`, `MAX_INGRESS_MODE=WEBHOOK`.
- Required runtime names: `PUBLIC_ORIGIN`, `COOKIE_PROFILE`, `DATABASE_URL`, `REDIS_URL`, `SESSION_KEY`, `ESCROW_KEY`, `BOT_TOKEN`, `MAX_WEBHOOK_SECRET`, `CREDENTIAL_SCOPE`, `POVOD_MINIAPP_URL`, `MAX_BOT_USERNAME`, `LIVE_GATE`. `COOKIE_PROFILE` is one of `LAX_FIRST_PARTY` or `PARTITIONED_EMBEDDED`; select only after client results. `LIVE_GATE=REVIEWED_MAX26_LIVE` requires separate owner review. Use the actual existing bot nickname; never rename it here. No values belong in repo, logs, or handoff.
- Conditional runtime names: `DEMO_CATALOG_VERSION=v1` only for an explicitly authorized `APP_MODE=hybrid` demo fallback; `ALLOWED_SOURCE_ORIGINS` for individually admitted official source links; `POVOD_PRIVACY_URL`, `POVOD_ABOUT_URL` if configured. `AI_EXTERNAL_ENABLED=false`, `MAP_EXTERNAL_ENABLED=false` preserve deferred features. `POVOD_OWNER_PREVIEW` is local-only and must not be enabled in production.
- Public contract: full-chain trusted HTTPS on TCP 443; same controlled origin for Mini App and API; webhook `POST /api/v1/max/webhook`; `/health/live` and `/health/ready`; migration 0015 completed before API/worker; durable PG/Redis volumes and restart/backup/restore review. `PUBLIC_ORIGIN` and `POVOD_MINIAPP_URL` must be the exact approved public URLs. Secure cookies, exact Origin and CSRF checks stay enabled.
- External MAX-console actions requiring explicit owner approval: confirm the current bot nickname/token and Mini App HTTPS URL/domain; configure webhook HTTPS endpoint, current MAX webhook secret and subscribed update types including `bot_started`, `message_created`, `bot_stopped`, `dialog_removed` as supported by current console; then verify delivery/secret handling without logging secrets. No console or subscription change occurred in this sprint.

## Scoped Moscow data boundary

The existing curated official Darwin Museum records with exact provenance remain admitted only within their reviewed scope. EKP date-range rows have no exact Occurrences. Demo fallback is labeled and conditional in hybrid mode. KudaGo and provider-wide Gate v2 remain deferred/FAIL; no provider-wide Moscow or KudaGo claim follows from this sprint. No provider research or new source admission was performed.

## Real MAX acceptance runbook — NOT_RUN

For each Android, iOS if available, Web and supported desktop run, record: MAX version, platform, existing bot nickname, payload, raw-auth result, API result/status, final V2 screen, whether native share picker opened, whether the user actually sent, whether recipient opened the exact destination, and bot delivery outcome. Keep picker, send, recipient open, and provider acceptance as separate observations. Use non-secret test records and owner-approved test accounts.

1. Owner approves external test configuration and deployment in a separate checkpoint. Verify public DNS/443, full-chain TLS, Mini App URL, API and webhook reachability, migrations, worker, health and restart behavior from an independent network. Verify live gate/data admission separately; do not infer broad source approval.
2. On every available client, launch `catalog`, exact `e_`/`x_` Event, authorized `p_` Plan, `i_` Invite and `f_` Friend link from bot/MAX; confirm raw initData auth, exact final screen, reload/direct re-entry, and safe invalid/expired/ACL errors. Opening invites must not join or commit.
3. From Event, Plan and Friend V2 actions, tap MAX share as a real user. Record picker-open, actual send and recipient exact-open independently. Also test explicit Copy Link when Bridge is unavailable/fails, without claiming a MAX send.
4. With owner-approved synthetic messages only, verify bot start, stop/removal, newer restart, duplicate/older/conflicting update order, webhook secret rejection, current-destination requirement, factual invitation/change/reminder buttons and UNKNOWN outcome review. Do not replay UNKNOWN blindly.
5. Compare `LAX_FIRST_PARTY` and `PARTITIONED_EMBEDDED` on Android, iOS if available, and Web. Record cookie persistence, session bootstrap, exact Origin/CSRF outcomes and reload. Select the real cookie profile only from these results; do not weaken security for local convenience.

## Risks and next action

- Real MAX clients, console subscription, actual native picker, actual send, recipient exact-open, public HTTPS/certificate/restart, and production secrets are **NOT_RUN** pending owner approval and environment. The selected cookie profile is therefore **UNDECIDED**.
- The recommendation transport hook has no AI creator; it must remain dormant until a later approved Smart Occasion ticket. In-app notifications are the fallback/source of truth.
- Owner should review this worktree and handoff, then explicitly authorize external configuration and real-client acceptance as a separate checkpoint. No commit, push or deploy has been done.
