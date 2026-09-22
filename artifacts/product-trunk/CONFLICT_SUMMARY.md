# Conflict summary

Integration order: corrected cleanroom policy 1176eb3, MAX runtime bbe233b, UI v1 6cc7311, UI quality safe fix 989bfcf. The pre-integration path matrix is INTEGRATION_MATRIX.md. All four SHAs remain ancestors of the trunk; no source branch was rewritten.

| Conflict | Resolution |
|---|---|
| .dockerignore (cleanroom/MAX) | Retained the corrected allowlist and all nested evidence/private-file exclusions; added exactly the MAX public CA file and README to the context inputs. Context proof excluded 27/27 forbidden paths and retained 10/10 inputs. |
| .gitignore (cleanroom/MAX) | Retained cleanroom private/env/database/browser/output ignores and the two safe env templates; added MAX's generated artifacts/packages directory ignore. Harmless ignore probes pass 12/12. |
| apps/miniapp/src/App.tsx (MAX/UI) | Kept MAX authenticated entry error and native Back handling, showing auth/expired/uncertain errors before any retained view; routed catalog/detail/loading/empty/error/offline through accepted UI v1 screens. Legacy Plan/Invite capability path remains without making social a P0 dependency. |
| apps/miniapp/src/components/EventDetail.tsx (MAX/UI) | Kept the accepted UI DetailScreen and server-data adapter. Routed both source actions through MAX ExternalLink to preserve Bridge capability/failure fallback on allowlisted URLs. |
| apps/miniapp/src/styles.css (MAX/UI) | Kept the accepted UI visual stylesheet, which already contains explicit compatibility styles for legacy runtime panels. Added only the MAX viewport-height variable to AppViewport/Screen. The quality reduced-motion fix merged afterward. |
| apps/miniapp/src/main.tsx | Git auto-composed MAX session/launch bootstrap with the UI's exact allowlisted dynamic design-preview import. Successful and unavailable-API browser probes verify preview isolation. |

The 13-file UI quality patch auto-merged with no conflict. No blanket ours/theirs resolution was used for shared files. One regression-tested integration safety correction followed: server-backed Home/Search/Offline adapters no longer attach design artwork or unsupported promotion/proximity copy. Explicit design previews retain their accepted artwork and text. No route, database, dependency, queue, provider, authorization, frozen-scope, or T105 contract change was introduced.