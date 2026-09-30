# Amvera GigaChat hackathon adapter

## Input and scope

User requested activation of GigaChat after the MAX bot/webhook rollout and showed a personal API project (`GIGACHAT_API_PERS`) before generating its Authorization key. The prior Amvera bot ZIP is the baseline. The desired behavior follows the existing Smart Occasion search review UI; no free-form bot chat or event generation is introduced.

## Changes

- `modules/ai/gigachat-smart.ts`: fixed-host OAuth plus `GigaChat-3-Ultra` chat completion, cached 30-minute access token, structured JSON response, bounded input/output, scoped pinned Russian Trusted Root CA, abort handling, no raw credentials/errors in logs.
- `packages/platform/config.ts`, `apps/api/main.ts`, `apps/api/app.ts`: explicit external AI gate and private Authorization key; production provider injection only when enabled.
- `modules/ai/smart-service.ts`, `apps/miniapp/client.ts`: 18-second provider abort and 20-second client timeout for this one request, retaining manual search fallback and user review.
- `.env.release.example` and external Amvera instructions document the secret and rollout.

## Verification

- `node --experimental-strip-types --test tests/unit/gigachat-smart.test.ts`: PASS with fake OAuth/chat responses; token cache, refresh, JSON validation and redacted failure covered.
- `npm run test:unit`: PASS, 321/321 tests.
- `npm run typecheck`: PASS.
- `npm run build`: PASS.
- Live OAuth, model response, outbound port 9443 and Amvera runtime: NOT_RUN (no Authorization key provided to workspace; intended user private secret on Amvera).
- Git diff/secret history scan: NOT_RUN because this ZIP staging folder has no `.git`. No real secrets were added.

## Operational limits

External calls remain off by default. One Amvera replica is assumed for the existing in-memory 10-calls-per-user/session/hour quota and five-minute proposal store. A restart resets these ephemeral limits/proposals. The hard catalog eligibility and source provenance remain deterministic. GigaChat may only propose filters; the user accepts them before search. OAuth or completion failures return a bounded error and leave manual search available. Enabling external AI consumes the account's GigaChat allowance; owner controls that switch in Amvera.
