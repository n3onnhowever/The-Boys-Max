-- A stopped bot or removed dialog revokes proactive delivery until newer personal evidence.
ALTER TABLE destinations ADD COLUMN active boolean NOT NULL DEFAULT true;
