-- Plan presentation belongs to the plan. Source occurrence facts remain in the canonical plan option.
ALTER TABLE actor_preferences ADD COLUMN preferred_time text NOT NULL DEFAULT 'ANY'
 CHECK (preferred_time IN ('ANY','MORNING','DAY','EVENING','NIGHT'));
CREATE TABLE plan_presentation (
 plan_id uuid PRIMARY KEY REFERENCES plans(id) ON DELETE CASCADE,
 version integer NOT NULL DEFAULT 1,
 title text NOT NULL,
 meeting_time timestamptz,
 meeting_point text,
 note text,
 participant_limit integer,
 changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
 changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (char_length(title) BETWEEN 1 AND 160),
 CHECK (participant_limit IS NULL OR participant_limit BETWEEN 1 AND 50)
);
CREATE TABLE plan_presentation_seen (
 plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
 seen_version integer NOT NULL,
 PRIMARY KEY (plan_id, actor_id)
);
CREATE TABLE plan_rsvps (
 plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
 actor_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
 state text NOT NULL CHECK (state IN ('YES','MAYBE','NO')),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (plan_id, actor_id)
);
CREATE TABLE friend_links (
 token_hash text PRIMARY KEY,
 actor_id uuid NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL
);
