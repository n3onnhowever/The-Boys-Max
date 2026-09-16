# Docker Desktop runbook (Windows)

Observed on 2026-09-16:
- Docker CLI and Compose are installed.
- `docker info` cannot connect to `dockerDesktopLinuxEngine`.
- `docker run --rm hello-world` cannot connect for the same reason.

For Docker-required tasks:
1. Start Docker Desktop manually.
2. Wait until Docker Desktop reports the engine running.
3. Run:
   ```powershell
   docker info
   docker run --rm hello-world
   ```
4. Only after both succeed may the task claim Docker runtime is available.

Do not automatically repair WSL, system services, Hyper-V, firewall, DNS or corporate policy as part of an application task. If Docker Desktop fails to start, open a separate environment-repair task with the exact error.
