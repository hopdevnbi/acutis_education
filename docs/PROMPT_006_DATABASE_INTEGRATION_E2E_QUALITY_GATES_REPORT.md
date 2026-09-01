# Prompt #006 — Database Integration/E2E Testing + Quality Gates

## 1. Objective

Establish a reliable database integration testing foundation and project-level quality gates before business modules begin. Define test database isolation, real MSSQL integration/e2e capability, migration validation against a dedicated test database, and canonical `quality` / `quality:full` scripts — without introducing business entities or weakening existing engineering rules.

## 2. State Inherited From Prompt #005

| Item | State |
|------|-------|
| Docker stack | **Healthy** (`catechism-mssql`, `catechism-api`) via WSL Docker |
| Development DB | `catechism_api` created by `mssql-init` |
| MSSQL host port | `localhost:14330` (published from container 1433) |
| Migrations | Infrastructure only; no business migrations |
| Existing tests | Unit (DB-free), infrastructure e2e (DB-free via `InfrastructureTestAppModule`) |
| Health endpoint | Liveness only (`GET /api/v1/health` → 200, no DB probe) |

Reference: `docs/PROMPT_005B_DOCKER_RUNTIME_VALIDATION_REPORT.md`

## 3. Test Layer Strategy

| Layer | Command | DB required | Purpose |
|-------|---------|-------------|---------|
| **A. Unit** | `npm test` | No | Fast logic/config tests |
| **B. Infrastructure e2e** | `npm run test:e2e` | No | Health, error contract, request ID, Swagger (DB-free app module) |
| **C. Database integration** | `npm run test:integration` | Yes | Real TypeORM + MSSQL against `catechism_api_test` |
| **D. DB-aware app e2e** | `npm run test:e2e:db` | Yes | Full `AppModule` + `DatabaseModule` smoke against test DB |

Supporting scripts:

- `npm run test:db:prepare` — create/ensure test DB exists
- `npm run test:db:migrations` — validate/apply migrations on test DB

## 4. Test Database Strategy

| Decision | Choice |
|----------|--------|
| MSSQL instance | Reuse existing Docker Compose `mssql` service (no second container, no Testcontainers) |
| Test database name | `catechism_api_test` (fixed, dedicated) |
| Safety rule | Name must end with `_test`; `catechism_api` is explicitly blocked |
| Lifecycle | **Preserve** test DB between runs for speed; `--reset` available for explicit drop/recreate |
| Host connectivity | Tests connect via `localhost:14330` (not compose-internal `mssql` hostname) |
| Port resolution | `loadTestEnvironment()` applies `MSSQL_PUBLISH_PORT` when host is `localhost` and port is unset/default `1433` |

## 5. Environment / Config Changes

| File | Tracked | Purpose |
|------|---------|---------|
| `.env.test.example` | Yes | Template: `DB_NAME=catechism_api_test`, `DB_PORT=14330`, test overrides |
| `.env.test` | No (gitignored) | Local copy for integration/e2e runs |
| `.gitignore` | Modified | Ignore `.env.test`; allow `.env.test.example` |

Load order in test tooling: `.env` → `.env.test` (override) → fallback `.env.test.example` if `.env.test` absent → set `NODE_ENV=test` → assert safe DB name.

## 6. Files Created

| File | Purpose |
|------|---------|
| `.env.test.example` | Tracked test env template |
| `test/database/test-database.constants.ts` | DB name constants and safe-name pattern |
| `test/database/test-database.guard.ts` | `assertSafeTestDatabaseName`, bracketed identifier helper |
| `test/database/test-database.guard.spec.ts` | Unit tests for guard |
| `test/database/load-test-environment.ts` | Loads test env, port defaults, safety assertion |
| `test/database/test-database.manager.ts` | Create/drop test DB via `mssql` on `master` |
| `test/database/prepare-test-database.ts` | CLI: ensure test DB; `--reset` to drop/recreate |
| `test/database/validate-test-database-migrations.ts` | Migration show/run on test DB |
| `test/setup-integration-env.ts` | Jest setup calling `loadTestEnvironment()` |
| `test/create-database-test-application.ts` | Full `AppModule` test app factory |
| `test/integration/database.integration-spec.ts` | Real MSSQL integration suite |
| `test/database-app.db.e2e-spec.ts` | DB-aware app e2e smoke |
| `test/jest-integration.json` | Integration Jest config (60s timeout) |
| `test/jest-db-e2e.json` | DB e2e Jest config (90s timeout, `*.db.e2e-spec.ts`) |

