# ADR-006 — Minimal proportional security and observability
Status: ACCEPTED

P0 requires:
- validated MAX launch/auth boundary;
- object authorization;
- no secrets in repo;
- bounded timeouts/retries;
- duplicate-safe writes;
- redacted structured logs;
- correlation ID;
- health/readiness;
- targeted failure/abuse tests;
- minimum deletion/privacy path when public-placement rules require it.

Defer:
full self-hosted OTel/Prometheus/Grafana/Loki/Tempo stack unless already available.
