# Known gaps / gates

## Runtime
- Docker CLI exists but Docker Desktop Linux daemon is not running.
- End-to-end API + PostgreSQL + Redis/BullMQ + worker has not yet been accepted on the final merged tree.
- Live MAX bot/mini-app verification has not yet been completed on the final tree.

## Integration
- Result 26 is the current baseline but does not yet contain all later valid deltas from 27/29/30.
- Root dependency/lockfile and clean-install/build evidence must be regenerated in the working Windows environment.
- Re-run regressions for past events, canonical price, geo projection, cancellation expiry, and UI↔API adapters after merge.

## Visual
- Real donor runtime screenshots were not produced in ChatGPT sandbox due DNS restrictions.
- User approval of the visual direction is still pending.

## Events/maps
- ChatGPT sandbox could not reach KudaGo/Timepad. Live provider probes and real map runtime remain to be executed locally.
- OSM public tile servers must not be assumed to be a guaranteed production CDN.

## AI
- Local adapter/eval harness exists.
- No provider/model may be declared selected until legal/access/zero-budget conditions and real benchmark calls are satisfied.
- API credentials must remain outside repository/chat.

## Submission
- Final Docker build under the official 5-minute constraint not yet measured.
- Final OpenAPI/DATA-API package, live HTTPS endpoint, web/mobile MAX checks, frozen commit/archive checksum, and technical slide require final acceptance evidence.
