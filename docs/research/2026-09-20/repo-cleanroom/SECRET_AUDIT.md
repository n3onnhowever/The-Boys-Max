# Secret and private-data audit

**Result: no confirmed secret match in scanned Git text. No unresolved candidate after fixture/prose triage.** This is a heuristic result, not secret-free certification.

Base: 1e4a7a2b454bed87bdcb40559773143c2fc38c9b. Final cleanup: 991b3cdf9e8081cf9648faa4746243e4e5dfcb3b. No values from .secrets or local private configuration were opened or printed.

The independent broad scan covered 37 reachable commits and 1,750 unique blobs, including Codex snapshot tree refs: 1,612 UTF-8 text blobs / 47,904,002 bytes scanned. Follow-up path checks covered 38 commit trees plus five additional snapshot roots, with no .secrets entries. A reproducible root rerun including final ignore edits is retained as secret-scan.json with its own snapshot counts. Git snapshot tree anchors are distinct from commits and can represent currently untracked paths.

Method: git rev-list --all / --objects, for-each-ref, ls-tree -r -z, cat-file --batch. Bounded regexes, 64 KiB text chunks, 4 KiB overlap, maximum 32 MiB/blob; .secrets-associated blobs excluded before content reads. Output contains paths, commit/tree/blob IDs and types, never matching values. Obvious placeholder/code strings are suppressed.

| Candidate | Occurrences | Triage |
|---|---:|---|
| Strong key/private-key/JWT/bot-token signature | 0 | No match |
| Private-network URL | 0 | No match |
| Credential assignment | 2 | Negative local validation fixture and duplicate |
| Credential URL | 5 | Generic test URL userinfo |
| Authorization literal | 9 | Documentation/identifiers |
| Cookie literal | 18 | Test/reproduction context |
| Phone shape | 95 | SHA/source-filename prefixes |
| Email shape | 3 | Test URL userinfo |

Resolved candidate anchors, values withheld:

- tests/unit/max-bot.test.ts:60, commit d2a03110d955a5e13f37a0e86281bdd26c7b3349, blob d92bbfb6ee6db665e92c4a7792b94b9f52908337: local assert.throws config validation expects KEY_STRENGTH or WEBHOOK_SECRET_FORMAT. The literal contains whitespace and is rejected; no live request occurs.
- Duplicate at artifacts/research/consolidated/bot-code.diff:491, snapshot tree 3eb1a44d9cf3cd62f4a504a61e7ca7ce6025243f, blob ee4d26e3afcb4a496b607f17a2a59ca762f55044.

No provider credential validation was attempted. Safe env templates and intentionally test-only configuration remain preserved.

Limitations: 138 binary blobs and compressed archive payloads excluded; no OCR; no reflog/unreachable-object scan; untracked/ignored working-file content excluded; no exhaustive entropy/commercial scanner. The Docker baseline admitted private marker paths, but this does not establish or disprove private content in older images.

Reproduce from the inspected repository with the saved [scanner](../../../../artifacts/repo-cleanroom/scan_git_secrets.py), saving stdout to a new evidence file. [Triage](../../../../artifacts/repo-cleanroom/secret-audit.json), [rerun output](../../../../artifacts/repo-cleanroom/secret-scan.json), [private-path metadata](../../../../artifacts/repo-cleanroom/protected-paths.json). A separate final staged/package audit checks this task's deliverables for prohibited paths and strong signatures.
