# T000 — Workspace bootstrap

## Archive and placement

- Archive source path: `C:\Users\admin\Desktop\THE_BOYS_CODEX_PROJECT_2026-09-16.zip`
- Archive SHA-256: `2A86C43588A931F7CFBC9AF80D2C42F3FA46973CF174D3EF11D3C44DD9720C82`
- Backup archive path: `D:\Dev\Backups\The-Boys-Max\handoffs\THE_BOYS_CODEX_PROJECT_2026-09-16.zip`
- Staging path: `D:\Dev\Data\The-Boys-Max\staging\bootstrap-2026-09-16`
- Final project path: `D:\Dev\Repos\The-Boys-Max`

The original Desktop archive was not moved, renamed, modified, or deleted. The archive was copied untouched to the backup location and extracted to staging before its expected `the-boys-max` directory contents were copied into the final project root.

## Verified required files

- `AGENTS.md`
- `README_CODEX.md`
- `docs/current/PROJECT_STATE.md`
- `docs/current/KNOWN_GAPS.md`
- `docs/current/DECISIONS.md`
- `docs/tasks/ACTIVE_TASK.md`
- `docs/prompts/MODEL_ROUTING.md`
- `docs/prompts/FIRST_SESSION.md`
- `input/official/Досуг и развлечения.pdf`
- Result archives 26, 27, 28, 29, 30, and 31 under `input/results/`

## Files changed during bootstrap

- Copied the contents of staged `the-boys-max` into `D:\Dev\Repos\The-Boys-Max` without creating a nested top-level directory.
- Updated `docs/prompts/MODEL_ROUTING.md` with the requested Luna/Terra/Sol/Astro policy.
- Added this handoff record: `docs/handoffs/T000_WORKSPACE_BOOTSTRAP.md`.

## Git status

`git status --short` was executed and returned: `fatal: not a git repository (or any of the parent directories): .git`.

No Git repository was initialized.

## Blockers and warnings

- No archive-safety blocker: ZIP inspection found 167 entries, all under the expected top-level `the-boys-max` directory; no absolute paths or traversal entries were found.
- The project root was empty before copying.
- Git is not initialized in the final project directory.

## Checks actually executed

- Located the archive on the current user's normal Desktop; redirected OneDrive Desktop was included as the allowed fallback search location.
- Computed the SHA-256 checksum of the original archive.
- Inspected all ZIP entry paths for absolute paths and `..` traversal before extraction.
- Confirmed the ZIP's sole top-level directory was `the-boys-max`.
- Confirmed the project root had no entries before copying.
- Confirmed the requested backup and staging destinations before use.
- Extracted to the requested staging path and verified the expected top-level directory.
- Verified every required file and result archives 26 through 31 after extraction and again in the final project root.
- Read only `AGENTS.md`, `README_CODEX.md`, and the three specified current-state documents.
- Ran `git status --short`.
