# CI/CD BE #003 — MSSQL Integration + Docker Build Gates

## 1. Objective

Extend Bitbucket Pipelines with MSSQL-backed database validation and production Docker build gates, while preserving the fast PR quality gate from CI_002.

## 2. State Inherited From CI #002

| Item | Value |
|------|-------|
| Baseline | PR + `master` Quality step |
| Node image | `node:22.23.1-bookworm-slim` |
| PR commands | `npm ci`, `npm run quality`, `npm audit` |
| Gaps | No MSSQL, no Docker build, DataSource required `.env`, no readiness wait |

## 3. Files Created

| File | Purpose |
|------|---------|
| `src/database/load-cli-data-source-environment.ts` | Local `.env` vs CI env-only bootstrap |
| `src/database/load-cli-data-source-environment.spec.ts` | Bootstrap unit tests |
| `src/database/wait-for-mssql.spec.ts` | Readiness helper validation tests |
| `scripts/wait-for-mssql.ts` | Portable MSSQL readiness retry script |
| `docs/CI_003_MSSQL_INTEGRATION_AND_DOCKER_BUILD_GATES_REPORT.md` | This report |

## 4. Files Modified

| File | Change |
|------|--------|
| `bitbucket-pipelines.yml` | MSSQL service, Database Tests + Docker Build steps, `full-ci` custom pipeline |
| `src/database/data-source.ts` | Uses shared CLI bootstrap loader |
| `test/database/load-test-environment.ts` | Skips env files when `CI=true` |
| `package.json` | `ci:wait-for-mssql`; lint/format include `scripts/` |
| `README.md` | Updated CI section |

## 5. Pipeline Architecture After CI #003

```
PR ('**')
  └── Quality

master
  ├── Quality
  ├── Database Tests  (+ mssql service)
  └── Docker Build    (+ docker service)

custom: full-ci
  ├── Quality
  ├── Database Tests
  └── Docker Build
```

Fail-fast: each step runs only if prior steps pass (sequential pipeline).

## 6. MSSQL Service Definition

```yaml
services:
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-CU18-ubuntu-22.04
    variables:
      ACCEPT_EULA: 'Y'
      MSSQL_PID: 'Developer'
      MSSQL_SA_PASSWORD: $DB_PASSWORD
```

Same image family as local Docker Compose. Password references secured Bitbucket variable — not hard-coded.

## 7. CI Database Environment

| Variable | Bitbucket CI value |
|----------|-------------------|
| `CI` | `true` |
| `NODE_ENV` | `test` |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `1433` |
| `DB_NAME` | `catechism_api_test` |
| `DB_USER` | `sa` |
| `DB_PASSWORD` | `$DB_PASSWORD` (secured repo variable) |
| `DB_ENCRYPT` | `true` |
| `DB_TRUST_SERVER_CERTIFICATE` | `true` |
| `SWAGGER_ENABLED` | `false` |

**Networking decision:** Bitbucket service containers are reachable from the build step at `localhost:1433`. Local development uses published port `14330` — CI uses internal service port `1433` directly.

## 8. DataSource CI Mode Fix

`loadCliDataSourceEnvironment()`:

- **Local (`CI` unset):** requires `.env`; fails clearly if missing; no `.env.example` fallback
- **CI (`CI=true`):** uses `process.env` only; no `.env` file required

`loadTestEnvironment()` also skips `.env` / `.env.test` / `.env.test.example` when `CI=true` so pipeline variables are not overwritten by example files.

## 9. DataSource Tests

| Scenario | Test |
|----------|------|
| Local without `.env` | Throws clear error |
| Local with `.env` | Loads successfully |
| CI with env vars, no `.env` | Succeeds |
| CI does not use `.env.example` | Verified |
| Missing `DB_PASSWORD` in wait script | Rejects before connect |

## 10. MSSQL Readiness Strategy

Script: `scripts/wait-for-mssql.ts`  
npm script: `npm run ci:wait-for-mssql`

| Setting | Default |
|---------|---------|
| Max attempts | 30 |
| Retry delay | 2000 ms |
| Connection timeout | 5000 ms |
| Query | `SELECT 1` on `master` |

No password logging. Pools closed in `finally`. Configurable via `MSSQL_WAIT_MAX_ATTEMPTS` / `MSSQL_WAIT_RETRY_DELAY_MS`.

## 11. Database Tests Step

Commands (after env exports):

1. `npm ci`
2. `npm run ci:wait-for-mssql`
3. `npm run test:db:migrations`
4. `npm run test:integration`
5. `npm run test:e2e:db`

**Decision:** Does not re-run `quality:full` (Quality already passed in prior step). Avoids duplicate lint/test/build work.

