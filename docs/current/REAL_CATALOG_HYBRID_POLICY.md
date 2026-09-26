# Real catalog hybrid policy (hackathon)

`APP_MODE=hybrid` is an explicit operator selection. It requires `DEMO_CATALOG_VERSION=v1` and the existing live release gate; it does not activate KudaGo or change Moscow Gate v2. The operator runs migrations, imports reviewed first-party factual records, and seeds demo records as separate commands. Startup and failed provider calls never seed or switch modes.

Search first evaluates admitted `LIVE` canonical Occurrences whose source is `APPROVED` and whose source link matches the accepted canonical record. If fewer than six real results pass the current filters, Search appends the six versioned demo candidates that also pass those filters. Real results retain their exact official source link and label. Demo cards retain `Демо-каталог`; the catalog notice explains that examples may appear. Save uses canonical occurrence IDs and keeps real and synthetic source identities separate. A source whose rights review has expired is excluded by the existing rights check.

KudaGo remains provider-wide `NOT_APPROVED`: its public API terms require direct indexable links and prohibit reuse of marked advertising material with third-party tokens. The API probe did not establish a reliable advertising discriminator. The current implementation stages KudaGo data only; no KudaGo source is registered for live admission. Movie showing IDs, their price strings, and nearest movie/place source evidence can be mapped, but all observed showings remain quarantined pending exact manual review. The full Gate v2 decision stays `FAIL`.

An exact KudaGo manual admission receipt can be evaluated in staging only when it binds provider event ID, exact source URL, response hash, review time, page review hash, and explicit factual-display approval. Any explicit ad/ERID evidence overrides that receipt and quarantines the record. This does not enable a KudaGo publisher or promote the full provider gate.

`import:curated-official` accepts only a versioned JSON, CSV, or ICS operator file with stable identity, exact sessions, official source URL and owner, reviewed timestamp, source hash, and rights note. The checked-in v1 file uses only factual title, schedule, venue, and quoted admission amount from official Darwin Museum pages. Descriptions and images are not copied. The museum site restricts reuse of its materials to noncommercial use; the imported material is factual metadata, and any broader content use requires separate rights review. The source hashes and bounded receipts are under `artifacts/real-catalog/source-receipts/`.

The import defaults to the two Darwin Museum hostnames. To admit another reviewed first-party host, the operator supplies its exact hostname through `CURATED_SOURCE_HOSTS` and its browser origin through `ALLOWED_SOURCE_ORIGINS`; the record still needs an individual source receipt and rights note. This expands the operator allowlist, not a crawler or provider-wide approval.

`import:moscow-sport` accepts reviewed EKP registry rows. The selected April 24 revision lists October date ranges, not exact sessions. Those rows create canonical Events with zero Occurrences and therefore do not enter Search or Save. They do not imply spectators may attend or admission is free. The downloaded PDF hash and reviewed page image are retained as bounded receipts.

For a real source button in the miniapp, configure `ALLOWED_SOURCE_ORIGINS=https://www.darwinmuseum.ru` (plus any other independently reviewed origins). The existing `ExternalLink` renders an ordinary anchor without `nofollow` or `noindex`; no public unauthenticated POVOD event detail URL exists in this runtime. A new public detail page would need the same direct link treatment before KudaGo data could be displayed there.

Operator commands after an isolated PostgreSQL 18.6 database has migrations 0001–0006:

```text
npm run import:curated-official -- artifacts/real-catalog/curated-official-v1.json
npm run import:moscow-sport -- artifacts/real-catalog/sport-ekp-2026-reviewed.json
npm run seed:demo
```

`DATABASE_URL` and the existing runtime settings are supplied outside the repository. The curated and sport commands were executed against the isolated PostgreSQL 18.6 verification database on 2026-09-26. It contains four accepted curated Events and five exact Occurrences, plus three accepted sport registry Events with no Occurrences. The test database is verification evidence, not a deployed catalog. KudaGo remains quarantined.
