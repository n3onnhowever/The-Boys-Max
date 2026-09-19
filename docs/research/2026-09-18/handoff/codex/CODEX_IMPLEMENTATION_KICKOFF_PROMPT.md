# CODEX IMPLEMENTATION KICKOFF PROMPT
**Do not use until the repository preflight has been reviewed.**

Continue the existing «Повод» repository from the accepted preflight SHA/state.

Read:
- current canonical docs;
- accepted ADRs;
- `IMPLEMENTATION_GAP_MATRIX.md`;
- `IMPLEMENTATION_PLAN.md`.

Do not expand frozen P0.

Work in small verified tickets, one writer at a time.

Order:
1. close reproducibility/lockfile/Docker blockers that prevent safe work;
2. close provider data gate and data-safety contract;
3. close MAX validated-identity + live P0 E2E;
4. close save/states/repeat-login;
5. run security/failure tests;
6. produce submission evidence;
7. only after all P0 gates are green, consider Smart Povod P1.

For every ticket:
- state exact goal;
- identify files;
- write/adjust tests;
- implement;
- lint/typecheck/test/build;
- runtime test where the claim is runtime;
- preserve evidence under `docs/evidence/<SHA-or-build>/` or project-standard evidence path;
- review git diff;
- report unresolved risks.

Non-negotiable:
- Event != Occurrence;
- UNKNOWN/conditional price stays honest;
- source/provenance required;
- no fake geo/time/price;
- hard FAIL cannot be ranking-overridden;
- startapp is not authorization;
- no provider approval without gate;
- no runtime claim without runtime evidence;
- no Kafka/Redpanda/Temporal/external search/vector DB;
- no new Redis just for architecture fashion;
- no mandatory group flow;
- no second city before its own data gate.

If current repo evidence contradicts an ADR, stop and report the conflict instead of forcing the ADR.
