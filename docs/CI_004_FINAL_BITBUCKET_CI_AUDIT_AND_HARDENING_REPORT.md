# CI/CD BE #004 — Final Bitbucket CI Audit + Hardening

## 1. Objective

Perform an independent final audit of the backend Bitbucket CI design (CI_001–CI_003), fix genuine CI-level issues, validate all gates locally, and declare CI/CD foundation completion.

## 2. CI State Before Audit

| Item | State |
|------|-------|
| PR pipeline | Quality only |
| `master` | Quality → Database Tests → Docker Build |
| Custom `full-ci` | Same as `master` |
| MSSQL service | `2022-CU18-ubuntu-22.04` |
| CI env bootstrap | `load-cli-data-source-environment.ts`, `CI=true` skips `.env` |
| Readiness | `scripts/wait-for-mssql.ts` (30×2s, 5s timeout) |
| Remote | GitHub — hosted Bitbucket run not yet executed |
| Known gap from CI_001 | `database.configuration.spec.ts` could fail when `MSSQL_PUBLISH_PORT` leaked from local env |

## 3. Audit Method

1. Read CI_001–CI_003 reports, `bitbucket-pipelines.yml`, CI scripts, test DB utilities
2. Structured review: triggers, anchors, secrets, MSSQL, Docker, portability
3. Classified findings by severity
4. Implemented two justified hardening fixes
5. Re-ran full local validation including CI-mode DB simulation and Docker production build

## 4. Findings Summary

| ID | Severity | Area | Finding | Action |
|----|----------|------|---------|--------|
| F-001 | MEDIUM | Unit tests | `database.configuration.spec.ts` inherited `MSSQL_PUBLISH_PORT` from parent env, causing flaky failure in CI/local | **FIXED** — clear in `beforeEach` |
| F-002 | MEDIUM | Pipeline | Database step lacked fail-fast when `DB_PASSWORD` repo variable missing | **FIXED** — preflight check |
| F-003 | LOW | Hosted CI | Bitbucket pipeline never executed (GitHub remote) | **DOCUMENT** — activation pending |
| F-004 | LOW | Branch name | Pipeline targets `master`; rename to `main` would require YAML update | **DOCUMENT** |
| F-005 | INFO | Duplicate `npm ci` | Quality + DB steps each run `npm ci` | **NO ACTION** — step isolation |
| F-006 | INFO | `quality:full` vs split steps | Pipeline uses DB scripts after Quality passed | **NO ACTION** — equivalent semantics |
| F-007 | INFO | Artifacts/coverage | No CI artifacts or coverage gate | **NO ACTION** — deferred |
| F-008 | INFO | MSSQL cold start | 60s max wait may need tuning on first hosted run | **DOCUMENT** |

No BLOCKER or unresolved HIGH issues.

## 5. Pipeline Trigger Audit

| Trigger | Steps | Result |
|---------|-------|--------|
| `pull-requests: '**'` | Quality | **PASS** |
| `branches: master` | Quality → Database Tests → Docker Build | **PASS** |
| `custom: full-ci` | Same three steps | **PASS** |

- No accidental `default:` pipeline
- Sequential steps fail-fast (later steps skip on earlier failure)
- PR wildcard `'**'` syntax correct for Bitbucket

**Note:** If Bitbucket is configured to run both branch and PR pipelines for the same commit, both may execute — repository setting, not YAML defect.

## 6. Default Branch Assumption

Pipeline explicitly targets **`master`** (matches current Git branch). If default branch becomes `main`, update `branches:` key in `bitbucket-pipelines.yml`.

## 7. Step / YAML Anchor Audit

Anchors: `&quality-step`, `&database-tests-step`, `&docker-build-step`.

| Check | Result |
|-------|--------|
| Services on DB/Docker steps only | **PASS** |
| npm cache on Quality + DB only | **PASS** |
| max-time: Quality 15, DB 20, Docker 15 | **PASS** |
| YAML parse (js-yaml) | **PASS** |

## 8. PR Quality Gate Audit

```bash
npm ci
npm run quality
npm audit --audit-level=moderate
```

No MSSQL, Docker, secrets, or `.env` required. Re-validated locally: **PASS**.

## 9. Master Gate Audit

Order: Quality → Database Tests → Docker Build. YAML sequential semantics ensure DB/Docker steps do not run when Quality fails.

## 10. Custom full-ci Audit

Real three-step pipeline — no placeholders, no deployment. Matches `master`.

## 11. Node/npm Reproducibility Audit

