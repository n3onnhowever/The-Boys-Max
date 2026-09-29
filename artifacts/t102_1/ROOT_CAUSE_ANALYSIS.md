# T102.1 root cause analysis (before edits)

Starting SHA: 4f9a198d4fa2b18686efa19a59b6ac78281d341d. TS 5.9.3, Node typings 24.13.3. strict=true, skipLibCheck=false, module/moduleResolution=NodeNext.

| Category / root cause | Typecheck | Build |
|---|---:|---:|
| C/E: Fastify unknown error | 6 | 6 |
| C/F: HTTP Amount union | 1 | 1 |
| D/B: ioredis named export | 11 | 5 |
| C: Leaflet indexed access | 1 | 1 |
| A/E: optional dialect peers | 11 | 11 |
| A: stripped getSQL | 8 | 8 |
| A: stripped role config fields | 2 | 2 |
| A: internal/protected keys in public keyof | 18 | 18 |
| A: stripped generatedAlwaysAs | 30 | 30 |
| A: throwing enum method return | 1 | 1 |

B is secondary to D: no independent NodeNext compiler configuration defect identified. G: 0. Each primary diagnostic counted once; indented explanation lines are not additional diagnostics. Drizzle common column-builder imports every dialect, so 70 diagnostics cascade from this graph even for PostgreSQL-only usage.

Minimum source corrections: named Redis export (11/5 use-site errors); narrow unknown error fields (6); use discriminated Amount schema with existing canonical validator (1); test coordinate before setView (1). Domain Price unchanged.

Drizzle repairs to investigate: restore stripped runtime members; exclude protected session from public method exclusion unions; type throwing enum method as never; install actual optional peer types only if unavoidable. Do not change compiler settings or runtime SQL architecture. Current declarations are defective, so skipLibCheck does not satisfy the requested correct-declarations exception.

Sources: https://github.com/drizzle-team/drizzle-orm/issues/5187 ; https://github.com/drizzle-team/drizzle-orm/issues/4818 ; https://github.com/redis/ioredis ; https://www.typescriptlang.org/docs/handbook/esm-node.html . Local exact package contracts: DEPENDENCY_CONTRACTS.json. Installed JS and source maps are the pinned runtime evidence.

## Resolution and cascade analysis

- Missing optional peer declarations: gel (6), mysql2/mysql2/promise (5). Installed pinned dev-only gel 2.2.1 and mysql2 3.24.4; 16 installed packages added in total. Existing pins unchanged; no major upgrades. Their actual engines/peers/licenses are recorded in dependency-preflight.json and installed-graph.txt.
- getSQL stripped by upstream declaration emission: 8 affected class declarations. Restored actual runtime method signatures.
- Role config members stripped: 2. Restored readonly fields proven by source maps and JS.
- Internal/protected keys in public keyof: 13 mysql/singlestore diagnostics refer to session, 5 sqlite diagnostics refer to config. Remove those nonpublic names from the set-operation public method exclusion lists; remaining method restrictions and protected fields stay intact.
- SingleStore generatedAlwaysAs stripped from base: 30 cascading subclass errors resolved by restoring one concrete base member.
- Enum generatedAlwaysAs always throws: 1; return type corrected to never.
- Exact changes: 15 declaration files, compact patch in patches/drizzle-orm-0.45.2.json, both input/output hashes checked. All JS/CJS files unchanged against a fresh npm ci (DRIZZLE_RUNTIME_HASHES.json).

Upstream runtime source maps and JS for 0.45.2 establish these defects; a compiler downgrade cannot restore omitted declarations or make protected names public keys. Reports also reproduce them on 0.44.4/TS 5.8.3 and 0.45.1/TS 5.9.3. No tested compatible replacement pin is claimed. We retain current runtime version with explicit reproducible declaration repairs, rather than a speculative runtime downgrade or skipLibCheck. Direct tsc after fresh install requires first running node scripts/patch-drizzle-declarations.mjs; standard typecheck/build run it explicitly. No install hook, lifecycle script, type suppression or compiler option was added. Maintenance cost: review/remove the patch when upgrading Drizzle; hash/version guards fail closed.

HTTP boundary: Amount now uses FREE/EXACT/RANGE discriminators with required/null fields matching existing domain types. priceSchema still invokes parsePrice for canonical derivation validation. FROM, TEXT, UNKNOWN, raw_label, source_field, warnings and fee evidence are unchanged; UNKNOWN stays a first-class union, not zero/null price. The existing legacy wire does not have a CONDITIONAL discriminator: conditional raw evidence survives as TEXT with UNKNOWN totals. This is a pre-existing T105 mapping gap documented by source authority, not removal of conditional semantics or a claim that T105 is implemented. Tests cover all six existing source-quote variants, conditional raw text, forged totals and malformed amounts.

## Runtime discoveries (not compiler diagnostics)

| Category | Root cause | Evidence | Correction/status |
|---|---|---|---|
| G/C | 0002 drops plans_state_check, but the multi-column CHECK from 0001 is named plans_check | docker-start exit 1; docker-migrate-diagnostic; transaction/rollback constraint probe | Change only DROP target in 0002; startup and migration ledger PASS |
| G | API attached only to internal bridge; Docker 29.7.2 retains requested host binding but creates no mapping | docker-port-bindings, docker-network, host curl exit 7; internal health PASS | BLOCKED_NETWORK_DECISION; no network/system changes made |

The migration fix changes 0002 checksum. Fresh isolated startup had rolled back the failed migration transaction; no prior successful 0002 was rewritten in the database. Existing deployed databases, if any, require separate checksum-history review: do not bypass MIGRATION_HASH_MISMATCH.

Docker upstream corroboration: https://github.com/moby/moby/discussions/53256 ; https://docs.docker.com/engine/network/port-publishing/ . Adding a non-internal network or changing isolation changes the security/network design; user explicitly required stopping architectural changes. Internal checks and stop/restart were completed independently.
