BEGIN;
CREATE TEMP TABLE t102_constraint_probe(state_version integer NOT NULL CHECK(state_version>0),state jsonb NOT NULL CHECK(state->>'version'='max.backend.23.v1-candidate' AND (state->>'stateVersion')::integer=state_version));
SELECT conname,pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='t102_constraint_probe'::regclass ORDER BY conname;
ROLLBACK;
