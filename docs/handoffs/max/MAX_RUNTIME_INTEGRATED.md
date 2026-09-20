# MAX runtime integrated — bounded release verification

**PASS for the authorized integration checkpoint.** Deployment and full frozen-P0 product acceptance remain separate. No live MAX mutation occurred.

## Revisions and ownership

- Base / original shared checkout starting SHA: 1e4a7a2b454bed87bdcb40559773143c2fc38c9b.
- TLS source: fc5aeed6ad9e12845c71b8016c9071240d22d74a.
- Bot source: d2a03110d955a5e13f37a0e86281bdd26c7b3349.
- Mini App source: 2b1f126bce6aac760a4be42df3fff88028b36f8e.
- Runtime integration result / exact-image source SHA: 6cdd93c3f10a9179e2e3edb9ba08b3f300ba043e.
- Final evidence commit/result SHA: [RESULT_SHA.txt](../../../artifacts/max-runtime/integrated/RESULT_SHA.txt), generated after the evidence-only commit to avoid a self-referential commit hash. The delivered package also appends its full value to this handoff.
- Branch: codex/max-runtime-integrated. Worktree: D:/Dev/Repos/The-Boys-Max-max-integrated.
- One writer/integration owner; three independent read-only reviews. Main, source branches, shared dirty checkout and UI worktrees were not edited. Main remains the baseline.

Read first: consolidated EXECUTIVE, MAX_BRANCH_OVERLAP, MAX_CURRENT_TRUTH, INTEGRATION_BACKLOG and RED_TEAM_RECONCILIATION from the original checkout. Also read ACTIVE_TASK/current authority. The current user request authorized this bounded ticket; historical task snapshots were not activated.

Cleanroom reuse: eefa73301fe9d49bef0c5ef0a77d061bceab99dd handoff and SELF_REVIEW; corrected Docker policy 1176eb3ae7e84315b9c3f0107c19232c8b2cffc4. Its original 991b3cd policy was superseded and was not reused.

## Selected changes and conflict resolution

[INPUTS.json](../../../artifacts/max-runtime/integrated/INPUTS.json), [SELECTED_FILES.json](../../../artifacts/max-runtime/integrated/SELECTED_FILES.json) and [OVERLAP_MATRIX.md](../../../artifacts/max-runtime/integrated/OVERLAP_MATRIX.md) preserve exact inputs, paths and decisions; logs retain each branch's name-status/stat/code diff. All input SHAs were verified commits with the same canonical parent before integration.

- TLS: official pinned public CA/provenance, MAX-scoped trust helper, fixed platform-api2.max.ru request options, compiled certificate asset and CA/scope tests.
- Bot: commands /start, /app, /help; Открыть Повод native button; bot_started/message_created parsing; inbox/outbox/deduplication/durable ACK; transport attachments, status-first classification, Retry-After; interactive governor lane; future-dated PostgreSQL fixtures and regressions; safe configuration examples.
- Mini App: server auth/Origin guard, account switch/cookie confirmation/session resume, rotation/revocation/escrow handling, tab CSRF binding, public-only launch locators, Bridge capability/failure handling and anchor fallback with their tests. HMAC/int64/freshness foundations remain unchanged.
- Direct runtime overlap: packages/platform/transport.ts was composed explicitly from Bot behavior plus TLS import/constructor/request options. Neither ours/theirs nor timestamp selection was used.
- Direct documentation overlap: ACTIVE_TASK.md is integration-owned, not a copy of either branch's prior task pointer. Historical branch artifacts were not imported as current evidence.

Additional bounded fixes: definitive 4xx is now classified immediately after verified HTTPS headers, so truncated/oversized optional error bodies cannot change 401/429 to UNKNOWN; response body is discarded. Malformed success, 5xx and network-after-possible-submission remain UNKNOWN, with one wire attempt. POVOD_MINIAPP_URL is bounded to 1024 both before and after URL normalization; privacy/about retain their prior 2048 policy and startapp retains its independent 512 limit.

No schema/migration SQL, dependency version, external route contract, MAX account setting, queue architecture or product-scope change. Build configuration additionally compiles the existing migration entry point; SQL semantics are unchanged.

## Exact release artifact and Docker safety

- Image ID/digest: sha256:c4e7cd181082c611708820895290e29547435222a1457750abe4e0edcc232105.
- Local tag: povod-max-integrated:6cdd93c3.
- Base: node:24.20.0-bookworm-slim@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e.
- Node v24.20.0; OpenSSL 3.5.7; Linux x64.
- Build timestamp: 2026-09-20T20:06:49.895Z; image created: 2026-09-20T20:07:34.628030047Z.
- Fresh no-cache build from the runtime commit; every later application-container check uses this immutable ID. PostgreSQL/Redis containers are isolated test dependencies.

Docker context uses corrected Cleanroom allowlisting plus explicit public CA files. Actual-context proof excluded 26 harmless synthetic marker paths plus the worktree .git metadata file (27/27 checks); 10 required input checks passed. No real credential was used as a marker. Final stage copies production node_modules, compiled dist, SQL migrations, package metadata and licences only. Test compose migration/prepare/check services target the build stage; API/worker target release. Release migration entry: node dist/scripts/migrate.js.

Full unmounted rootfs audit: 16,234 entries; 13,996 regular files; 281,071,201 bytes scanned. No forbidden paths, synthetic exclusion markers, MAX_BOT_TOKEN string, synthetic credential markers, missing required runtime inputs or checked development dependencies. Source and delivery scans have zero unresolved findings.

