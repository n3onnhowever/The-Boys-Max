# Cleanup matrix

Base: `1e4a7a2b454bed87bdcb40559773143c2fc38c9b`. Final safe cleanup code: `991b3cdf9e8081cf9648faa4746243e4e5dfcb3b`. Date: 2026-09-20. Branch: `codex/repo-cleanroom`. No feature merges, source deletions, archive moves, or branch/worktree deletions.

Every inventory row has one requested action class and reason. Classes are disposition proposals, not claims of performed removal. **Executed deletions: 0. Executed archive moves: 0.**

| Class | Original-workspace group | Files | Bytes |
|---|---|---:|---:|
| DELETE_SAFE | node_modules/ | 8,600 | 114,127,101 |
| DELETE_SAFE | dist/ | 137 | 1,060,097 |
| DELETE_SAFE | artifacts/research/consolidated/verification/baseline/node_modules/ | 8,600 | 114,127,101 |
| DELETE_SAFE | artifacts/research/consolidated/verification/bot/node_modules/ | 8,600 | 114,127,101 |
| DELETE_SAFE | artifacts/research/consolidated/verification/miniapp/node_modules/ | 8,600 | 114,127,101 |
| DELETE_SAFE | artifacts/research/consolidated/verification/tls/node_modules/ | 8,600 | 114,127,101 |
| DELETE_SAFE | artifacts/research/consolidated/verification/baseline/dist/ | 133 | 1,042,471 |
| MOVE_TO_ARCHIVE | artifacts/research/consolidated/sources/ | 266 | 1,633,728 |
| MOVE_TO_ARCHIVE | artifacts/research/consolidated/verification/ excluding above outputs | 567 | 2,715,852 |

DELETE_SAFE means regenerable package/build output once its owner has finished using it. It does not authorize deleting a worktree, runtime state or evidence. No owned files were removed in the original workspace.

MOVE_TO_ARCHIVE requires validating master-archive completeness and updating/resolving references first. Directory names alone are not replacement proof. Keep the master ZIP and receipt. Unknown runtime JSON/PID state, uncommitted implementation files and local tools remain REVIEW_REQUIRED.

KEEP_TRACKED covers source, safe templates, accepted receipts, immutable specs/ADRs/research and original evidence. KEEP_UNTRACKED retains pending evidence/input/archives. IGNORE covers local/private/generated material. The inventory records actual pre-cleanup Git status separately from proposed classification.

Implemented policy:

- .gitignore deduplicates prior rules and covers dependencies/build/coverage, secrets/env, raw ZIPs, browser output, nested downloads, root databases, editor/OS junk. .env.example and .env.release.example remain allowed. Canonical docs/research/**/raw/*.zip originals can be tracked explicitly; existing tracked archives remain tracked.
- .dockerignore denies by default and allows reviewed manifest/config/source/script/migration/patch/test/asset/license inputs; nested generated/private outputs are re-excluded.
- .gitattributes is unchanged; historical -text rules and original bytes are retained.

Git path probes cover safe examples, raw ZIPs, root SQLite, nested downloads and private paths. Product image assets and curated screenshots remain reviewable; no blanket screenshot ignore was added. Docker marker and actual-image proofs are in [CLEAN_CHECKOUT](CLEAN_CHECKOUT.md).

No dependencies, runtime logic, Dockerfile, contracts, routes, migrations, auth/session, queue architecture or branding changed. [cleanup.patch](../../../../artifacts/repo-cleanroom/cleanup.patch.gz) is the exact base-to-cleanup patch. [primary-summary.json](../../../../artifacts/repo-cleanroom/primary-summary.json) and [full inventory](../../../../artifacts/repo-cleanroom/inventory.csv.gz) contain exact paths.
