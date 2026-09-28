# POVOD V2 visual runtime handoff

## Inputs and revision

- Worktree: `D:\Dev\Codex\Worktrees\unified-runtime\The-Boys-Max`.
- Starting HEAD: `c0235a30195ced23b1cf9934dfe1bf09830e45b4`. The pre-existing unified runtime changes were recovered from the Codex snapshot after the worktree was archived elsewhere; they remain uncommitted.
- Visual authority: `POVOD_best_visual_refs_2026-09-26.zip` and its README. The one-pass inventory and primary screenshot mapping are in `UI_V2_REFERENCE_MAP.md`.
- Product authority: `AGENTS.md`, `docs/tasks/ACTIVE_TASK.md`, and `docs/current/POVOD_SOURCE_AUTHORITY.md`. The attached screenshots were treated as visual guidance, never as authority for event facts or backend behavior.

## Implementation

- Added shared POVOD headers, buttons, chips, status labels, settings rows, sheets, empty/error states and a real unread badge. Existing approved brand SVGs are used without artwork edits.
- Rebuilt Profile and direct preference editors, city/coverage, Friends, Notifications, My Plans, organizer/participant Plan Detail, change acknowledgement, RSVP, invite/join approval, plan edit, cancellation and MAX share handoff in one component system.
- Search remains the top-level tab with editable local text, removable filter chips and a sort sheet. Selected date/category/budget filters display only candidates with a PASS verdict for that fact. Unknown payable prices do not satisfy a budget chip.
- Event Detail uses the same POVOD sheet for plan creation. The source event date, venue and price stay read only; plan meeting fields are separate.
- Runtime Home and Search cards omit disabled Save icons; Save is active in Event Detail, where it is backed by the persistent API.
- Kept Save, catalog, plans, invitations, sessions, outbox, worker and owner-preview APIs. Added narrow durable plan presentation, RSVP, preference and friend-link persistence/API routes. The old chat implementation remains unused and invisible.

## Contract and data deltas

- `migrations/0008_povod_v2_ui.sql` adds plan presentation/seen state, social RSVP, friend links and preferred time. Migration applied to the local owner-preview database.
- The plan presentation endpoint now includes the organizer's public display name and internal ID so participants can see the organizer role correctly. The ID is never rendered.
- The catalog view hides UNKNOWN outcomes for selected visible date/category/budget chips; underlying catalog and eligibility rules were preserved. A focused integration test covers the verified payable budget boundary.
- RSVP in this visual social layer is separate from the existing domain commitment/feasibility records.

## Actual checks

| Command/check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS, exit 0 |
| `npm.cmd run typecheck:pure` | PASS, exit 0 |
| `npm.cmd run test:unit` | PASS, 284/284, exit 0 |
| `npm.cmd run build` | PASS, exit 0 |
| `node --experimental-strip-types --test tests/integration/ui26.test.ts` against isolated `max23_test` | PASS, 4/4, exit 0 |
| `node --experimental-strip-types --test tests/integration/p0-save.test.ts` against isolated `povod_save_fresh` | PASS, 3/3, exit 0 |
| `git diff --check` | PASS, exit 0; Git emitted only Windows LF/CRLF conversion notices |
| Secret token/private key pattern scan in app, package, migration, script, handoff and test sources | No matches |
| Prohibited file name scan | Only existing `.env.example` and `.env.release.example` |

Browser owner-preview at 360×780, 390×844, 430×844 and 1440×900 showed no horizontal overflow; desktop content centered at 428 px. Logo remained within its header. Search, plan and profile views were inspected visually. Local browser flows exercised Home, Search text and budget filter, Event Detail, Save and persistent Saved, Profile/interests/city/budget/time/radius/notifications, Friends invite, notifications/unread badge, My Plans, plan creation, friend invitation, join request/approval, plan edit/change acknowledgement, RSVP change, cancellation and share/copy handoff. Unsupported city showed zero confirmed events. Test preference changes were restored. A new demo preview plan was created and cancelled to verify both roles.

## NOT_RUN / boundaries

- Native MAX destination, live MAX integration, hosting, deployment, LLM and live provider checks were outside this ticket. The share sheet hands off to platform share when available and otherwise copies the link.
- Map stays labelled “Скоро”; only Moscow has confirmed catalog coverage.
- Budget and preferred-time profile choices persist, but the current recommendation service does not consume them. Search uses its own explicit verified filters. Radius is used when coordinates and permission are available.
- Empty My Plans and join/friend rejection states are implemented but were not visually exercised in the two populated owner-preview personas.
- No commit or push. Owner visual approval is the next action.

## Source fingerprints (SHA-256)

- `apps/miniapp/src/components/V2RuntimePages.tsx`: `8D8AA3CBF0CFA45E58EDC10B980B4DA47891D996FF6469C077BE3F16AF57B214`
- `apps/miniapp/src/components/PovodUI.tsx`: `683C23F61458B0758ECBCF8B298DF236F4CAFC584490F513EAFB1CE722848721`
- `apps/miniapp/src/components/EventDetail.tsx`: `E9FAB32E61E0B89F9663AEF9C337B354C00DBB78BF37CFC74ED5E792A5FA758D`
- `packages/persistence/social.ts`: `90F4600F2DEAD7243B6D74E7822FB5692AD635BDA1BD6059ABFE43D609F3D01E`
- `packages/persistence/ui.ts`: `650C6593812662B36E2F977123D862863C771A4F05B3720CB21DB27EF658061F`
- `migrations/0008_povod_v2_ui.sql`: `BCBEC9923EF567F3CAEC567998D49B3B4130587B3680AE51BA5A7D403C787397`
