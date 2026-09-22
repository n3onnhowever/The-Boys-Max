# POVOD UI v1 integration report

Status: PASS for the authorized UI integration and visual checkpoint.

## Inputs and revision

Base: 84ca97d41dd16991359ccdcf39f7c068cfd566b5. Integrated implementation: 14528e10a9a855fab661bdef23228b1c69903354. Source SHAs: see SOURCE_SHAS.json. Delivery HEAD (documentation/evidence only after this implementation): RESULT_SHA.txt in the final archive.

The current user instruction authorizes this UI checkpoint; ACTIVE_TASK's historical data freeze was read and respected. Main started at 1e4a7a2b454bed87bdcb40559773143c2fc38c9b with pre-existing changes. An isolated branch/worktree was created at the exact specified base. No main/source worktree files were edited. All five source commits existed and are retained through merges.

## Integration decisions

OVERLAP_MATRIX.md was built before merging. CONFLICT_RESOLUTION.md lists the eight actual overlap files and each semantic resolution. Screen-specific CSS remains scoped and tokens are unchanged. Offline's old three-column row was adapted to the common EventCardList button layout without changing its rendered pixels. Duplicate chevronRight/plus definitions were resolved to one glyph each. There are 28 unique glyphs, no missing static glyph usages, and no duplicate CSS selectors in the same media context. The obsolete App designPreview bypass, Detail artwork export, old detail-heading rule and duplicated browser startup code were removed. All accepted slice handoffs and their original evidence remain unchanged.

VK + OK are display-only design placeholders under Связанные сервисы; OK uses the shared monochrome glyph. No external connection is simulated as successful. A SERVER_ADAPTER can display only supplied CONNECTED service records. Saved remains under Profile. The small Profile header bookmark uses an existing empty control slot to make this subsection reachable. Detail's default active destination is Home; opening from Saved/Search/Plans retains that origin. No discovery, Save or source action requires a group, friends or chat.

## Fixture and capability boundaries

1. main.tsx accepts only exact allowlisted design values, then dynamically loads DesignPreview.tsx. Missing/unknown/toString routes use normal runtime.
2. Home/Search/Filter, Saved and Profile data is deterministic fixture data. Save removal/undo, filter edits, preference chips and notifications are local preview operations. The design map affordance remains disabled.
3. Detail's three safety variants remain intact. Generic preview navigation keeps the selected event's supplied values and leaves end time, address, source and attendance absent when not supplied. The runtime adapter fabricates none of those facts and exposes only HTTPS allowlisted source URLs.
4. Plans, people, attendance counts, RSVP and discussion are synthetic UI previews. Invite is unavailable. The composer only appends local state. Solo and empty discussion are preserved. No social runtime, authorization or delivery contract was added.
5. Profile placeholders have no href/API/OAuth. Only real supplied connected-status records are eligible in server presentation.
6. Offline renders only explicitly supplied cached events. The preview supplies two synthetic records; ordinary runtime does not create a cache or fixture events.
7. Three production-browser negative controls (missing design, unknown design, toString) with an unavailable API show the existing authentication failure, no synthetic text/controls and no loaded fixture chunk. Existing MAX SDK loading is intercepted only in the offline evidence harness. No preview API calls or JavaScript exceptions occurred.

## Verification and visual review

Source fingerprint: 6d968e6e50c9a7a84214664f4b7a142bbddd88e8a596f811028ac4fc1d7a9c4b. VERIFICATION_SUMMARY.json contains exact commands, exits and times; verification/raw-logs.zip preserves all 28 original logs byte-for-byte (including resolved failures), so incidental log whitespace is not rewritten; verification/source-snapshot.json contains per-file hashes. Focused tests 39/39; full unit 154/154; typecheck, pure typecheck, npm production build and diff check all passed. The final build's six JS/CSS/index hashes exactly match the build used for all 37 captures. Eight browser interaction groups passed. Old capture/saved/state command entry points were exercised, and their PNG output matches the integrated set.

The montage includes all 12 primary screens without device frames. The master comparison includes all three supplied approved packs and corresponding final application screenshots. Required 390/360/430 captures and five supplemental variants are present. Automated overflow, missing images, nav geometry and active-state checks pass. All 390 screens and narrow/wide Home/Detail/Profile/Plans were visually inspected; unchanged screens were also checked against accepted pixels. 20/32 primary PNGs are exact matches. Remaining changed pixel counts/bounds are recorded in pixel-regression.json: Profile changes (1801 pixels each), Detail active Home (595 pixels each), plus glyph normalization (22–32 pixels), Home 360/430 small rasterization differences (92/26 pixels). No structural or palette drift.

Branded magnifier and broken-cable assets retain their exact SHA-256 hashes (safety-and-residue-audit.json), stable paths, red poster elements and replacement boundary.

## Resolved check failures

- Default exec/image helpers returned windows sandbox failed / helper_unknown_error: setup refresh had errors. Authorized elevated execution and direct local image reading completed the work.
- New Profile regression tests failed before implementation and passed after VK/OK and connected filtering.
- Initial TypeScript check reported TS2322 unknown not assignable to boolean/string in design-data/navigation.ts. Explicit value guards fixed this.
- Initial diff check reported view-model/detail.ts:137: new blank line at EOF. Removed; final diff exit 0.
- Browser negative control initially waited for .system-state-error and timed out; actual 401 correctly renders AUTH_FAILED. The test expectation was corrected, preserving runtime behavior.
- Evidence script default PSScriptRoot resolution and C# System.Drawing reference (CS1069) failures were confined to evidence tooling. Explicit paths and separate image-read/byte-array comparison completed visual evidence.

## Remaining gaps and limits

Existing licensed/internal artwork differs from the exact reference photography; participant portraits remain initials. The Home temporary wordmark retains its previously accepted optical difference, and state illustrations remain replaceable PNGs awaiting approved SVGs. Browser rasterization and reference device framing differ. These are inherited accepted gaps, not integration regressions.

Runtime Save/Saved and real profile preferences still need their owning authenticated/persistence integration; this task preserves unavailable capabilities and makes no production durability claim. Plans/discussion stay optional previews. Docker, PostgreSQL, Redis/BullMQ, MAX auth/mobile, live providers and deployment: NOT_RUN_NOT_REQUIRED for this UI-only checkpoint. No domain/HTTP/migration/auth/session/provider/queue contract, dependency or secret changed.

## Next

Integrate the existing persisted Save/Saved P0 contract with Saved and Detail presentation and verify the authenticated solo journey.
