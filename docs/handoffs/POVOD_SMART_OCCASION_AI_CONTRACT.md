# POVOD Smart Occasion / AI contract handoff

**Checkpoint update, 2026-09-29:** The owner subsequently authorized committing this implementation, preparing canonical `main`, and publishing to a private team repository. Both browser failures below were stale V1 verifier assumptions: accepted V2 uses a `Событие` Back header and no bottom tabs on Event Detail. Focused V2 browser verification now passes without product changes. See [team publication validation](POVOD_TEAM_PUBLICATION.md) and [Nikita handoff](TEAM_HANDOFF_NIKITA.md). The original sprint evidence below remains a record of what ran before this follow-up; production AI is still disabled.

## Inputs and revision

- Owner's 2026-09-29 approved Smart Occasion / AI contract request, base `f024156659b10481a43508272a80219c812a28de`, branch `codex/ai-smart-occasion`, dedicated clean worktree `D:\Dev\Codex\Worktrees\ai-smart-occasion\The-Boys-Max`.
- Existing read-only Smart Occasion contract was described in the request but no separate contract document was present at the base SHA. The field list and behavior in the owner request were used as the sprint contract. Existing source authority, real-catalog policy, V2 UI, and MAX transport were preserved.
- Source samples, SHA-256 after final implementation: `modules/ai/smart-occasion.ts` `20A6003F82CE9ACED33FED4B8F7FE5011B7C99A1DEA3C152D8BCC55BDDB59DBF`; `modules/ai/smart-service.ts` `B3A73BAE6CCEB31BD3F0BDECF30887734A3BEAC81603368E56955AAF87993EFC`; `modules/ai/smart-creator.ts` `84CFCA9196DAE30D1F0BFFE2164776F08767A354B2E1289384EA57CE9EE87F86`; `apps/api/app.ts` `80D9F31F37AB249AB59F1CEA967C4F6B85E05E55A13127A9FED4E78D1F7FCA6D`; `tests/unit/smart-occasion.test.ts` `D0CCB6EFF691B2E318DC1F83C8FE535B992D91BB445DAC5CCE9F74D1728B8E4E`.

## Contract and changed areas

- `modules/ai/smart-occasion.ts`: strict `smart-occasion-intent/1` parser for all requested fields, no unknown fields; deterministic Moscow date/daypart and budget mapping; unsupported-city and ambiguous group-budget clarification; evidence-backed reason-code allowlist and backend Russian copy.
- `modules/ai/smart-service.ts` and `modules/ai/port.ts`: replaceable interpretation port; 240-character input, 8192-character output, 4-second timeout, 10 calls per actor/session/hour, 500 output-token port ceiling, five-minute session-bound proposal, no raw prompt/response logging. Provider receives only request text, abort signal, and output limit. No event or private account data is sent.
- `apps/api/app.ts`: authenticated `POST /api/v1/ai/smart-occasion/propose` and `POST /api/v1/ai/smart-occasion/accept` with existing origin/session/CSRF boundaries. Provider injection works only in test mode. In demo/hybrid/live the endpoint returns `AI_DISABLED`; no external model call is wired.
- Existing Search contract and UI: proposal review/clarification is shown in the V2 Search screen; acceptance returns a normalized Search draft, then the existing Search command persists it. No Search context mutation occurs at proposal or accept. Manual Search works with AI disabled. Weekend ranges and confirmed-free flags are carried through the existing deterministic catalog gate.
- `modules/integration/recommendations.ts`, `packages/persistence/ui.ts`, and the existing card view: saved preference score precedes verified interpreted interest soft ranking; backend reasons carry candidate observation ID and passing check. Nearby/mood/social context are preserved as soft proposal data but do not rank without verified supporting facts.
- `modules/ai/smart-creator.ts`: pure dormant gate for followed “Выставки” topic and an approved, future, LIVE Moscow exhibition with confirmed rights and eligibility. No Follow persistence, creator schedule, outbox write, or recommendation transport call was added.
- `tests/unit/smart-occasion.test.ts` and `tests/integration/ui26.test.ts`: fixed-clock evaluation and authenticated proposal/apply checks. `docs/tasks/ACTIVE_TASK.md` points at this dedicated sprint.
- Migrations: **none**. EventProvider, MAX transport, source admission, map and real bot configuration unchanged. No commit, push, deployment or real MAX send.

