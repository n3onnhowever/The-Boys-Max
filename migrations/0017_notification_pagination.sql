-- Match the complete keyset ordering, including timestamp ties.
CREATE INDEX in_app_notifications_actor_cursor ON in_app_notifications(actor_id,created_at DESC,id DESC);
