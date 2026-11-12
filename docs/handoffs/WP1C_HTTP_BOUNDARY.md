# WP1C HTTP boundary and anonymous admission

Authorized findings: P20-F003, F005, F006 and F079 only. Base
`d08e0e370b3f3458a51874cb71afd371937b9bca`, tree
`383fe5c9ae6ebaa01ac8cd0913a0a1036ed26dd6`. Worktree:
`D:/Dev/Codex/Worktrees/povod-wp1c-http/The-Boys-Max`; branch
`codex/povod-pretelegram-wp1c-http-boundary`. One implementation owner.

Inputs: explicit owner packet; P20 FINDINGS.json, REPAIR_ORDER.md and
FILE_OWNERSHIP.md; P04 counterreview, HTTP counterexamples and bootstrap proof;
WP1A/WP1B handoffs, current routes/config/session persistence, retained P21
runtime-slot protocol, existing tests and pinned library source. ACTIVE_TASK
and current source authority were read in the original checkout (absent from
this base); the explicit WP1C packet authorizes this checkpoint. External
inputs and receipts remain in `D:/Dev/Codex/Evidence/povod-pretelegram-recovery`
and `D:/Dev/Codex/Evidence/povod-pretelegram-20261029`. Historical files and
private bundles were not modified. Original dirty checkout, foundation,
WP1A/WP1B and P15-P19 were hashed before work.

## Reproduction and evidence limits

Unchanged WP1B, actual Fastify routes, fresh PostgreSQL 18.6 / Redis 8.2.9,
pinned Node 24.22.2 / npm 11.19.1, generated synthetic credentials only:

- F003: an absolute slash-prefixed asset locator returned HTTP 200 and an
  innocuous outside-root JavaScript marker. No sensitive file was read.
- F005: 128 requests from one simulated direct peer returned 128 HTTP 200
  responses and inserted 128 bootstrap rows. Existing expiration/worker cleanup
  was present; permanent retention and production load capacity were not inferred.
- F006: explicit development preview plus forged allowed Origin and an injected
  remote socket peer returned 200 and added one real synthetic session row.
  This new database proof is separate from P04's historical stub issuer. It is
  not a physical remote-machine exploit qualification.
- F079: the historical 14,001-issue amplification did **not** reproduce on the
  updated dependency baseline. The 70,132-byte original shape returned 400 with
  one issue, about 7.6 ms and 4.7 MB observed heap growth. The lifecycle still
  parsed/validated before authentication. The regression's equivalent measurement
  recorded 14.5 ms / 5.4 MB / one validation pass before the repair; the repaired
  run recorded about 8.0 ms / 1.0 MB / zero validation passes and HTTP 401.
  These single-process observations include harness work and GC variability;
  deterministic lifecycle/issue bounds, not timing thresholds, are assertions.

The baseline suite retained expected failures. Its final replay uses an
EOL-safe Git archive plus identical new test files, never another writer's
checkout. Original logs, setup errors and assertion failures remain external.
Fastify inject normalizes string URLs using WHATWG URL rules; raw HTTP is used
for rejection of dot/backslash syntax. Separately normalized valid in-root URLs
remain usable. A server cannot recover syntax removed by an upstream proxy.

## F003: confined static files

Resolve the trusted asset root during app composition, independently of the
request. Permit canonical ASCII segments and the existing extension/MIME list;
reject absolute/drive/UNC, backslash, percent encoding, empty/dot/parent segments,
trailing dot/space, streams, controls and Windows reserved devices. Check native
relative-path containment both before and after realpath; read the canonical
file only. Missing root/file, denied access and escaping symlinks return the
same compact 404 without filesystem paths. Tests use a real outside-directory
symlink (Windows junction) and harmless fixtures. The static build tree remains
operator-owned; this is not protection against a hostile local process racing
filesystem mutations while the server reads its build artifacts.

## F005: admission before persistence

One new platform utility is justified by the atomic Redis protocol and its
connection lifecycle; no dependency or service was added. HTTP read-Origin
checks run first, then admission, then the unchanged session bootstrap issuer.

Policy: at most **64 admissions per direct peer** and **256 per service** per
**60,000 ms** fixed window starting with the first accepted request. A normal
signed start and subsequent reload measured two bootstrap permits total. The
policy allows repeated local startup/retry while rejecting half of a 128-request
same-peer probe; it is a conservative checkpoint policy, not production sizing.
Adjacent fixed windows can permit a boundary burst. All replicas must share
mode, CREDENTIAL_SCOPE, PUBLIC_ORIGIN and existing Redis authority; those stable
deployment values scope the key. Session-keyed HMACs conceal addresses in Redis;
IPv4-mapped IPv6 and equivalent IPv6 spellings share a peer bucket.

