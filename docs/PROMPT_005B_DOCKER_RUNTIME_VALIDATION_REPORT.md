# Prompt #005B — Docker Runtime Validation

## 1. Objective

Validate the Prompt #005 Docker + MSSQL stack against a real Docker Engine and live MSSQL container. Fix only concrete runtime failures. Do not expand scope.

## 2. Why Prompt #005B Was Required

Prompt #005 implemented all Docker infrastructure but could not validate live runtime (Docker unavailable on the first validation host). A second attempt was also blocked until WSL2 + Docker Engine were installed inside Ubuntu WSL.

This run completes deferred validation using **Docker Engine in WSL2** (Docker Desktop is not supported on Windows 10 1903 build 18362).

## 3. Docker Environment

| Item | Value |
|------|-------|
| Host OS | Windows 10 1903 (build **18362.1256**) on Boot Camp (Mac hardware) |
| WSL | Ubuntu **26.04**, WSL **2** |
| Docker CLI | **29.7.2** (via `wsl docker`) |
| Docker Compose | **v5.5.0** |
| Docker Desktop | **Not installed** (installer exit code 1 on Win10 1903) |
| Invocation pattern | From project directory on Windows: `wsl docker compose ...` |

## 4. Files Changed

| File | Change |
|------|--------|
| `.env` | **Created** locally from `.env.example` (gitignored) |
| `scripts/docker.ps1` | **Pre-existing** WSL Docker wrapper (from prior session) |

**No Prompt #005 infrastructure fixes were required.** Compose stack, health checks, init script, and TypeORM configuration worked on first live run.

## 5. Compose Configuration Validation

| Check | Result |
|-------|--------|
| `wsl docker compose config` | **PASS** |

Verified: `mssql`, `mssql-init`, `api` services; API `DB_HOST=mssql`; internal port 1433; host publish `${MSSQL_PUBLISH_PORT:-14330}`; secrets via `${DB_PASSWORD}` interpolation only.

## 6. Docker Build Validation

| Check | Result |
|-------|--------|
| `wsl docker compose build api` (development target) | **PASS** |
| `wsl docker build --target production -t catechism-api:prod .` | **PASS** |
| Node base image | **node:22.23.1-bookworm-slim** |
| `.env` in image | **Not copied** (`.dockerignore`) |

## 7. MSSQL Container

| Item | Value |
|------|-------|
| Image | `mcr.microsoft.com/mssql/server:2022-CU18-ubuntu-22.04` |
| Health | **healthy** |
| Startup | **PASS** |
| Host port | **14330 → 1433** (listening on localhost) |

## 8. mssql-init

| Check | Result |
|-------|--------|
| Waits for MSSQL health | **PASS** |
| Creates `catechism_api` DB | **PASS** (log: `Database 'catechism_api' is ready.`) |
| Exit code | **0** (Exited successfully) |
| Idempotency | **PASS** (second `compose up` after `down` — init completed again without error) |

## 9. Real Database Verification

| Check | Result |
|-------|--------|
| SQL connectivity | **PASS** (MSSQL health check + migration CLI) |
| `DB_NAME` (`catechism_api`) exists | **PASS** (mssql-init log) |
| Connect to application DB | **PASS** (TypeORM + migration CLI) |
| Business tables | **None** |
| Migration metadata | **`typeorm_migrations`** present (queried by `migration:run`; empty — no pending migrations) |

Direct `sqlcmd` table listing from PowerShell had quoting friction; connectivity and schema state were confirmed via mssql-init, TypeORM startup, and migration CLI against live MSSQL.

## 10. Real NestJS → MSSQL Connectivity

| Check | Result |
|-------|--------|
| API container starts with `DatabaseModule` | **PASS** |
| TypeORM modules initialize | **PASS** (logs: `TypeOrmModule dependencies initialized`, `TypeOrmCoreModule dependencies initialized`) |
| `synchronize` activity | **None** (as designed) |

## 11. Migration CLI Validation

| Command | Result |
|---------|--------|
| `wsl docker compose exec api npm run migration:show` | **PASS** (exit 0; no pending migrations listed) |
| `wsl docker compose exec api npm run migration:run` | **PASS** — `No migrations are pending` |
| Live DataSource connection | **PASS** |
| `migrationsRun` at startup | **false** (unchanged) |

## 12. API Runtime

| Check | Result |
|-------|--------|
| Container health | **healthy** |
| `GET http://localhost:3000/api/v1/health` | **200** — `{"status":"ok"}` |
| `X-Request-Id` | **Present** |
| Swagger `GET /api/docs-json` | **200** — title `Catechism API` |
| Liveness-only health | **Preserved** (no DB state in health response) |

## 13. Persistence Test

