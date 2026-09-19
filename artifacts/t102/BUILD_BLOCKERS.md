# T102 compiler baseline — FAIL, not dependency-resolution failure

Starting HEAD: 4f9a198d4fa2b18686efa19a59b6ac78281d341d plus unchanged application working-tree hashes in artifacts/t101/BASELINE_HASHES.json.

`npm install --package-lock-only --ignore-scripts`, `npm ci --ignore-scripts` and `npm ls --all --json` all exited 0. No ERESOLVE/engine conflict or direct version change. Metadata review passed. The lock is valid for installation; this does not mean the source builds.

`npm run typecheck` and `npm run build` both exited 2. Exact file/line/code diagnostics: COMPILER_DIAGNOSTICS.json; complete logs: logs/typecheck.txt and logs/build.txt. The build's chained copy-assets/Vite stages did not run. Partial ignored dist output from tsc is not a valid build.

## Confirmed error families

- `apps/api/app.ts:40–41`: Fastify handler error is inferred as unknown (TS18046).
- `apps/api/app.ts:80`: HTTP price schema inference does not match domain Command/Extra/Money/Amount discriminated unions (TS2345). A cast would hide a real contract mismatch; no price/Occurrence semantics change is authorized in this pass.
- `apps/worker/main.ts`, `packages/platform/governor.ts`, scripts/arm-test-outbound.ts and integration test helpers: ioredis default import is treated as a namespace under current NodeNext settings (TS2351/TS2709). Installed ioredis 5.11.1 exports the named Redis class.
- `modules/maps/component/leaflet-renderer.ts:29`: array access can be undefined under noUncheckedIndexedAccess (TS2345).
- Installed `drizzle-orm@0.45.2` declaration graph: missing optional dialect types (including gel/mysql2) and internal type/interface errors in non-PG and PG declarations (TS2307, TS2344, TS2515, TS2420 etc.). These are compiler failures despite npm peer resolution succeeding. Full list is in the diagnostic receipt.

## Minimum next correction proposed for human review

1. Bound source-only typing fix: narrow Fastify errors safely; use the documented installed named Redis export; prove the Leaflet array-bound case. Add targeted regression only when behavior changes/reproducible defects require it.
2. Integration owner aligns HTTP price validation and domain discriminated union with tests proving accepted/rejected payloads. Preserve UNKNOWN and existing semantic rules; no unchecked cast.
3. Isolate Drizzle declarations with the installed TypeScript 5.9.3 and choose a demonstrated compatible pin or minimal reviewed upstream declaration fix with provenance. No compatible replacement version is claimed without testing. Installing unrelated DB drivers alone would not repair internal type errors.
4. Re-run the existing syntax/unit/typecheck/build scripts, then Docker. Keep skipLibCheck=false/strict/noUncheckedIndexedAccess; do not suppress diagnostics, patch node_modules or upgrade majors silently.

These corrections are proposals, not applied changes. This pass preserves application/config/contract bytes and finishes independent documentation/evidence work. T102 is PARTIAL; compiler baseline and Docker are not accepted. No T103+ work started.