## 7. Files Modified

| File | Change |
|------|--------|
| `.gitignore` | Added `.env.test`, `!.env.test.example` |
| `package.json` | New scripts; devDependency `@types/mssql` |
| `test/jest-e2e.json` | Added `testPathIgnorePatterns` to exclude `*.db.e2e-spec.ts` from DB-free e2e |
| `test/integration/database.integration-spec.ts` | Typed generic queries (lint/prettier fix during validation) |

## 8. Dependencies Added

| Package | Type | Reason |
|---------|------|--------|
| `@types/mssql` ^12.3.0 | devDependency | Strict TypeScript + ESLint for `test-database.manager.ts` |

`mssql` was already a production dependency (TypeORM driver).

## 9. Test DB Management Utility

**Entry points:**

- `prepareTestDatabase({ reset?: boolean })` in `test-database.manager.ts`
- CLI: `npm run test:db:prepare` / `npm run test:db:prepare -- --reset`

**Safety:**

1. `assertSafeTestDatabaseName()` runs before any DDL
2. Blocks `catechism_api` and any name not ending in `_test`
3. Validates against `/^[A-Za-z][A-Za-z0-9_]*_test$/`
4. Connects to `master` only for create/drop
5. Uses bracket-quoted identifiers via `formatBracketedDatabaseIdentifier()`
6. Closes pool in `finally`; never logs `DB_PASSWORD`

## 10. Integration Test Architecture

```
loadTestEnvironment()
       ↓
assertSafeTestDatabaseName(DB_NAME)
       ↓
prepareTestDatabase()  ← optional before suite (npm script)
       ↓
Jest (jest-integration.json / jest-db-e2e.json)
       ↓
TypeORM DataSource / AppModule → localhost:14330 → catechism_api_test
```

Core logic is portable Node.js — no WSL wrappers in test code. Local Docker invocation remains a developer concern (`wsl docker compose ...`).

## 11. DB Integration Tests

`test/integration/database.integration-spec.ts` validates:

| # | Assertion | Result |
|---|-----------|--------|
| 1 | DataSource initialize/destroy | **PASS** |
| 2 | `SELECT 1` | **PASS** |
| 3 | `DB_NAME()` equals `catechism_api_test`, not `catechism_api` | **PASS** |
| 4 | `synchronize=false`, `migrationsRun=false` in options | **PASS** |
| 5 | Migration metadata query; no unexpected business tables | **PASS** |
| 6 | Clean DataSource teardown | **PASS** |

Guard unit tests (`test-database.guard.spec.ts`): **4 passed**

**Total integration suite: 9 tests passed**

## 12. DB-Aware App E2E

`test/database-app.db.e2e-spec.ts`:

- Instantiates real `AppModule` with `DatabaseModule`
- Applies normal bootstrap (`configureApplication`)
- `GET /api/v1/health` → **200** with `{ status: 'ok' }` and `x-request-id` header
- Health remains liveness-only (no DB state in response)

**Result: 1 test passed**

## 13. Migration Validation

`npm run test:db:migrations`:

- Loads test environment
- Ensures test DB exists
- Initializes TypeORM DataSource against test DB
- Runs `showMigrations()`; applies pending migrations if any

**Output:** `No migrations are pending on the test database.` — valid foundation state.

## 14. Development DB Protection

