# POVOD final catalog artwork / presentation data polish

## Inputs and revision

- Owner ticket: final catalog artwork polish on `codex/catalog-showcase`, expected and verified source HEAD `41bb9b206d4ac309ee13ab769f1d1ef091fbe125`.
- Remote `origin/codex/catalog-showcase` and PR #1 both pointed to that SHA before editing. Work was isolated in a clean managed worktree; the unrelated main checkout with pre-existing changes was left untouched.
- Starting evidence: `category-artwork.ts` returned OTHER whenever `categoryLabel.includes(',')`; `packages/persistence/ui.ts` joined canonical categories into comma-separated Russian labels. The pre-existing unit test explicitly expected `categoryArtwork('Другое, Театр')` to return OTHER. Home, Search, Detail and Saved all called that label resolver.

## Contract and artwork rule

- `EventCardView.artworkCategory` is a required canonical presentation key (`CINEMA | THEATRE | CONCERT | MUSEUM | SPORT | OUTDOOR | VOLUNTEER | OTHER | null`), emitted alongside the localized display label and validated at the UI port schema. `null` means no known category.
- The domain has no primary category field. For a set of categories, the fixed priority is `CINEMA > THEATRE > CONCERT > MUSEUM > SPORT > OUTDOOR > VOLUNTEER > OTHER`. Provider array order, translated copy, search filter selection, reload and session do not affect it. An unknown nonempty category value raises `UNKNOWN_ARTWORK_CATEGORY` rather than silently becoming OTHER.
- Search, Home and Event Detail consume the key. Saved and Saved Detail derive the same key from canonical `OccurrenceView.categories`. Design fixtures keep their previously approved explicit assets. Runtime Plans carry no canonical category in plan terms and retain their existing calendar treatment.
- All mapped URLs are first-party local editorial illustrations. None is claimed to be a source event poster. There is no random choice or remote provider image URL.

| Canonical category | Local asset | Note |
|---|---|---|
| CINEMA | `category-cinema.png` | Dedicated |
| THEATRE | `category-theatre.png` | Dedicated |
| CONCERT | `category-concert.png` | Dedicated; dark atmospheric concert fixture art also retained |
| MUSEUM | `category-museum.png` | Dedicated |
| SPORT | `category-sport.png` | Dedicated |
| OUTDOOR | `category-outdoor-v2.png` | Dedicated |
| VOLUNTEER | `category-other-v2.png` | **ASSET_MISSING_VOLUNTEER**: explicit temporary editorial fallback with a distinct honest alt text |
| OTHER or no known category | `category-other-v2.png` | Explicit generic category or unknown-category fallback |

The supplied approved set has no volunteer-specific image. `for-you-concert.jpg`, `for-you-gallery.jpg`, `for-you-club.jpg`, `nearby-dance.jpg` and `home-hero.jpg` remain used by design fixtures where appropriate; none depicts volunteering. All 12 event-art files have matching SHA-256 before and after in `artifacts/catalog-artwork/asset-hashes.json`. No artwork was removed, recompressed, downloaded or generated.

## Catalog, filters and parity

- Database backed integration confirms **167 LIVE exact** and **48 labeled SYNTHETIC exact** occurrences. The unfiltered Search DTO remains capped at 200 results; that cap does not change the stored totals or provenance.
- Unit parity checks all 48 v3 Demo records, six per category, across Home, Search, Detail, Saved and Saved Detail, and checks each asset path exists. Database backed integration checks five actual stored records per category across Search, Detail, Saved and Saved Detail (40 checks). Multi-category permutations and unknown-category rejection are covered.
- Browser API filter results: Cinema 19, Theatre 56, Concert 48, Museum 31, Sport 6, Outdoor 6, Volunteer 6, Other 43; Free 12, ≤500 18, ≤1000 25, ≤2000 34; Morning 12, Day 70, Evening 96, Night 8; category + budget 3, date + category 2, text + category 19. Every response was HTTP 200 and nonempty in the isolated test catalog.

