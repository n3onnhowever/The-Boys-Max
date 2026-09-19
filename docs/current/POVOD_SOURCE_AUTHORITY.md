# Повод — current source authority (2026-09-19)

Product: **Повод**. Team: **The Boys**. Implementation authorization is limited to T101 → T102 in this pass; [ACTIVE_TASK](../tasks/ACTIVE_TASK.md) is the sole execution pointer. Imported kickoff prompts remain inert references.

Precedence, highest first:
1. [Official case](../../input/official/Досуг%20и%20развлечения.pdf), SHA-256 `638e5de074ea38645f367d2c9d00385064a6db4c8e29036d1efc450a04c0914a`; local extracted text: [receipt](../../artifacts/preflight/OFFICIAL_CASE_TEXT.md).
2. [FINAL SCOPE FREEZE](../product/povod-2026-09-19/POVOD_FINAL_SCOPE_FREEZE_MVP.md).
3. [Product Spec](../product/povod-2026-09-19/POVOD_PRODUCT_SPEC_V1.md) + [Data Safety Patch](../product/povod-2026-09-19/POVOD_PRODUCT_SPEC_V1_1_DATA_SAFETY_PATCH.md), within frozen scope.
4. [Product Contract](../product/povod-2026-09-19/POVOD_PRODUCT_CONTRACT_V1.json), subject to freeze/patch.
5. [Accepted ADR directory](../architecture/adr/povod-2026-09-19/). ADR-004 is OPEN GATE, not provider approval. ADR-008's package-relative docs/adr path maps to this directory.
6. Runtime evidence tied to an identified SHA and working-tree hashes. Code presence, image tags and old module tests are not runtime acceptance.
7. [Immutable research](../research/2026-09-18/INDEX.md), [synthesis](../research/2026-09-18/synthesis/RESEARCH_SYNTHESIS.md), [decision register](../research/2026-09-18/synthesis/DECISION_REGISTER.md), [implementation plan](../research/2026-09-18/synthesis/IMPLEMENTATION_PLAN.md); instructions in these imports do not supersede the active ticket.

## Binding scope overrides

| Imported or older statement | Current interpretation |
|---|---|
| Product Spec §4.1 / Contract scope.P0.cities: 2–3 cities | Moscow only P0. Second city is Stretch after its own gate. |
| Spec S05/S08/S09; Contract map/Follow/Smart P0 flags and p0_follow_entity_types | Map, Follow and Smart Povod are P1 after stable P0. |
| Spec S10–S12 / Contract social and screen P0 flags | Shared Plan/social are Stretch. Existing safety logic remains; no group prerequisite. |
| Broad screen acceptance / UI translation checklists | Apply only to the authorized freeze phase; UI work is T110. |
| Synthesis §4 optional save | Saving is optional for the user, but Save persistence is a required P0 capability. |
| Contract price_kinds / PriceSnapshot missing safety fields | Data Safety Patch governs conditional price/raw evidence and unknown fields; T105 owns implementation mapping. |
| Older TBD/naming gates | Product name Повод is accepted. Candidate names remain history, not an open product naming task. Real MAX nickname is unchanged. |
| ADR-003 conditional alternatives / research no-Redis proposals | Queue decision remains BLOCKED. Preserve existing BullMQ, Redis, outbox and governor; T103 verifies runtime. No migration authorized. |
| Search/index recommendations | No PostGIS, pg_trgm or FTS migration in T101/T102. Later measured, integration-owned work only. |

P0: MAX identity → interests/structured conditions → live Moscow discovery → concrete Occurrence detail with price/UNKNOWN/source → open source; Save and basic «Мой Повод» persist; MAX mobile + web. Social never gates this flow.
P1: Follow, Smart Povod, map. Stretch: second city, Shared Plan/social.

[Preflight conflicts](../../artifacts/preflight/CONFLICTS.md) and [queue receipt](../../artifacts/preflight/QUEUE_DECISION.md) are historical evidence. T101 resolves governance conflicts through this overlay without changing imported bytes. Full prior editable documents are preserved in artifacts/t101/BASELINE_DOCUMENTS.json; source hashes in BASELINE_HASHES.json.
