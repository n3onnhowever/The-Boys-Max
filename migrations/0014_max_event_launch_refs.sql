CREATE TABLE max_event_launch_refs(
  ref char(32) PRIMARY KEY CHECK(ref ~ '^[a-f0-9]{32}$'),
  source_id text NOT NULL,
  external_event_id text NOT NULL,
  occurrence_id text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX max_event_launch_refs_expiry ON max_event_launch_refs(expires_at);