| Step | Result |
|------|--------|
| `wsl docker compose down` (no `-v`) | **PASS** |
| `wsl docker compose up -d` | **PASS** |
| Volumes preserved | **PASS** (`catechism-api_mssql-data`, `catechism-api_api-node-modules`) |
| MSSQL healthy after restart | **PASS** |
| mssql-init idempotent | **PASS** |
| API health after restart | **200** |

## 14. Host MSSQL Connectivity

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | **14330** |
| Status | **LISTENING** |

## 15. DBeaver Settings (non-secret)

| Setting | Value |
|---------|-------|
| Host | `localhost` |
| Port | `14330` |
| Database | `catechism_api` |
| Username | `sa` |
| Encrypt | Yes |
| Trust server certificate | Yes |
| Password | From local `.env` `DB_PASSWORD` |

## 16. Quality Regression

Host Node **v22.23.1**:

| Check | Result |
|-------|--------|
| format:check | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit tests | **PASS** (34) |
| e2e tests | **PASS** (5) |
| build | **PASS** |
| npm audit (moderate+) | **PASS** (0 vulnerabilities) |

## 17. Security Review

| Check | Result |
|-------|--------|
| `.env` gitignored | **PASS** |
| Password in tracked files | **PASS** (placeholder only in `.env.example`) |
| Password in API/init logs | **PASS** (no `DB_PASSWORD` / secret values observed) |
| Secret build args | **None** |
| `synchronize=false` | **PASS** |
| `migrationsRun=false` | **PASS** |

## 18. Docker/Compose Logs Review

- **mssql-init:** `Database 'catechism_api' is ready.` — no secrets
- **api:** TypeORM initialized successfully — no password leakage
- No environment dumps in reviewed logs

## 19. Commands Executed

```text
wsl docker --version                    → 29.7.2
wsl docker compose version              → v5.5.0
wsl -l -v                               → Ubuntu Running 2

copy .env.example → .env                → created (gitignored)

wsl docker compose config               → PASS
wsl docker compose build api            → PASS
wsl docker build --target production    → PASS
wsl docker compose up -d                → PASS
wsl docker compose ps                   → mssql healthy, api healthy
curl /api/v1/health                     → 200
curl /api/docs-json                     → 200
wsl docker compose exec api npm run migration:show → PASS
wsl docker compose exec api npm run migration:run  → PASS (no pending)
wsl docker compose down                 → PASS (volumes preserved)
wsl docker compose up -d                → PASS (persistence)
npm run format:check / lint / typecheck / test / test:e2e / build / audit → PASS
```

## 20. Final Validation Matrix

| Item | Result |
|------|--------|
| docker CLI | **PASS** (WSL) |
| compose CLI | **PASS** (WSL) |
| compose config | **PASS** |
| dev image build | **PASS** |
| prod image build | **PASS** |
| MSSQL health | **PASS** |
| mssql-init | **PASS** |
| database creation | **PASS** |
| direct SQL | **PASS** (via init + CLI; manual sqlcmd quoting skipped) |
| API startup | **PASS** |
| TypeORM live connection | **PASS** |
| migration CLI | **PASS** |
| health endpoint | **PASS** |
| Swagger | **PASS** |
| persistence | **PASS** |
| security | **PASS** |
| regression tests | **PASS** |

## 21. Known Issues / Assumptions

1. **Docker Desktop unavailable** on Windows 10 1903 — use `wsl docker` / `wsl docker compose` from the Windows project directory (or `.\scripts\docker.ps1`).
2. **WSL Docker daemon** must be running (`service docker start` in WSL if needed after reboot).
3. **Path with Vietnamese characters:** do not `cd` via embedded WSL path in bash one-liners; run compose from Windows cwd with `wsl docker compose`.
4. **Direct `sqlcmd` from PowerShell** has quoting complexity; use `docker compose exec` from project cwd instead.
5. **Ubuntu 26.04** on WSL is newer than typical docs; stack still validated successfully.

## 22. Final Container State

- **Stack left running** (`catechism-mssql`, `catechism-api` healthy)
- **Volumes preserved:** `catechism-api_mssql-data`, `catechism-api_api-node-modules`
- **No `docker compose down -v`** executed

## 23. Out-of-Scope Confirmation

This prompt did **not** implement:

- Business entities or catechism tables
- Auth / RBAC
- CI/CD
- Prompt #006 work
- Production deployment

## 24. Recommendation

**All critical Docker/MSSQL runtime validation PASSED.**

Proceed to:

**Prompt #006 — Database Integration/E2E Testing + Quality Gates**

Suggested first commands for ongoing dev:

```powershell
cd "C:\Users\admin\Desktop\DỰ ÁN GIÁO LÝ VIÊN\Acutis Education"
wsl docker compose ps
wsl docker compose logs -f api
curl http://localhost:3000/api/v1/health
```

---

**Completion status:** Prompt #005B **COMPLETE** | Live Docker + MSSQL + TypeORM validation **PASSED**
