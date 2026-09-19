# T020 — Visual donor runtime + narrow adaptation

> Historical task; inactive. Follow [ACTIVE_TASK](ACTIVE_TASK.md). The T101/T102 authorization supersedes this old work order.

Recommended: GPT-5.3-Codex / medium

Goal
Close the visual-evidence gap: run the pinned donor, capture the real original UI, then create a narrow product adaptation for team review.

Inputs
- input/results/MAX_RESULT_27_FRONTEND_2026-09-16_v1.zip
- current root mini-app
- docs/design/BRAND_BRIEF.md
- docs/product/PRODUCT_FRAME.md

Do
1. Extract the exact EventHive provenance/pinned revision from result 27.
2. Acquire that revision from GitHub, verify licence/dependency metadata, and record provenance.
3. Clean install and run the ORIGINAL donor.
4. Capture real screenshots at 360, 390 and 430 px for relevant list/detail flows. Record the exact command, URL and commit.
5. Adapt only a vertical slice: personal discovery → event detail/location → explicit “invite friends” continuation.
6. Use temporary product naming; do not register a bot nickname.
7. Capture adapted screenshots from the actual React/Vite build.
8. Record concrete UI issues, not a broad design review.

Do not
- recreate screenshots with static HTML;
- claim team approval;
- reuse unlicensed imagery/assets;
- redesign the entire product before review.

Acceptance
Original + adapted runtime screenshots exist, provenance is clear, and the team can make a visual decision.