| Mechanism | Location |
|-----------|----------|
| Hard block on `catechism_api` | `test-database.guard.ts` |
| Required `_test` suffix + regex | `test-database.guard.ts` |
| Guard before prepare/drop | `test-database.manager.ts`, `load-test-environment.ts` |
| Runtime assertion `DB_NAME() ≠ catechism_api` | `database.integration-spec.ts` |
| Test env sets `DB_NAME=catechism_api_test` | `.env.test.example` |

Destructive operations cannot target the development database when tooling is used as designed.

## 15. Existing Test Preservation

| Command | Behavior | Result |
|---------|----------|--------|
| `npm test` | Unit only, DB-free (`setup-env.ts` placeholders) | **34 passed** |
| `npm run test:e2e` | DB-free infrastructure e2e only (excludes `*.db.e2e-spec.ts`) | **5 passed** |
| `npm run test:cov` | Unit coverage unchanged | **PASS** |
| `GET /api/v1/health` | Liveness only | Unchanged |

## 16. Package Scripts

```json
"test:db:prepare": "ts-node ... test/database/prepare-test-database.ts"
"test:db:migrations": "ts-node ... test/database/validate-test-database-migrations.ts"
"test:integration": "npm run test:db:prepare && jest --config ./test/jest-integration.json"
"test:e2e:db": "npm run test:db:prepare && jest --config ./test/jest-db-e2e.json"
"quality": "format:check && lint && typecheck && test && test:e2e && build"
"quality:full": "quality && test:db:migrations && test:integration && test:e2e:db"
```

All scripts executed successfully during validation.

## 17. Quality Gate Design

| Gate | Includes DB tests | When to use |
|------|-------------------|-------------|
| `npm run quality` | No | Fast local/CI baseline without MSSQL |
| `npm run quality:full` | Yes | Full foundation check when Docker MSSQL is running |

Chaining uses `&&` — stops on first failure.

## 18. Future Data-Access Testing Conventions

Future module persistence tests should:

- Use `catechism_api_test` (or guarded unique `_test` name) only
- Run `test:db:prepare` / migration validation before suites
- Cover happy path, constraints, FKs, transactions where relevant
- Isolate test data per case/suite; avoid order dependence
- Never depend on `catechism_api`
- Clean up or reset state explicitly when business tables exist
- Keep `synchronize=false`; schema changes via migrations only

## 19. Future Migration Workflow

When adding/changing entities:

1. Update entity
2. Generate/review migration
3. Run migration against local dev DB (`catechism_api`)
4. Run `npm run test:db:migrations` (fresh/current test DB)
5. Run `npm run test:integration` and `npm run test:e2e:db`
6. Understand revert behavior before production
7. Never use `synchronize`

## 20. Bitbucket CI Readiness

Future pipeline can call (Linux, no WSL):

```bash
npm ci
npm run quality          # no MSSQL required
npm run quality:full     # requires MSSQL service + test env
```

Requirements documented:

- Node **22.23.1**
- MSSQL container/service on reachable host/port
- `.env.test` or CI env vars: `DB_NAME=catechism_api_test`, `DB_HOST`, `DB_PORT`, credentials
- Non-interactive; correct exit codes verified

No `bitbucket-pipelines.yml` created in this prompt.

## 21. Commands Executed

```text
node --version                    → v22.23.1
npm --version                     → 10.9.8
npm run format                    → PASS
npm run format:check              → PASS
npm run lint                      → PASS
npm run typecheck                 → PASS
npm test                          → 34 passed
npm run test:e2e                  → 5 passed (2 suites, DB-free only)
npm run test:cov                  → PASS
npm run build                     → PASS
npm audit --audit-level=moderate  → 0 vulnerabilities
npm run test:db:prepare           → Test database ready: catechism_api_test
npm run test:db:migrations        → No migrations pending
npm run test:integration          → 9 passed
npm run test:e2e:db               → 1 passed
npm run quality                   → PASS
npm run quality:full              → PASS
wsl docker compose ps             → mssql + api healthy
```

## 22. Validation Results

