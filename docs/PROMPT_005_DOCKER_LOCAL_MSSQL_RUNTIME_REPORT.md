# Prompt #005 — Docker + Docker Compose + Local MSSQL Runtime

## 1. Objective

Add a local Docker development stack (NestJS API + MSSQL) with persistent storage, health checks, deterministic startup ordering, idempotent database creation, and container networking via Compose service DNS. Validate real NestJS ↔ MSSQL connectivity and migration CLI access against the Docker MSSQL instance.

## 2. State Inherited From Prompt #004

- TypeORM 0.3.x + `@nestjs/typeorm` 11.x with `mssql` driver
- `synchronize: false`, `migrationsRun: false`
- Shared options factory + CLI `DataSource` (`src/database/data-source.ts`)
- Migration scripts in `package.json`; empty `src/database/migrations/`
- Snake_case naming strategy; migration table `typeorm_migrations`
- E2e tests isolated from DB via `InfrastructureTestAppModule`
- `.env.example` DB vars; Joi validation in `env.validation.ts`
- No business entities/tables
- Live MSSQL connectivity intentionally deferred until Prompt #005

## 3. Docker Strategy

### Dockerfile stages

| Stage | Purpose |
|-------|---------|
| `base` | `node:22.23.1-bookworm-slim`, `WORKDIR /app` |
| `development` | `npm ci`, full source copy, `USER node`, `CMD npm run start:dev` |
| `build` | `npm ci` + `npm run build` → `dist/` |
| `production` | `npm ci --omit=dev`, copy `dist/`, `USER catechism`, Node-based `HEALTHCHECK`, `CMD node dist/main.js` |

### Local dev behavior

- Compose `api` service builds `target: development`
- Bind-mount project root to `/app`
- Named volume `api-node-modules` isolates Linux container `node_modules` from the Windows host
- NestJS watch mode via `start:dev`
- `DB_HOST=mssql` overridden in Compose (not hard-coded in application code)

### Production build behavior

- Multi-stage build produces a minimal runtime image without devDependencies
- Non-root `catechism` user
- Built-in Node `fetch` health check on `GET /api/v1/health`
- No `.env`, `docs/`, or git metadata in image context (`.dockerignore`)

### Node image/tag

- **`node:22.23.1-bookworm-slim`** — exact patch pin matching project `engines.node`

## 4. Files Created

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage dev/build/production API image |
| `.dockerignore` | Exclude secrets, build artifacts, docs from image context |
| `docker-compose.yml` | `mssql`, `mssql-init`, `api` services + volumes |
| `docker/mssql/init/create-database.sh` | Idempotent `DB_NAME` creation via `sqlcmd` |
| `docker/mssql/healthcheck.sh` | MSSQL health check using `sqlcmd` (tools18 with `-C` fallback) |
| `.gitattributes` | Enforce LF for `*.sh` (CRLF safety on Windows) |

## 5. Files Modified

| File | Change |
|------|--------|
| `.env.example` | SQL Server–compliant password placeholder; `MSSQL_PUBLISH_PORT=14330`; Docker networking notes |

No application source changes were required — existing TypeORM/config already supports env-driven `DB_HOST`.

## 6. Docker Compose Architecture

```
┌─────────────┐     healthy      ┌──────────────┐    success     ┌─────────────┐
│   mssql     │ ───────────────► │  mssql-init  │ ─────────────► │     api     │
│  (1433)     │                  │  (one-shot)  │                │  (3000)     │
└─────────────┘                  └──────────────┘                └─────────────┘
      │                                                                 │
      │ volume: mssql-data                                              │ volume: api-node-modules
      ▼                                                                 ▼
 /var/opt/mssql                                                   /app/node_modules
```

**Services**

1. **`mssql`** — Microsoft SQL Server 2022; persistent named volume; published host port
2. **`mssql-init`** — waits for MSSQL health, creates `DB_NAME` if missing, exits 0
3. **`api`** — NestJS dev container; depends on `mssql-init` completion; connects to `mssql:1433`

**Project name:** `catechism-api` (Compose `name:`)

## 7. MSSQL Image

| Setting | Value |
|---------|-------|
| Image | `mcr.microsoft.com/mssql/server:2022-CU18-ubuntu-22.04` |
| Edition | `MSSQL_PID=Developer` |
| EULA | `ACCEPT_EULA=Y` |
| SA password | `${DB_PASSWORD}` from local `.env` (single source of truth) |

