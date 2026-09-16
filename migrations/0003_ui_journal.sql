-- The mapping is persisted before calling the established plan command service. This avoids
-- recomputing an edit from a changed plan after an ambiguous HTTP response. The domain receipt
-- still owns the atomic business effect. No externally submitted POST is automatically replayed.
CREATE TABLE ui_mapped_commands(actor_id uuid NOT NULL REFERENCES actors(id),key uuid NOT NULL,payload_hash text NOT NULL,mapped jsonb NOT NULL,result_route jsonb,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(actor_id,key));
