-- T105 additive, FORWARD_ONLY. No LIVE source is seeded or enabled.
CREATE TABLE catalog_sources(
  id text PRIMARY KEY CHECK(length(id) BETWEEN 1 AND 256),
  provider_id text NOT NULL CHECK(length(provider_id) BETWEEN 1 AND 128),
  data_mode text NOT NULL CHECK(data_mode IN ('SYNTHETIC','LIVE')),
  admission_state text NOT NULL DEFAULT 'DISABLED' CHECK(admission_state IN ('DISABLED','SYNTHETIC','APPROVED')),
  rights_revision text NOT NULL CHECK(length(rights_revision) BETWEEN 1 AND 128),
  next_request_seq bigint NOT NULL DEFAULT 0 CHECK(next_request_seq>=0),
  fence bigint NOT NULL DEFAULT 0 CHECK(fence>=0),
  last_success_at timestamptz,
  CHECK((data_mode='SYNTHETIC' AND admission_state IN ('DISABLED','SYNTHETIC')) OR (data_mode='LIVE' AND admission_state IN ('DISABLED','APPROVED')))
);
CREATE TABLE catalog_sync_runs(
  id uuid PRIMARY KEY,source_id text NOT NULL REFERENCES catalog_sources(id),
  scope_hash text NOT NULL CHECK(scope_hash ~ '^[a-f0-9]{64}$'),
  epoch uuid NOT NULL,source_fence bigint NOT NULL CHECK(source_fence>0),
  status text NOT NULL CHECK(status IN ('RUNNING','SUCCEEDED','PARTIAL','FAILED','ABORTED')),
  next_page integer NOT NULL DEFAULT 1 CHECK(next_page BETWEEN 1 AND 51),
  query_exhausted boolean NOT NULL DEFAULT false,snapshot_consistent boolean NOT NULL DEFAULT false,
  truncated boolean NOT NULL DEFAULT false,partial_count integer NOT NULL DEFAULT 0 CHECK(partial_count>=0),
  failed_pages integer NOT NULL DEFAULT 0 CHECK(failed_pages>=0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),finished_at timestamptz
);
CREATE UNIQUE INDEX one_active_catalog_run_per_source ON catalog_sync_runs(source_id) WHERE status='RUNNING';
CREATE TABLE catalog_sync_pages(
  id uuid PRIMARY KEY,run_id uuid NOT NULL REFERENCES catalog_sync_runs(id),
  page_number integer NOT NULL CHECK(page_number BETWEEN 1 AND 50),
  request_seq bigint NOT NULL CHECK(request_seq>0),
  status text NOT NULL CHECK(status IN ('DISPATCHED','COMMITTED','FAILED')),
  response_sha256 text CHECK(response_sha256 IS NULL OR response_sha256 ~ '^[a-f0-9]{64}$'),
  record_count integer CHECK(record_count IS NULL OR record_count BETWEEN 0 AND 500),
  accepted_count integer NOT NULL DEFAULT 0 CHECK(accepted_count>=0),
  quarantined_count integer NOT NULL DEFAULT 0 CHECK(quarantined_count>=0),
  dispatched_at timestamptz NOT NULL DEFAULT clock_timestamp(),committed_at timestamptz,
  UNIQUE(run_id,page_number),UNIQUE(run_id,request_seq)
);
CREATE TABLE source_observations(
  id uuid PRIMARY KEY,source_id text NOT NULL REFERENCES catalog_sources(id),
  provider_event_id text NOT NULL CHECK(length(provider_event_id) BETWEEN 1 AND 256),
  request_id text NOT NULL CHECK(length(request_id) BETWEEN 1 AND 256),
  record_ordinal integer NOT NULL CHECK(record_ordinal>=0),
  request_seq bigint NOT NULL CHECK(request_seq>0),
  fetched_at timestamptz NOT NULL,
  source_url text CHECK(source_url IS NULL OR length(source_url)<=2000),
  response_sha256 text NOT NULL CHECK(response_sha256 ~ '^[a-f0-9]{64}$'),
  projection_sha256 text NOT NULL CHECK(projection_sha256 ~ '^[a-f0-9]{64}$'),
  transform_version text NOT NULL CHECK(length(transform_version) BETWEEN 1 AND 128),
  rights_revision text NOT NULL CHECK(length(rights_revision) BETWEEN 1 AND 128),
  disposition text NOT NULL CHECK(disposition IN ('ACCEPT','PARTIAL_ACCEPT','DUPLICATE','STALE_IGNORED')),
  UNIQUE(source_id,request_id,record_ordinal)
);
CREATE TABLE canonical_events(
  id uuid PRIMARY KEY,source_id text NOT NULL REFERENCES catalog_sources(id),
  provider_event_id text NOT NULL CHECK(length(provider_event_id) BETWEEN 1 AND 256),
  title text NOT NULL CHECK(length(title) BETWEEN 1 AND 300),
  categories jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(categories)='array'),
  categories_complete boolean NOT NULL DEFAULT false,category_mapping_verified boolean NOT NULL DEFAULT false,
  CHECK(NOT categories_complete OR category_mapping_verified),
  source_url text CHECK(source_url IS NULL OR length(source_url)<=2000),
  semantic_hash text NOT NULL CHECK(semantic_hash ~ '^[a-f0-9]{64}$'),
  last_request_seq bigint NOT NULL CHECK(last_request_seq>0),
  accepted_observation_id uuid NOT NULL REFERENCES source_observations(id),
  fetched_at timestamptz NOT NULL,
  UNIQUE(source_id,provider_event_id)
);
CREATE TABLE canonical_venues(
  id uuid PRIMARY KEY,source_id text NOT NULL REFERENCES catalog_sources(id),
  provider_venue_id text NOT NULL CHECK(length(provider_venue_id) BETWEEN 1 AND 256),
  UNIQUE(source_id,provider_venue_id)
);
CREATE TABLE canonical_occurrences(
  id uuid PRIMARY KEY,event_id uuid NOT NULL REFERENCES canonical_events(id),
  native_session_id text CHECK(native_session_id IS NULL OR length(native_session_id) BETWEEN 1 AND 256),
  fragment_path text NOT NULL CHECK(length(fragment_path) BETWEEN 1 AND 200),
  starts_at timestamptz NOT NULL,ends_at timestamptz,
  time_zone text NOT NULL CHECK(length(time_zone) BETWEEN 1 AND 80),
  venue_id uuid REFERENCES canonical_venues(id),
  place jsonb NOT NULL CHECK(COALESCE(jsonb_typeof(place)='object' AND place->>'kind' IN ('VENUE','PARTIAL_ADDRESS','ONLINE','UNKNOWN'),false)),
  price jsonb NOT NULL CHECK(COALESCE(jsonb_typeof(price)='object' AND price->>'kind' IN ('KNOWN','FREE','FROM','RANGE','CONDITIONAL','UNKNOWN') AND jsonb_typeof(price->'conditions')='array' AND price->>'feeMode' IN ('UNKNOWN','NONE','INCLUDED','ITEMIZED') AND price->>'feesKnown' IN ('true','false'),false)),
  lifecycle text NOT NULL CHECK(lifecycle IN ('UNKNOWN','SCHEDULED','POSTPONED','CANCELLED')),
  confirmation text NOT NULL CHECK(confirmation IN ('CONFIRMED','UNCONFIRMED')),
  listing text NOT NULL CHECK(listing IN ('PRESENT','MISSING_FROM_FEED','UNKNOWN')),
  revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
  semantic_hash text NOT NULL CHECK(semantic_hash ~ '^[a-f0-9]{64}$'),
  accepted_observation_id uuid NOT NULL REFERENCES source_observations(id),
  fetched_at timestamptz NOT NULL,
  source_url text CHECK(source_url IS NULL OR length(source_url)<=2000),
  transform_version text NOT NULL CHECK(length(transform_version) BETWEEN 1 AND 128),
  time_paths jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(time_paths)='array'),
  time_evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(time_evidence)='object'),
  place_paths jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(place_paths)='array'),
  CHECK(ends_at IS NULL OR ends_at>starts_at),
  CHECK(price->>'kind'<>'UNKNOWN' OR (price->>'quoteMinMinor' IS NULL AND price->>'quoteMaxMinor' IS NULL)),
  CHECK(price->>'kind'<>'CONDITIONAL' OR jsonb_array_length(price->'conditions')>0),
  CHECK(price->>'kind'<>'FREE' OR (
    price->>'quoteMinMinor'='0' AND price->>'quoteMaxMinor'='0' AND
    price->>'totalMinMinor'='0' AND price->>'totalMaxMinor'='0' AND
    price->>'feesKnown'='true' AND price->>'scopeAppliesToOccurrence'='true' AND
    price->>'isFreeClaimedBySource'='true' AND price->>'freeEvidencePath' IS NOT NULL AND
    jsonb_typeof(price->'feeEvidencePaths')='array' AND jsonb_array_length(price->'feeEvidencePaths')>0 AND
    jsonb_array_length(price->'conditions')=0
  ))
);
CREATE INDEX canonical_occurrences_event_start ON canonical_occurrences(event_id,starts_at);
CREATE TABLE occurrence_aliases(
  event_id uuid NOT NULL REFERENCES canonical_events(id),
  alias_type text NOT NULL CHECK(alias_type IN ('NATIVE','ANON')),
  alias_value text NOT NULL CHECK(length(alias_value) BETWEEN 1 AND 256),
  occurrence_id uuid NOT NULL REFERENCES canonical_occurrences(id),
  PRIMARY KEY(event_id,alias_type,alias_value)
);
CREATE INDEX occurrence_aliases_occurrence ON occurrence_aliases(occurrence_id);
CREATE TABLE catalog_normalization_quarantine(
  id uuid PRIMARY KEY,source_id text NOT NULL REFERENCES catalog_sources(id),
  run_id uuid NOT NULL REFERENCES catalog_sync_runs(id),
  page_number integer NOT NULL,record_ordinal integer,
  provider_event_id text,path text NOT NULL CHECK(length(path)<=200),
  code text NOT NULL CHECK(length(code)<=128),
  field_hash text CHECK(field_hash IS NULL OR field_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
