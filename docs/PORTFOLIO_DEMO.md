# Local portfolio demo

Prerequisites: Node.js 24.20.0, npm 11.19.0 and a running Linux Docker engine. Run `npm ci` first. The pinned PostgreSQL/Redis images must be available locally or downloadable on the first run. No MAX account, bot/webhook credentials, GigaChat credentials, production database or event provider is needed.

Start from the repository root:

```sh
npm run demo:portfolio
```

Open **http://127.0.0.1:3210**. The command builds the current UI, creates private disposable PostgreSQL/Redis containers on random loopback ports, applies existing migrations, seeds 48 synthetic occurrences with matching canonical/search projections, then starts the API on 127.0.0.1 and the existing BullMQ worker with TestTransport. Port 3210 must be free. Ctrl+C stops the children and removes only this invocation's containers/data. Saved items, plans and settings in this demo are disposable.

Home → Search → Event Detail → Save → Profile / Сохранённое → New Plan → Plan Detail → Friends / Profile use the existing application. A synthetic friend is pre-seeded. The normal signed exchange, session, Origin, CSRF, ownership and plan checks remain active. In New Plan choose future Moscow deadlines before the synthetic occurrence. No purchase, booking or real event availability is implied.

This is explicit local/test activation: `POVOD_OFFLINE_DEMO=1` is set only in child environments by the launcher. The API refuses production mode, non-test application mode, non-loopback origin/services, runtime-file inheritance, external AI and owner-preview activation. The ordinary production entry point does not enable the demo. There is no public owner-preview/login bypass endpoint. Ephemeral signing keys remain server-side; a synthetic launch goes through the existing HMAC-verifying session exchange. The offline HTML omits the remote MAX SDK and restricts connections to the same origin. Worker transport is the existing TestTransport; no MAX messages or AI/provider calls are made.

The historical v3 fixtures and real catalog are unchanged. Only separate `synthetic:povod-demo:portfolio-v1` records receive dates relative to startup. Their dates and sources are fictional and visibly labeled. The catalog uses the real clock; no expired real record is presented as a future event. Unknown prices/fees/ends remain unknown.

Automated smoke, with automatic teardown:

```sh
npm run demo:portfolio -- --smoke
```

This checks the same HTTP journey, 48 synthetic rows, six sport matches, session/Origin/CSRF guards, disabled AI, no owner-session endpoint, no remote SDK in HTML, and Redis/BullMQ worker registration. Ignored local logs are in `.run-evidence/stability-01/portfolio-*.log`; never publish private runtime logs automatically.

Full isolated integration acceptance (including historical 167 LIVE + 48 DEMO fixtures and present-day/expiry regressions):

```sh
npm run test:integration:isolated
```

The historical PowerShell entry point delegates to this platform-neutral command. It imports checked-in JSON only, starts no real provider, creates six fresh databases, runs every integration test, and removes its own containers afterward. The historical fixture clock is injected only into those fixture assertions; security/session/credential clocks remain real. Direct `npm run test:integration` requires all isolated database/environment setup and is not the fresh-install command.

The repository license decision remains **OWNER_REQUIRED**.
