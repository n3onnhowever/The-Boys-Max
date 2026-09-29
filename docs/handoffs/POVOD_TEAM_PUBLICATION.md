# POVOD canonical team publication — 2026-09-29

## Inputs and revision

Owner's team handoff/private GitHub request supersedes the previous no-commit/no-push checkpoint. Worktree: `D:\Dev\Codex\Worktrees\ai-smart-occasion\The-Boys-Max`; branch: `codex/ai-smart-occasion`; starting HEAD `f024156659b10481a43508272a80219c812a28de`. All pre-existing Smart Occasion changes in this worktree were retained. Other worktrees were not modified.

Canonical result is the commit identified by `povod-smart-occasion` and `main`. Required ancestors were verified with `git merge-base --is-ancestor` (exit 0 each):

| Tag | Commit |
| --- | --- |
| `povod-ui-v2-accepted` | `7ae18e69d9dcdd912faddd02b202d2289cadcd38` |
| `povod-backend-hardened` | `f19ab5762b035cca17f70918af03af940fca7a4a` |
| `povod-max-e2e` | `f024156659b10481a43508272a80219c812a28de` |
| `povod-smart-occasion` | This handoff's canonical commit (resolve with `git rev-parse povod-smart-occasion^{commit}`). |

## Browser verifier decision

Both reported failures are **A — stale verifier assumptions**, not product regressions.

- Saved fixture: first `h1` is the accepted Back header `Событие`; actual event title remains `#event-detail-title` = `БИКИНИ KILL`. The verifier now checks both and returns through Back to Saved.
- Missing `.bottom-nav`: accepted V2 Event Detail uses the compact Back header. `DetailScreen.tsx` intentionally renders bottom tabs only without `onBack`. The verifier now expects no tabs on detail routes and checks return destination. Search → Detail → Back returns to active Search; Saved → Detail → Back returns to active Profile/Saved.
- The same outdated detail controls were corrected to header Save, and the final request audit permits only the accepted V2 `GET /api/v1/me/notifications/count` read. It still rejects all other fixture API calls, mutations, JavaScript exceptions and external requests (MAX SDK is intercepted).
- Authority: [accepted V2](UI_POVOD_V2_ACCEPTED_RESULT.md), [final V2 correction](UI_POVOD_V2_FINAL_CORRECTION.md), existing `DetailScreen.tsx`, `EventHero.tsx`, `PovodUI.tsx`. No product/UI source was changed in this verifier follow-up. No CSS changed; build retains `index-De2ka6wG.css`.

## Checks actually run

Final application source is the reviewed Smart Occasion implementation; only verification scripts, hygiene and documentation changed in this follow-up. Local logs are ignored under `.run-evidence/ai-smart-occasion/` and `.run-evidence/team-handoff/`.

| Command | Result |
| --- | --- |
| `npm run typecheck` | PASS, exit 0. |
| `npm run typecheck:pure` | PASS, exit 0. |
| `npm run test:unit` | PASS, exit 0; 307/307, none skipped. |
| `node --experimental-strip-types --test tests/unit/smart-occasion.test.ts` | PASS, exit 0; 12/12 fixed-clock deterministic evaluations, no live provider. |
| `npm run test:integration` | PASS, exit 0; 76/76, none skipped, PostgreSQL 18.6 + Redis 8.2.9. Includes real-catalog, Save, auth/session, MAX launch/deep-link/transport simulation and AI review/apply tests. |
| `pwsh -NoProfile -File scripts/test-handoff-integration.ps1` | PASS, exit 0; repeat 76/76 in newly created databases; helper cleanup completed. |
| `npm run build` | PASS, exit 0; TypeScript + Vite. |
| `node scripts/verify-povod-integrated.mjs --only=detail-navigation --output=.run-evidence/ai-smart-occasion/handoff-browser` | PASS, exit 0; 15 captures (Saved, Detail, three UNKNOWN variants at 360/390/430 × 844), two interaction checks, no overflow, broken images, JavaScript exceptions or external traffic. Five notification-count GET attempts to the local static preview; no mutations. |
| `node scripts/scan-repository-secrets.mjs --history=HEAD` | PASS, exit 0; reachable history plus current files; no unreviewed findings, prohibited current paths or GitHub oversized blobs. |
| `git diff --check` / `git diff --cached --check` | PASS, exit 0 each. |

