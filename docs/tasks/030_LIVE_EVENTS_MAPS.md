# T030 — Live events + map execution

> Historical task; inactive. Follow [ACTIVE_TASK](ACTIVE_TASK.md). The T101/T102 authorization supersedes this old work order.

Recommended: GPT-5.3-Codex / medium

Goal
Replace network-blocked evidence with safe local live probes and feed real samples through the current normalization/map path.

Inputs
- input/results/MAX_RESULT_30_EVENTS_MAP_2026-09-16_v1.zip
- current search/map modules
- official case
- docs/current/KNOWN_GAPS.md

Do
1. Perform minimal read-only probes against KudaGo and Timepad documented public endpoints that require no secret/payment.
2. Save request URL/params, timestamp, HTTP status, source/provenance and a small sanitized response sample.
3. Pass samples through the current normalization/search pipeline.
4. Test finished/current/future events, unknown/incomplete price, missing coordinates and incomplete pagination semantics.
5. Run the actual map component in a browser and test marker/list selection, missing coordinates, attribution, external Yandex Maps navigation link and resource failure.
6. Record rights/cost/production assumptions separately from observed runtime facts.

Do not
- scrape around access controls;
- spend money;
- treat documentation pages as proof of production API behavior;
- assume public OSM tiles are a guaranteed production CDN.

Acceptance
At least one real provider sample is successfully processed, or an exact provider-specific blocker is evidenced. Map evidence comes from the actual target component.
