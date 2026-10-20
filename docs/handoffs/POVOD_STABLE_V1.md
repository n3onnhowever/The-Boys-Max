# Stable portfolio v1 finalization handoff

Input: owner's stable offline portfolio finalization request, 2026-10-20. Starting revision: `0c0c2a528e6daf523a74df0e3c5747482196b5c1` on `codex/posthackathon-correctness-02b`. One writer/integration owner; the original dirty checkout and all existing branches/worktrees are preserved.

The documentation cleanup changes README references and `docs/CI.md`, consolidates acceptance into [VALIDATION](../VALIDATION.md), and removes the obsolete ACTIVE_TASK plus three duplicate historical handoffs. Their source-pinned history links and relevant contracts are retained in VALIDATION. No runtime, build, test, dependency, migration SQL, catalog/provenance, product specification, ADR or deployment file changes. Contract deltas: none.

Local checks executed during cleanup: both existing typechecks, the full unit suite and build exited 0. Local Markdown links/anchors, allowed changed paths, unchanged runtime/build/test source, all 17 SQL blobs and unchanged DEPLOYMENT were checked. Exact commands, exits, source hashes and log hashes are retained in a private finalization receipt. Fresh hosted validation of the cleanup commit and integrated main are separate mandatory gates; historical candidate runs do not replace them.

The integration owner must use exact-head normal merge commits for PRs #3 → #4 → #5, explicitly retarget #4/#5 to main, verify accepted ancestry and exact tree equality after each merge, and inspect fresh main CI logs before creating the annotated stable tag. The final operator report records the actual cleanup/integration/merge/tag SHAs and exact main run URL; the tag and hosted run identify the finished snapshot without a self-referential source commit field here.

NOT_RUN in this offline checkpoint: live MAX, live GigaChat/provider calls, production databases, deployment and Docker publication. Deferred risks and reproduction commands are maintained only in VALIDATION; deployment's 0010 safety/checksum contract remains canonical. Stop after the verified stable tag; roadmap implementation is outside this task.
