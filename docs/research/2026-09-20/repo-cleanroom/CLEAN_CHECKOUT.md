# Clean checkout proof

**PASS at 991b3cdf9e8081cf9648faa4746243e4e5dfcb3b.** Source baseline: 1e4a7a2b454bed87bdcb40559773143c2fc38c9b.

Final fresh detached worktree: D:/Dev/Repos/The-Boys-Max-repo-cleanroom-verify.
Preflight: clean Git status; no node_modules/dist; no .secrets/.runtime/.env/.env.release. Lock hash remained unchanged. No local dependencies or application runtime input were copied.

Only OS/tool-location variables were retained; application/credential/NODE variables were excluded. npm used empty user/global config files and a new cache. Docker used an explicit local named-pipe endpoint and empty task Docker config pointing only to the installed Buildx executable. Installed tool binaries, Docker daemon/base image and public registry access are prerequisites; no saved application files or Docker registry credentials were required.

| Check | Exit | Result |
|---|---:|---|
| Node/npm versions, lock review/tree, SBOM | 0 | PASS |
| npm audit --package-lock-only --json --ignore-scripts | 0 | 0 advisory matches at execution |
| npm ci --ignore-scripts --no-audit --no-fund | 0 | PASS |
| npm run typecheck | 0 | PASS |
| npm run test:unit | 0 | 115 tests, 115 pass, 0 fail/skipped |
| npm run build | 0 | PASS |
| docker build --no-cache --progress=plain | 0 | PASS |
| Host/container missing configuration | 1 expected | APP_MODE_REQUIRED |
| Host/container live mode missing secrets | 1 expected | MISSING_SESSION_KEY |
| Actual-image required/forbidden paths | 0 | No forbidden paths; required files present |
| git diff --check / final status | 0 | PASS; proof tracked tree clean |

[Exact commands, cwd, SHA, timestamps, exits, log paths/hashes](../../../../artifacts/repo-cleanroom/clean-checkout-results.json) are authoritative. The build script, Vite config and application source are unchanged; only ignore policies differ from baseline.

Reproduction:

```powershell
git worktree add --detach <new-empty-proof-path> 991b3cdf9e8081cf9648faa4746243e4e5dfcb3b
Set-Location <new-empty-proof-path>
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm run test:unit
npm run build
docker build --no-cache --progress=plain -t povod-repo-cleanroom:991b3cdf9e80 .
docker run --rm --network none povod-repo-cleanroom:991b3cdf9e80
```

The last command intentionally fails without settings. Use [verify-clean-checkout.py](../../../../artifacts/repo-cleanroom/verify-clean-checkout.py) for exact isolated environment/error assertions; it assumes its configured proof path is freshly created. Preserve previous evidence before rerunning.

Initial proof at c9d7984 passed host checks but Docker CLI could not discover Buildx under sanitized environment and rejected --progress before building. That complete attempt is retained under artifacts/repo-cleanroom/attempts/c9d7984. Final proof used a second fresh checkout and explicit tool discovery. A supplemental image-membership assertion initially expected an incorrect Vite output path; config actually emits dist/miniapp. Both failed and corrected assertions are retained. No application change was needed.

Docker context probe uses harmless marker content and FROM scratch/COPY. Baseline copied 17/21 prohibited markers. Final copied 0/21 and retained 15/15 required markers. Real-image membership corroborates exclusion of .secrets/env, docs/input/artifacts/Git. Env examples remain in Git but are unnecessary Docker inputs. The existing .gitattributes was preserved.

NOT_RUN: PG/Redis integration, MAX/provider/browser acceptance. No live-runtime PASS is claimed. Separate isolated runtime reproduction is `docker compose -p povod-cleanroom-runtime --profile checks run --rm checks` after reviewing local port/resource requirements; compose generates test-only configuration. Release requires explicit .env.release and fails when it is absent. No live configuration was supplied.

Evidence: [preflight](../../../../artifacts/repo-cleanroom/clean-checkout-preflight.json), [context probe](../../../../artifacts/repo-cleanroom/context-proof.json), [actual image](../../../../artifacts/repo-cleanroom/image-files-proof.json), [source hashes](../../../../artifacts/repo-cleanroom/source-anchors.json).

Raw command outputs and the cleanup patch are losslessly gzip-encoded to preserve exact bytes and avoid treating whitespace in logs/diff context as new source defects. Receipts contain compressed and uncompressed SHA-256; raw-output-encoding.json maps original names. Root historical .gitattributes is unchanged; a new task-local rule preserves evidence bytes.
