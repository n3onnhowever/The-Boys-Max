# T001B — Codex environment bridge diagnosis

Date: 2026-09-16
Authority read: `AGENTS.md`, `docs/current/PROJECT_STATE.md`, `docs/handoffs/T001_ENVIRONMENT_BASELINE.md`
Environment: Codex PowerShell 7.6.5, process identity `desktop-u6o4q2o\codexsandboxonline`

No application or system configuration was modified. No PATH/profile/Git configuration was persisted.

## Process environment

- `USERPROFILE`: `C:\Users\admin`
- `LOCALAPPDATA`: `C:\Users\admin\AppData\Local`
- PATH contains the curated Codex Node runtime (`...\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin`), system Git (`C:\Program Files\Git\cmd`), a native Codex Git fallback, and a user Docker candidate (`C:\Users\admin\AppData\Local\Programs\DockerDesktop\resources\bin`).
- PATH does not resolve `fnm`, `npm`, or `docker`.

## Diagnostic table

| component | host known-good | Codex default | Codex temporary/direct-path test | classification |
|---|---|---|---|---|
| Node | `v24.20.0` | `v24.19.0`, bundled runtime | No fnm environment available; bundled Node fetch returned HTTP 200 for GitHub and npm | `OTHER` (runtime version drift; network works in Node) |
| npm | `11.19.0`, `npm ping` PASS | command not found | fnm absent, so no temporary npm test possible | `PATH_NOT_INHERITED` |
| fnm | host facts imply host-managed toolchain, exact host path not supplied | `Get-Command`/`where.exe` found nothing | `$LOCALAPPDATA\fnm` absent; candidate WinGet directory yielded no accessible `fnm.exe`; `fnm --version/current/list` NOT_RUN | `FNM_ENV_NOT_LOADED` |
| PowerShell HTTPS | PASS to GitHub/npm | `Invoke-WebRequest -Method Head` failed: SSL connection could not be established | Node fetch independently returned HTTP 200 for both URLs | `TLS_SCHANNEL_ONLY` |
| GitHub transport | `git ls-remote` PASS | Schannel failed with `SEC_E_NO_CREDENTIALS (0x8009030e)` | `git -c http.sslBackend=openssl ls-remote https://github.com/NekoTheDev/EventHive.git HEAD` PASS; HEAD `2c1d44453ed3a159134e01a35cce877c5ea2cef0` | `TLS_SCHANNEL_ONLY` |
| Git | `2.55.0.windows.3` | `2.55.0.windows.3`, resolved from `C:\Program Files\Git\cmd\git.exe` | OpenSSL backend succeeds command-locally | `TLS_SCHANNEL_ONLY` |
| Docker CLI | `29.7.2` | command not found | `C:\Program Files\Docker\Docker\resources\bin\docker.exe` absent; user Docker candidate in PATH was inaccessible; no direct invocation possible | `PATH_NOT_INHERITED` |
| Docker Compose | `v5.5.1` | unavailable because Docker CLI is unresolved | direct standard-path test NOT_RUN (executable absent) | `PATH_NOT_INHERITED` |
| Docker daemon | host known to be stopped | not testable | `docker info` not executable; daemon was not started | `DOCKER_DAEMON_DOWN` |

## Exact observations

Identity and shell:

```text
desktop-u6o4q2o\codexsandboxonline
PowerShell 7.6.5
```

Tool resolution found:

```text
node.exe  C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe
git.exe   C:\Program Files\Git\cmd\git.exe
```

`C:\Program Files\Git` exists. `C:\Program Files\Docker\Docker\resources\bin` and `$LOCALAPPDATA\fnm` were absent. Access to `$LOCALAPPDATA\fnm_multishells` and the user Docker candidate directory was denied by the Codex sandbox, so their contents were not inferred.

## Interpretation

The discrepancy has two independent causes:

1. The Codex process receives a curated runtime PATH and bundled Node, so the host’s npm/fnm-managed Node and Docker command resolution are not inherited.
2. PowerShell/.NET and default Git use the Windows Schannel path, which fails in this process with `SEC_E_NO_CREDENTIALS`; Node’s independent TLS stack works, and Git’s command-local OpenSSL backend works.

This is not evidence that the host tools or network are absent. It is evidence of a process-environment bridge gap plus a Schannel-only failure in Codex.

## Checks not run / blocked

- fnm version/current/list and temporary fnm shell: `FNM_ENV_NOT_LOADED` because fnm was not resolvable.
- npm version/ping: `PATH_NOT_INHERITED` because npm was not resolvable.
- Docker direct commands: `PATH_NOT_INHERITED`; standard executable absent. No Docker Desktop start or daemon repair attempted.
- Git default command: failed only under Schannel; OpenSSL command-local override passed.
- Repository Git status/baseline remains unavailable because this extracted directory is not a Git repository.

## Contract deltas

None.

## Residual risks and next concrete action

Host-native npm/Docker operations and PowerShell HTTPS checks cannot be assumed runnable from the Codex shell. If needed, use an explicitly approved local wrapper/bridge that resolves host tools without persisting configuration, or execute those checks on the host PowerShell environment. Do not modify system TLS, PATH, profiles, Git config, Docker, WSL, Hyper-V, DNS, firewall, proxy, or VPN settings.

## Runtime classification

**B. CODEX_RUNTIME_PARTIALLY_RECOVERABLE** — Node network access and Git HTTPS are usable with the existing runtime / command-local OpenSSL override, but npm and Docker require host-tool bridging or host execution.
