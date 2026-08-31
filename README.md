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
3. Optional: enable dev RBAC demo routes for Postman (`AUTH_RBAC_DEMO_ENABLED=true` in `.env`)
4. Start the API: `npm run start:dev`
5. Import the Postman collection and environment from `docs/postman/` (see local handoff report in `docs/` for sample credentials)

The seed command is manual, development-only, and refuses `NODE_ENV=production` or unknown database names. Dev RBAC demo endpoints require explicit opt-in and are never registered in production.

After schema changes that add parish or academic structure permissions, re-run `npm run seed:auth-rbac` on a development database to refresh sample permission assignments.

Optional local domain demo data (parish + academic year + catechism levels):

```powershell
npm run seed:parish-academic
```

This command is manual, development-only, idempotent, and uses public module services only.

Optional local class/enrollment demo data (memberships, classes, students, guardians, catechist assignments, enrollments):

```powershell
npm run seed:class-enrollment
```

Optional local curriculum demo data (published curriculum, topics, lessons, content, assignment for demo level):

```powershell
npm run seed:curriculum-demo
```

Prerequisites (run in order): `npm run seed:auth-rbac`, then `npm run seed:parish-academic`, then `npm run seed:class-enrollment`, then `npm run seed:curriculum-demo`.

This command is manual, development-only, idempotent, and uses public module services only. Sample users (`admin@`, `catechist@`, `parent@local.catechism.test`) gain scoped links after this seed runs.

## Parish API

Authenticated parish endpoints (require JWT + RBAC):

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/parishes` | `parishes.manage` |
| `GET` | `/api/v1/parishes` | `parishes.read` |
| `GET` | `/api/v1/parishes/:id` | `parishes.read` |
| `PATCH` | `/api/v1/parishes/:id` | `parishes.manage` |
| `PATCH` | `/api/v1/parishes/:id/status` | `parishes.manage` |

List query parameters: `page`, `limit`, `sortBy`, `sort`, optional `status`, optional `search`.

## Academic structure API

Authenticated academic year and catechism level endpoints (require JWT + RBAC):

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/parishes/:parishId/academic-years` | `academic-years.manage` |
| `GET` | `/api/v1/parishes/:parishId/academic-years` | `academic-years.read` |
| `GET` | `/api/v1/academic-years/:id` | `academic-years.read` |
| `PATCH` | `/api/v1/academic-years/:id` | `academic-years.manage` |
| `PATCH` | `/api/v1/academic-years/:id/status` | `academic-years.manage` |
| `POST` | `/api/v1/parishes/:parishId/catechism-levels` | `catechism-levels.manage` |
| `GET` | `/api/v1/parishes/:parishId/catechism-levels` | `catechism-levels.read` |
| `GET` | `/api/v1/catechism-levels/:id` | `catechism-levels.read` |
| `PATCH` | `/api/v1/catechism-levels/:id` | `catechism-levels.manage` |
| `PATCH` | `/api/v1/catechism-levels/:id/status` | `catechism-levels.manage` |

List query parameters: `page`, `limit`, `sortBy`, `sort`, optional `status`, optional `search`.

## Class API

Authenticated class endpoints (require JWT + RBAC):

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/parishes/:parishId/classes` | `classes.manage` |
| `GET` | `/api/v1/parishes/:parishId/classes` | `classes.read` |
| `GET` | `/api/v1/classes/:id` | `classes.read` |
| `PATCH` | `/api/v1/classes/:id` | `classes.manage` |
| `PATCH` | `/api/v1/classes/:id/status` | `classes.manage` |

List query parameters: `page`, `limit`, `sortBy`, `sort`, optional `academicYearId`, optional `catechismLevelId`, optional `status`, optional `search`.

Class lifecycle: `PLANNED` → `ACTIVE` → `COMPLETED` or `CANCELLED`. Activation requires an ACTIVE parish, ACTIVE academic year, and ACTIVE catechism level.

## Student API

Authenticated student and guardian endpoints (require JWT + RBAC):

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/students` | `students.manage` |
| `GET` | `/api/v1/students` | `students.read` |
| `GET` | `/api/v1/students/:id` | `students.read` |
| `PATCH` | `/api/v1/students/:id` | `students.manage` |
| `GET` | `/api/v1/parishes/:parishId/students` | `students.read` |
| `POST` | `/api/v1/students/:studentId/guardians` | `student-guardians.manage` |
| `GET` | `/api/v1/students/:studentId/guardians` | `student-guardians.read` |
| `PATCH` | `/api/v1/student-guardians/:id/status` | `student-guardians.manage` |

Parish student list returns distinct profiles with at least one **ACTIVE** enrollment in the parish (optional `academicYearId`, `search` filters).

