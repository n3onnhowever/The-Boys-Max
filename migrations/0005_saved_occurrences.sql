CREATE TABLE saved_occurrences(
  actor_id uuid NOT NULL REFERENCES actors(id),
  occurrence_id uuid NOT NULL REFERENCES canonical_occurrences(id),
  saved_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT saved_occurrences_actor_occurrence_unique PRIMARY KEY(actor_id,occurrence_id)
);
CREATE INDEX saved_occurrences_actor_saved_at ON saved_occurrences(actor_id,saved_at DESC,occurrence_id);
