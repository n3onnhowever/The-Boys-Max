CREATE TABLE actor_preferences (
 actor_id uuid PRIMARY KEY REFERENCES actors(id) ON DELETE CASCADE,
 city text NOT NULL DEFAULT 'Москва',
 interests text[] NOT NULL DEFAULT '{}',
 budget_rub integer,
 radius_km integer NOT NULL DEFAULT 15,
 notifications_enabled boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (budget_rub IS NULL OR budget_rub BETWEEN 0 AND 1000000),
 CHECK (radius_km BETWEEN 1 AND 100)
);
CREATE TABLE friendships (
 requester_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
 recipient_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
 state text NOT NULL CHECK (state IN ('PENDING','ACCEPTED')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(requester_id,recipient_id),
 CHECK (requester_id<>recipient_id)
);
CREATE TABLE plan_messages (
 id uuid PRIMARY KEY, plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES actors(id), body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX plan_messages_recent ON plan_messages(plan_id,created_at,id);
CREATE TABLE in_app_notifications (
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
 kind text NOT NULL, title text NOT NULL, plan_id uuid REFERENCES plans(id) ON DELETE CASCADE, invite_ref text,
 read_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX in_app_notifications_recent ON in_app_notifications(actor_id,created_at DESC);