The first fresh integration setup failed at `KEY_STRENGTH` because generated hex was uppercase; this was a harness input error, not an application test failure. Lowercase generated keys passed the guard and the full suite. The checked-in `scripts/test-handoff-integration.ps1` reproduces the working setup with generated isolated database credentials and automatic removal of its own containers. No shared databases were used.

Evidence SHA-256 (local files, not uploaded logs):

- `modules/ai/smart-occasion.ts`: `20A6003F82CE9ACED33FED4B8F7FE5011B7C99A1DEA3C152D8BCC55BDDB59DBF`.
- `modules/ai/smart-service.ts`: `B3A73BAE6CCEB31BD3F0BDECF30887734A3BEAC81603368E56955AAF87993EFC`.
- `scripts/verify-povod-integrated.mjs`: `C2DF164B288411FCEFCED33D6E11FB670ECE5990C013007196C79FA925B0914B`.
- `handoff-unit.log`: `8C6D27F1FBA948B5AC8C25B5DDAC619592613F02FDF221782D438AADA8F9228B`.
- `handoff-build.log`: `46529EE01D22DFE97744AB9B3B743ED48409A035CBB1DFDD24A969D91A666C2E`.
- `handoff-browser/browser-audit.json`: `F655C533C15BFDBDD47D26EE82B12237D09D33B3F942BB09107CC3603E443F85`.

## Security and scope

Removed 496 tracked `.log` files and files in artifact `logs/` directories, plus one `raw-logs.zip`, from the canonical tree, retaining local copies and historical commits. Added an ignore rule. Historical sanitized test evidence remains reachable through the required milestone history, which was scanned rather than rewritten. `.env.example` / `.env.release.example` are blank templates, `deploy/runtime.example.json` contains placeholders, and Compose/test fixtures contain only explicit isolated synthetic credentials.

No actual `.env`, private keys, production runtime configuration, production DB credentials, BOT_TOKEN, webhook secret, API credential, `.run-evidence`, dist or local database is included in the canonical tracked tree. The dependency-free scanner covers secret signatures, credential assignments, credential-bearing database URLs, prohibited current paths and oversized Git objects. Reviewed exceptions are exact blob/rule/line fingerprints with reasons, including JPEG Huffman bytes. Its limitation is documented: compressed archives are not unpacked and pattern scans cannot identify every arbitrary secret.

Scanner negative control passed: an untracked synthetic token probe caused exit 1 and a redacted location; the raw value was absent from scanner output. The probe was removed and the clean scan returned exit 0.

Supplemental pre-publication archive checks unpacked all 91 reachable gzip blobs and all 11 reachable ZIP blobs (240 nonempty entries) in memory and scanned their payloads for private keys, GitHub/vendor/bot tokens, credential assignments and database URL passwords. Both checks returned zero findings. Raw reports remain ignored in `gzip-security.json` and `zip-security.json` under the local evidence directory. These checks supplement the checked-in scanner's documented archive limitation.

Changed areas: Smart Occasion modules/API/Search/recommendation integration and tests from the approved sprint; verifier; README/current task/handoffs; security scanner with reviewed exceptions; isolated integration reproduction helper; log hygiene. No migrations, dependencies, source admission, provider integrations, MAX transport contracts or product design changes in this follow-up.

## External boundaries and next action

No deployment, real MAX call or live AI call ran. Production AI remains disabled; Follow creator/transport activation remains dormant. The full historical V1 browser suite was not used as V2 acceptance; the two reported failures were verified with the focused scope above.

Publication target: private `n3onnhowever/The-Boys-Max`, canonical `main` and the four annotated tags, without force push. Authenticated CLI account and user-confirmed collaborator login `NikitkaYolo` were verified. Invitation acceptance is an action for Nikita. See [TEAM_HANDOFF_NIKITA](TEAM_HANDOFF_NIKITA.md) for exact provider modules, owner approvals and commands. Stop at team publication; production hosting, real MAX console/native acceptance and approved live AI remain external gates.