| Item | Value |
|------|-------|
| Pipeline image | `node:22.23.1-bookworm-slim` |
| Dockerfile base | Same Node version |
| `package.json` engines | `22.23.1` |
| `.nvmrc` | Present |
| `.npmrc` | `engine-strict=true` |
| Install | `npm ci` in every Node step |

## 12. Cache Audit

Only `~/.npm` cached. No `node_modules`, secrets, or dist caching.

## 13. Duplicate Work Decision

**Keep separate `npm ci` per step.** Isolation and reproducibility outweigh ~1 min duplicate install on `master`.

## 14. MSSQL Service Audit

```yaml
image: mcr.microsoft.com/mssql/server:2022-CU18-ubuntu-22.04
variables:
  ACCEPT_EULA: 'Y'
  MSSQL_PID: 'Developer'
  MSSQL_SA_PASSWORD: $DB_PASSWORD
```

- No hard-coded password
- Service attached only to Database Tests step
- Test DB only (`catechism_api_test`)

## 15. MSSQL Networking Audit

CI uses `DB_HOST=localhost`, `DB_PORT=1433` — standard Bitbucket service-container semantics. Local simulation used port `14330` (Docker publish); hosted CI uses direct `1433`.

## 16. MSSQL Readiness Audit

| Property | Value |
|----------|-------|
| Max attempts | 30 |
| Retry delay | 2s |
| Connection timeout | 5s |
| Worst-case wait | ~60s + connection time |
| Password logging | None |
| WSL dependency | None |
| `.env` required | No |

Local CI simulation: ready on attempt 1.

## 17. CI DataSource Audit

| Mode | Behavior |
|------|----------|
| Local CLI | Requires `.env`; no `.env.example` fallback |
| CI (`CI=true`) | Env-only; no file load |
| Test loader | Skips `.env`/`.env.test` when `CI=true` |

Unit tests: **PASS** (5 tests in `load-cli-data-source-environment.spec.ts`).

## 18. Environment / Secret Audit

Database step exports safe constants; `DB_PASSWORD` from Bitbucket secured repository variable (injected automatically + validated by preflight).

Added preflight:

```bash
test -n "${DB_PASSWORD:-}" || (echo "DB_PASSWORD repository variable is required" >&2 && exit 1)
```

No passwords/tokens in YAML, scripts committed to repo, or pipeline env dumps.

## 19. Test DB Safety Audit

| Guard | Status |
|-------|--------|
| Blocks `catechism_api` | **PASS** |
| Requires `_test` suffix | **PASS** |
| Runtime `DB_NAME()` assertion | **PASS** (integration test) |
| Negative guard test | **PASS** (4 tests) |

## 20. Database Test Step Audit

Order after preflight + `npm ci`:

1. `ci:wait-for-mssql`
2. `test:db:migrations`
3. `test:integration`
4. `test:e2e:db`

No `migration:run`, no auto-sync, migrations before integration/e2e.

## 21. quality:full Relationship

Pipeline intentionally splits: Quality runs first; DB step runs migration/integration/db-e2e without re-running Quality. Semantically equivalent to `quality:full` when Quality already passed. `npm run quality:full` retained for local use.

## 22. Docker Build Gate Audit

```bash
docker build --target production -t catechism-api:ci .
```

- Docker service on step only
- No push, login, or secrets
- Local validation: **PASS**

## 23. Docker Context Audit

`.dockerignore` excludes `.env`, `.env.test`, `docs`, `.git`, `node_modules`, `dist`, `coverage`. **PASS**

## 24. YAML Validation

Parsed with `npx js-yaml` — valid structure, anchors expand correctly.

## 25. Hosted Bitbucket Execution Status

| Item | Status |
|------|--------|
| Remote | GitHub (`hopdevnbi/acutis_education`) |
| Bitbucket hosted run | **Not executed** |
| Blocker for code readiness | **No** |

## 26. Linux Portability Audit

All CI scripts (`wait-for-mssql.ts`, test loaders, npm scripts) are portable Node/bash. `scripts/docker.ps1` is developer-only, outside pipeline.

## 27. README CI Audit

README accurately describes PR/master/full-ci behavior, `DB_PASSWORD` requirement, no deploy, Bitbucket activation. **No changes required.**

## 28. Artifact / Coverage Decision

No CI artifacts or separate `test:cov` step. Quality already runs unit tests. Thresholds not introduced.

## 29. Resource / Timeout Review

