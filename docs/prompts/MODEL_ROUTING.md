# Model routing policy

## Luna

- routine inventory;
- manifests/checksums;
- simple documentation;
- repetitive classification;
- mechanical repository operations.

Default reasoning: low.

## Terra

- ordinary implementation;
- focused bug fixes;
- tests;
- small frontend/backend changes;
- provider adapters;
- normal runtime work.

Default reasoning: low or medium.

## Sol

- non-trivial multi-module integration;
- architecture;
- complex debugging;
- product/technical synthesis;
- design-system synthesis;
- important contract changes.

Default reasoning: medium or high.

## Astro

- difficult architecture conflicts;
- severe reliability/security issues;
- hard-to-reproduce bugs;
- final independent acceptance;
- release-blocking investigations.

Default reasoning: high.
Use extra-high reasoning only for a demonstrated hard blocker.

## General rule

Use the cheapest model and reasoning level that can reliably complete the task.
Escalate after observed difficulty, not pre-emptively.
