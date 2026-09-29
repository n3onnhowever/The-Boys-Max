# T105 schema summary

Base: fd03d3a15157fcaa59e5574619725f366fd6185d
Implementation: 30a60928c58cd4be208b6ae097250a165de8ee0f
Migration: 0004_t105_catalog.sql, SHA-256 d14cef7b400fc9eb78fac5f81a2cef8e78519afd448160ec8c0d8e6865cb829e

- `catalog_sources`: isolated synthetic/live source identity, rights revision, admission state, dispatch sequence and run fence. No live source is seeded.
- `catalog_sync_runs`, `catalog_sync_pages`: bounded page checkpoint, query exhaustion, partial/failure state, and late-response fencing.
- `source_observations`: provider record ID, request/ordinal, fetch time, source URL, response and projection hashes, transform and rights revisions. No raw response body.
- `canonical_events`: conceptual event title and category facts, one row per source and provider event ID, separate accepted observation.
- `canonical_venues`: optional source-scoped provider venue identity; place facts remain per occurrence.
- `canonical_occurrences`: exact start, nullable end, timezone, optional venue, price and place JSON with discriminators and safety checks, lifecycle/confirmation/listing, semantic revision and accepted observation.
- `occurrence_aliases`: unique source Event-local native or anonymous session aliases mapping to opaque occurrence UUIDs.
- `catalog_normalization_quarantine`: bounded reason/path/hash receipt, without rejected raw content.

Foreign keys, unique constraints and CHECK rules reject duplicate provider identities, impossible persisted end order, invalid discriminators, unsupported FREE evidence and malformed provenance hashes. Coordinates are optional JSON facts; PostGIS is absent.
