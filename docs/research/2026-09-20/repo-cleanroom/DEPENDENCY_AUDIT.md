# Dependency and supply-chain audit

**Lock consistency PASS. No dependency changes.** Base 1e4a7a2; final cleanup 991b3cd.

Lock v3 root name/version/engines/workspaces/dependencies/devDependencies match package.json. All 23 direct packages are exact pins: 13 runtime, 10 development. There are 166 lock entries / 161 package names; each has npm-registry resolution, SHA-512 integrity and license metadata. Node 24.20.0 / npm 11.19.0 match the declared versions.

Flags overlap: 46 dev, 20 devOptional, 36 optional. Do not interpret every entry without dev=true as production. Thirty-three entries constrain OS/CPU. Native/optional components include msgpackr-extract (BullMQ graph), Rolldown, Lightning CSS and macOS fsevents. Only msgpackr-extract and fsevents declare installation scripts. --ignore-scripts remained enabled; actual Windows and Linux Docker builds passed.

| Repeated dependency | Versions | Decision |
|---|---|---|
| fastify-plugin | 5.1.0 / 6.0.0 | Different dependency ranges; retain |
| fast-uri | 4.2.1 / 3.1.8 under two parents | No forced dedupe |
| process-warning | 5.1.0 / 4.0.1 | Retain |
| real-require | 0.2.0 / 1.0.0 | Retain |

Import review covered 97 tracked source/build-script files. No application runtime import of root devDependencies was found. Vite/plugin are in vite.config, TypeScript in the syntax checker. gel/mysql2 support evidenced strict Drizzle declaration checks (T102 root-cause receipt); openapi-types is a required peer/transitive input. No indisputably unnecessary package was identified. Keep the 15 hash-checked declaration-only Drizzle patches and notices.

| License metadata | Entries |
|---|---:|
| MIT | 131 |
| Apache-2.0 | 7 |
| ISC | 7 |
| BSD-3-Clause | 6 |
| MPL-2.0 | 12 |
| BSD-2-Clause | 1 |
| BlueOak-1.0.0 | 1 |
| 0BSD | 1 |

MPL entries belong to Lightning CSS build dependencies; BlueOak to isexe (devOptional). These require notice/review consideration, not speculative incompatibility claims. Existing EventHive reuse stays BLOCKED_PROVENANCE_T112 in licenses/module-22-NOTICES.md. Installed Leaflet/other notices still need delivered-bundle acceptance. This is a metadata/provenance audit, not full legal review of every package.

Already installed npm generated the [CycloneDX SBOM](../../../../artifacts/repo-cleanroom/sbom.cdx.json):
`npm sbom --package-lock-only --sbom-format cyclonedx --ignore-scripts --offline`, exit 0.
It describes the lock including optional platforms, not only deployed packages.
`npm ls --package-lock-only --all --json` exited 0.
`npm audit --package-lock-only --json --ignore-scripts` exited 0 with 0 known vulnerabilities in that time-bound registry response.

Release review: Dockerfile copies the entire build-stage /app, retaining source/tests/dev packages. A smaller runtime layout needs separate validation. The base image is version-tagged, not digest-pinned; this build resolved node@sha256:ba849c60be29959425b8734d57b8b4b7d56f98edd9504c9af091d5281095a71e. No speculative pin, major upgrade, queue change or package removal was made.

Evidence: [dependency audit](../../../../artifacts/repo-cleanroom/dependency-audit.json), [lock review](../../../../artifacts/repo-cleanroom/lock-review.json), [command receipt](../../../../artifacts/repo-cleanroom/clean-checkout-results.json), [advisory response](../../../../artifacts/repo-cleanroom/raw/proof-advisories.txt.gz).
