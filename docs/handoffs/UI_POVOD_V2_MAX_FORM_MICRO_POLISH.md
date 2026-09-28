# POVOD V2 final MAX and form micro-polish — 2026-09-28

## Scope and baseline

- Exact checkout: `D:\Dev\Codex\Worktrees\unified-runtime\The-Boys-Max`; HEAD remains `c0235a30195ced23b1cf9934dfe1bf09830e45b4`. Existing uncommitted V2 work and the port 3000 owner preview were retained. No commit, push, deployment or preview reseed.
- Only official MAX button artwork and New Plan form validation presentation changed. No navigation, backend/catalog/plan semantics, or global composition changed.

## Official MAX asset

- Official source: https://go.max.ru/brandbook, which publishes versions with and without text and instructs preserving proportions and contrast. Icon-only downloads: `https://st.max.ru/brandbook/max-colored.zip` (SHA-256 `BFB540772C667BA12A2E9052295CD91DAD39EBD8D270038262F2F2404303C206`) and `https://st.max.ru/brandbook/max-white.zip` (SHA-256 `6FAFFBA487E25DCCC29421EE162624ACC8F8E12BD9C33C71A2BA6CBEDE46D7B8`). The linked detailed Figma rules were inaccessible; no separate open-source licence is asserted.
- Unmodified `Max colored.svg` → `apps/miniapp/public/assets/vendor/max/max-colored.svg`, SHA-256 `5CAA61A4B0731D0D89421B4FB24F41433025E5AEA59155A14CF3A3FADA6C9174`; unmodified `Max white.svg` → `.../max-white.svg`, SHA-256 `2D4939E3CF89A5EB61114D8EFAC7B9F67B03737F1226853F177D931E3B354DBD`. Neither SVG contains script or external references. Local vendor README records provenance and usage.
- White mark accompanies text on existing red primary MAX actions; colored mark accompanies text on light secondary MAX actions in Event share, Plan share/actions, and friend invite. It does not indicate native MAX sharing. Browser loaded the white SVG in Event share and the colored SVG in a Plan action; both static URLs returned HTTP 200.

## Form validation

- New Plan form retains real `required` text and `datetime-local` inputs. `noValidate` suppresses browser-specific constraint bubbles on submit; the submit handler checks title and both required date values before invoking the unchanged Plan command. First invalid input receives focus. Editing or locally rejecting a field hides any stale server rejection until the next valid submit.
- Invalid fields receive `aria-invalid`, an `aria-describedby` reference to visible Russian error copy and an inline `role="alert"`. Error clears when the field becomes valid. Existing date-segment entry, pointer and keyboard focus-visible outline, disabled and normal states remain.
- 390×844 browser: valid date pointer focus `micro-date-valid-focus-390.png`; keyboard focus-visible `micro-date-keyboard-focus-390.png`; invalid submit `micro-date-invalid-inline-390.png` shows both inline errors, no native popup and a reachable CTA. DOM check verified both descriptions and `aria-invalid=true`. At 360×780 and 430×844, real pointer submit retained inline errors, zero horizontal overflow and CTA center hit (`micro-date-invalid-inline-360.png`, `micro-date-invalid-inline-430.png`). MAX sheet loaded the official icon at all three widths; `micro-max-event-share-390.png` is the representative visual capture.
- With complete dates, browser submit reached the existing server Plan command and received the expected pre-event deadline rejection; draft values and Event Detail remained. Isolated UI integration still created a plan and replayed idempotently behind unrelated Search filters (7/7 passed).
- After that server rejection, a new locally invalid date showed only its inline field error; no stale server message or native bubble remained (`micro-date-invalid-after-rejection-390.png`).

## Checks and limits

- `npm.cmd run typecheck`: exit 0; `npm.cmd run typecheck:pure`: exit 0; `npm.cmd run build`: exit 0; isolated `tests/integration/ui26.test.ts`: exit 0, 7/7; `git diff --check`: exit 0. Only synthetic isolated `max23_test` data was changed by integration tests.
- Port 3000 HTTP HTML equals final `dist/miniapp/index.html` (SHA-256 `7841A2E9FA64D92B844ED6B7560886617D648F04EE36F241AD2272CC9B6DCC69`), with `index-DfRNEVjo.js` and `index-Bav4_Fek.css`; official white and colored asset URLs return 200. Source HEAD unchanged and worktree remains dirty by design.
- Evidence root: `.run-evidence/povod-r3-polish/`. NOT_RUN: native MAX handoff, real mobile keyboard/device safe area, independent Astra gate, live/production mode. Owner preview: `http://127.0.0.1:3000/?owner-preview=1`. Next action: independent Astra review; no product-wide acceptance is claimed here.