## Checks actually run

All commands below ran from this worktree on the final source unless noted. The isolated test pair was PostgreSQL 18.6 on `127.0.0.1:55492` and Redis 8.2.9 on `127.0.0.1:56392`, with generated test-only keys and five fresh named test databases. No real provider or MAX calls were made. Logs are ignored local evidence in `.run-evidence/ai-smart-occasion/`.
The two test containers were stopped and removed after the final run; the ignored logs remain in this worktree.

| Command | Exit / result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | 0; 136 pinned packages installed. |
| `npm run migrate` for `max23_test`, `povod_t105_test`, `povod_real_catalog_verify`, `povod_save_fresh`, `povod_demo_verify` | 0 each; migrations 0001–0015 applied in fresh isolated databases. `migrate-final-*.log`. |
| `npm run typecheck` | 0; `typecheck-final.log`. |
| `npm run typecheck:pure` | 0; `typecheck-pure-final.log`. |
| `npm run test:unit` | 0; 307/307. `unit-final.log`, SHA-256 `3084CC5D23172AB9FD989BB6DCE393A9480B4477E753E3C2B06C138ED088AB93`. |
| `node --experimental-strip-types --test tests/unit/smart-occasion.test.ts` | 0; 12/12. Fixed clock `2026-09-29 12:00 Europe/Moscow`; seven requested phrases, injection-like event text, UNKNOWN price, malformed/unknown model fields, timeout/failure, rate limit and creator gate. `evaluation-final.log`. |
| `npm run test:integration` with `RUN_MAX23_INTEGRATION=1` and the five isolated database URLs | 0; 76/76. Includes new session/CSRF/review/apply flow, existing real catalog, Save, MAX launch/deep-link and transport simulation checks. `integration-final.log`, SHA-256 `83D78CCED414CF14B56B77A203F8E27C8A19D45132A204EB84D639281292BBD5`. |
| `npm run build` | 0; TypeScript and Vite (202 modules). `build-final.log`, SHA-256 `62B8226E1E8C15B569AC10C705208434FD0FE9A2A10EE63314FC73586FFB4CB1`. |
| `git diff --check` | 0. |
| Changed-path and changed-file secret scan | 0 prohibited paths; 0 private-key/credential-content files. |

The first `npm run test:integration` attempt exited 1 at its required environment guards (`APP_MODE_REQUIRED`, isolated database URLs, `RUN_MAX23_INTEGRATION`). It did not test application behavior. The corrected fresh-database run above is authoritative.

Browser design verification was attempted against the built V2 site. `node scripts/verify-povod-integrated.mjs --no-capture --output=.run-evidence/ai-smart-occasion/ui-regression` exited 1 because its Saved fixture navigation expected `БИКИНИ KILL` but saw `Событие`; the Search design route was also captured and visually inspected at 390 px, with no horizontal overflow at that route. `--only=search` captured Home/Search/Filters before the verifier failed at a later route without `.bottom-nav`. These browser-script failures are **not** a pass or a real MAX client check; logs and the Search screenshot are under ignored `.run-evidence/ai-smart-occasion/`.

## NOT_RUN / BLOCKED and next action

- **BLOCKED_AI_LIVE_PROVIDER:** No approved live provider credential, model admission, Russian data-handling/territory approval, spending decision, or durable distributed call/token quota exists in this sprint. Production stays `AI_DISABLED`. Owner must approve those inputs and a live adapter before any external calls.
- **BLOCKED_FOLLOW_CREATOR:** Follow/topic persistence and creator activation are not authorized in current source authority. The pure exhibition gate cannot enqueue a recommendation; the transport remains dormant.
- **NOT_RUN_REAL_MAX:** No real MAX app launch/send or live provider event call. Existing MAX launch/deep-link integration tests passed with synthetic credentials and local services.
- **UI_VERIFIER_FAIL:** The existing browser interaction verifier's fixture assertions failed as described above. Review that verifier separately before claiming full browser acceptance; the Search design screenshot is available for visual review.

Next action: owner reviews this uncommitted checkpoint, provides an approved AI provider/admission/quota decision if live interpretation is desired, and separately authorizes Follow persistence plus creator activation. Do not enable the recommendation transport from this ticket alone.
