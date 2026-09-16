# Current project state — 2026-09-16

## Product frame
The Boys is building a MAX personal event guide. A person can discover an event for themselves and get a useful result without creating a group. If they want, they can turn one or more events into a collaborative plan and invite friends.

Working public product name is **not decided**. “Есть планы” and “Договорились” are historical/working candidates only.

## Current implementation base
Repository tree is extracted from `MAX_RESULT_26_INTEGRATION_2026-09-16_v1` and is the current code baseline for the next integration pass.

Known verified local evidence from the previous review:
- result 26: 105/105 local unit tests passed in the review environment;
- result 27: 122/122 local frontend unit tests passed;
- result 29: 348/348 local AI-module tests passed;
- result 30: its local `tests/run_all.py` passed.

These are module/local checks, **not** an end-to-end application pass.

## Environment
User Windows workstation on 2026-09-16:
- DNS and TCP 443: GitHub, npm registry, KudaGo docs, Timepad docs — reachable;
- Node `v24.20.0`;
- npm `11.19.0`;
- Git `2.55.0.windows.3`;
- npm registry `npm ping` — PASS;
- EventHive `git ls-remote` — PASS;
- Docker CLI `29.7.2` and Compose `v5.5.1` installed;
- Docker Desktop Linux daemon is currently **not running** (`docker info` cannot connect to `dockerDesktopLinuxEngine`).

Do not treat the Docker daemon as available until `docker info` and a disposable container actually pass.

## Immediate priorities
1. Integration v2: merge valid deltas from 27/29/30 into the result-26 code tree, resolve contract conflicts, create one dependency/lock graph, and run clean checks.
2. Visual runtime: run the pinned donor in the working Windows/Codex environment and capture real original/adapted screenshots.
3. Live events/maps: perform safe read-only provider probes, preserve samples/provenance, and validate map runtime.
4. Then perform independent acceptance against one exact source commit/hash.
5. Update the presentation only with evidence from the accepted build.

## Do not restart
No new broad architecture, competitor, stack, or product-direction review is needed unless a concrete blocker invalidates an accepted decision.
