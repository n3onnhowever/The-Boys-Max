-- Existing immutable snapshot/audit rows are not rewritten. See scripts/upgrade-price.ts.
ALTER TABLE plans DROP CONSTRAINT plans_state_check;
ALTER TABLE plans ADD CONSTRAINT plans_state_check CHECK(state->>'version' IN ('max.backend.23.v1-candidate','the-boys.backend.26.v1-candidate') AND (state->>'stateVersion')::integer=state_version);
ALTER TABLE outbox ALTER COLUMN command_id DROP NOT NULL;
ALTER TABLE outbox ALTER COLUMN plan_id DROP NOT NULL;
ALTER TABLE outbox DROP CONSTRAINT outbox_kind_check;
ALTER TABLE outbox ADD CONSTRAINT outbox_kind_check CHECK(kind IN ('PLAN_NOTICE','BOT_WELCOME','REMINDER'));
ALTER TABLE outbox ADD COLUMN purpose text NOT NULL DEFAULT 'LEGACY';
ALTER TABLE outbox ADD COLUMN expected_selection_revision integer;
ALTER TABLE outbox ADD COLUMN expected_config_revision integer;
ALTER TABLE outbox ADD COLUMN inbox_id uuid REFERENCES inbox(id);
ALTER TABLE outbox ADD CONSTRAINT outbox_scope_check CHECK(
 (kind='BOT_WELCOME' AND plan_id IS NULL AND command_id IS NULL AND inbox_id IS NOT NULL) OR
 (kind IN ('PLAN_NOTICE','REMINDER') AND plan_id IS NOT NULL AND command_id IS NOT NULL AND inbox_id IS NULL));
CREATE UNIQUE INDEX one_welcome_per_inbox_actor ON outbox(inbox_id,actor_id) WHERE kind='BOT_WELCOME';
-- Legacy pending notices have neither purpose nor expected revisions; do not send them as fresh asks.
UPDATE outbox SET state='CANCELLED',result_reason='LEGACY_NOTICE_REVIEW_REQUIRED' WHERE purpose='LEGACY' AND state IN ('READY','QUEUED','RETRY_WAIT');
CREATE TABLE search_contexts(
 id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES actors(id),kind text NOT NULL CHECK(kind IN ('PERSONAL','PLAN_PRIVATE')),
 plan_id uuid REFERENCES plans(id),revision integer NOT NULL DEFAULT 1 CHECK(revision>0),acl_revision integer NOT NULL DEFAULT 1,
 draft jsonb NOT NULL,hard jsonb NOT NULL,approval_id uuid,updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((kind='PERSONAL' AND plan_id IS NULL) OR (kind='PLAN_PRIVATE' AND plan_id IS NOT NULL)));
CREATE UNIQUE INDEX one_personal_context ON search_contexts(actor_id) WHERE kind='PERSONAL';
CREATE UNIQUE INDEX one_private_context ON search_contexts(actor_id,plan_id) WHERE kind='PLAN_PRIVATE';
CREATE TABLE search_approvals(id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES actors(id),session_id uuid NOT NULL REFERENCES app_sessions(id),context_id uuid NOT NULL REFERENCES search_contexts(id),body jsonb NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE search_issued_offers(id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES actors(id),session_id uuid NOT NULL REFERENCES app_sessions(id),approval_id uuid NOT NULL REFERENCES search_approvals(id),body jsonb NOT NULL,expires_at timestamptz NOT NULL);
CREATE TABLE catalog_occurrences(observation_id text PRIMARY KEY,provider_id text NOT NULL,event_id text NOT NULL,occurrence_id text NOT NULL,body jsonb NOT NULL,data_mode text NOT NULL CHECK(data_mode IN ('LIVE','SYNTHETIC')),updated_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE INDEX catalog_latest ON catalog_occurrences(provider_id,event_id,occurrence_id,updated_at DESC,observation_id DESC);
CREATE TRIGGER immutable_catalog_observation BEFORE UPDATE OR DELETE ON catalog_occurrences FOR EACH ROW EXECUTE FUNCTION immutable_row();
-- A browse receipt is not an approved AI search. It is a server-issued immutable choice, scoped to
-- the reader and current filter revision. It never implies a vote, membership or purchase.
CREATE TABLE catalog_choices(id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES actors(id),session_id uuid NOT NULL REFERENCES app_sessions(id),context_id uuid NOT NULL REFERENCES search_contexts(id),context_revision integer NOT NULL,observation_id text NOT NULL REFERENCES catalog_occurrences(observation_id),expires_at timestamptz NOT NULL,
 UNIQUE(actor_id,session_id,context_id,context_revision,observation_id));
CREATE INDEX search_approval_expiry ON search_approvals(expires_at);
CREATE INDEX catalog_choice_expiry ON catalog_choices(expires_at);
