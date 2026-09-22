# Product trunk integration matrix

Prepared before integration on 2026-09-22. The isolated worktree started clean at main 1e4a7a2b454bed87bdcb40559773143c2fc38c9b. The original dirty checkout is untouched.

| Input | Exact SHA | Relation to main | BASE..SHA changed paths | Required raw diff |
|---|---|---|---:|---|
| Corrected repo/Docker cleanroom policy | 1176eb3ae7e84315b9c3f0107c19232c8b2cffc4 | descendant | 108 | [name-status](input-diffs/cleanroom.name-status.txt), [stat](input-diffs/cleanroom.stat.txt) |
| MAX runtime integrated | bbe233b6fce98e362da0d29e4824353de4be4a75 | descendant | 143 | [name-status](input-diffs/max.name-status.txt), [stat](input-diffs/max.stat.txt) |
| UI v1 integrated | 6cc7311aa2ad882437946a7970245704527732c6 | descendant | 272 | [name-status](input-diffs/ui.name-status.txt), [stat](input-diffs/ui.stat.txt) |
| UI quality safe fix | 989bfcf53912ea594e12ccb7884f64009cf3ffc2 | descendant of UI v1 | 272 cumulative; 13 incremental | [name-status](input-diffs/quality.name-status.txt), [stat](input-diffs/quality.stat.txt), [incremental delta](input-diffs/quality-delta.name-status.txt) |

The cleanroom handoff, corrected executive and self-review identify 1176eb3 as the accepted policy revision; 991b3cd is superseded. MAX adds the official pinned CA paths to that policy. The UI-quality handoff and recheck identify 989bfcf as the source patch; later quality commits add audit evidence and correct audit claims without changing application source. The [cumulative direct-path listing](input-diffs/overlaps.txt) includes the inherited UI paths in the quality commit and must not be read as 272 new quality edits.

## Direct overlap requiring composition

| Category | Paths and decision |
|---|---|
| Ignore and Docker context | .gitignore and .dockerignore change in cleanroom and MAX. Preserve the corrected cleanroom exclusions, including .secrets/, local outputs and nested evidence, then add MAX's public CA allowlist. MAX's older .gitignore snapshot must not erase cleanroom protections. |
| Frontend runtime | apps/miniapp/src/App.tsx, components/EventDetail.tsx, main.tsx, styles.css change in MAX and UI. Compose authenticated MAX launch/session/Bridge behavior with accepted UI routing and screens. Verify the normal runtime cannot import design fixtures. |
| Quality patch | Thirteen incremental UI source files, including styles.css. UI v1 is its exact ancestor. Apply the safe fix after UI integration, preserving MAX's CSS and runtime changes. |
| package and lock | package.json changes in UI v1 only; the quality cumulative path is inherited. No direct MAX/cleanroom package or lockfile overlap. Reconcile script behavior with actual verification. |
| Environment and config | .env.example, .env.release.example, Dockerfile, tsconfig.build.json, platform config/launch/TLS and API config change in MAX only. Docker context policy changes in cleanroom and MAX. Verify no private env/secret path is tracked or packaged. |
| Tests | MAX adds/changes transport, auth, webhook, integration and security tests; UI adds view-model/screen tests; no non-ancestral direct test-file overlap. The quality patch changes production UI only, so all suites must run together. |
| Semantic overlap | MAX's server auth/session, Bot/Bridge transport, client source opening and runtime state handling meet UI's App/main/Detail routing, Save affordances, loading/error/offline screens and design preview. Accepted Plans screens remain preview-only/P1 or Stretch and cannot become P0 prerequisites. |

## Chosen order

1. Merge corrected cleanroom policy at 1176eb3 to establish the context/secret boundary.
2. Merge MAX runtime at bbe233b; resolve ignore-policy conflict explicitly and preserve runtime/Docker guarantees.
3. Merge UI v1 at 6cc7311; resolve shared runtime files explicitly.
4. Merge UI quality safe-fix at 989bfcf; it descends from UI v1 and therefore has a 13-file incremental source delta.

This order minimizes quality-patch conflict and puts safety boundaries in place before the frontend merge. Merge conflicts and resolutions will be logged separately. Evidence-only commits from the cleanroom and UI-quality branches are provenance sources, not additional runtime features.