## 12. Docker Build Step

```yaml
services:
  - docker
script:
  - docker build --target production -t catechism-api:ci .
```

No login, push, or deploy.

## 13. Master Pipeline

1. Quality  
2. Database Tests  
3. Docker Build  

## 14. PR Pipeline

Unchanged: **Quality only** — no MSSQL, no Docker, no secrets.

## 15. Custom full-ci

Runs all three gates sequentially — now fully functional (not a placeholder).

## 16. Cache / Install Strategy

- npm cache on Quality and Database Tests steps
- Each step runs `npm ci` independently
- No Docker layer cache in CI_003

## 17. Secret Strategy

| Variable | Type |
|----------|------|
| `DB_PASSWORD` | Bitbucket **secured** repository variable |

Required for MSSQL service and DB test step. Not in YAML, README, or reports.

## 18. README Changes

Updated CI section: PR vs master vs `full-ci`, secured `DB_PASSWORD`, no deployment yet.

## 19. YAML Validation

Parsed with `npx js-yaml` — valid structure, anchors resolve.

Bitbucket hosted execution: **Not run** (remote is GitHub).

## 20. Local CI-Mode Simulation

Simulated Database Tests step with `CI=true` and env-only configuration (local host port **14330**):

| Command | Result |
|---------|--------|
| `npm run ci:wait-for-mssql` | **PASS** (attempt 1) |
| `npm run test:db:migrations` | **PASS** |
| `npm run test:integration` | **PASS** (9 tests) |
| `npm run test:e2e:db` | **PASS** (1 test) |

No `.env` file used during simulation.

## 21. Docker Build Validation

```bash
wsl docker build --target production -t catechism-api:ci .
```

**PASS**

## 22. Existing Quality Regression

| Check | Result |
|-------|--------|
| `npm run quality` | **PASS** |
| Unit tests | **PASS** (45) |
| DB-free e2e | **PASS** (5) |

## 23. Commands Executed

```text
npm run format / lint / typecheck / test / quality
npm audit --audit-level=moderate
npx js-yaml bitbucket-pipelines.yml
CI=true simulation: ci:wait-for-mssql, test:db:migrations, test:integration, test:e2e:db
wsl docker build --target production -t catechism-api:ci .
git status / git diff --stat (read-only)
```

## 24. Validation Results

| Check | Result |
|-------|--------|
| npm ci | **PASS** |
| quality | **PASS** |
| audit | **PASS** |
| New DataSource tests | **PASS** |
| CI env-only DataSource | **PASS** |
| readiness helper | **PASS** |
| migration test DB | **PASS** |
| integration | **PASS** |
| DB-aware e2e | **PASS** |
| Docker production build | **PASS** |
| YAML syntax | **PASS** |
| No secrets in tracked files | **PASS** |
| No deployment | **PASS** |
| Bitbucket hosted run | **N/A** |

## 25. Git Diff / Scope Summary

| File | Status |
|------|--------|
| `bitbucket-pipelines.yml` | Modified |
| `scripts/wait-for-mssql.ts` | New |
| `src/database/load-cli-data-source-environment.ts` | New |
| `src/database/load-cli-data-source-environment.spec.ts` | New |
| `src/database/wait-for-mssql.spec.ts` | New |
| `src/database/data-source.ts` | Modified |
| `test/database/load-test-environment.ts` | Modified |
| `package.json` | Modified |
| `README.md` | Modified |

No git write operations performed.

## 26. Known Issues / Assumptions

1. **GitHub remote** — pipeline YAML ready; Bitbucket activation pending.
2. **First Bitbucket MSSQL run** — startup time may require tuning wait retries (defaults should suffice).
3. **Database Tests step runs `npm ci` again** — intentional for step isolation; CI_004 may optimize.
4. **`DB_PASSWORD` must be configured** in Bitbucket before Database Tests can pass on hosted CI.

## 27. Out-of-Scope Confirmation

Not implemented: deployment, staging, registry push, auth/business modules, CI_004 audit.

## 28. Recommended CI #004 Plan

**CI #004 — Final CI Audit + Hardening** should:

- Independently audit full `bitbucket-pipelines.yml`
- Validate trigger semantics and duplicate `npm ci` cost
- Review MSSQL readiness reliability on first Bitbucket run
- Review secrets handling and Docker build gate
- Verify Linux portability end-to-end
- Review artifacts/caching opportunities
- Remove CI technical debt
- Keep deployment out of scope

## 29. Commit Message Recommendation

```bash
git commit -m "ci: add database and Docker build gates"
```

Cursor did **not** run `git add`, `git commit`, or `git push`.
