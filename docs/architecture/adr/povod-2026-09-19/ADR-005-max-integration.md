# ADR-005 — MAX Mini App primary, chatbot connected
Status: ACCEPTED

Decision:
- Mini App is the primary UI.
- Per official case it is attached to a chatbot and not an isolated service.
- Validate launch identity server-side.
- Backend owns product state.
- startapp/share context is never authorization.
- Runtime-test current MAX API2/TLS.
- Smart Povod remains P1.
- Do not depend on programmatic group-member addition.
- MAX UI library is optional/conditional.
