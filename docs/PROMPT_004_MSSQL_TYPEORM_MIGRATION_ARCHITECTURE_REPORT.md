# PROMPT 004 — MSSQL + TypeORM Migration Architecture Report

## 1. Objective

Establish a production-oriented MSSQL data-access foundation using TypeORM and `@nestjs/typeorm`: typed database configuration, NestJS integration, migration tooling, naming conventions, and tests — without business entities, Docker, or live database connectivity validation.

## 2. State Inherited From Prompt #003

- NestJS 11.2.3 with strict TypeScript, ESLint, Prettier, Jest/e2e
- Centralized config (`@nestjs/config` + Joi + `AppConfigService`)
- Global validation, exception filter, pino logging, request ID, Swagger
- Shared bootstrap via `configureApplication()`
- `GET /api/v1/health` lightweight liveness endpoint
- E2e used full `AppModule` (no database yet)
- No MSSQL, ORM, migrations, or Docker

## 3. ORM Decision

**Selected: TypeORM 0.3.x + `@nestjs/typeorm` 11.x + `mssql` driver**

Reasons (aligned with prompt and `PROJECT_RULES.md`):

- First-class NestJS integration (`TypeOrmModule.forRootAsync`)
- Mature MSSQL support via `mssql`/`tedious`
- Migration-driven schema workflow
- Repository patterns fit future domain modules
- Compatible with Node.js 22.23.1, NestJS 11.2.3, TypeScript 5.9.x

No compatibility blocker found. NestJS major version was **not** upgraded. Prisma/MikroORM/Sequelize/Drizzle were not introduced.

## 4. Exact Dependencies Added

| Package | Version | Purpose |
| --- | --- | --- |
| `@nestjs/typeorm` | 11.0.3 | NestJS TypeORM integration |
| `typeorm` | 0.3.31 | ORM core + CLI |
| `mssql` | 11.0.1 | MSSQL driver |
| `typeorm-naming-strategies` | 4.1.0 | `SnakeNamingStrategy` for snake_case DB names |
| `dotenv` | 16.6.1 (dev) | Load `.env` / `.env.example` for TypeORM CLI |

`npm audit`: **0 vulnerabilities**

## 5. Files Created

| Path | Purpose |
| --- | --- |
| `src/config/database.config.types.ts` | `DatabaseConfiguration` interface |
| `src/config/database.configuration.ts` | DB config factory + parsers |
| `src/config/database.configuration.spec.ts` | DB parsing unit tests |
| `src/database/database.constants.ts` | Migration table name, entity suffix |
| `src/database/database.module.ts` | `TypeOrmModule.forRootAsync` |
| `src/database/typeorm-options.factory.ts` | Shared TypeORM options builders |
| `src/database/typeorm-options.factory.spec.ts` | TypeORM options unit tests |
| `src/database/data-source.ts` | TypeORM CLI `DataSource` entry point |
| `src/database/data-source.spec.ts` | DataSource load unit test |
| `src/database/migrations/.gitkeep` | Empty migrations directory (no business schema yet) |
| `test/infrastructure-test-app.module.ts` | E2e module **without** `DatabaseModule` |
| `test/setup-env.ts` | Placeholder DB env for Jest (no live DB) |
| `docs/PROMPT_004_MSSQL_TYPEORM_MIGRATION_ARCHITECTURE_REPORT.md` | This report |

## 6. Files Modified

| Path | Change |
| --- | --- |
| `package.json` / `package-lock.json` | TypeORM/MSSQL deps + migration scripts + Jest setup |
| `src/app.module.ts` | Imports `DatabaseModule` |
| `src/config/config.module.ts` | Loads `databaseConfiguration` |
| `src/config/app-config.service.ts` | Adds `getDatabaseConfiguration()` |
| `src/config/env.validation.ts` | Joi rules for DB variables |
| `src/config/env.validation.spec.ts` | DB validation tests |
| `.env.example` | DB variables with non-secret placeholder password |
| `test/create-test-application.ts` | Uses `InfrastructureTestAppModule` (no DB) |
| `test/jest-e2e.json` | Loads `test/setup-env.ts` |

Prompt #001–#003 rule files were not modified.

## 7. Database Configuration

| Variable | Purpose | Default / behavior |
| --- | --- | --- |
| `DB_HOST` | MSSQL host | Required (no empty value) |
| `DB_PORT` | MSSQL port | `1433` |
| `DB_NAME` | Database name | Required |
| `DB_USER` | SQL login | Required |
| `DB_PASSWORD` | SQL password | Required; never logged |
| `DB_ENCRYPT` | TLS encryption | `true` when omitted |
| `DB_TRUST_SERVER_CERTIFICATE` | Accept self-signed certs | `true` in **development** only when omitted; `false` in **test/production** |

**Production/local security behavior:**

