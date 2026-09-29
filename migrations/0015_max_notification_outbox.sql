ALTER TABLE outbox DROP CONSTRAINT outbox_kind_check;
ALTER TABLE outbox ADD CONSTRAINT outbox_kind_check CHECK(kind IN
 ('PLAN_NOTICE','BOT_WELCOME','REMINDER','PLAN_INVITE','RECONFIRMATION','RECOMMENDATION'));
ALTER TABLE outbox DROP CONSTRAINT outbox_scope_check;
ALTER TABLE outbox ADD CONSTRAINT outbox_scope_check CHECK(
 (kind='BOT_WELCOME' AND plan_id IS NULL AND command_id IS NULL AND inbox_id IS NOT NULL) OR
 (kind IN ('PLAN_NOTICE','REMINDER','PLAN_INVITE','RECONFIRMATION') AND plan_id IS NOT NULL AND inbox_id IS NULL) OR
 (kind='RECOMMENDATION' AND plan_id IS NULL AND command_id IS NULL AND inbox_id IS NULL));
ALTER TABLE outbox ADD COLUMN notification_key text;
ALTER TABLE outbox ADD COLUMN invite_ref text;
ALTER TABLE outbox ADD COLUMN semantic_revision integer;
ALTER TABLE outbox ADD COLUMN event_ref char(32);
CREATE UNIQUE INDEX outbox_notification_key ON outbox(notification_key) WHERE notification_key IS NOT NULL;
