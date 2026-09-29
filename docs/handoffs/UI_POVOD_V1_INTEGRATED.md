# POVOD UI v1 — integration handoff

Verified integrated implementation: `14528e10a9a855fab661bdef23228b1c69903354`. Delivery revision is the subsequent documentation/evidence commit; exact immutable SHA is in the review archive's `RESULT_SHA.txt`.

[Canonical state](../current/UI_POVOD_V1_STATE.md) records the base, five source SHAs, screen/capability boundary and next slice. [Integration report](../../artifacts/ui-povod-v1/integrated/INTEGRATION_REPORT.md) records decisions, checks, resolved failures and limits.

- Files: miniapp shared entry/navigation/icons/styles and five accepted slices; UI unit tests; capture/verification/evidence scripts; canonical state and integrated evidence. Exact changed-file lists accompany the package.
- Actual checks: focused 39/39; full unit 154/154; typecheck, pure check, production build and diff PASS. 37 captures, eight browser interaction groups, three normal-runtime fixture negative controls PASS. Final build hashes match captured files.
- Visual evidence: [Full montage](../../artifacts/ui-povod-v1/integrated/POVOD_UI_V1_FULL_MONTAGE.png), [Master comparison](../../artifacts/ui-povod-v1/integrated/POVOD_UI_V1_MASTER_COMPARISON.png), [verification summary](../../artifacts/ui-povod-v1/integrated/VERIFICATION_SUMMARY.json).
- Contracts: no HTTP/domain/database/auth/session/provider/queue/dependency delta. Runtime connected-service filtering is presentation-only; no service-linking capability added.
- NOT_RUN_NOT_REQUIRED: Docker/PG/Redis/MAX/live providers/deployment. Their acceptance is not implied by browser design-fixture QA.
- Risks/gaps: accepted artwork/initial-avatar/wordmark/raster illustration differences; real Saved/profile persistence not newly wired. Social previews never gate the solo P0 path.
- Next: integrate the existing persisted Save/Saved P0 contract into the accepted Saved and Detail presentation.

Reproduce from the integration worktree:

```powershell
npm.cmd run test:unit
npm.cmd run typecheck
npm.cmd run typecheck:pure
npm.cmd run build
node node_modules/vite/bin/vite.js preview apps/miniapp --host 127.0.0.1 --port 4183 --strictPort
# In a second terminal:
$env:POVOD_CAPTURE_URL='http://127.0.0.1:4183/'
npm.cmd run capture:integrated
./scripts/build-povod-integration-evidence.ps1 -ScreenshotDirectory ./artifacts/ui-povod-v1/integrated -ReferenceDirectory D:/Dev/Repos/The-Boys-Max/input/design/povod-master-ui-v1
node scripts/audit-povod-integration.mjs
git diff --check
```