| Step | max-time |
|------|----------|
| Quality | 15 min |
| Database Tests | 20 min |
| Docker Build | 15 min |

First hosted MSSQL run may need wait tuning if cold start exceeds 60s — monitor on Bitbucket activation.

## 30. Security Review

| Check | Result |
|-------|--------|
| Secrets in YAML | None (symbolic `$DB_PASSWORD` only) |
| Hard-coded passwords | None in pipeline |
| env dump / printenv | None |
| Production DB in CI | Never |
| Deployment syntax | None |

## 31. Files Created

| File | Purpose |
|------|---------|
| `docs/CI_004_FINAL_BITBUCKET_CI_AUDIT_AND_HARDENING_REPORT.md` | This report |

## 32. Files Modified

| File | Change |
|------|--------|
| `bitbucket-pipelines.yml` | Fail-fast if `DB_PASSWORD` unset |
| `src/config/database.configuration.spec.ts` | Clear `MSSQL_PUBLISH_PORT` in `beforeEach` for deterministic tests |

## 33. Changes Implemented

| Change | Problem | Fix | Reason |
|--------|---------|-----|--------|
| Test env isolation | Flaky port assertion when local `MSSQL_PUBLISH_PORT` leaked | `delete process.env['MSSQL_PUBLISH_PORT']` in `beforeEach` | CI/local reproducibility |
| DB_PASSWORD preflight | Silent failure if Bitbucket variable not configured | Shell check before DB step | Clear first-hosted-run diagnostics |

## 34. Commands Executed

```text
git status / git log / git remote -v     → read-only
node --version                           → v22.23.1
npm --version                            → 10.9.8
npm ci                                   → PASS
npm run quality                          → PASS (45 tests)
npm audit --audit-level=moderate         → PASS
npm run test:integration (guard)         → PASS (4 guard tests)
CI=true simulation:
  npm run ci:wait-for-mssql              → PASS
  npm run test:db:migrations             → PASS
  npm run test:integration               → PASS (9)
  npm run test:e2e:db                      → PASS (1)
wsl docker build --target production     → PASS
npx js-yaml bitbucket-pipelines.yml      → PASS
grep secrets in pipeline                 → PASS
wsl docker compose ps                    → healthy stack
```

## 35. Validation Results

| Check | Result |
|-------|--------|
| npm ci | **PASS** |
| quality | **PASS** |
| audit | **PASS** |
| DataSource CI tests | **PASS** |
| readiness tests | **PASS** |
| guard tests | **PASS** |
| CI-mode DB simulation | **PASS** |
| migrations | **PASS** |
| integration | **PASS** |
| DB e2e | **PASS** |
| Docker build | **PASS** |
| YAML syntax | **PASS** |
| secret review | **PASS** |
| Linux portability | **PASS** |
| no deployment | **PASS** |
| Bitbucket hosted | **N/A** |

## 36. Remaining Issues

| ID | Severity | Issue |
|----|----------|-------|
| R-001 | LOW | Hosted Bitbucket execution not validated |
| R-002 | LOW | Remote is GitHub until Bitbucket mirror/host |
| R-003 | INFO | MSSQL wait tuning may be needed on first hosted run |

None block CI foundation completion.

## 37. Future Deployment Extension Points

Future phases (not implemented):

- Container registry push after Docker build
- Staging deployment environment
- Manual production promotion
- Explicit production migration job
- Coverage/test report artifacts

## 38. Git Status / Scope Summary

Modified: `bitbucket-pipelines.yml`, `src/config/database.configuration.spec.ts`. No git write operations.

## 39. Out-of-Scope Confirmation

Not implemented: deployment, registry push, auth/business modules, Bitbucket remote migration, hosted pipeline activation.

## 40. CI/CD Completion Decision

## **A. BACKEND BITBUCKET CI FOUNDATION COMPLETE**

All CI_004 completion criteria met. No unresolved BLOCKER/HIGH issues.

## 41. Next Phase Recommendation

**Phase 2 — Authentication + Users + Roles + Permissions**

Recommended starting points:

- User entity + migration (UUID v4, snake_case)
- Password hashing, JWT/session per `PROJECT_RULES.md`
- Role/permission model with least privilege
- Extend CI when auth modules add meaningful test coverage

Optional parallel track: migrate repository to Bitbucket and validate first hosted pipeline run.

## 42. Commit Message Recommendation

```bash
git commit -m "ci: finalize Bitbucket validation pipeline"
```

Cursor did **not** run `git add`, `git commit`, or `git push`.
