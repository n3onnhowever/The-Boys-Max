# Network decision

The existing test network is an internal Docker bridge. API requested 127.0.0.1:3000 but T102.1 observed no effective mapping with API attached only to this network. Before-change inspect confirms the requested binding and internal-only attachment; stopped-container Ports alone is not independent proof of the running failure.

Add frontend (normal bridge) only to API. Keep the existing test network as backend (internal:true), retaining its name to avoid unnecessary network churn. API networks: frontend + test; its sole published binding remains 127.0.0.1:3000:3000. PostgreSQL, Redis, worker, init, migrate, prepare and checks retain test only. No database/cache host ports. Service-name DNS remains postgres/redis.

Worker in test mode uses TestTransport, PostgreSQL and Redis; current behavior needs no frontend or external egress. Release compose is a separate unlaunched external-dependency flow and is unchanged.

Security tradeoff: the API gains normal bridge egress as part of the user-authorized dual-network design. This does not authorize live delivery/provider behavior. Database/cache retain internal-network isolation; no host networking, firewall/system changes or public binding. Acceptance covers published ports and network attachment, not a claim against privileged Docker-host access.
