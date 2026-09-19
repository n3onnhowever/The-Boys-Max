# Migration 0002 safety

Classification: SAFE_PRE_RELEASE_EDIT (repository evidence, not an external-environment audit).

Runner scripts/migrate.ts sorts migration names, uses the four-digit identity and SHA-256 of UTF-8 file contents, stores id/sha256/applied_at, and fails closed on MIGRATION_HASH_MISMATCH. All migrations run in one advisory-locked transaction.

No evidence of original 0002 applied to shared development, staging, production or another persistent deployment was found in current records, handoffs, git migration history or release configuration. Git history contains bootstrap records, no release tags; compose.release.yaml is explicitly unlaunched and gated. The staging directory in T000 is archive extraction, not a database deployment. T070/T102 report deployment/runtime not run. T102.1 records original clean-database failure and rollback; the only available applied ledger is the local synthetic Docker database with corrected 0002.

Keep the existing one-line correction DROP CONSTRAINT plans_check: 0001 creates a multi-column CHECK with that name; 0002 then creates plans_state_check. No new migration change or checksum bypass. Original HEAD blob, original CRLF working-tree equivalent and current byte SHA-256 are in MIGRATION_HASHES.json (line endings matter). Prior pre-edit hash can also be checked against artifacts/t102_1/STARTING_HASHES.json.

This disposition is appropriate for the documented pre-release local scope. If an external original-hash ledger is later discovered, stop: preserve that history, inventory its schema and hashes, and approve a forward repair/baseline plan before changing strategy. Do not rewrite its ledger or disable checksum validation.

Verified original pre-T102.1 byte hash: 8fd7bc090a45a14b7e632a9e6972c9608552022dd63b4922cc926bbe5578b2e7. Current byte hash: 2c713fbfd55cb228d215eb2de25d380391323e4ed2701a3d693c521e45972b88. T102.2 fresh project applied 0001/0002/0003 successfully (logs/fresh-migrations.txt); existing ledger accepted unchanged migration hashes on the persistent stack.
