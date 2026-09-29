# RU HTTPS deployment and organizer attachment handoff

Status: **CONFIGURATION READY; PUBLIC DEPLOYMENT BLOCKED**. No public URL has been deployed or verified. No MAX settings, subscription, message, or Testograf form was changed.

## Authority and revision

- Requested base and clean worktree start: `797fef47a054164fc395705a57a322a0f00d5062`, `D:/Dev/Repos/The-Boys-Max-deploy`, branch `codex/delivery-ru-https`. The shared checkout had pre-existing changes and was left untouched.
- Read `AGENTS.md`, `docs/tasks/ACTIVE_TASK.md`, `docs/handoffs/P0_INTEGRATION_CHECKPOINT.md`, `docs/handoffs/INTEGRATION_T103_T104.md`, `docs/research/2026-09-20/ru-compliance/FASTEST_DEPLOYMENT.md`, `docs/handoffs/RU_INFRA_152FZ_RESEARCH.md`, MAX Mini App and token/TLS handoffs, and current Docker/Compose/config/asset paths. The latter research and MAX handoffs were read from the shared checkout because they are absent from the requested base; they were not copied into this branch.
- Queue remains BullMQ/Redis. Migrations 0001–0006, auth, UI, event data, bot identity, and scoped MAX TLS were not changed. `LIVE_GATE` remains empty in the example. T104 provider/data gate remains FAIL and Moscow is not activated.

## One concrete hosting path

Use the previously shortlisted **Timeweb Cloud Moscow Linux VM, 4 vCPU / 8 GB RAM / 80 GB NVMe, public IPv4**, with Docker Compose on that VM. Place the API, worker, PostgreSQL 18.6, Redis 8.2.9, and Caddy on it. This is one failure domain, suitable only for a bounded demo after the live gates are reviewed. Preserve power, billing, DNS, certificate renewal, and monitoring throughout judging. The 20 September assessment estimated **2.5–4k RUB/month including copies**, not a current quote or spending authority. Obtain a current provider quote and an approved limit before creating a paid resource. No custom domain or MAX Partners registration is required. A provider hostname is sufficient only if the operator controls it, it resolves to this VM, and a publicly trusted certificate can be issued for that exact hostname.

There is no authorized Russian host/account or public hostname in the supplied deployment inputs. No VM, DNS, CA certificate, backup location, or public HTTPS was created. The operator must supply:

1. Authorized Timeweb account or already owned Moscow VM access, billing approval/limit, reserved public IPv4, SSH access, and a **controlled DNS name or provider hostname** with A record and inbound TCP 80/443. If an existing authorized RU host is offered, first verify its region/capacity and use the same isolated project there.
2. Written provider/contract evidence for the VM **and its local Docker volumes, logs, certificate data, and every backup copy** staying in approved Russian regions; a separate RU backup destination and retention/access policy. This region claim is **BLOCKED_REGION**, not inferred from a product label.
3. Root-only runtime credentials: current bot token from the owner, separate generated session/escrow/webhook keys, one generated PostgreSQL password, exact existing bot username, `CREDENTIAL_SCOPE`, privacy/about/support URLs and legal/operator review. Do not put values in Git, build arguments, shell history, tickets, or reports.
4. Explicit review for `LIVE_GATE=REVIEWED_MAX26_LIVE`, provider/data admission and outbound hold policy. The current T104 gate fails. Hosting does not authorize live ingestion, MAX delivery, or real user data.

## Configuration and boundary

`compose.ru-https.yaml` has the fixed project name `povod-ru-https`; use `-p povod-ru-https` explicitly. The only public ports are Caddy 80/443. PostgreSQL and Redis have no published ports and share an internal network; API and worker also attach to an outbound network so the worker can reach the fixed MAX endpoint. Caddy proxies the Fastify API and Vite output from the API. Its access log is disabled because request URLs may contain sensitive query data. Docker JSON logs are rotated at 10 MiB × 3 per container. PG, Redis, Caddy certificate/config data use dedicated persistent volumes; verify their physical region on the selected VM. PostgreSQL and Redis images retain the accepted versions; all three third-party image references are digest pinned in the Compose file. `scripts/health-worker.cjs` checks worker access to PostgreSQL and Redis without logging credentials; a passing probe still does not prove external delivery.

