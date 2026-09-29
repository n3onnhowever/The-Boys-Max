# Recommended repository documentation structure

```text
docs/
  current/
    README.md
    FINAL_SCOPE_FREEZE.md
    PRODUCT_SPEC.md
    PRODUCT_CONTRACT.json
    DATA_SAFETY.md
    DESIGN_SYSTEM.md
    CASE_COMPLIANCE_MATRIX.md
    IMPLEMENTATION_PLAN.md
    DECISION_REGISTER.md

  adr/
    001-scope-and-evidence.md
    002-postgresql-search.md
    003-async-jobs.md
    004-provider-kudago.md
    005-max-integration.md
    006-security-observability.md
    007-ux-semantics.md
    008-research-governance.md

  research/
    2026-09-18/
      raw/
        architecture/
        max-native/
        data-pipeline/
        security-reliability/
        codex-workflow/
        providers/
        ux-patterns/
        hackathon-compliance/
        user-validation/
        presentation-content/
      INDEX.md

  evidence/
    <build-or-sha>/
      manifest.json
      preflight/
      docker/
      api/
      max/
      provider/
      screenshots/
      tests/

  presentation/
    CONTENT.md
    CLAIMS_EVIDENCE.md
    DESIGNER_HANDOFF.md
```

## Branch policy

Do **not** create a permanent branch for every research topic.

Recommended:
- one short-lived branch for documentation import/synthesis, if branching is required;
- normal feature branches for implementation tasks;
- raw research separated by folders and immutable checksums.

This keeps one source of truth while preserving research history.
