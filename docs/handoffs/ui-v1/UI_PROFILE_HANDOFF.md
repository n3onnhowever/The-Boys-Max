# POVOD UI v1 — Profile / Preferences handoff

## Status

PASS — the approved Profile / Preferences screen is implemented on codex/ui-v1-profile from the exact base 84ca97d41dd16991359ccdcf39f7c068cfd566b5.

This handoff belongs to the implementation commit that contains it. The exact result SHA is recorded after commit in the delivery archive as RESULT_SHA.txt.

## Authorized inputs and boundary

- Visual authority: input/design/povod-master-ui-v1/02_povod_ui_pack_secondary_4screens.png, screen #3 only.
- The visual source was read from the main checkout because the ignored input/design material is intentionally absent from this worktree.
- Product purpose remains event-discovery personalization. No social feed, follower count, group requirement, Telegram/VK connection, external-account linking, MAX auth, provider, queue, map, or durable profile backend work was added.
- docs/current/UI_POVOD_V1_STATE.md was not modified.
- No .secrets/ path was read.

## Implementation

- Added ?design=profile backed only by deterministic PROFILE_DESIGN_DATA.
- Added the approved title/settings action, avatar/name/city card, interests, favorite categories, edit affordances, event budget, preferred time, notification UI, secondary contact/social block, settings row, and active Profile BottomNav.
- Preference chip and notification feedback is local UI state only. The fixture explicitly declares LOCAL_PREVIEW_ONLY persistence and unavailable identity editing, preference persistence, and external-account linking.
- Normal runtime does not synthesize missing profile fields. Without an authorized navigation callback, unavailable bottom-navigation destinations remain disabled.
- VK/Telegram marks are display-only disabled controls with no href, API call, account linking, or auth behavior. Violet is confined to the social contact mark; red remains action/active.
- The deterministic avatar is a crop adapted from the user-provided approved screen #3 visual. No external asset or network source was used.
- Motion is limited to fast chip/edit/row press feedback and honors the existing reduced-motion rule.

## Changed implementation surface

- apps/miniapp/src/components/ProfileScreen.tsx
- apps/miniapp/src/design-data/profile.ts
- apps/miniapp/src/view-model/profile.ts
- apps/miniapp/public/assets/profile/design-avatar.jpg
- apps/miniapp/src/components/BottomNav.tsx
- apps/miniapp/src/components/HomeScreen.tsx
- apps/miniapp/src/components/SearchScreen.tsx
- apps/miniapp/src/components/Icon.tsx
- apps/miniapp/src/assets.ts
- apps/miniapp/src/main.tsx
- apps/miniapp/src/styles.css
- tests/unit/profile-ui-state.test.ts
- package.json

## Visual evidence and parity passes

- artifacts/ui-povod-v1/profile/360.png
- artifacts/ui-povod-v1/profile/390.png
- artifacts/ui-povod-v1/profile/430.png
- artifacts/ui-povod-v1/profile/parity-comparison.png

Parity pass 1 established the screen hierarchy, fixture content, token usage, responsive fit, and 12 px shared gutter. The screen rendered without clipping at all three required widths.

Parity pass 2 compared a normalized screen-#3 crop against the 390 × 844 capture, then changed the Profile-only content gutter to 16 px and increased identity spacing while reducing the name size by 1 px. The final comparison is labeled PASS 2 and was regenerated from the last verified 390 px capture.

## Verification

| Check | Exact command | Exit | Evidence |
|---|---|---:|---|
| Targeted render / chips / budget / time / notifications | node --experimental-strip-types --test tests/unit/profile-ui-state.test.ts | 0 | artifacts/ui-povod-v1/profile/verification/profile-unit.log |
| Existing unit suite | npm run test:unit | 0; 129/129 passed | artifacts/ui-povod-v1/profile/verification/unit.log |
| TypeScript | npm run typecheck | 0 | artifacts/ui-povod-v1/profile/verification/typecheck.log |
| Production build | npm run build | 0 | artifacts/ui-povod-v1/profile/verification/build.log |
| Browser captures | npm run capture:profile | 0; 360/390/430 captured | artifacts/ui-povod-v1/profile/verification/capture.log |
| Diff whitespace | git diff --check | 0 | artifacts/ui-povod-v1/profile/verification/diff-check.log |
| Changed-path and secret-pattern scan | PowerShell scan recorded with exact patterns | 0 | artifacts/ui-povod-v1/profile/verification/safety-scan.log |

Browser evidence used the existing local Chrome/Edge CDP capture script against the production Vite preview. No live API, session, or external network data was required.

## Contract deltas

- No API, database, route-contract, auth/session, provider, queue, MAX, or durable business-model change.
- Internal presentation-only additions: ProfileViewModel, ProfileUiState, Profile design fixture, Profile component, icon variants, and optional capability-aware BottomNav.availableIds.

## NOT_RUN / out of scope

- Integration tests requiring PostgreSQL or environment activation: NOT_RUN.
- Docker, PostgreSQL, Redis/BullMQ, MAX API, provider, and live-ingestion checks: NOT_RUN; this presentation-only ticket does not touch those systems.
- External-account linking and real profile persistence: deliberately NOT IMPLEMENTED because no approved backend capability exists.

## Remaining parity gaps

- The reference includes iOS/device chrome; repository captures intentionally contain only the 390 × 844 app viewport.
- The display-only Telegram mark uses a local typographic paper-plane approximation instead of a linked branded asset.
- Native browser text rasterization and normalized reference-crop resampling create small antialiasing differences.

## Next action

Keep this fixture presentation-only until an integration-owned profile contract, authenticated field source, persistence semantics, and external-account decision are explicitly approved. Do not infer those capabilities from this screen.
