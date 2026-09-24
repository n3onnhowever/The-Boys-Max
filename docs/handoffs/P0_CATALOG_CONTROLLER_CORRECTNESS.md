# P0 catalog and controller correctness

## Inputs and result

- Base: `78d68e4fc40f708e45fe0f6baf1b833040d4744f`; implementation result: `ec4f3492f653a2404b915cbf7802d73481ac0627` on `codex/p0-catalog-correctness`.
- Read: `docs/current/PRODUCT_TRUNK_STATE.md`, `docs/handoffs/T105_DATA_SAFETY_IMPLEMENTATION.md`, relevant E2E red-team findings, and catalog/controller paths. No Save, provider, queue, auth, or migration change.

## Root causes and fixes

- `catalog.browse` selected the first 100 latest observations before rights and eligibility checks. It now reads deterministic 100-row observation pages until it has 100 eligible choices or exhausts the catalog. Event Detail narrows the query to its exact occurrence before paging. Event/Occurrence identity, price, provenance, and evaluator logic are unchanged.
- `HttpVisualPort` classified HTTP 422 as an uncertain mutation. It now returns a definitive `VALIDATION` error with a bounded server reason code, allowing `ViewController` to clear its pending key, retain the draft, and accept a corrected command. The catalog error screen displays the recoverable message. Ambiguous transport outcomes remain uncertain.
- Client port error vocabulary gains `VALIDATION`; server HTTP contract and database schema are unchanged.

## Checks on implementation result

- Before fixes: `invalid search HTTP 422 clears pending and corrected search succeeds without reload` failed (`uncertain` versus `error`); `catalog finds a matching occurrence after 100 earlier nonmatching rows and opens detail` failed (match absent). Logs: `artifacts/p0-correctness/422-before.log`, `catalog-before.log`.
- Focused controller: `node --experimental-strip-types --test tests/unit/ui-422-recovery.test.ts` — 1/1 pass.
- Focused PostgreSQL/Fastify: `docker compose -p povod-catalog-correctness-final --profile checks run --rm --build checks node --experimental-strip-types --test tests/integration/ui26.test.ts` — 3/3 pass on a fresh isolated PostgreSQL 18.6 project. The test includes 100 nonmatching synthetic rows, a future-dated matching occurrence after them, and exact detail lookup. A rerun against the retained repro database passed the new test but failed an existing first-page fixture assumption; the clean project passed all three. Log: `catalog-final.log`.
- `npm run test:unit` — 265/265 pass; `npm run typecheck` — pass; `npm run build` — pass; `git diff --check` — exit 0. Logs under `artifacts/p0-correctness/` are local, ignored artifacts.
- Source scan of touched paths found only test/typing references to tokens; prohibited archive and `.secrets` paths were absent from this worktree change.

## Remaining gap and next action

Catalog pages are bounded in memory and return at most 100 eligible choices, but a large run of nonmatching rows can still require many PostgreSQL queries. No load test or live provider/browser check was run for this ticket. Integrate this implementation after review; do not infer provider approval or Moscow activation from these checks.