**Why this tag:** Pinned CU release on Ubuntu 22.04 — avoids floating `latest`, includes **`/opt/mssql-tools18/bin/sqlcmd`** with `-C` (trust server certificate) support for local dev.

## 8. Local Environment Variables

Documented in `.env.example` (names only):

| Variable | Role |
|----------|------|
| `NODE_ENV` | Application environment |
| `PORT` | API listen + host publish port |
| `SWAGGER_ENABLED` | Swagger UI toggle |
| `DB_HOST` | `localhost` for host tools; Compose overrides to `mssql` for API |
| `DB_PORT` | `1433` (container internal) |
| `DB_NAME` | Application database name |
| `DB_USER` | Local dev login (`sa` for foundation) |
| `DB_PASSWORD` | Shared by MSSQL SA + NestJS + migration CLI |
| `DB_ENCRYPT` | TLS encryption flag |
| `DB_TRUST_SERVER_CERTIFICATE` | Trust self-signed cert in local Docker |
| `MSSQL_PUBLISH_PORT` | Host-side MSSQL port (default `14330`) |

Compose-only interpolation (not app config): `MSSQL_SA_PASSWORD=${DB_PASSWORD}`.

## 9. MSSQL Host Port Strategy

| Context | Host | Port |
|---------|------|------|
| Container-to-container (API → MSSQL) | `mssql` (DNS) | `1433` |
| Host tools (DBeaver, host sqlcmd) | `localhost` | `${MSSQL_PUBLISH_PORT}` (default **14330**) |

**Native Windows MSSQL conflict avoidance:** Default publish port is **14330**, not 1433. Host port 1433 was **not in use** on the validation machine at inspection time. Developers with native SQL Server on 1433 can keep it running unchanged.

## 10. Persistent Volume

| Volume | Mount | Purpose |
|--------|-------|---------|
| `mssql-data` | `/var/opt/mssql` | MSSQL data files |
| `api-node-modules` | `/app/node_modules` | Linux deps isolated from Windows bind mount |

**Preserve DB data:** `docker compose down`

**Reset DB data:** `docker compose down -v` (destroys `mssql-data` for this project only)

## 11. Database Initialization

**Mechanism:** One-shot `mssql-init` service running `docker/mssql/init/create-database.sh`.

**Behavior:**

1. Resolve `sqlcmd` at `/opt/mssql-tools18/bin/sqlcmd` (fallback: `/opt/mssql-tools/bin/sqlcmd`)
2. Retry connection to `MSSQL_HOST` (default `mssql`) up to 30 attempts (2s interval)
3. Execute idempotent T-SQL: `IF NOT EXISTS … CREATE DATABASE [DB_NAME]`
4. Exit 0; does not drop or recreate existing databases

**Startup order:** `mssql` (healthy) → `mssql-init` (completed) → `api` (starts)

**Tool path:** `/opt/mssql-tools18/bin/sqlcmd -C` on the selected 2022-CU18 image.

## 12. CRLF / Shell Safety

- Shell scripts stored with **LF** line endings
- `.gitattributes`: `*.sh text eol=lf`
- Scripts use `#!/usr/bin/env bash` and `set -euo pipefail`
- No `set -x` around secrets
- LF normalization applied to `create-database.sh` and `healthcheck.sh` after creation on Windows

## 13. API Container Development Workflow

| Aspect | Detail |
|--------|--------|
| Bind mount | `.` → `/app` (live source edits on host) |
| `node_modules` | Named volume `api-node-modules` prevents Windows/Linux binary conflicts |
| Watch mode | `npm run start:dev` (Nest CLI `--watch`) |
| Exposed port | `${PORT:-3000}:3000` |
| Env | `env_file: .env` + Compose override `DB_HOST=mssql`, `DB_PORT=1433` |

**Prerequisite:** Copy `.env.example` → `.env` before first `docker compose up`.

## 14. Production Docker Build

```bash
docker build --target production -t catechism-api:prod .
```

- Final stage: `node:22.23.1-bookworm-slim`
- Non-root user `catechism`
- Production deps only (`npm ci --omit=dev`)
- Compiled `dist/` from `build` stage
- Node-based container health check (no curl/wget)

