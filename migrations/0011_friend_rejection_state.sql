-- A rejected friendship remains a durable result so reject retries are idempotent.
-- The 0010 unordered-pair unique index continues to guard every state.
ALTER TABLE friendships DROP CONSTRAINT friendships_state_check;
ALTER TABLE friendships ADD CONSTRAINT friendships_state_check
 CHECK (state IN ('PENDING','ACCEPTED','REJECTED'));
