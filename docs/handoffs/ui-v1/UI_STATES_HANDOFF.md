# UI States handoff

## Status

PASS for the explicitly authorized POVOD UI v1 system-state pack on `codex/ui-v1-states`.

- Starting/result base before this work: `84ca97d41dd16991359ccdcf39f7c068cfd566b5`
- Reference: approved internal `POVOD Master UI Reference v1` state pack, `03_povod_ui_pack_states_4screens.png`
- Reference SHA-256: `7FF1046935A0246856A9EAB8DCB0920241DDCFA6A96FE97A55FBC96BD15B2053`
- `docs/current/UI_POVOD_V1_STATE.md` was not modified.
- Backend, MAX authentication, providers, PostgreSQL, Redis, BullMQ, and `.secrets/` were not modified.

## Implemented

- Explicit discriminated Home system-state model: `loading | empty | error | offline`.
- Loading preserves the established Home chrome and exact structural order: header, search, category chips, hero skeleton, `Для тебя`, compact cards, `Рядом с тобой`, BottomNav.
- Empty includes approved copy, Edit Filters and Reset Filters actions, and the branded magnifier/halftone/red-strip asset.
- Error includes approved non-technical copy, Retry and Return Home actions, and the branded broken-cable/red-strip asset.
- Offline shows an explicit no-connection alert, labels content as available without internet, renders only explicitly supplied cached events, explains staleness, and provides Retry plus BottomNav.
- Preview routes are deterministic: `?design=loading`, `empty`, `error`, and `offline`.
- Catalog runtime uses the state pack for empty/error/offline phases. Offline cards come only from a catalog view already held by the controller; no live status or cached event is invented.
- Reset keeps Moscow/currency/timezone context but clears user filters and returns to solo-first participants=`1` with price basis `UNKNOWN`.

## Brand assets and provenance

Temporary replaceable raster placeholders live under `apps/miniapp/public/assets/states/`.

| Asset | Deterministic crop | SHA-256 |
|---|---:|---|
| `povod-empty-magnifier.png` | `500,270 260×215` | `99F7AF5056643B13D13FF26B13A06CEB5C655E00F0F0E56D254AEB1CF8E75F8F` |
| `povod-error-cable.png` | `900,285 300×180` | `8057E561728D1262CC8A546893AFBC16F0EC807E0BB593036842D358F32FF21B` |

Both were derived only from the approved internal reference with deterministic edge-background transparency. No external or generated imagery was used. `scripts/extract-povod-state-assets.ps1` verifies the immutable source hash before extraction. A designer can replace these paths with exact SVGs without changing state components.

## Visual evidence and parity

- Required 390×844: `artifacts/ui-povod-v1/states/{loading,empty,error,offline}-390.png`
- Width verification: the same four states at 360×844 and 430×844.
- Montage: `artifacts/ui-povod-v1/states/states-montage.png` (`A2675C2619102DF7AAA47CD40E330DE03AC421BF208E396B17AB83EF49218AF6`)
- Practical reference comparison: `artifacts/ui-povod-v1/states/states-parity.png` (`B15A93F6C97AF3908E5A48A29A5E0ABA54FA9FBFED21BCC22100F042387BE345`)
- Browser audit: `artifacts/ui-povod-v1/states/state-capture-audit.json`

Two refinements followed the initial capture:

1. Normalized the reference phone/status offset and moved Empty/Error art, headings, and actions upward by the measured 30–44 px gap.
2. Matched the reference’s fixed supporting-copy line breaks for Empty and Error.

## Verification actually run

All logged checks below exited `0`; exact commands, timestamps, and log hashes are in `artifacts/ui-povod-v1/states/logs/verification-results.json`.

- dependency metadata verification
- source syntax check
- full unit suite: 129 passed, 0 failed, 0 skipped
- focused system-state/reset tests
- TypeScript `--noEmit`
- pure TypeScript check
- TypeScript production build plus Vite production build
- `git diff --check`
- browser capture of 12 viewport/state combinations
- browser Retry action audit
- browser Reset Filters action audit
- browser Offline audit: exactly 2 explicitly cached fixture cards
- browser reduced-motion audit: skeleton `animationName=none`, duration `0s`
- heuristic secret/prohibited-file and change-scope scan: PASS, 836 files scanned, 0 findings, 0 prohibited paths, 0 unexpected changed paths

Node `v24.19.0` was available on this host; npm was not on PATH. The checks reused the parent checkout’s existing lockfile-matching `node_modules` through a local junction; no dependency was downloaded or changed.

## NOT_RUN / boundaries

- Integration tests requiring PostgreSQL/Redis and `RUN_MAX23_INTEGRATION=1`: NOT_RUN; this task changes no backend/runtime contract.
- Docker, live PostgreSQL/Redis/BullMQ, MAX auth/client, provider, external network, and deployment checks: NOT_RUN and outside this UI-state ticket.
- No claim is made that the Offline preview fixture is live availability; it is explicitly synthetic cached design data.

## Contract deltas, risks, and next action

- No HTTP/domain/database/auth/session/provider contract delta.
- UI-only addition: state view model, state renderer, deterministic preview routes, capture/evidence scripts, and reset-draft helper.
- The authoritative reference contains device chrome/status-bar framing; repository screenshots intentionally capture the 390×844 application viewport without the decorative device frame.
- The two illustrations remain raster placeholders and may retain minute antialiasing/background-fringe differences until designer-supplied SVGs arrive.
- Offline does not add a new persistent cache. It renders only data already supplied to the UI state.

Next action: review the packaged screenshots/parity sheet, then replace the two PNGs with approved SVGs at the documented asset boundary when supplied.