- Encryption defaults to **on** (`DB_ENCRYPT=true`)
- `trustServerCertificate` defaults to **false** outside development
- Development may opt into `DB_TRUST_SERVER_CERTIFICATE=true` for local/self-signed MSSQL (Prompt #005 Docker scenario)
- No insecure production defaults were introduced to simplify local dev

Access path: `AppConfigService.getDatabaseConfiguration()` — application code does not read `process.env` directly.

## 8. Environment Validation

Joi schema extended with required `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`; validated `DB_PORT`; optional boolean parsing for `DB_ENCRYPT` and `DB_TRUST_SERVER_CERTIFICATE`.

Fail-fast: invalid/missing DB values prevent NestJS bootstrap via `ConfigModule` validation.

Typed parsers in `buildDatabaseConfiguration()` apply NODE_ENV-aware defaults for TLS trust after Joi passes.

## 9. `.env.example` Changes

Added MSSQL variables with `DB_PASSWORD=change-me-locally` and comments stating:

- not a production secret
- developers must override in local `.env`
- production secrets belong in the deployment secret store

No real credentials committed. `.env` remains gitignored.

## 10. Database Module Architecture

`DatabaseModule` wraps:

```typescript
TypeOrmModule.forRootAsync({
  inject: [AppConfigService],
  useFactory: (appConfigService) =>
    buildTypeOrmModuleOptions(
      appConfigService.getDatabaseConfiguration(),
      appConfigService.getNodeEnv(),
      'nestjs',
    ),
});
```

`AppModule` imports `DatabaseModule` for production/dev runtime. Normal application startup **will** attempt a DB connection when the full app runs.

## 11. TypeORM Options

| Setting | Value |
| --- | --- |
| `type` | `mssql` |
| `synchronize` | **`false` always** |
| `migrationsRun` | **`false` always** (explicit migration commands only) |
| `entities` | Glob `src/**/*.entity.ts` (compiled: `.js` from `dist/`) |
| `migrations` | `src/database/migrations/*.ts` (compiled: `dist/database/migrations/*.js`) |
| `autoLoadEntities` | `true` (NestJS module options only) |
| `migrationsTableName` | `typeorm_migrations` |
| `namingStrategy` | `SnakeNamingStrategy` (typeorm-naming-strategies) |
| `logging` | development: `error`, `warn`, `schema`, `migration`; test/production: `error` |
| TLS | `options.encrypt`, `options.trustServerCertificate` from config |

Runtime-specific globs prevent executing both `.ts` and `.js` migration duplicates.

## 12. Naming Convention

**Database naming (MSSQL via SnakeNamingStrategy):**

- Tables: `snake_case` plural (e.g. `users`, `academic_years`)
- Columns: `snake_case` (e.g. `created_at`, `student_id`)
- TypeScript entities: `PascalCase` classes in `*.entity.ts` files; strategy maps to snake_case in DB

No speculative custom naming package beyond maintained `typeorm-naming-strategies`.

## 13. Future Entity Convention (no entities created)

Future entities should:

- Use `*.entity.ts` suffix for discovery/autoLoadEntities
- Define explicit column types and nullability
- Use `created_at` / `updated_at` where appropriate
- Define FK delete/update behavior intentionally
- Never rely on `synchronize`
- Not be exposed directly as API DTOs
- Avoid premature `BaseEntity` inheritance until real duplication exists

## 14. UUID Strategy

**Decision: application-generated UUID v4**, stored as MSSQL `uniqueidentifier`.

- Generate with `crypto.randomUUID()` in the service/domain layer (or `@BeforeInsert` when justified)
- Map with `@PrimaryColumn('uniqueidentifier')` or equivalent explicit TypeORM column type
- Rationale: predictable IDs across layers, easier testing, works well with TypeORM + MSSQL without hidden DB defaults

No UUID test table was created in this prompt.

## 15. Migration Architecture

| Concern | Path / command |
| --- | --- |
| Source migrations | `src/database/migrations/*.ts` |
| Compiled migrations | `dist/database/migrations/*.js` |
| Create empty migration | `npm run migration:create -- src/database/migrations/<Name>` |
| Generate from entity diff | `npm run migration:generate -- src/database/migrations/<Name>` |
| Run pending | `npm run migration:run` (dev/ts) / `npm run migration:run:prod` (compiled) |
| Revert latest | `npm run migration:revert` |
| Show status | `npm run migration:show` |
| Metadata table | `typeorm_migrations` |

**Development:** TypeORM CLI via `typeorm-ts-node-commonjs` + `src/database/data-source.ts`

**Production:** `typeorm migration:run -d dist/database/data-source.js` after `npm run build`

No meaningless initial migration was added (migrations folder is intentionally empty).

## 16. CLI DataSource

`src/database/data-source.ts`:

1. Loads `.env` if present, else `.env.example` (CLI convenience only)
2. Calls shared `buildDatabaseConfiguration(process.env)`
3. Builds options via shared `buildTypeOrmDataSourceOptions(..., 'cli-typescript')`
4. Exports `default new DataSource(...)`

NestJS runtime uses the same parsers/factory via `AppConfigService` + `buildTypeOrmModuleOptions()`. No duplicate parsing logic.

## 17. Test Isolation

**Decision:** `InfrastructureTestAppModule` (in `test/`) mirrors production bootstrap modules **except** it excludes `DatabaseModule`.

- `test/create-test-application.ts` imports `InfrastructureTestAppModule`
- Health, error contract, Swagger, and request ID e2e tests run without MSSQL
- No production runtime flag like `DISABLE_DATABASE=true`
- `test/setup-env.ts` supplies placeholder DB env so Joi/config unit tests pass without a live server

Unit/lint/typecheck/build do **not** require MSSQL. Full `AppModule` startup does require DB config values and will attempt connection (Prompt #005).

## 18. Tests Added / Updated

| Test | Proves |
| --- | --- |
| `database.configuration.spec.ts` | Parsing, TLS defaults, invalid input rejection |
| `env.validation.spec.ts` (updated) | Joi DB rules, missing/invalid DB vars fail |
| `typeorm-options.factory.spec.ts` | `synchronize=false`, `migrationsRun=false`, mssql type, migration table, naming strategy, password redaction |
| `data-source.spec.ts` | CLI DataSource loads with expected options |
| E2e (unchanged behavior) | Health, 404 contract, request ID, Swagger still pass without DB module |

34 unit tests + 5 e2e tests pass.

## 19. Commands Executed

- `node --version` → `v22.23.1`
- `npm --version` → `10.9.8`
- `npm install`
- `npm run format` / `format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test` (34 tests)
- `npm run test:e2e` (5 tests)
- `npm run test:cov`
- `npm run build`
- `npm run migration:show` (loads DataSource; connection fails — no MSSQL)
- `npx typeorm-ts-node-commonjs migration:create --help`
- `npm audit`

No `git add` / `git commit` / `git push`.

## 20. Validation Results

| Check | Result |
| --- | --- |
| Node `v22.23.1` | PASS |
| npm `10.9.8` | PASS |
| Install | PASS |
| format / format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit tests | PASS (34) |
| e2e tests | PASS (5) |
| coverage | PASS |
| build | PASS |
| migration CLI DataSource load | PASS (config loads from `.env.example` fallback) |
| migration CLI live connection | **Expected FAIL** — `ConnectionError: Failed to connect to localhost:1433` (no MSSQL yet) |
| npm audit | PASS (0 vulnerabilities) |

**Important distinction:**

- Configuration and CLI wiring: validated
- Live MSSQL connectivity: **intentionally NOT tested** (deferred to Prompt #005)

## 21. Security Review

- `DB_PASSWORD` not logged by project code (`buildSanitizedTypeOrmOptionsForLogging` redacts password)
- No real DB credentials in Git; `.env.example` uses `change-me-locally`
- `.env` remains gitignored
- `synchronize: false` enforced
- `migrationsRun: false` (no silent auto-migrate on startup)
- Production TLS trust defaults remain secure (`trustServerCertificate` false outside development)
- TypeORM logging conservative in test/production (`error` only)
- TypeORM/MSSQL internal errors are not mapped to API responses yet; Prompt #003 global filter still returns safe generic 500s

## 22. Existing API Regression

- `GET /api/v1/health` unchanged (`{ "status": "ok" }`) — e2e pass
- Global 404 error contract + request ID — e2e pass
- Swagger OpenAPI JSON when enabled — e2e pass

Public health endpoint does **not** depend on MSSQL.

## 23. Git Status / Scope Summary

No initial commit yet. All Prompt #001–#004 files remain untracked. Scope limited to database infrastructure; no business entities, Docker, auth, or CI/CD.

## 24. Rules Compliance Review

- Migration-driven schema; **`synchronize: false`**
- Config from environment via centralized module; no secrets in Git
- TypeScript strict; English naming; feature-oriented modules
- Tests deterministic without live DB for current suites
- No speculative business modules or entities
- Local report under `docs/`; no commit

## 25. Known Issues / Assumptions

- **`npm run migration:show`** requires env vars (from `.env` or `.env.example` fallback) and attempts a real connection — fails until Prompt #005 MSSQL is running. This is expected.
- **Production app startup** imports `DatabaseModule` and will fail to connect without reachable MSSQL + valid credentials.
- **Jest/e2e** use `InfrastructureTestAppModule` without DB; full integration tests come in Prompt #006.
- **typeorm 0.3.31** installed (latest 0.3.x at install time); remains within `@nestjs/typeorm@11` peer range.
- **Node PATH:** use Node `v22.23.1` consistently (same note as Prompt #002/003).

## 26. Out-of-Scope Confirmation

This prompt did **not** implement:

- Business/domain entities or tables
- Docker / Docker Compose / MSSQL container
- Live MSSQL connectivity validation
- Auth / RBAC / catechism modules
- Bitbucket Pipelines / CI/CD
- Database health/readiness endpoint changes

## 27. Recommended Next Step

**Prompt #005 — Docker + Docker Compose + Local MSSQL Runtime**

- Dockerfile(s) for API
- MSSQL container + persistent volume
- Compose-based local dev stack
- Health checks and startup ordering
- Real API ↔ MSSQL connectivity validation
- Local migration execution against Docker MSSQL

Do **not** implement Prompt #005 in this prompt.