| Check | Status |
|-------|--------|
| Format / lint / typecheck | **PASS** |
| Unit tests | **PASS** (34) |
| Infrastructure e2e (DB-free) | **PASS** (5) |
| Test DB prepare | **PASS** |
| Migration validation (test DB) | **PASS** |
| DB integration tests | **PASS** (9) |
| DB-aware app e2e | **PASS** (1) |
| `quality` | **PASS** |
| `quality:full` | **PASS** |
| Build | **PASS** |
| npm audit (moderate+) | **PASS** (0 issues) |
| Docker stack healthy | **PASS** |
| Dev DB via API container | **PASS** (API healthy on port 3000) |

## 23. Database Safety Review

- Test tooling refuses `catechism_api` and non-`_test` names before DDL
- Integration tests assert `DB_NAME()` is the dedicated test database
- No `docker compose down -v` executed
- No production or development database dropped
- `catechism_api_test` created alongside existing `catechism_api` on same MSSQL instance
- Credentials loaded from env files; never printed in scripts or test output

## 24. Security Review

- No secrets committed; `.env.test` gitignored
- No plaintext password storage introduced
- No client-side authorization bypass
- No health endpoint redesign exposing DB internals
- Global exception filter behavior unchanged (Prompt #003 regression covered by existing e2e)
- Test DB guard prevents accidental destructive ops on dev DB
- Least privilege: test scripts connect to `master` only for create/drop, then use test DB for TypeORM

## 25. Git Status / Scope Summary

- **No git commit** (per prompt and project rules)
- Scope limited to test infrastructure, env template, package scripts, and one Jest config fix
- No business entities, modules, or migrations added
- No `bitbucket-pipelines.yml`
- No Prompt #007 work

## 26. Rules Compliance Review

| Rule | Compliance |
|------|------------|
| `PROJECT_RULES.md` | TypeScript strict, DTO/config separation, English source, no secrets in Git |
| `AGENTS.md` | Report in `docs/`, no commit, scope contained |
| Security/privacy rules | Server-side patterns preserved; no child data exposed |
| Engineering baseline | Thin test helpers in `test/database/`, portable Node scripts |
| Prompt #006 scope | Foundation DB testing only; no business schema |

## 27. Known Issues / Assumptions

1. **Host-side migration CLI (`npm run migration:show`)** requires `DB_PORT=14330` (or `MSSQL_PUBLISH_PORT`) in `.env` when running from Windows host against WSL Docker. The API container uses internal `DB_HOST=mssql:1433` and is unaffected. Test scripts handle port via `loadTestEnvironment()`.

2. **Jest e2e separation fix:** `database-app.db.e2e-spec.ts` matched `.e2e-spec.ts$` and was incorrectly included in DB-free `test:e2e`. Fixed with `testPathIgnorePatterns` for `*.db.e2e-spec.ts`.

3. **MSSQL must be running** before `quality:full`, `test:integration`, or `test:e2e:db`. Tests fail clearly on connection error (no silent skip).

4. **Test DB preserved** between runs for speed; use `npm run test:db:prepare -- --reset` when a clean schema is needed (future business tables).

5. **`LegacyRouteConverter` warnings** from NestJS/path-to-regexp during e2e — pre-existing, non-blocking.

## 28. Out-of-Scope Confirmation

Not implemented (as required):

- Business entities (users, roles, parish, classes, etc.)
- Dummy tables for testing
- Meaningless migrations
- Testcontainers / second MSSQL container
- `bitbucket-pipelines.yml`
- Health endpoint DB readiness probe
- Prompt #007 audit/hardening
- Git commit

## 29. Recommended Next Step

**Prompt #007 — Final Backend Foundation Audit + Hardening**

Should audit Prompts #001–#006, review config consistency, Docker/WSL developer experience, logging/security, migrations/testing, remove foundation technical debt, decide on readiness endpoint, and prepare architecture handoff before Auth/Users/Roles — with first Git commit only if explicitly instructed in that prompt.
