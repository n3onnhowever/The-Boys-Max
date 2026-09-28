-- Keep each presentation revision's changed fields so an actor who missed
-- several updates sees the cumulative factual changes since their seen version.
CREATE TABLE plan_presentation_changes (
 plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
 version integer NOT NULL CHECK (version > 0),
 changed_fields jsonb NOT NULL,
 PRIMARY KEY (plan_id, version)
);
-- Earlier revisions were not stored by 0008. Preserve the latest known diff
-- without inventing unavailable older history.
INSERT INTO plan_presentation_changes(plan_id,version,changed_fields)
SELECT plan_id,version,changed_fields FROM plan_presentation;
