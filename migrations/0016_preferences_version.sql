-- Version zero also represents an absent row. First successful write is version one.
ALTER TABLE actor_preferences ADD COLUMN version integer NOT NULL DEFAULT 0 CHECK (version >= 0);