The new Caddy image is `caddy:2.10.2-alpine@sha256:4c6e91c6ed0e2fa03efd5b44747b625fec79bc9cd06ac5235a779726618e530d`, from the [official image source](https://github.com/caddyserver/caddy-docker) (source revision reported by its OCI manifest: `272e3f8bf40120000fbd9deb4a9003892a8e7c5e`). [Caddy](https://github.com/caddyserver/caddy) and its image source are Apache-2.0; retain their upstream notices. No third-party source file or asset was copied into the repo. Existing Node, PostgreSQL, Redis and font licences/notices remain under the original release paths and dependencies.

The application reads a single JSON runtime file through `RUNTIME_FILE`; Compose mounts it read-only into API, worker and the one-shot migrator. On Linux, keep `/etc/povod/ru-https` root-owned mode 0750, `runtime.json` root:1000 mode 0440 (the Node image runs as UID/GID 1000), and `pg_password` root:root mode 0400 for the PostgreSQL entrypoint. Mount sources must be **absolute paths outside the checkout**. Docker administrators can still inspect container mounts; restrict Docker socket access to the operator. Generate credentials without printing them. The password in `DATABASE_URL` must be URL-encoded and match `pg_password`. Never use a Docker image build argument for secrets. `deploy/runtime.example.json` contains names/placeholders only; create the real file on the server and leave `LIVE_GATE` empty until reviewed. The committed MAX trust root is read by `max-tls.ts` for the fixed MAX request only; do not set global `NODE_EXTRA_CA_CERTS` or disable TLS verification.

## Server run sequence after inputs and approvals

Use a clean checkout at the **committed delivery SHA**. Install supported Docker/Compose from official packages, apply SSH key/firewall policy, and keep 80/443 reachable for Caddy certificate issuance and renewal. Source the four non-secret shell variables without storing credentials in shell history:

```sh
export POVOD_RUNTIME_FILE=/etc/povod/ru-https/runtime.json
export POVOD_PG_PASSWORD_FILE=/etc/povod/ru-https/pg_password
export PUBLIC_HOSTNAME=controlled-hostname.example
export POVOD_IMAGE=povod-ru-https:REVIEWED_GIT_SHA
git status --short
git rev-parse HEAD
npm ci --ignore-scripts
npm run typecheck && npm run test:unit && npm run build
docker build --build-arg SOURCE_SHA="$(git rev-parse HEAD)" --build-arg BUILD_TIMESTAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)" -t "$POVOD_IMAGE" .
docker compose -p povod-ru-https -f compose.ru-https.yaml config --quiet
docker compose -p povod-ru-https -f compose.ru-https.yaml up -d
docker compose -p povod-ru-https -f compose.ru-https.yaml ps --all
```

`up` waits for PostgreSQL/Redis health and successful forward-only migration before the API/worker, then API health before Caddy. Do not run `compose.yaml` test seeding or `compose.release.yaml` in this project. For an update, keep the prior image by digest, take and verify a backup, build a new immutable tag, run `up -d`, and confirm the migration ledger and health before changing external settings. No `down -v` or volume deletion on the live project.

## Smoke and readiness checklist

- [ ] DNS resolves to the approved RU IPv4; external `curl -I https://$PUBLIC_HOSTNAME/` succeeds with a public CA chain, matching SAN and HTTP→HTTPS redirect; verify renewal and TCP 443 over the judging period. Public URL is **NOT_VERIFIED** until this passes from an independent network.
- [ ] `docker compose -p povod-ru-https -f compose.ru-https.yaml ps --all` shows PG/Redis/API/Caddy healthy, migrator exit 0, worker running. `GET /health/live` proves process only; `GET /health/ready` proves PostgreSQL query and reports `outboundHold`. Neither proves MAX delivery, Redis reconciliation, browser support, or public TLS by itself.
- [ ] Through the **built release image and Fastify**, GET `/`, the JS/CSS named by its HTML, `/assets/fonts/Onest-Variable.ttf`, `/assets/events/home-hero.jpg`, and `/assets/brand/povod-icon-app.png`; compare content types and bytes. No Vite preview is part of release verification.
- [ ] Confirm private DB/Redis ports are absent from public `docker compose ps` and external scan. Inspect host firewall, Docker networks, volume locations, disk capacity, log retention, backups, and offsite RU storage receipt.
- [ ] With separate reviewed approval, verify MAX webhook secret rejection, durable ACK/idempotency, subscription state, fixed-host MAX TLS, worker/governor hold behavior, cookie/session and source links. Use synthetic identities and payloads; never print authorization headers, tokens, initData, webhook bodies, or query strings.
- [ ] Actual MAX Web, Android, and iOS launch/storage/link/share/viewport checks: **NOT_RUN**. Real client checks must be recorded individually after execution.

## Restart, backup, restore, rollback

Use the exact project name in every command. Routine restart: `docker compose -p povod-ru-https -f compose.ru-https.yaml restart api worker`, then inspect API readiness, worker status, outbound hold, queue reconciliation and unknown delivery outcomes. For a host reboot, Docker `unless-stopped` restarts persistent services; the migrator remains a one-shot service. Check its prior exit and run `up -d` with the same reviewed image if Compose needs to recreate it. Do not blindly resend UNKNOWN MAX attempts.

PostgreSQL is durable business truth. On the RU server, create a root-only backup directory, run `pg_dump -U povod -Fc` inside the PostgreSQL container to a temporary file, `docker cp` it to the protected directory, verify `pg_restore -l`, record timestamp/checksum/image/schema migration ledger, encrypt and copy it to the approved separate RU backup location. Back up Caddy certificate storage and Redis AOF volume with a provider-consistent snapshot; do not copy active PG data files as a logical backup. Test restore in a **different** Compose project with new volumes and synthetic data before accepting the procedure. Restore PostgreSQL with `pg_restore` into an empty test database, compare migration rows and known synthetic markers, then test API readiness. The local drill below did exactly this for six migrations and one marker. Production RU offsite backup and recovery time are **NOT_RUN/BLOCKED_REGION**. RPO ≤24 h and RTO ≤4 h are only proposed demo targets until measured.

Exact PG backup commands on the approved Linux host, from a root shell with the non-secret Compose variables above (the backup file contains private data and must never be attached to a ticket):

```sh
umask 077
backup_dir=/var/backups/povod-ru-https
install -d -m 0700 "$backup_dir"
pg_container=$(docker compose -p povod-ru-https -f compose.ru-https.yaml ps -q postgres)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
docker exec "$pg_container" pg_dump -U povod -Fc -f /tmp/povod-backup.dump povod
docker exec "$pg_container" pg_restore -l /tmp/povod-backup.dump >/dev/null
docker cp "$pg_container":/tmp/povod-backup.dump "$backup_dir/povod-$stamp.dump"
docker exec "$pg_container" rm -f /tmp/povod-backup.dump
sha256sum "$backup_dir/povod-$stamp.dump" >"$backup_dir/povod-$stamp.sha256"
```

For a restore drill, use a **synthetic** dump and synthetic runtime/password files with the same variable names, choose a new project name and start only its PostgreSQL service (never point this at the live volume):

```sh
restore_project=povod-ru-https-restore-drill
docker compose -p "$restore_project" -f compose.ru-https.yaml up -d --wait postgres
restore_container=$(docker compose -p "$restore_project" -f compose.ru-https.yaml ps -q postgres)
docker cp /protected/synthetic-only.dump "$restore_container":/tmp/restore.dump
docker exec "$restore_container" createdb -U povod povod_restore_test
docker exec "$restore_container" pg_restore -U povod -d povod_restore_test /tmp/restore.dump
docker exec "$restore_container" psql -U povod -d povod_restore_test -At -c 'SELECT count(*) FROM schema_migrations;'
```

The operator must also compare a known synthetic marker, run application readiness against the restored database, and measure elapsed recovery time. Keep the drill's volumes until its evidence is reviewed; remove only that named project after confirming it holds no real data.

Rollback: stop new ingress and worker processing under an approved hold, retain the database and backup, and redeploy the prior recorded application **image digest** only if its code supports the already applied forward schema. Recheck `/health/ready`, worker/governor epoch, pending outbox and UNKNOWN outcomes before release. Never reverse migrations or restore older data over current live data automatically. A schema-incompatible rollback requires a reviewed forward repair and isolated restore test.

After compatibility review, the rollback command is `export POVOD_IMAGE=povod-ru-https@sha256:REVIEWED_PRIOR_IMAGE_DIGEST` followed by `docker compose -p povod-ru-https -f compose.ru-https.yaml up -d --no-deps api worker`. The prior digest must be recorded **before** deployment. This does not roll back data or migrations.

## Actual verification at this checkpoint

All commands below used the requested worktree. Docker used only the uniquely named **`povod-ru-https-verify`** project with randomly generated synthetic runtime values in ignored `.runtime/`; those values were never printed. This was local Docker Desktop, **not** a Russian server or public HTTPS.

`artifacts/deployment/CHECKS.json` records the exact final check commands, exit codes, UTC receipt time, SHA-256 hashes of the six deployment source/config files and the seven saved logs in `artifacts/deployment/logs/`. A direct comparison against every synthetic credential found zero values in source/config/report/log files.

| Check | Result |
|---|---|
| `npm.cmd ci --ignore-scripts` | exit 0 |
| `npm.cmd run typecheck` | exit 0 after correcting a TypeScript indexed lookup |
| `npm.cmd run test:unit` | exit 0; 269/269 |
| `npm.cmd run build` | exit 0; Vite release output generated |
| `docker compose -p povod-ru-https-verify -f compose.ru-https.yaml -f .runtime/verify.override.yaml config --quiet` | exit 0 |
| `docker build ... -t povod-ru-https:verify-797fef4 .` | exit 0; release stage built, no secret build args |
| Synthetic `up -d postgres redis migrate api worker` | exit 0; all four long-running containers up, PG/Redis/API healthy, migrations 0001–0006 applied |
| Fastify release GET `/`, font, image, traversal, readiness | 200 HTML, 200 `font/ttf`, 200 `image/jpeg`, 404 traversal, 200 readiness; font/image bytes matched the local Vite build by SHA-256 |
| `caddy validate --config /etc/caddy/Caddyfile` in pinned image | exit 0; config valid; image contains `wget` for healthcheck |
| Synthetic PG `pg_dump -Fc` → new `povod_restore_test` database with `pg_restore` | exit 0; one synthetic marker and all six migration rows recovered |
| Scoped PG/Redis/API/worker restart | exit 0; API readiness 200; PG/Redis/API healthy and worker running after restart |
| Synthetic image switch and rollback: `up -d --no-deps api worker` from `verify-797fef4` → `verify-candidate` → `verify-797fef4` | exit 0; running API image ID matched original, readiness 200, synthetic restore marker retained; the candidate differed only in its image label, so this proves orchestration, not schema compatibility of a different code release |
| Final Docker build `povod-ru-https:verify-final`, scoped API/worker recreation and worker dependency health probe | exit 0; worker health `healthy`, explicit probe exit 0, built Fastify nested font 200 `font/ttf` |

The verification images were built before the delivery commit and have synthetic/test revision labels for local testing only. Build a fresh image from the final committed SHA on the selected RU host. The `caddy validate` check did not request a public certificate. No Docker service from another project was stopped or modified.

**NOT_RUN / blockers:** Public RU host, domain/provider hostname, DNS, 443 and certificate, RU storage/log/backup location checks, real credential loading, live gate, provider admission, MAX webhook/subscription, external delivery, Testograf submission, and MAX Web/Android/iOS. Reproduce external checks from the approved host using the run sequence and smoke checklist above; record region and restore evidence before declaring ready.

## Organizer attachment handoff (after URL verification and explicit review)

The organizer FAQ requires a public HTTPS URL for full MAX testing. The organizers attach **the URL submitted through their Testograf form**. The owner should review the tested exact URL and then submit it through that form; no MAX Partners registration or custom domain is needed. Do not alter the issued bot name, username, avatar, or administrative settings. Keep the service available for all judging.

Suggested Testograf text, replacing the bracketed URL only after external HTTPS and MAX smoke pass:

> Команда The Boys, приложение «Повод». Просим прикрепить к выданному нам боту MAX мини-приложение по адресу **[https://проверенное-имя-хоста/]**. Адрес доступен по публичному HTTPS и будет поддерживаться в течение всего периода оценки. Просим не менять выданные имя, username, аватар и административные настройки бота.

Before submission, the owner records the exact URL, external TLS/asset checks, current bot identity, and form receipt. A reviewed, separately authorized operator may then perform any required MAX webhook/attachment configuration and verify the resulting subscriptions. No such external action was performed in this task.

## Contract delta and next manual action

The only application-serving change is Fastify serving allowlisted nested release assets (fonts/images as well as JS/CSS). It rejects non-asset paths and traversal. A worker dependency probe was added to the release image. No auth, data, API business response, UI semantics, business route contract, migration, queue, or MAX identity change was made.

**Next manual action:** designate the authorized Timeweb Moscow account/VM and controlled hostname, approve a current spending cap and RU backup/log region evidence, then supply root-only runtime inputs and close the live/data/legal gates. Build the final committed image on that host, verify external HTTPS and the smoke matrix, then obtain explicit review before the organizer submits the exact URL through Testograf.
