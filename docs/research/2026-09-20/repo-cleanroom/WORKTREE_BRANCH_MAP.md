# Worktree and branch map

Base: 1e4a7a2b454bed87bdcb40559773143c2fc38c9b. Final cleanup code: 991b3cdf9e8081cf9648faa4746243e4e5dfcb3b.
No feature merges, tags created, or branches/worktrees deleted.

No tags existed. t002-pre-repair / t002-pre-final-repair are branches. The original committed HEAD/main baseline is the audit source; dirty MAX/UI changes are preserved outside this proof.

| Branch | Tip | Baseline-only / branch-only commits |
|---|---|---:|
| main / codex/max-bot-entry-flow | 1e4a7a2 | 0 / 0 |
| codex/ui-v1-integrated | 6cc7311aa2ad882437946a7970245704527732c6 | 0 / 15 |
| codex/max-bot-ux | d2a03110d955a5e13f37a0e86281bdd26c7b3349 | 0 / 1 |
| codex/max-miniapp-production | 2b1f126bce6aac760a4be42df3fff88028b36f8e | 0 / 1 |
| codex/max-token-tls | fc5aeed6ad9e12845c71b8016c9071240d22d74a | 0 / 1 |
| codex/t105-data-safety | 05ef63d2fa24a05e1ff308052b02c9b808d2af34 | 1 / 0 |
| codex/t106-max-runtime | 5583772554bb196f6410ea4b3a90da55ba1e68eb | 6 / 4 |

[refs.json](../../../../artifacts/repo-cleanroom/refs.json) lists every branch/ref at initial inventory, including all UI slices and pre-repair branches. The just-created cleanup ref initially points to baseline; that snapshot is not its final tip. Final evidence commits add only audit reports/receipts after 991b3cd.

[worktrees.json](../../../../artifacts/repo-cleanroom/worktrees.json) records exact paths, HEAD, branch, file counts, bytes and status hash for all 12 original worktrees. Initial status logs are preserved. T103/T104/T105/T106/base-UI trees were clean. UI detail/integrated/plans/profile/saved/states had untracked evidence packages. The primary worktree contains pre-existing source modifications and untracked code/research/runtime/design/handoff files.

Task-created worktrees, all retained:

- D:/Dev/Repos/The-Boys-Max-repo-cleanroom — branch codex/repo-cleanroom, cleanup + audit.
- D:/Dev/Repos/The-Boys-Max-repo-cleanroom-proof — detached c9d7984, initial proof with diagnosed Docker discovery failure.
- D:/Dev/Repos/The-Boys-Max-repo-cleanroom-verify — detached 991b3cd, final clean proof.

Generated dependency/build output in proof worktrees is ignored local verification material, excluded from the deliverable.

Integration boundaries:

- UI versus baseline: 272 changed files; 15 commits ahead. UI branch-local docs/current/UI_POVOD_V1_STATE.md covers UI integration/visual QA, not Docker/PG/Redis/MAX/live-provider acceptance.
- Each of three MAX branches is also unmerged into UI: UI-only/MAX-only 15/1.
- T106 merge-base with baseline: 5e4973f24fb74489387b3c29313cfcd1e8401ca7. Relative to UI: 21/4. Endpoint diff omits later baseline receipts; it is not a cleanup deletion proposal.
- Local technical research master ZIP is not a merge or acceptance of its branch inputs.
- MAX TLS requires reviewed certs input not present in the baseline Docker allowlist; reconcile on future integration.

No integration decision is made here. Do not assume a clean baseline proof covers dirty working code or unmerged branch-local features.