## Catechist Assignment API

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/classes/:classId/catechists` | `class-catechists.manage` |
| `GET` | `/api/v1/classes/:classId/catechists` | `class-catechists.read` |
| `PATCH` | `/api/v1/class-catechist-assignments/:id/status` | `class-catechists.manage` |

## Enrollment API

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/classes/:classId/enrollments` | `enrollments.manage` |
| `GET` | `/api/v1/classes/:classId/enrollments` | `enrollments.read` |
| `GET` | `/api/v1/students/:studentId/enrollments` | `enrollments.read` |
| `GET` | `/api/v1/enrollments/:id` | `enrollments.read` |
| `PATCH` | `/api/v1/enrollments/:id/status` | `enrollments.manage` |
| `POST` | `/api/v1/enrollments/:id/transfer` | `enrollments.manage` |

Enrollment requires an **ACTIVE** student and **ACTIVE** class. One ACTIVE enrollment per student per parish and academic year. Transfer closes the source row as `TRANSFERRED` and creates a new ACTIVE row in the target class (same parish and year).

## Scoped authorization (class domain)

Global permissions (`classes.read`, `students.read`, etc.) express capability. **Resource scope** is enforced server-side in addition to permissions:

| Role | Scope evidence |
|------|----------------|
| `SUPER_ADMIN` | Bypass (all parishes/resources) |
| `PARISH_ADMIN` | Active `parish_memberships` row for the parish |
| `CATECHIST` | Active `class_catechist_assignments` for the class (roster reads) |
| `PARENT` | Active `student_guardians` link (student/enrollment reads for linked children) |

List endpoints filter results to accessible resources (e.g. `GET /students` no longer returns all students globally for scoped roles).

See Swagger at `/api/docs` when enabled.

## Database safety

- **Development DB:** `catechism_api`
- **Test DB:** `catechism_api_test` (must end with `_test`)
- `docker compose down` preserves the MSSQL volume
- `docker compose down -v` destroys project volumes — use only when intentional

## Media storage (local-first)

Default provider is **local filesystem** — no AWS credentials required for Compose.

| Setting | Purpose |
|---------|---------|
| `MEDIA_STORAGE_PROVIDER` | `local` (default), `s3`, or `auto` (non-production only) |
| `MEDIA_LOCAL_ROOT` | Upload directory (`./storage/uploads` locally; `/app/storage/uploads` in Docker) |
| `MEDIA_MAX_IMAGE_BYTES` | 10 MiB default |
| `MEDIA_MAX_DOCUMENT_BYTES` | 25 MiB default |

**Enabled upload types (MVP):** JPEG, PNG, WebP, PDF. **AUDIO/VIDEO upload disabled** until streaming upload and HTTP Range support exist.

**Docker volume:** Compose mounts `media-uploads:/app/storage/uploads` so uploads survive container recreation.

**Switching to S3:** set `MEDIA_STORAGE_PROVIDER=s3` and configure `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, and optional credentials. Production rejects `auto` and `MEDIA_STORAGE_ALLOW_LOCAL_FALLBACK=true`. Existing assets keep their per-row `storage_provider`; reads never fall back S3→local per request.

### Media HTTP routes

| Audience | Route | Permission |
|----------|-------|------------|
| Admin | `POST /api/v1/media/assets` | `media.upload` |
| Admin | `GET /api/v1/media/assets/:id` | `media.read` |
| Admin | `GET /api/v1/media/assets/:id/content` | `media.read` |
| Learner (class) | `GET /api/v1/classes/:classId/lessons/:lessonId/media/:assetId/content` | `lesson-content.read` + scope |
| Learner (enrollment) | `GET /api/v1/enrollments/:enrollmentId/lessons/:lessonId/media/:assetId/content` | `lesson-content.read` + scope |

Learner lesson content responses enrich `image_ref` / `video_ref` blocks with a derived `mediaContentPath` (not stored in lesson JSON).

Postman collection: `docs/postman/Acutis-Education-Media.postman_collection.json`

## Question Bank API

Authenticated question bank endpoints (require JWT + RBAC + parish scope for parish-scoped routes):

| Method | Route | Permission |
|--------|-------|------------|
| `GET` | `/api/v1/parishes/:parishId/questions` | `questions.read` |
| `GET` | `/api/v1/question-versions/:versionId/export` | `questions.read` |
| `POST` | `/api/v1/parishes/:parishId/question-imports/validate` | `questions.manage` |

List query parameters: `page`, `limit`, `sortBy` (`updatedAt` default), `sort`, optional `status`, `sourceLocale`, `code`, `search`, `questionType`, `difficulty`, `versionStatus`, `hasDraft`, `hasPublished`, `tagId`, `tagCode`, `curriculumId`, `canonicalLessonKey` (requires `curriculumId`).

**Effective-version semantics:** filters on type, difficulty, and prompt `search` use the DRAFT version when present, otherwise the current PUBLISHED version.

**Export V1:** read-only JSON (`schemaVersion: 1`) with export-local option keys, tag codes, and curriculum links. Media `assetId` values are environment-local.

**Import:** validate-only endpoint (no database writes). Import commit is deferred.

MVP question types: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`. No generic learner question-bank routes; Practice/Exam modules consume published version snapshots via internal contracts.

## Project rules

See `PROJECT_RULES.md` and `AGENTS.md` for engineering, security, and workflow requirements.
