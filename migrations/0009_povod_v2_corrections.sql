-- Presentation changes that alter meeting logistics require a response to the current version.
ALTER TABLE plan_presentation ADD COLUMN reconfirm_version integer NOT NULL DEFAULT 0;
ALTER TABLE plan_rsvps ADD COLUMN reconfirm_version integer NOT NULL DEFAULT 0;
ALTER TABLE in_app_notifications ADD COLUMN actor_context_id uuid REFERENCES actors(id) ON DELETE SET NULL;
CREATE INDEX in_app_notifications_plan_recipient ON in_app_notifications(plan_id,actor_id,kind);