## 15. Health Checks

### MSSQL

- **Command:** `/bin/bash /healthcheck.sh` (mounted script)
- **Logic:** `sqlcmd -C -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1"`
- **Timing:** interval 10s, timeout 5s, retries 12, start_period 45s

### API

- **Command:** Node `fetch('http://127.0.0.1:3000/api/v1/health')`
- **Timing:** interval 15s, timeout 5s, retries 8, start_period 90s (allows Nest watch boot)

Public `GET /api/v1/health` remains liveness-only — does **not** fail when MSSQL is down.

## 16. Container Networking

- API connects to MSSQL via Compose service name **`mssql`** (not `localhost`, not host IP, not `host.docker.internal`)
- No machine-specific IPs in source or Compose
- Host-side tools use published port on `localhost`

## 17. TypeORM Connectivity

| Result | Status |
|--------|--------|
| Real NestJS → MSSQL connection in Docker | **NOT TESTED — BLOCKER** |

**Blocker:** Docker Engine / Docker Compose CLI not available on the validation host (`docker` command not found; Docker Desktop and WSL not detected).

Infrastructure is in place; connectivity must be verified after Docker installation (see §21).

## 18. Database Verification

| Check | Status |
|-------|--------|
| SQL Server accepts connections | **NOT TESTED — BLOCKER** |
| `DB_NAME` exists after init | **NOT TESTED — BLOCKER** |
| Direct `sqlcmd` verification | **NOT TESTED — BLOCKER** |
| No unexpected business tables | **NOT TESTED — BLOCKER** (expected: system DBs only + empty app DB until migrations run) |

**Planned verification commands (after Docker install):**

```bash
docker compose exec mssql /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT @@VERSION"
docker compose exec mssql /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$DB_PASSWORD" -Q "SELECT name FROM sys.databases"
docker compose exec mssql /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -d catechism_api -Q "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
```

## 19. Migration Validation

| Check | Status |
|-------|--------|
| `migration:show` against live Docker MSSQL | **NOT TESTED — BLOCKER** |
| `migration:run` (expected: no pending migrations) | **NOT TESTED — BLOCKER** |
| `typeorm_migrations` table | **NOT TESTED** (created only after first migration run) |

**Planned commands:**

```bash
docker compose exec api npm run migration:show
docker compose exec api npm run migration:run
```

Explicit migration execution remains manual — `migrationsRun=false` unchanged.

## 20. Host Connection Settings

For DBeaver / host sqlcmd (non-secret):

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `14330` (or your `MSSQL_PUBLISH_PORT`) |
| Database | `catechism_api` |
| Username | `sa` |
| Encrypt | Yes |
| Trust server certificate | Yes |
| Password | From local `.env` `DB_PASSWORD` (not documented here) |

Host-side reachability was **not tested** (Docker not available).

## 21. Developer Commands

**First-time setup:**

```bash
cp .env.example .env   # Windows: copy .env.example .env
# Edit .env if needed; default password meets SQL Server complexity
```

**Start / status / logs:**

```bash
docker compose up -d
docker compose ps
docker compose logs -f api
docker compose logs -f mssql
```

**Migrations:**

```bash
docker compose exec api npm run migration:show
docker compose exec api npm run migration:run
```

**Stop / reset:**

```bash
docker compose down          # preserves mssql-data
docker compose down -v       # destroys mssql-data for this project
```

**Production image build:**

```bash
docker compose build api
docker build --target production -t catechism-api:prod .
```

**API smoke:**

```bash
curl http://localhost:3000/api/v1/health
```

## 22. Files / Dependencies Review

- **No new npm packages** — Docker is infrastructure-only
- **No Redis, brokers, or unrelated services**
- **No business entities or schema**
- **No CI/CD changes**
- Application code unchanged; existing tests remain DB-free

## 23. Commands Executed

```text
node -v                          → v22.23.1
npm -v                           → 10.9.8
npm run format:check             → PASS
npm run lint                     → PASS
npm run typecheck                → PASS
npm test                         → PASS (34 tests)
npm run test:e2e                 → PASS (5 tests)
npm run test:cov                 → PASS
npm run build                    → PASS
npm audit --audit-level=moderate → 0 vulnerabilities

docker --version                 → FAIL (command not found)
docker compose version           → FAIL (command not found)
docker compose config            → NOT RUN (blocker)
docker compose build             → NOT RUN (blocker)
docker compose up -d             → NOT RUN (blocker)

netstat (1433 / 14330)           → no listeners detected on validation host
git status --short               → read-only inspection (no commit)
```