The initial rootfs scanner found PEM signatures in Debian's libgnutls.so.30.34.3. Raw finding is preserved in IMAGE_CONTENT_AUDIT_INITIAL.json. All 10 embedded key constants were compared byte-for-byte, in memory, to public GnuTLS self-tests at commit ca61668d7764fc29fb4cc2aa396cb035e176636d; Debian package checksum also matches. This is a path/hash/pinned-source-specific adjudication, not a binary exclusion. No key bytes are emitted. [Pinned source](https://github.com/gnutls/gnutls/blob/ca61668d7764fc29fb4cc2aa396cb035e176636d/lib/crypto-selftests-pk.c).

See EXACT_IMAGE.json, DOCKER_CONTEXT.json, IMAGE_CONTENT_AUDIT.json, GNUTLS_SELF_TEST_ADJUDICATION.json and SECRET_SCAN.json under artifacts/max-runtime/integrated.

## TLS and live read-only MAX

Exact image at 2026-09-20T20:08:52Z: scoped official trust PASS (authorized TLS1.3, unauthenticated GET /me 401); missing required root fails UNABLE_TO_GET_ISSUER_CERT_LOCALLY; wrong hostname fails ERR_TLS_CERT_ALTNAME_INVALID. Unrelated https://example.com is authorized HTTP200 before and after; global trust/HTTPS agent unchanged. No TLS weakening is used.

Authorized fresh reads, same image:

|Request|UTC|HTTP|Sanitized result|
|---|---|---|---|
|GET /me|2026-09-20T20:08:53.255Z|200|395973548; Хакатон МАХ 777; t777_hakaton_max_bot; is_bot=true|
|GET /subscriptions|2026-09-20T20:08:53.292Z|200|0 subscriptions|

Ignored MAX_BOT_TOKEN was read only for these requests, passed on child stdin, never printed/echoed/hashed/screenshotted/persisted or supplied as a build/environment input. No messages, command/profile changes, subscription POST/DELETE or other live mutations occurred. Only allowlisted response fields were saved.

## Fresh verification

|Check|Actual result|Evidence|
|---|---|---|
|Focused MAX/auth/Bridge/security|125/125 PASS|logs/focused.json + .txt|
|Full unit|203/203 PASS, 0 skipped|logs/test-unit.json + .txt|
|Typecheck|exit0|logs/typecheck.json|
|Pure typecheck|exit0|logs/typecheck-pure.json|
|Dependency verification|exit0|logs/verify-dependencies.json|
|Production build|exit0|logs/build.json + fresh Docker build|
|Exact-image transport/Bot/URL/TLS units|35/35 PASS, 0 skipped|TRANSPORT_EVIDENCE.json|
|Exact-image PostgreSQL/Redis/BullMQ integration|36/36 PASS, 0 skipped|POSTGRES_INTEGRATION.json|
|git diff --check and staged check|exit0|logs/diff-check.json; logs/staged-diff.txt|
|Source/artifact/image scan|PASS with narrow public self-test adjudication|SECRET_SCAN.json|

Raw .txt/.diff logs are preserved byte-for-byte as .gz in Git/package; LOG_ARCHIVE_MANIFEST.json maps original names and both hashes. The first evidence diff check correctly rejected literal diff-context whitespace/CRLF; lossless gzip resolved packaging without altering source evidence or disabling whitespace checks.

Host checks initially ran on the composed tree before its commit; SOURCE_HASHES.json and SOURCE_VERIFICATION_BINDING.json prove every checked source byte is unchanged at the committed image source. Docker checks compile and execute that committed runtime. Test harness imports are rewired to immutable /app/dist modules; only tests and two client command helpers are mounted read-only, with no backend source overlay. Test source hashes and exact adaptation are in COMPILED_TEST_HARNESS.json.

Transport matrix covers success; 401/429 with string message; ordinary 4xx; Retry-After seconds/HTTP-date; malformed success; ambiguous5xx; network failure; one wire attempt and preserved UNKNOWN. URL regression first failed before the fix (url-red.txt, exit1); final 1024/1025 and unrelated URL controls pass.

PostgreSQL tests execute committed inbox/outbox before ACK, both updates, webhook-secret failure, concurrent duplicate/collision handling, PG failure/no durable ACK, BullMQ handoff, Redis failure/recovery, governor hold/cooldown, 429 durable RETRY_WAIT, future event fixtures and UNKNOWN no-resend/crash fences.

Auth coverage executes valid/tampered/stale/future/duplicate/malformed launches, lossless large int64 IDs, account switch, active-cookie resume, session rotation/revocation, expired escrow replay, session/tab CSRF, Origin/read isolation, IDOR, startapp tampering and unsafe/query authority rejection. Bridge unavailable/failure/timeouts/fallback are covered by host units. Real client acceptance remains NOT_RUN.

Initial ordinary shell sandbox helper failed before command launch; authorized escalated commands worked. Docker Desktop initially failed on two stale IPC sockets. After explicit user approval for each path, both runtime-only directories were preserved by rename and Desktop restarted; no image/volume/settings reset. Docker checks were then actually executed. DOCKER_RECOVERY.json records the setup failure and explicitly approved recovery; no unavailable dependency is marked PASS.

## Boundaries, risks and next action

Within this integration checkpoint: no remaining blocker. Real MAX Web/Android/iOS, public webhook delivery, production hosting/configuration/rollback and full product acceptance remain NOT_RUN. The live account currently has zero subscriptions; no production ingress has been configured by this task.

Unchanged outside scope: Moscow provider/data gate, durable actor-owned solo Save, catalog LIMIT-before-filter, controller422 pending-state behavior, destination overwrite race, production hosting, real MAX devices, AI and UI redesign. Legal/provider/operator readiness remains external. KEEP_EXISTING_BULLMQ remains binding; PostgreSQL is durable truth.

Next recommended task: authorize T105 data-safety mapping for Event/Occurrence/price/provenance, following the accepted T104 gate inputs. Stop at this integration/package boundary.
