# Real catalog provenance

`real-catalog/` contains the bounded source receipts, reviewed sport registry input, and source hash inventory retained from the catalog review. The historical `source-hashes.json` records paths at the time the receipts were produced; they were relocated from `artifacts/real-catalog/` without changing receipt bytes. The exact curated Darwin fixture was moved to `tests/fixtures/real-catalog/curated-official-v1.json`; its SHA-256 matches the runtime import file at `scripts/data/curated-official-v1.json`. Removed historical documents remain recoverable from the `povod-pre-final-cleanup` tag.

These receipts support individual reviewed records. They are not blanket approval for a provider, future dates, images, advertising material, or reuse beyond documented rights.
