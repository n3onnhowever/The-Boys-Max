# ADR-002 — PostgreSQL-centered P0
Status: ACCEPTED

Decision:
- PostgreSQL remains system of record.
- Start search with PostgreSQL FTS/GIN + pg_trgm.
- Use stable PostGIS only if geo functionality needs it.
- Do not add an external search service without measured evidence.

Rejected for P0:
Meilisearch, Typesense, Elasticsearch, OpenSearch, vector DB.

Notes:
Exact DB/extension versions and indexes are selected after repository/host preflight and benchmarks.
