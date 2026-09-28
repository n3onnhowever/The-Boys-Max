# POVOD V2 correction pass — 2026-09-27

## Inputs and revision

- Exact checkout: `D:\Dev\Codex\Worktrees\unified-runtime\The-Boys-Max`; starting HEAD `c0235a30195ced23b1cf9934dfe1bf09830e45b4`. All earlier uncommitted V2/runtime work was preserved. No root-checkout switch, snapshot restore, commit or push.
- Correction authority: `POVOD_UI_V2_correction_bundle_2026-09-27.zip`, SHA-256 `D599F358A1C837F58CB62FE552AEBA459B607A4B42B2DEBA990F2FB5B8BF1E30`. README and fix brief read before edits; Astra audit used as defect evidence. Visual references were inventoried and viewed once as contact sheets. Existing base mapping: `docs/handoffs/UI_V2_REFERENCE_MAP.md`.
- The correction archive maps `01_home_search_location` to Home/Search/Filters/City/Nearby, `02_event_saved` to Event/Saved/share, `03_plans` to plan states, and `04_social_profile` to Friends/Notifications/Profile/Interests. Source-controlled event facts and real catalog remain authoritative over illustrative screenshot data.
- Representative final fingerprints: `App.tsx` SHA-256 `648A6B4EBCE8442F130E89D7A879D971798C9FF3EC35DBC5CB40C983CF5241FC`; `PovodUI.tsx` `321D280B50E1933EB171511B62189AD50A1CE3179FE73CE77D475ABB2BE374D5`; `V2RuntimePages.tsx` `C9D84E7217387DF5E18DB7033516010D139EBA92FCB7810584CF5CE2763CF2FA`; `social.ts` `46FE04F0D1B1CA032C5736796EEE79696E7C484EC720A95B30C1B1A892355BC7`; migration `0009` `8DF9C7A13F7635EBE949C7F733E9AAB84EB41DF6C1120FD87ED9D31FAC36FC53`.

## Changes

- Shared sheet portal, focus containment, inert background, internal scroll and bottom safe area make New Plan CTA clickable above navigation. Nested Saved/Invitation screens use Back headers without bottom navigation.
- URL/history navigation preserves Search query, filter state, origin and reload destination. Home/Search/Saved/Plan open the same Event Detail route. Shared event links are opaque and resolve to the same occurrence without showing provider names in the visible URL.
- Added real-data social context, pending/already-member guards, notification context, direct Copy Link and local event-share fallback. Material meeting time/point edits require a current RSVP response; event fields stay read-only.
- Corrected Nearby gutters/manual city path, unsupported-city recovery, Settings notification routing, neutral signed-out state, truthful Search empty/filter/sort states, and category-specific artwork fallbacks without fabricated event images or people.
- UI and narrow persistence changes are in `apps/miniapp/src`, `apps/api/app.ts`, `packages/persistence/{social,ui}.ts`, `migrations/0009_povod_v2_corrections.sql`, and `tests/unit/event-link.test.ts`. Existing runtime adapters, real catalog, Save, preferences, Friends, plans, RSVP, notifications and owner-preview guard remain.

## Verification

- `npm.cmd run typecheck` exit 0; `npm.cmd run typecheck:pure` exit 0; `npm.cmd run test:unit` exit 0, 285/285; `npm.cmd run build` exit 0. Final build was run by `scripts/start-owner-preview.ps1 -NoSeed`; served `index.html` SHA-256 matched `dist/miniapp/index.html` at `E91FD52EE7D57D324F9EB669BD6931E133385F207951C9C76894A9973922750B`.
- `RUN_MAX23_INTEGRATION=1` `node --experimental-strip-types --test tests/integration/ui26.test.ts` exit 0, 4/4 against isolated `max23_test`, after migration 0009. `P0_SAVE_TEST_DATABASE_URL` `node --experimental-strip-types --test tests/integration/p0-save.test.ts` exit 0, 3/3 against isolated `povod_save_fresh`, after migration 0009.
- `git diff --check` exit 0 (line-ending warnings only). Targeted private-key/token pattern scan over changed runtime domains had no matches (`rg` exit 1). `git status --short` confirmed all work remains uncommitted and earlier dirty files preserved.
- Browser pointer QA: New Plan enabled CTA hit-tested and clicked at 360×780 (button y710–756), 390×844 (y774–820) and 430×844 (y774–820), each creating a plan. Home had no horizontal overflow at 360/390/430/1440; desktop main width 428 px centered. Verified Home→Notifications→Back, Search→City→Back, Notifications→Plan/Invitation→Back, Search query→Event→Back, My Plans→Plan→reload→Back, Profile reload, canonical Saved/Event, city recovery, truthful cinema/1000 ₽ filter, query empty state, Settings→notification preferences, Saved nested header, direct clipboard copy and event shared-link reload.
- Two owner-preview personas exercised invitation→pending join→organizer approval→participant access, duplicate invitation suppression, RSVP persistence, organizer meeting-time change→participant explicit reconfirmation, changed-field-only notice, cancelled plan→original event, MAX handoff state and neutral logout. New Plan, join and RSVP actions used real pointer clicks. The preview is running at `http://127.0.0.1:3000/?owner-preview=1`; alternate persona is `?owner-preview=friend`.

## Contract delta, limits and next action

- Additive DB fields: `plan_presentation.reconfirm_version`, `plan_rsvps.reconfirm_version`, and `in_app_notifications.actor_context_id`; no existing Event fields or provider contracts changed. New read APIs provide friend-link and invite status; RSVP accepts optional expected reconfirm version. Migration 0009 applied to owner-preview and isolated integration databases.
- NOT_RUN: live MAX delivery/integration, production deploy, provider ingestion, LLM, geolocation permission grant, and browser checks against production. Map and unsupported cities remain explicitly “Скоро”; additional sort orders remain unavailable and are labelled as such. Browser QA used the dev-only owner preview and does not establish production behavior.
- Native MAX destination is deferred per task boundary; local Copy Link and handoff feedback remain usable. Source images absent from the real catalog use category artwork. The Vite build reports a non-failing >500 kB chunk warning.
- Owner should review the running preview visually. Keep changes uncommitted pending visual approval.
