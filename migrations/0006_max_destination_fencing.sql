-- Existing destinations predate source-time capture and remain unfenced until fresh evidence arrives.
ALTER TABLE inbox ADD COLUMN source_timestamp_ms bigint CHECK(source_timestamp_ms > 0);
ALTER TABLE destinations ADD COLUMN source_timestamp_ms bigint CHECK(source_timestamp_ms > 0);
