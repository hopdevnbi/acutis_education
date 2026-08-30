# Catechism API

Backend API for the parish catechism platform (NestJS, TypeScript strict, MSSQL, TypeORM).

## Prerequisites

- **Node.js** `22.23.1` (see `.nvmrc` / `package.json` engines)
- **npm** `>=10`
- **Docker** with MSSQL for local database development

On Windows with WSL2, Docker Engine inside Ubuntu WSL is the validated setup. Run Compose from the project directory:

```powershell
wsl docker compose up -d
```

Optional helper: `.\scripts\docker.ps1 compose up -d` (uses the default WSL distro).

## Local setup

1. Copy environment files:

   ```powershell
   copy .env.example .env
   copy .env.test.example .env.test
   ```

2. Adjust credentials in `.env` if needed (never commit real secrets).

3. Start the stack:

   ```powershell
   wsl docker compose up -d
   ```

4. Run migrations against the development database when schema changes exist:

   ```powershell
   npm run migration:run
   ```

## URLs

| Service | URL |
|---------|-----|
| API | `http://localhost:3000/api/v1` |
| Health (liveness) | `http://localhost:3000/api/v1/health` |
| Swagger (when enabled) | `http://localhost:3000/api/docs` |
| MSSQL (host) | `localhost:14330` (default publish port) |

Host-side tools use `DB_HOST=localhost`. When `DB_PORT=1433` and `MSSQL_PUBLISH_PORT=14330` are set in `.env`, npm CLI and TypeORM resolve the published Docker port automatically.

Inside Docker Compose, the API connects to `mssql:1433`.

## Quality commands

| Command | Purpose |
|---------|---------|
| `npm run quality` | format, lint, typecheck, unit tests, DB-free e2e, build |
| `npm run quality:full` | `quality` + DB migration validation, integration tests, DB-aware e2e (requires MSSQL) |

## Continuous integration

Bitbucket Pipelines (`bitbucket-pipelines.yml`) uses Node `22.23.1-bookworm-slim`.

| Trigger | Steps |
|---------|-------|
| Pull requests | Quality — `npm ci`, `npm run quality`, `npm audit --audit-level=moderate` |
| `master` | Quality → Database Tests → Docker Build |
| Custom `full-ci` | Same three gates as `master` (manual validation) |

Database Tests attach an MSSQL service container, wait for readiness, then run migration validation, integration tests, and DB-aware e2e against `catechism_api_test`. Docker Build validates `docker build --target production`.

Configure a secured Bitbucket repository variable `DB_PASSWORD` (SQL Server complexity rules apply). Do not commit real secrets.

The pipeline runs when the repository is hosted on Bitbucket. There is no deployment or image push yet.

## Test layers

| Command | Database |
|---------|----------|
| `npm test` | No (unit) |
| `npm run test:e2e` | No (infrastructure e2e) |
| `npm run test:integration` | Yes (`catechism_api_test`) |
| `npm run test:e2e:db` | Yes (`catechism_api_test`) |

Integration tests use a dedicated test database (`catechism_api_test`). The development database (`catechism_api`) is protected by safety guards in test tooling.

## Migrations

| Command | Purpose |
|---------|---------|
| `npm run migration:create -- DescriptiveName` | Create an empty migration file |
| `npm run migration:generate -- DescriptiveName` | Generate migration from entity changes |
| `npm run migration:run` | Apply pending migrations (dev DB) |
| `npm run migration:show` | List migration status |
| `npm run migration:revert` | Revert last migration |
| `npm run test:db:migrations` | Validate migrations against test DB |

TypeORM uses `synchronize=false` and `migrationsRun=false` in all environments.

## Local Auth/RBAC demo

1. Apply migrations: `npm run migration:run`
2. Seed local sample roles, permissions, and accounts: `npm run seed:auth-rbac`
3. Start the API: `npm run start:dev`
4. Import the Postman collection and environment from `docs/postman/` (see local handoff report in `docs/` for sample credentials)

The seed command is manual, development-only, and refuses `NODE_ENV=production` or unknown database names.

## Database safety

- **Development DB:** `catechism_api`
- **Test DB:** `catechism_api_test` (must end with `_test`)
- `docker compose down` preserves the MSSQL volume
- `docker compose down -v` destroys project volumes — use only when intentional

## Project rules

See `PROJECT_RULES.md` and `AGENTS.md` for engineering, security, and workflow requirements.