A single Lua script checks/increments both counters atomically. One hash has
at most 257 fields and a fixed TTL; rejected requests allocate no peer state and
do not extend retention. The saturation fixture measured 20,608 Redis bytes.
At most 256 commands per app instance may await Redis. Offline buffering and
automatic replay/retry are disabled; connection/command waits are bounded to
500 ms. An uncertain/timed-out command can burn a permit, but never inserts a
database row. Disconnect on transport failure clears stuck client work.

Exhaustion returns 429 / BOOTSTRAP_LIMIT. Missing/unavailable authority returns
503 / BOOTSTRAP_ADMISSION_UNAVAILABLE. Neither response sets a bootstrap cookie
or discloses a token. The existing 120-second cryptographic bootstrap binding,
MAX exchange, session cookies/CSRF and cleanup one hour after expiry are unchanged.
Real Redis pause/outage and AOF stop/start checks retained the budget and recovered
normal admission. Replacing/flushing Redis can reset its current window; existing
AOF/noeviction infrastructure and stable scope are operational prerequisites.
Worker cleanup must continue running; admission is a rate bound, not an absolute
database retention cap during indefinite worker downtime.

trustProxy remains false. X-Forwarded-For/Forwarded are ignored. A reverse proxy
is the direct peer and may share one 64-request budget across clients; the
independent 256 global bound still applies. Do not enable arbitrary forwarded
identity to raise that budget. Production traffic/proxy sizing is a later
measured operational decision.

## F006: local preview

Existing explicit opt-in/nonproduction/mode/Origin checks remain required.
The real main entrypoint binds preview to 127.0.0.1 or ::1 according to its
configured local Origin. The handler checks the actual socket peer in onRequest,
before parsing or session mint. Node's IP parser/BlockList handles IPv4 loopback,
IPv6 loopback and mapped IPv4; forwarding headers cannot override it. Production
NODE_ENV and live mode do not register the route. Ordinary session verification
is untouched. IPv6 localhost configuration is now explicitly supported.

Actual entrypoint listeners and HTTP session issuance passed on IPv4 and IPv6.
A local nonloopback socket was denied 403 by an intentionally exposed test
listener, and the real loopback-bound entrypoint rejected nonloopback access.
Those are local-machine network controls, distinct from inject simulation;
physical remote-network qualification is NOT_RUN. Operators must not publish
this local preview through a proxy or tunnel; a local proxy is itself a local
socket peer.

## F079: inexpensive necessary rejection first

Only PUT /api/v1/me/preferences changes lifecycle: existing auth/Origin/CSRF
checks in onRequest, a 16 KiB route body limit, an O(1) array-length preflight
in preValidation, then the unchanged full Zod DTO and update semantics. A
request-scoped WeakMap carries the authenticated actor into the handler.
No expensive schema validation precedes the necessary authentication rejection.

Twenty interests of 80 UTF-16 units plus an 80-unit city require at most 10,080
bytes for fully Unicode-escaped string contents. The route limit accommodates
keys, numeric fields and punctuation, including escaped multilingual and emoji
maximum fixtures. It bounds representation size, not the accepted field lengths.
Malformed JSON, oversize, invalid/missing session/CSRF, optimistic versions,
21 items, overlong strings and concurrent invalid requests are covered. This
does not claim general DoS resistance or eliminate all authenticated parser work.

## Files, validation and boundary

Production: apps/api/app.ts, apps/api/main.ts, packages/platform/config.ts and
new packages/platform/bootstrap-admission.ts. Tests: four focused integration
files and their shared http-boundary-fixtures.ts. This handoff is the tenth
changed path. No existing tests, persistence/business/auth code, MiniApp,
migration, package baseline, Dockerfile, queue or provider files were changed.
Commits are separated by finding. No wire DTO/version change; deliberate error
precedence changes and bootstrap resource errors are described above.

Pre-freeze checks: locked npm ci exit 0; focused repaired regressions **136/136**
(83 new + 53 existing), development typecheck exit 0, diff check exit 0; actual
IPv4/IPv6 listener, nonloopback peer and real Redis restart checks passed.
Expected complete totals: **372 units**, **269 integrations per full run**.
P21 slot is held for serial runtime work. Exact frozen SHA/tree, commands,
exits/log hashes, two independent full integration executions, browser/offline,
Docker/package, cross-EOL, audit/secrets, canonical bytes, cleanup and hosted
publication receipts belong to external `WP1C/FINAL_REPORT.md` and
`WP1C/docs/handoffs/WP1C.md`. This pre-freeze handoff does not claim those
pending gates passed; any mandatory acceptance failure blocks publication.

Next action: complete frozen-source gates, then only on all required PASS push
normally and open a Draft stacked on unchanged WP1B. Preserve F001/F002/F004;
all unrelated P20 findings remain open, especially F016/F017/F018/F028/F029/F030/
F032/F059/F007. Historical IT-08 and evidence limitations are not erased by
passing tests. No full security certification, main merge, deployment, retarget,
stable tag, Telegram implementation or real AI/provider activation.
