# POVOD repository cleanroom

**Status: COMPLETE — bounded audit and isolated safe cleanup. Cleanliness verdict: CONDITIONAL / READY FOR REVIEW, not an integrated submission release.**

Base: `1e4a7a2b454bed87bdcb40559773143c2fc38c9b`. Final safe cleanup code: `991b3cdf9e8081cf9648faa4746243e4e5dfcb3b`. Date: 2026-09-20. Branch: `codex/repo-cleanroom`. No feature merges, source deletions, archive moves, or branch/worktree deletions.

The principal defect was Docker context leakage: the baseline admitted 17 of 21 forbidden harmless marker paths, including `.secrets/`. The final allowlist admitted none and preserved all 15 required build/test marker paths. A real no-cache Docker build passed; the resulting image contains none of the checked repository-root private, Git, input, artifact or docs paths.

Only existing `.gitignore` and `.dockerignore` changed. Safe env examples remain tracked. Historical evidence and `.gitattributes` remain unchanged. New reports and evidence are confined to this task's directories. Earlier cleanup commit: `c9d7984bb3c87c0c7fa285704d2e24b04618efc7`.

| Checkpoint | Result |
|---|---|
| Inventory | 124,695 file records; 12 original worktrees; 2,141,639,205 bytes; zero inventory errors |
| Clean checkout | PASS: lock install, typecheck, 115/115 unit tests, build, Docker build |
| Hidden application state | New checkout, empty npm configs/cache; missing settings/secrets fail honestly on host and container |
| Secret heuristics | No confirmed secret match in scanned Git text; explicit binary/archive/unreachable/local-content limits |
| Supply chain | 23 exact direct pins, consistent lock, CycloneDX SBOM, npm advisory response total 0 |
| Deletion / relocation | 0 files deleted; 0 moved; classified proposals only |
| Runtime acceptance | PG/Redis integration, MAX/provider/browser checks NOT_RUN in this task |

Remaining submission decisions:

- README and TARGET_ARCHITECTURE still present obsolete T102.2 / pre-T103 status.
- The official-case PDF matches the authority hash locally but is absent from Git checkout.
- UI `6cc7311` and three MAX branches remain outside the inspected baseline and outside each other.
- EventHive `BLOCKED_PROVENANCE_T112`, runtime-image dependency/source retention and mutable base-image tags remain review items.
- Future MAX TLS integration must reconcile its reviewed `certs/` input with the Docker allowlist.

In the original workspace, **43,270 files / 572,738,073 bytes** are regenerable dependencies/build output. They remain untouched because other tasks may use them. **833 files / 4,349,580 bytes** of expanded research copies are archive candidates after owner/reference validation. The existing master ZIP is retained.

Start with [cleanup matrix](CLEANUP_MATRIX.md), [build proof](CLEAN_CHECKOUT.md), [source authority](SOURCE_AUTHORITY_AUDIT.md), [secret audit](SECRET_AUDIT.md) and [compact state](../../../../artifacts/repo-cleanroom/state.json). The ZIP contains this audit's reports, metadata, safe logs, scripts, SBOM and cleanup patch; no original private inputs, research payloads, installed dependencies or credentials are copied.
