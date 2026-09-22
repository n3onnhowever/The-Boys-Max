# Inventory

Base: `1e4a7a2b454bed87bdcb40559773143c2fc38c9b`. Final safe cleanup code: `991b3cdf9e8081cf9648faa4746243e4e5dfcb3b`. Date: 2026-09-20. Branch: `codex/repo-cleanroom`. No feature merges, source deletions, archive moves, or branch/worktree deletions.

The snapshot enumerates every regular file in the 12 pre-existing registered worktrees. Git internals are excluded from filesystem walking and audited through Git. Task-created cleanup/proof worktrees are listed separately in the branch map.

| Classification | All 12 worktrees | Original workspace |
|---|---:|---:|
| KEEP_TRACKED | 9,429 | 744 |
| KEEP_UNTRACKED | 702 | 660 |
| MOVE_TO_ARCHIVE | 833 | 833 |
| IGNORE | 234 | 222 |
| DELETE_SAFE | 113,445 | 43,270 |
| REVIEW_REQUIRED | 52 | 35 |

Git states across worktrees: 9,429 tracked, 113,756 ignored, 1,510 untracked. Total: 124,695 records / 2,141,639,205 bytes. Original workspace: 45,764 records / 672,830,109 bytes. These counts include legitimate copies across worktrees and are not a deletion instruction.

[inventory.csv.gz](../../../../artifacts/repo-cleanroom/inventory.csv.gz) is UTF-8 compressed CSV: worktree, path, Git status, category, classification, reason, bytes, mtime, SHA-256 and hash status. Metadata is available for dependency/build files individually. Every suspicious path has a disposition; meanings and safe deletion constraints are in [CLEANUP_MATRIX](CLEANUP_MATRIX.md).

Method: batched `git worktree list --porcelain`, `git for-each-ref`, `git ls-files -z`, `git ls-files --others --ignored --exclude-standard -z`; metadata walk; streaming SHA-256 for eligible files. Private env/secret paths, local runtime/database state and installed dependencies are metadata-only. No .secrets value was read. Hashes refer to working-file bytes; Windows newline conversion can differ from Git blob bytes. Key anchors record both.

There are 964 same-worktree duplicate groups. Empty files, installed dependencies and same-path copies across different worktrees are excluded from duplicate reporting. Equality alone does not make evidence disposable. UI home/integrated screenshots can match while proving distinct checkpoints. A baseline source ZIP appears at three original-workspace paths and remains retained.

The original workspace contains 27 ZIPs whose central directories were inspected. No private .env or .secrets member-name candidate was found. Payloads, nested archives, binary/OCR contents and full CRC integrity were not inspected. [Archive metadata](../../../../artifacts/repo-cleanroom/archive-directory-audit.json) includes exact path/size/SHA and entry counts. The technical research master is local/untracked and absent from the source commit.

Baseline tracked binary evidence includes ten original ZIPs under docs/research/2026-09-18/raw and the official-case PNG. No indisputably unnecessary tracked binary deletion was established. Large tracked command receipts remain preserved.

Runtime material stays local: .runtime state is REVIEW_REQUIRED, not automatically disposable. Tracked scripts/seed-test.ts requires test mode and the isolated database; the synthetic candidate uses current time and expires to UNKNOWN after one hour. These are deliberate fixtures, not stale live data. No runtime JSON values were used as authority.

Evidence: [summary](../../../../artifacts/repo-cleanroom/inventory-summary.json), [duplicates](../../../../artifacts/repo-cleanroom/duplicates.json), [primary groups](../../../../artifacts/repo-cleanroom/primary-summary.json), [private-path metadata](../../../../artifacts/repo-cleanroom/protected-paths.json). Reproduction: `python artifacts/repo-cleanroom/inventory.py`; later runs are new snapshots and should be preserved separately.