## Verification and evidence

Commands used synthetic session credentials and isolated PostgreSQL databases on `127.0.0.1:55491`, Redis on `127.0.0.1:56390`; environment values were not printed. The required integration variables were `RUN_MAX23_INTEGRATION`, `DATABASE_URL`, `T105_TEST_DATABASE_URL`, `REAL_CATALOG_TEST_DATABASE_URL`, `P0_SAVE_TEST_DATABASE_URL`, `DEMO_TEST_DATABASE_URL`, and `SHOWCASE_TEST_DATABASE_URL`.

| Check | Result | Evidence |
|---|---|---|
| `npm.cmd run typecheck` | Exit 0 | `.run-evidence/catalog-artwork/typecheck-final.log`, SHA-256 `77b580ef6a7590b980532ab86dcfb2a4a00ce0c477fd7a0459461fad734e6e46` |
| `npm.cmd run test:unit` | Exit 0, 330/330 | `.run-evidence/catalog-artwork/unit-final.log`, SHA-256 `f6ed9b4f98d8ad70ff0c54b4e005222bdfbe1de8f6769127e0078d2586ffa5d6` |
| `npm.cmd run build` | Exit 0 | `.run-evidence/catalog-artwork/build-final.log`, SHA-256 `a80c250dbae17b4d96872c39953c99efd9a2752bb5fe6feeeda81b622fc4988f` |
| `npm.cmd run test:integration` | Exit 0, 100/100 | `.run-evidence/catalog-artwork/integration-final.log`, SHA-256 `1e808b0bf64ae20de3cd1d5dfd34e0fe1f81e0a407cd093ea431913e4f0499a0` |
| `node --experimental-strip-types scripts/showcase-browser.mjs` | Exit 0; 18 captures, zero browser exceptions | `.run-evidence/catalog-artwork/browser-final.log`, SHA-256 `68da27a7678c257bb6e92fab49a5c9360715fc93437624e3856e807c8f78647d` |
| `node scripts/verify-catalog-artwork-assets.mjs` | PASS; 12/12 SHA-256 unchanged | `artifacts/catalog-artwork/asset-hashes.json` |
| `git diff --cached --check`, staged secret/prohibited-file scan, `git status --short --branch` | Exit 0; 24 intended staged paths, zero prohibited paths, zero secret-pattern files | Final staged review |

`artifacts/catalog-artwork/source-hashes.json` ties the changed source and tests to these runs. `artifacts/catalog-artwork/screenshots.json` records SHA-256 and 390×844 dimensions for all 18 captures. Browser checks assert local image URLs, zero broken visible images, zero owner-preview markers, no remote image requests, and a stable first-card `src` from first DOM insertion through settling. Screenshots include all events, seven requested categories plus OTHER, three representative Details, and a mixed Theatre/Cinema/Volunteer Saved view. The Detail CTA is fully visible. The old `concerts.png` capture remains as historical evidence; current concert evidence is `concert.png`.

Offline integration covers existing Smart Occasion/GigaChat contract behavior, MAX auth/webhooks/startapp/share transport paths, Plans, Friends, Notifications and Save. External GigaChat and MAX calls, production Amvera state, and deployment were **NOT_RUN**; those require separate production access and are not inferred from local tests. No database migrations or catalog records were edited.

## Risks and next action

- **ASSET_MISSING_VOLUNTEER** remains an editorial asset gap. A separately approved volunteer image can replace the explicit fallback later.
- New unrecognized category codes fail visibly instead of receiving a misleading OTHER illustration; a new category requires an explicit artwork decision and DTO/schema update.
- PR #1 is to be updated by pushing one result commit to `codex/catalog-showcase`. Do not merge or deploy as part of this ticket. Existing Amvera release gates in `POVOD_CATALOG_SHOWCASE_RELEASE_PREP.md` remain in force.
