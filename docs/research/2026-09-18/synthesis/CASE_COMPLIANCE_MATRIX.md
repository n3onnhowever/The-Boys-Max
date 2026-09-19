# ПОВОД — OFFICIAL CASE COMPLIANCE MATRIX
**Case:** `official_case.pdf`  
**Pages:** 22  
**SHA-256:** `638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a`  
**Creation metadata:** 2026-09-15

This matrix is derived from the exact PDF reopened during synthesis.

| Requirement | Case page | Povod response | Status before implementation evidence |
|---|---:|---|---|
| Define concrete audience/problem and justify it | 6, 8, 16–17 | Solo event-goer with time/budget/location constraints | SPECIFIED, evidence wording still careful |
| One priority scenario end-to-end | 6, 8, 17 | Frozen solo-first flow | SPECIFIED |
| MAX is implementation/interaction environment | 7 | MAX Mini App + connected bot | MUST VERIFY RUNTIME |
| Functionality available in mobile and web MAX | 7 | Responsive P0 contract | MUST VERIFY RUNTIME |
| Mini App is connected to chatbot, not isolated | 7, 15 | Bot attachment required structurally | MUST VERIFY |
| No closed libraries/private APIs/unlicensed code | 7 | Licence gate on dependencies/providers/donor | MUST AUDIT REPO |
| No working secrets in repository | 7 | `.env.example`, secret scan | MUST VERIFY |
| Clearly disclose test/model data if used | 7, 18 | P0 intends live data; any fallback must be labelled | MUST ENFORCE |
| Source/data provenance and freshness considered | 8, 18 | Source mandatory, UNKNOWN/freshness guarded | SPECIFIED |
| Working solution in MAX | 9 | Main E2E | BLOCKER until runtime |
| Fixed source version / commit hash or archive checksum | 9 | Evidence bundle per release SHA | MUST PRODUCE |
| README with scenario, architecture, Docker command, env, ports, dependencies, integrations, test data, known limits, restart | 9 | Planned | MUST PRODUCE/VERIFY |
| Dependency versions fixed | 9 | Lockfile required | MUST VERIFY |
| Dockerfile + compose + .dockerignore + .env.example | 9 | Planned | MUST PRODUCE/VERIFY |
| Docker build <=5 minutes excluding initial base image download | 9 | Evidence timing required | MUST RUN |
| Product remains accessible in MAX even with Docker | 9 | Deployment separate from local reproducibility | MUST VERIFY |
| Presentation PDF | 10 | Content blueprint exists; final design later | MUST PRODUCE |
| Presentation first slide is service/technical and not product-scored | 10 | Must include MAX link, repo+SHA, own API if used, test credentials, required runtime secrets/values, scenario | MUST IMPLEMENT CAREFULLY |
| Own API: full HTTPS address | 10 | Required if own API remains | MUST VERIFY |
| Own API: OpenAPI 3.0 or 3.1 | 10 | Required | MUST PRODUCE/VALIDATE |
| Own API: test accounts if roles required | 10 | Only as needed | CONDITIONAL |
| Own API: reproducible test data | 10 | Required | MUST PRODUCE |
| Own API: DATA-API.yaml with required check definitions | 10 | Required; exact schema version still must be confirmed from submission tooling if external spec exists | MUST PRODUCE/VALIDATE |
| Product value / UX / scale / cohesion | 12 | Strong research/spec basis | NEEDS RUNTIME + evidence |
| Technical functionality/integration/stability/architecture/security/docs | 13 | Implementation plan targets them | NEEDS RUNTIME |
| Platform bonus only for working extra MAX capability after core works | 13 | Smart Povod could qualify only if fully proven; not needed for P0 | P1 ONLY |
| Scale must specify core vs variable and realistic rollout | 19 | Moscow → separately gated second city | SPECIFIED |
| Pilot should define segment/process/data/channels/metrics/next step | 20 | Prior pilot framework exists | CONTENT READY, not executed |

## Critical clarification about secrets

The case simultaneously:
- forbids working secrets in the **repository** (page 7), and
- asks the service/technical first presentation slide to provide working tokens/API keys/env values needed for technical verification (page 10).

Therefore:
- never commit working secrets to Git;
- provide judge-required values only through the submission/service mechanism expected by organizers;
- Codex must not invent a public secret-distribution mechanism;
- verify the actual submission portal/instructions before final packaging.

## Exact online evaluation weights

### Product = 40% of online score
- Scale potential: 35%
- User value: 25%
- UX/UI: 20%
- Cohesion/justification: 15%
- Presentation: 5%

### Technical = 60% of online score
- Core functionality: 30%
- Integrations/data exchange: 20%
- Stability/error handling: 10%
- Technical implementation/architecture: 20%
- Security/dependencies/data: 10%
- Technical documentation/completeness: 10%

Platform bonus: +0.15 only as a complete bonus after the main flow works and the extra MAX capability produces end-to-end user value.