## 24. Validation Results

### Application quality

| Check | Result |
|-------|--------|
| Node v22.23.1 | **PASS** |
| npm | **PASS** |
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit tests | **PASS** (34) |
| e2e tests | **PASS** (5) |
| coverage | **PASS** |
| build | **PASS** |
| npm audit | **PASS** (0 moderate+) |

### Docker / MSSQL (blocked)

| Check | Result |
|-------|--------|
| docker version | **FAIL — Docker not installed / not in PATH** |
| compose version | **FAIL — same blocker** |
| compose config | **NOT RUN** |
| docker build | **NOT RUN** |
| mssql health | **NOT RUN** |
| db creation | **NOT RUN** |
| API startup (Docker) | **NOT RUN** |
| TypeORM connection | **NOT RUN** |
| migration CLI connection | **NOT RUN** |
| API health (Docker) | **NOT RUN** |
| Swagger regression (Docker) | **NOT RUN** |
| direct DB verification | **NOT RUN** |

## 25. Security Review

- Passwords not hard-coded in Dockerfile, Compose, or source
- Single local secret: `DB_PASSWORD` in ignored `.env`
- Compose maps `MSSQL_SA_PASSWORD=${DB_PASSWORD}` — no duplicate secrets
- Init/health scripts do not echo passwords; no `set -x`
- `.env` gitignored; not copied into image (`.dockerignore`)
- No secret build args
- Existing logger redacts TypeORM password in sanitized options
- `synchronize=false`, `migrationsRun=false` preserved
- SA login acceptable for local foundation only — restricted app login required before production

## 26. Git Status / Scope Summary

No commit performed (per prompt). All Prompt #001–#005 files remain untracked. Scope limited to Docker runtime infrastructure; no business schema, auth, or CI/CD.

## 27. Rules Compliance Review

- Read `PROJECT_RULES.md`, `AGENTS.md`, Cursor rules, and prior prompt reports
- English naming; TypeScript/application code unchanged
- Env-driven configuration; no secrets in Git
- Public health endpoint unchanged (liveness only)
- Migration execution remains explicit
- Local report under `docs/` (gitignored)
- No commit

## 28. Known Issues / Assumptions

1. **Primary blocker:** Docker Engine not available on the Cursor validation host (Windows 10). Live MSSQL connectivity validation is **deferred until Docker Desktop (or compatible engine) is installed** and `.env` exists locally.
2. **`.env` required:** Compose `api` service uses `env_file: .env`. Developers must copy from `.env.example` before `docker compose up`.
3. **Windows bind mounts:** Named `api-node-modules` volume avoids host/container `node_modules` conflicts; first `docker compose up` runs `npm ci` inside the Linux container.
4. **MSSQL cold start:** Health check `start_period: 45s` and init retry loop accommodate first boot on slower machines.
5. **Production SA usage:** Documented as local-only; production should use a restricted SQL login (future hardening).
6. **Node PATH:** Use Node `v22.23.1` on the host for non-Docker npm commands.

## 29. Final Container State

**No containers running** — Docker was not available to start the stack. No project volumes created.

## 30. Out-of-Scope Confirmation

This prompt did **not** implement:

- Business entities or catechism tables
- Seed data
- Auth / RBAC
- Bitbucket Pipelines / CI/CD
- Production deployment
- DB integration e2e tests (Prompt #006)
- Readiness endpoint with DB state
- Automatic migrations at startup

## 31. Recommended Next Step

**Prompt #006 — Database Integration/E2E Testing + Quality Gates**

After Docker is installed and live connectivity is confirmed locally:

1. Run the §21 developer commands to validate MSSQL + TypeORM + migration CLI
2. Proceed to Prompt #006 for real DB integration tests, disposable test DB strategy, migration validation against a throwaway database, and foundation quality gates

Do **not** implement Prompt #006 in this prompt.

---

**Completion status:** Infrastructure **COMPLETE**; live Docker/MSSQL validation **BLOCKED** pending Docker Engine installation on the development host.
