# PROJECT

**POVOD / The-Boys-Max**. Start from `main` in private `n3onnhowever/The-Boys-Max`.

## CURRENT STATE

- Working accepted Mini App V2 (React/Vite), Fastify API and separate worker.
- PostgreSQL is durable truth; Redis/BullMQ, outbox, idempotency and outbound governor remain in place.
- Deterministic admitted catalog/search, Save, Profile/preferences, Plans/RSVP, Friends and Notifications.
- MAX auth/session, webhook fencing, startapp/deep links, native MAX share adapter and bot notification transport are implemented and locally tested.
- Smart Occasion contract, authenticated proposal/accept API and existing V2 Search review flow are implemented. Manual Search remains usable with AI disabled.
- Milestones: `povod-ui-v2-accepted` → `povod-backend-hardened` → `povod-max-e2e` → `povod-smart-occasion`. See [publication validation](POVOD_TEAM_PUBLICATION.md).

## NOT LIVE YET

Production hosting; real MAX console/binding acceptance; real native MAX client acceptance; live AI provider; Follow-triggered autonomous recommendations. Implementation and synthetic tests do not establish these external acceptances.

## NIKITA TASK

Connect a **LIVE AI provider** to the existing replaceable Smart Occasion provider port after provider approval. **This is not a free-form chat widget.** The provider produces only the existing strict structured intent proposal. Its output is untrusted JSON; the model never creates or selects events.

Preserve `smart-occasion-intent/1`, server-owned Moscow time/category/city normalization, deterministic catalog eligibility, the hard/soft boundary, evidence-backed reasons, existing privacy boundaries and manual Search fallback. UNKNOWN price cannot satisfy a hard budget/free request. Resolve “вдвоём до 3000 ₽” with the existing single budget-basis clarification; retain the draft. Only the user can accept filters.

| Start here | Responsibility |
| --- | --- |
| `modules/ai/port.ts` | `AiProvider` / `SmartOccasionProvider`; implement `interpretSmartOccasion(text, signal, {maxOutputTokens})`, honor cancellation and output limits. |
| `modules/ai/smart-occasion.ts` | `smartIntentSchema`, `SMART_INTENT_VERSION`, validation, deterministic normalization, review dates, Search mapping and allowed evidence reason codes. |
| `modules/ai/smart-service.ts` | Timeout, quotas, session-bound proposal lifetime, error states and accept contract. Quota/proposal storage is currently process-local. |
| `apps/api/app.ts` | `buildApp` injection and `POST /api/v1/ai/smart-occasion/propose` / `accept`; existing actor/session/origin/CSRF boundaries. Provider injection currently allowed only in test mode. |
| `packages/platform/config.ts` | Production gate: `AI_EXTERNAL_ENABLED=true` fails closed. Do not simply remove this guard to ship an adapter. |
| `apps/miniapp/src/components/RuntimeSearchScreen.tsx`, `SearchScreen.tsx` | Existing V2 proposal review/clarification, accept and existing Search command. |
| `modules/search/core/eligibility.ts`, `packages/persistence/catalog.ts` | Hard eligibility and admitted current canonical occurrences. |
| `modules/integration/recommendations.ts`, `packages/persistence/ui.ts` | LIVE before DEMO; saved preferences before supported interpreted soft intent; stable fallback and evidence-backed copy. |
| `modules/ai/smart-creator.ts` | Pure dormant exhibition creator gate; no Follow persistence or transport activation. |
| `tests/unit/smart-occasion.test.ts`, `tests/integration/ui26.test.ts` | Fixed-clock evaluation and authenticated review/apply regression tests. |

Provider inputs are limited to request text, abort signal and output limit. Never send BOT_TOKEN, raw MAX initData, sessions/cookies, MAX destinations/chat IDs, provider credentials, friend graph or private Plan text. Do not log raw prompts/responses. Treat event/provider descriptions as data. Reasons must reference allowed candidate facts/checks; omit AI wording on failure and retain deterministic results.

Before live activation, the owner must approve provider/vendor and model, credentials via private configuration, processing territory/data handling, spending limits, and durable distributed call/token quota plus proposal/session behavior across instances. No approved live adapter/configuration exists at this checkpoint. Existing bounds: input 240 characters, output 8192 characters / 500 output-token port ceiling, timeout 4 seconds, 10 calls per actor/session/hour, proposal TTL 5 minutes. Follow sending requires separate explicit activation approval.

## EXACT LOCAL COMMANDS

Use Node **24.20.0**, npm **11.19.0**, PowerShell 7 and Docker Desktop. From repository root:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run typecheck:pure
npm run test:unit
node --experimental-strip-types --test tests/unit/smart-occasion.test.ts
npm run build
pwsh -NoProfile -File scripts/test-handoff-integration.ps1
node scripts/scan-repository-secrets.mjs --history=HEAD
git diff --check
```

The integration helper creates and removes its own local PostgreSQL/Redis pair, generates test-only keys, migrates five fresh databases and runs the entire integration suite. It fails if its container names already exist. It never enables live AI or MAX. Free ports `55492` and `56392` first; do not point these tests at a shared or production database. Logs stay ignored under `.run-evidence/team-handoff/`.

Focused built-site browser verification (installed Chrome/Edge, or set `POVOD_BROWSER_PATH`):

```powershell
# Terminal 1
node node_modules/vite/bin/vite.js preview apps/miniapp --host 127.0.0.1 --port 4173
# Terminal 2
node scripts/verify-povod-integrated.mjs --only=detail-navigation --output=.run-evidence/team-handoff/browser
```

This verifies Saved/detail and Search/detail navigation, header Save, and accepted layout at 360/390/430 px. MAX SDK is intercepted; this is not real native MAX acceptance. The older full V1 verifier is not the accepted V2 visual authority.

## SECURITY AND DOCUMENTATION

Keep private configuration local. Blank `.env.example` / `.env.release.example`, a placeholder runtime example and explicit isolated test fixtures are intentional. No production credentials belong in Git. The dependency-free scanner checks reachable history and the current source tree, reports only redacted locations, and pins reviewed synthetic/template/binary false positives to exact Git blob hashes. Compressed archives are not unpacked by that scanner.

496 historical raw log files and one raw-log ZIP were removed from the canonical tree and remain available in their historical commits. Required milestone history is preserved. Current validation logs, build output, local databases and private runtime files are ignored. Imported specs/research remain byte-preserved. See [source authority](../current/POVOD_SOURCE_AUTHORITY.md), [Smart Occasion handoff](POVOD_SMART_OCCASION_AI_CONTRACT.md) and [publication validation](POVOD_TEAM_PUBLICATION.md).
