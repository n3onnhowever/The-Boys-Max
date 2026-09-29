# Drizzle ORM declaration corrections

Source: https://registry.npmjs.org/drizzle-orm/-/drizzle-orm-0.45.2.tgz
Pinned version: 0.45.2
Integrity: sha512-kY0BSaTNYWnoDMVoyY8uxmyHjpJW1geOmBMdSSicKo9CIIWkSxMIj2rkeSR51b8KAPB7m+qysjuHme5nKP+E5Q==
License: Apache-2.0; full original license retained alongside this notice. Upstream: https://github.com/drizzle-team/drizzle-orm .

Modified declarations are recorded with original/modified SHA-256 and exact text in patches/drizzle-orm-0.45.2.json. Adapted paths:

- pg-core/query-builders/query.d.ts: Restore getSQL present in the pinned runtime and stripped from declarations.
- gel-core/query-builders/query.d.ts: Restore getSQL present in the pinned runtime and stripped from declarations.
- sqlite-core/query-builders/query.d.ts: Restore getSQL present in the pinned runtime and stripped from declarations.
- mysql-core/query-builders/delete.d.ts: Restore runtime getSQL.
- singlestore-core/query-builders/delete.d.ts: Restore runtime getSQL.
- mysql-core/query-builders/select.d.ts: Restore inherited concrete getSQL implemented in runtime.
- mysql-core/query-builders/select.types.d.ts: session/config is protected/internal, not a public key. Removing it from the public omission list preserves its protection and public method restrictions.
- singlestore-core/query-builders/select.d.ts: Restore inherited concrete getSQL implemented in runtime.
- singlestore-core/query-builders/select.types.d.ts: session/config is protected/internal, not a public key. Removing it from the public omission list preserves its protection and public method restrictions.
- sqlite-core/query-builders/select.d.ts: Restore inherited concrete getSQL implemented in runtime.
- sqlite-core/query-builders/select.types.d.ts: session/config is protected/internal, not a public key. Removing it from the public omission list preserves its protection and public method restrictions.
- pg-core/roles.d.ts: Restore readonly optional config fields from pinned source map.
- gel-core/roles.d.ts: Restore readonly optional config fields from pinned source map.
- singlestore-core/columns/common.d.ts: Restore runtime method using the existing abstract contract, without any.
- singlestore-core/columns/enum.d.ts: Runtime always throws Method not implemented: never is the exact return type.

Only declarations are modified; JavaScript runtime is unchanged. Source/runtime evidence is the corresponding .js and .js.map from the same pinned tarball. Local modifications by The Boys, 2026-09-19. See artifacts/t102_1/ROOT_CAUSE_ANALYSIS.md.
