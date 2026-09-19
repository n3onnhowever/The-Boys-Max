# Povod baseline: pre-commit receipt

Old HEAD: `4f9a198d4fa2b18686efa19a59b6ac78281d341d`, main. Commit message: `chore: establish Povod reproducible P0 baseline`. The containing commit is the baseline; exact resulting SHA and actual worktree verification are reported after commit in the final response (option B). No post-commit tracked receipt or second commit is required.

Human review accepts only exact immutable whitespace exceptions. See IMMUTABLE_WHITESPACE_EXCEPTIONS.md and CLASSIFICATION.json: initial 48 offenders; 3 mutable scripts corrected only at EOF; final 177 immutable exceptions after CRLF preservation. The ordinary check remains exit 2; strict check over every other staged file passes. Exact per-path -text attributes preserve 304 historical data files and do not disable whitespace checking. Hashes match both working tree and index. All 146 T102.2 final source hashes still match.

Regression: verify:dependencies, syntax, unit (115/115), typecheck and build PASS. Exact commands, exits, UTC dates and external raw-log hashes are in COMMAND_RESULTS.json. Secret/prohibited-file heuristic scan PASS including 213 ZIP members; one known unchanged synthetic test DB literal. Docker NOT_RUN here: existing T102.2 evidence intact; source unchanged.

FILES_COMMITTED.txt enumerates this baseline candidate. Three worktrees are pending creation from the exact new commit. No implementation ticket activated, no dependency installs in future worktrees, no remote/push/global config changes.
