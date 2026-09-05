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

| Service                | URL                                      |
| ---------------------- | ---------------------------------------- |
| API                    | `http://localhost:3000/api/v1`           |
| Health (liveness)      | `http://localhost:3000/api/v1/health`    |
| Swagger (when enabled) | `http://localhost:3000/api/docs`         |
| MSSQL (host)           | `localhost:14330` (default publish port) |

Host-side tools use `DB_HOST=localhost`. When `DB_PORT=1433` and `MSSQL_PUBLISH_PORT=14330` are set in `.env`, npm CLI and TypeORM resolve the published Docker port automatically.

Inside Docker Compose, the API connects to `mssql:1433`.

## Family Portal API

`FamilyPortalModule` is a **stateless, zero-table** read-model layer. It owns no entities,
repositories, migrations, or business data. It composes narrow public snapshots from Class,
Enrollment, Student, Learning Progress, and Exam.

### Architecture

- Public export: `FamilyPortalService` only
- No `TypeOrmModule`, no `forwardRef`, no reverse imports from owning modules
- Permission uses existing domain read permissions (`class.read`, `enrollments.read`,
  `learning-progress.read`, `practice.read`, `exam.result.read`) — **not** a
  `family-portal.read` permission
- Scope is enforced server-side: Catechist via ACTIVE class assignment; Parent via ACTIVE
  guardian relationship

### Routes (exactly six GET)

Authenticated Catechist routes require existing domain read permissions and an ACTIVE class
assignment:

| Method | Route                                          | Purpose                                                                 |
| ------ | ---------------------------------------------- | ----------------------------------------------------------------------- |
| `GET`  | `/api/v1/me/catechist/context`                 | Assigned-class count and deterministic parish IDs                       |
| `GET`  | `/api/v1/me/catechist/classes`                 | Paginated assigned classes (`limit` max 50)                             |
| `GET`  | `/api/v1/me/catechist/classes/:classId/roster` | Assigned-class roster with compact learning, practice, and exam metrics |

Authenticated Parent routes require existing domain read permissions and ACTIVE guardian
relationships:

| Method | Route                                                  | Purpose                                              |
| ------ | ------------------------------------------------------ | ---------------------------------------------------- |
| `GET`  | `/api/v1/me/parent/context`                            | Linked-child and active-enrollment counts            |
| `GET`  | `/api/v1/me/parent/children`                           | Linked children with active enrollment/class context |
| `GET`  | `/api/v1/me/parent/enrollments/:enrollmentId/progress` | Compact progress for a linked child's enrollment     |

### Actor / scope rules

- Parish Admin and Super Admin do **not** impersonate `/me/catechist/*` or `/me/parent/*`
- Parents are denied formal Exam attempt starts and class-wide Learning Progress aggregates
- Parent progress is compact (learning/practice/exam metrics) — **no** per-lesson detail array
- Parent children list is unpaginated in MVP (naturally bounded guardian-child count); Catechist
  class/roster collections are paginated with deterministic sorting

### Performance

Roster and children responses use bounded batch calls (no per-learner service loops):

- Catechist roster: ≤5 orchestration-level calls
- Parent children: ≤4 bounded batch calls
- Parent progress: relationship resolution + one Learning Progress composition

### Demo seed (dev/test only)

Orchestration seed composing existing domain demos (auth → parish → class/enrollment →
curriculum → question bank → learning progress → exam):

```powershell
npm run seed:family-portal-demo
```

Idempotent. Guarded to `catechism_api` / `catechism_api_test` and refuses `NODE_ENV=production`.

| Actor     | Email                               | Password (local sample) |
| --------- | ----------------------------------- | ----------------------- |
| Catechist | `catechist@local.catechism.test`    | `LocalDev!Sample2026`   |
| Parent    | `parent@local.catechism.test`       | `LocalDev!Sample2026`   |

### Postman

Collection: `docs/postman/Acutis-Education-Family-Portal.postman_collection.json`

Covers Catechist/Parent positive flows plus Parent↔Catechist denial, Parent exam-start denial,
Parent class-wide LP denial, and unknown enrollment 404.

### Tests

```powershell
npm test -- --runInBand --testPathPattern=family-portal
npm run test:integration -- --testPathPattern=family-portal-demo-seed
npm run test:e2e:db
npm run quality:full
```

### Deferred

Attendance, Schedule, Prayer Memorization, Notifications, Recent Activity, and all write
operations remain out of scope for this phase.

**Family Portal backend phase is complete** for Catechist + Parent supporting read APIs.

## Quality commands

| Command                | Purpose                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `npm run quality`      | format, lint, typecheck, unit tests, DB-free e2e, build                               |
| `npm run quality:full` | `quality` + DB migration validation, integration tests, DB-aware e2e (requires MSSQL) |

## Continuous integration

Bitbucket Pipelines (`bitbucket-pipelines.yml`) uses Node `22.23.1-bookworm-slim`.

| Trigger          | Steps                                                                     |
| ---------------- | ------------------------------------------------------------------------- |
| Pull requests    | Quality — `npm ci`, `npm run quality`, `npm audit --audit-level=moderate` |
| `master`         | Quality → Database Tests → Docker Build                                   |
| Custom `full-ci` | Same three gates as `master` (manual validation)                          |

Database Tests attach an MSSQL service container, wait for readiness, then run migration validation, integration tests, and DB-aware e2e against `catechism_api_test`. Docker Build validates `docker build --target production`.

Configure a secured Bitbucket repository variable `DB_PASSWORD` (SQL Server complexity rules apply). Do not commit real secrets.

The pipeline runs when the repository is hosted on Bitbucket. There is no deployment or image push yet.

## Test layers

| Command                    | Database                   |
| -------------------------- | -------------------------- |
| `npm test`                 | No (unit)                  |
| `npm run test:e2e`         | No (infrastructure e2e)    |
| `npm run test:integration` | Yes (`catechism_api_test`) |
| `npm run test:e2e:db`      | Yes (`catechism_api_test`) |

Integration tests use a dedicated test database (`catechism_api_test`). The development database (`catechism_api`) is protected by safety guards in test tooling.

## Migrations

| Command                                         | Purpose                                |
| ----------------------------------------------- | -------------------------------------- |
| `npm run migration:create -- DescriptiveName`   | Create an empty migration file         |
| `npm run migration:generate -- DescriptiveName` | Generate migration from entity changes |
| `npm run migration:run`                         | Apply pending migrations (dev DB)      |
| `npm run migration:show`                        | List migration status                  |
| `npm run migration:revert`                      | Revert last migration                  |
| `npm run test:db:migrations`                    | Validate migrations against test DB    |

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

| Method  | Route                         | Permission        |
| ------- | ----------------------------- | ----------------- |
| `POST`  | `/api/v1/parishes`            | `parishes.manage` |
| `GET`   | `/api/v1/parishes`            | `parishes.read`   |
| `GET`   | `/api/v1/parishes/:id`        | `parishes.read`   |
| `PATCH` | `/api/v1/parishes/:id`        | `parishes.manage` |
| `PATCH` | `/api/v1/parishes/:id/status` | `parishes.manage` |

List query parameters: `page`, `limit`, `sortBy`, `sort`, optional `status`, optional `search`.

## Academic structure API

Authenticated academic year and catechism level endpoints (require JWT + RBAC):

| Method  | Route                                         | Permission                |
| ------- | --------------------------------------------- | ------------------------- |
| `POST`  | `/api/v1/parishes/:parishId/academic-years`   | `academic-years.manage`   |
| `GET`   | `/api/v1/parishes/:parishId/academic-years`   | `academic-years.read`     |
| `GET`   | `/api/v1/academic-years/:id`                  | `academic-years.read`     |
| `PATCH` | `/api/v1/academic-years/:id`                  | `academic-years.manage`   |
| `PATCH` | `/api/v1/academic-years/:id/status`           | `academic-years.manage`   |
| `POST`  | `/api/v1/parishes/:parishId/catechism-levels` | `catechism-levels.manage` |
| `GET`   | `/api/v1/parishes/:parishId/catechism-levels` | `catechism-levels.read`   |
| `GET`   | `/api/v1/catechism-levels/:id`                | `catechism-levels.read`   |
| `PATCH` | `/api/v1/catechism-levels/:id`                | `catechism-levels.manage` |
| `PATCH` | `/api/v1/catechism-levels/:id/status`         | `catechism-levels.manage` |

List query parameters: `page`, `limit`, `sortBy`, `sort`, optional `status`, optional `search`.

## Class API

Authenticated class endpoints (require JWT + RBAC):

| Method  | Route                                | Permission       |
| ------- | ------------------------------------ | ---------------- |
| `POST`  | `/api/v1/parishes/:parishId/classes` | `classes.manage` |
| `GET`   | `/api/v1/parishes/:parishId/classes` | `classes.read`   |
| `GET`   | `/api/v1/classes/:id`                | `classes.read`   |
| `PATCH` | `/api/v1/classes/:id`                | `classes.manage` |
| `PATCH` | `/api/v1/classes/:id/status`         | `classes.manage` |

List query parameters: `page`, `limit`, `sortBy`, `sort`, optional `academicYearId`, optional `catechismLevelId`, optional `status`, optional `search`.

Class lifecycle: `PLANNED` → `ACTIVE` → `COMPLETED` or `CANCELLED`. Activation requires an ACTIVE parish, ACTIVE academic year, and ACTIVE catechism level.

## Class Operations API (Attendance)

**ATTENDANCE + CLASS OPERATIONS BACKEND IMPLEMENTATION COMPLETE**

**RUNTIME VALIDATION DEFERRED TO FE INTEGRATION / STABILIZATION PHASE** (Fast Implementation Mode). Demo seed and Postman artifacts are ready for manual/FE integration later; do not assume tests were executed in this phase.

### Architecture

- One module: `class-operations`
- Three owned tables: `class_sessions`, `class_session_roster`, `attendance_records`
- Owns session occurrences, frozen roster snapshots, and attendance marks
- Public facade export: `ClassOperationsService` only
- Not Family Portal; not Learning Progress (no composition writes either way)

### Lifecycle

`SCHEDULED` → `COMPLETED` | `CANCELLED` (no hard delete; no reopen; no recurring schedule templates in MVP).

### Attendance

Statuses: `PRESENT` | `ABSENT` | `LATE` | `EXCUSED`.  
**UNMARKED** = roster row with no `attendance_records` row (`attendanceStatus: null` in history responses). Persistence enum does not include UNMARKED.

### Roles / scope

| Actor | Access |
| ----- | ------ |
| Assigned Catechist (ACTIVE) | Staff session + attendance + generic enrollment reads for assigned class |
| ParishAdmin | Own parish only |
| SuperAdmin | Generic staff routes globally |
| Parent | `/me/parent/...` linked-child only (ACTIVE guardian); no staff writes; no generic enrollment routes |
| Student | `/me/learner/...` self enrollment only; no staff writes; no generic enrollment routes |

No `/me` admin impersonation fallback. Permission never replaces scope.

### Summary formula

`attendanceRatePercent = round(100 * (presentCount + lateCount) / totalSessions)` when `totalSessions > 0`, else `0`.  
Eligible: roster ∩ `COMPLETED` only. `LATE` counts as present; `EXCUSED` does not; `UNMARKED` lowers the rate. `SCHEDULED`/`CANCELLED` excluded. Same formula for all actors.

History survives enrollment `TRANSFERRED` / `WITHDRAWN` / `COMPLETED` (roster membership).

### Note privacy

Staff history may include `note`. Parent/Student history omits `note`. Summaries never include notes. Audit actor IDs are never returned.

### Routes (15)

| Method | Route | Permission | Notes |
| ------ | ----- | ---------- | ----- |
| `POST` | `/api/v1/classes/:classId/sessions` | `class-sessions.manage` | Create SCHEDULED + freeze roster |
| `GET` | `/api/v1/classes/:classId/sessions` | `class-sessions.read` | Paginated; max limit 50 |
| `GET` | `/api/v1/class-sessions/:sessionId` | `class-sessions.read` | Detail + counts |
| `PATCH` | `/api/v1/class-sessions/:sessionId` | `class-sessions.manage` | Title/times while SCHEDULED |
| `POST` | `/api/v1/class-sessions/:sessionId/cancel` | `class-sessions.manage` | Soft cancel |
| `POST` | `/api/v1/class-sessions/:sessionId/complete` | `class-sessions.manage` | Locks attendance |
| `POST` | `/api/v1/class-sessions/:sessionId/roster/refresh` | `class-sessions.manage` | SCHEDULED + zero marks |
| `GET` | `/api/v1/class-sessions/:sessionId/attendance` | `attendance.read` | Staff roster + marks |
| `PUT` | `/api/v1/class-sessions/:sessionId/attendance` | `attendance.manage` | Bulk upsert |
| `GET` | `/api/v1/enrollments/:enrollmentId/attendance` | `attendance.read` | Staff history |
| `GET` | `/api/v1/enrollments/:enrollmentId/attendance-summary` | `attendance.read` | Staff summary |
| `GET` | `/api/v1/me/parent/enrollments/:enrollmentId/attendance` | `attendance.read` | Parent linked-child |
| `GET` | `/api/v1/me/parent/enrollments/:enrollmentId/attendance-summary` | `attendance.read` | Parent summary |
| `GET` | `/api/v1/me/learner/enrollments/:enrollmentId/attendance` | `attendance.read` | Student self |
| `GET` | `/api/v1/me/learner/enrollments/:enrollmentId/attendance-summary` | `attendance.read` | Student summary |

History pagination: `page` default 1, `limit` default 20, max 50; sort `startsAt DESC`, `sessionId DESC`.

### Demo seed

```bash
npm run seed:class-operations-demo
```

Composes auth/rbac + parish/academic + class/enrollment seeds, then creates Class Operations demo sessions (3 COMPLETED with mixed marks + UNMARKED, 1 SCHEDULED, 1 CANCELLED) via `ClassOperationsService`. Dev/test only (`assertSafeSeedEnvironment`). Idempotent by stable session titles.

### Postman

Collection: `docs/postman/Acutis-Education-Class-Operations.postman_collection.json`  
Import into Postman; set variables after seed; no live JWTs committed.

### Deferred product scope

- Recurring schedule templates
- Notifications
- Attendance revision history
- Session reopen / DELETE
- FamilyPortal attendance composition
- LearningProgress attendance integration
- Class-wide analytics

### Bulk PUT notes

Transactional all-or-nothing; unique `(sessionId, enrollmentId)`; enrollment must be on frozen roster; note max 500 (never logged).

## Student API

Authenticated student and guardian endpoints (require JWT + RBAC):

| Method  | Route                                   | Permission                 |
| ------- | --------------------------------------- | -------------------------- |
| `POST`  | `/api/v1/students`                      | `students.manage`          |
| `GET`   | `/api/v1/students`                      | `students.read`            |
| `GET`   | `/api/v1/students/:id`                  | `students.read`            |
| `PATCH` | `/api/v1/students/:id`                  | `students.manage`          |
| `GET`   | `/api/v1/parishes/:parishId/students`   | `students.read`            |
| `POST`  | `/api/v1/students/:studentId/guardians` | `student-guardians.manage` |
| `GET`   | `/api/v1/students/:studentId/guardians` | `student-guardians.read`   |
| `PATCH` | `/api/v1/student-guardians/:id/status`  | `student-guardians.manage` |

Parish student list returns distinct profiles with at least one **ACTIVE** enrollment in the parish (optional `academicYearId`, `search` filters).

## Catechist Assignment API

| Method  | Route                                            | Permission                |
| ------- | ------------------------------------------------ | ------------------------- |
| `POST`  | `/api/v1/classes/:classId/catechists`            | `class-catechists.manage` |
| `GET`   | `/api/v1/classes/:classId/catechists`            | `class-catechists.read`   |
| `PATCH` | `/api/v1/class-catechist-assignments/:id/status` | `class-catechists.manage` |

## Enrollment API

| Method  | Route                                     | Permission           |
| ------- | ----------------------------------------- | -------------------- |
| `POST`  | `/api/v1/classes/:classId/enrollments`    | `enrollments.manage` |
| `GET`   | `/api/v1/classes/:classId/enrollments`    | `enrollments.read`   |
| `GET`   | `/api/v1/students/:studentId/enrollments` | `enrollments.read`   |
| `GET`   | `/api/v1/enrollments/:id`                 | `enrollments.read`   |
| `PATCH` | `/api/v1/enrollments/:id/status`          | `enrollments.manage` |
| `POST`  | `/api/v1/enrollments/:id/transfer`        | `enrollments.manage` |

Enrollment requires an **ACTIVE** student and **ACTIVE** class. One ACTIVE enrollment per student per parish and academic year. Transfer closes the source row as `TRANSFERRED` and creates a new ACTIVE row in the target class (same parish and year).

## Scoped authorization (class domain)

Global permissions (`classes.read`, `students.read`, etc.) express capability. **Resource scope** is enforced server-side in addition to permissions:

| Role           | Scope evidence                                                                 |
| -------------- | ------------------------------------------------------------------------------ |
| `SUPER_ADMIN`  | Bypass (all parishes/resources)                                                |
| `PARISH_ADMIN` | Active `parish_memberships` row for the parish                                 |
| `CATECHIST`    | Active `class_catechist_assignments` for the class (roster reads)              |
| `PARENT`       | Active `student_guardians` link (student/enrollment reads for linked children) |

List endpoints filter results to accessible resources (e.g. `GET /students` no longer returns all students globally for scoped roles).

See Swagger at `/api/docs` when enabled.

## Database safety

- **Development DB:** `catechism_api`
- **Test DB:** `catechism_api_test` (must end with `_test`)
- `docker compose down` preserves the MSSQL volume
- `docker compose down -v` destroys project volumes — use only when intentional

## Media storage (local-first)

Default provider is **local filesystem** — no AWS credentials required for Compose.

| Setting                    | Purpose                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| `MEDIA_STORAGE_PROVIDER`   | `local` (default), `s3`, or `auto` (non-production only)                         |
| `MEDIA_LOCAL_ROOT`         | Upload directory (`./storage/uploads` locally; `/app/storage/uploads` in Docker) |
| `MEDIA_MAX_IMAGE_BYTES`    | 10 MiB default                                                                   |
| `MEDIA_MAX_DOCUMENT_BYTES` | 25 MiB default                                                                   |

**Enabled upload types (MVP):** JPEG, PNG, WebP, PDF. **AUDIO/VIDEO upload disabled** until streaming upload and HTTP Range support exist.

**Docker volume:** Compose mounts `media-uploads:/app/storage/uploads` so uploads survive container recreation.

**Switching to S3:** set `MEDIA_STORAGE_PROVIDER=s3` and configure `MEDIA_S3_BUCKET`, `MEDIA_S3_REGION`, and optional credentials. Production rejects `auto` and `MEDIA_STORAGE_ALLOW_LOCAL_FALLBACK=true`. Existing assets keep their per-row `storage_provider`; reads never fall back S3→local per request.

### Media HTTP routes

| Audience             | Route                                                                            | Permission                    |
| -------------------- | -------------------------------------------------------------------------------- | ----------------------------- |
| Admin                | `POST /api/v1/media/assets`                                                      | `media.upload`                |
| Admin                | `GET /api/v1/media/assets/:id`                                                   | `media.read`                  |
| Admin                | `GET /api/v1/media/assets/:id/content`                                           | `media.read`                  |
| Learner (class)      | `GET /api/v1/classes/:classId/lessons/:lessonId/media/:assetId/content`          | `lesson-content.read` + scope |
| Learner (enrollment) | `GET /api/v1/enrollments/:enrollmentId/lessons/:lessonId/media/:assetId/content` | `lesson-content.read` + scope |

Learner lesson content responses enrich `image_ref` / `video_ref` blocks with a derived `mediaContentPath` (not stored in lesson JSON).

Postman collection: `docs/postman/Acutis-Education-Media.postman_collection.json`

## Question Bank API

Bounded context for parish-scoped assessment content: question roots, immutable published versions, options/correct answers, tags, and curriculum links. Internal grading and assessment snapshots are service-only (no public HTTP). Practice and Exam modules will consume published version projections — there is no generic learner question-bank browse API.

### MVP question types

`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE` only. Deferred types (short text, ordering, matching, etc.) are not active.

### Version lifecycle

- One question root per stable `code` (optional) with `ACTIVE` / `INACTIVE` status and `sourceLocale`.
- At most one `DRAFT` version per question; monotonic `versionNumber`.
- `DRAFT` is mutable; `PUBLISHED` and `ARCHIVED` are immutable.
- Publishing archives the previous `PUBLISHED` version and updates `currentPublishedVersionId`.
- Clone from `PUBLISHED` / `ARCHIVED` creates a new `DRAFT` with new option UUIDs and remapped correct answers.

### RBAC matrix

| Role           | Read         | Manage       | Publish      |
| -------------- | ------------ | ------------ | ------------ |
| `SUPER_ADMIN`  | all parishes | all parishes | all parishes |
| `PARISH_ADMIN` | own parish   | own parish   | own parish   |
| `CATECHIST`    | own parish   | denied       | denied       |
| `PARENT`       | denied       | denied       | denied       |

All by-id routes resolve parish scope server-side.

### Authoring flow (admin HTTP)

1. Create question + initial draft
2. Update draft metadata (prompt, difficulty, media refs)
3. Replace options / set correct options
4. Link tags and curriculum (`canonicalLessonKey`, not direct lesson/topic FK)
5. Preview (learner-safe projection, allows `DRAFT`)
6. Publish (validates prompt, difficulty, options, correct answers, media)
7. Export V1 / import validate-only
8. Clone to draft → edit → publish v2

### Search / filter

`GET /api/v1/parishes/:parishId/questions` — effective-version semantics: `DRAFT` when present, else current `PUBLISHED`. Supports Unicode prompt search, tag/curriculum filters, pagination, whitelist sort. List rows never include correct answers.

### Curriculum / Media integration

- Curriculum links require same parish, active curriculum for new links, and valid `canonicalLessonKey` / `authoringCurriculumVersionId`.
- Media references store `assetId` only (no bucket/key/path/URL persistence). Publish revalidates `READY` `IMAGE` assets.

### Practice / Exam / Mobile boundary

Question Bank provides immutable published versions, learner-safe projections, grading contracts, and selection metadata. Mobile and learners consume questions through future Practice/Exam contextual routes — not direct generic Question Bank learner APIs.

### Multilingual foundation

`sourceLocale` and semantic `sourceContentHash` on each version; correctness is independent of display strings. No runtime translation in this module.

### Demo seed

```bash
npm run seed:auth-rbac
npm run seed:parish-academic
npm run seed:class-enrollment
npm run seed:curriculum-demo
npm run seed:question-bank-demo
```

Creates stable demo codes: `qb-demo-single-001`, `qb-demo-multi-001`, `qb-demo-tf-001` (published), and `qb-demo-draft-001` (draft).

Authenticated question bank endpoints (require JWT + RBAC + parish scope for parish-scoped routes):

| Method | Route                                                  | Permission         |
| ------ | ------------------------------------------------------ | ------------------ |
| `GET`  | `/api/v1/parishes/:parishId/questions`                 | `questions.read`   |
| `GET`  | `/api/v1/question-versions/:versionId/export`          | `questions.read`   |
| `POST` | `/api/v1/parishes/:parishId/question-imports/validate` | `questions.manage` |

List query parameters: `page`, `limit`, `sortBy` (`updatedAt` default), `sort`, optional `status`, `sourceLocale`, `code`, `search`, `questionType`, `difficulty`, `versionStatus`, `hasDraft`, `hasPublished`, `tagId`, `tagCode`, `curriculumId`, `canonicalLessonKey` (requires `curriculumId`).

**Effective-version semantics:** filters on type, difficulty, and prompt `search` use the DRAFT version when present, otherwise the current PUBLISHED version.

**Export V1:** read-only JSON (`schemaVersion: 1`) with export-local option keys, tag codes, and curriculum links. Media `assetId` values are environment-local.

**Import:** validate-only endpoint (no database writes). Import commit is deferred.

Postman collection: `docs/postman/Acutis-Education-Question-Bank.postman_collection.json`

MVP question types: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`. No generic learner question-bank routes; Practice/Exam modules consume published version snapshots via internal contracts.

## Practice API

Learner practice sessions for linked enrollments. Question selection uses published Question Bank versions; grading feedback is revealed only after allowed attempt semantics (finalized question or completed session).

**Prerequisites (dev demo, run in order):** `seed:auth-rbac` → `seed:parish-academic` → `seed:class-enrollment` → `seed:curriculum-demo` → `seed:question-bank-demo`.

| Method  | Route                                                                                      | Permission        | Notes                                       |
| ------- | ------------------------------------------------------------------------------------------ | ----------------- | ------------------------------------------- |
| `POST`  | `/api/v1/enrollments/:enrollmentId/practice-sessions`                                      | `practice.manage` | Create STANDARD session                     |
| `GET`   | `/api/v1/practice-sessions/:sessionId`                                                     | `practice.read`   | Resume snapshot                             |
| `POST`  | `/api/v1/practice-sessions/:sessionId/questions/:sessionQuestionId/answers`                | `practice.manage` | Submit attempt; idempotent `clientAnswerId` |
| `POST`  | `/api/v1/practice-sessions/:sessionId/review-wrong`                                        | `practice.manage` | Create REVIEW_WRONG from completed source   |
| `PATCH` | `/api/v1/practice-sessions/:sessionId/abandon`                                             | `practice.manage` | Abandon in-progress session                 |
| `GET`   | `/api/v1/practice-sessions/:sessionId/questions/:sessionQuestionId/media/:assetId/content` | `practice.read`   | Contextual media stream                     |
| `GET`   | `/api/v1/enrollments/:enrollmentId/practice/progress`                                      | `practice.read`   | Derived metrics (no answer leakage)         |
| `GET`   | `/api/v1/classes/:classId/practice/progress`                                               | `practice.read`   | Class summary + paginated learners          |

**Scoped access:** linked parent/guardian may manage learner sessions and read enrollment progress. Parish admin and assigned catechist may read enrollment progress and class progress. **Parent is denied class progress** even when linked to a learner in the class. Permissions alone are insufficient — server-side relationship scope is enforced.

Progress query filters: `curriculumId`, `canonicalLessonKey` (requires `curriculumId`), `from`, `to` (session `startedAt` window). Class route also supports `page`, `limit`.

Postman collection: `docs/postman/Acutis-Education-Practice.postman_collection.json`

## Learning Progress API

Explicit lesson completion tracking for linked learner enrollments, composed with Practice progress metrics. Learning Progress owns `lesson_progress` only; Practice remains the source of truth for quiz metrics.

**Prerequisites (dev demo, run in order):** `seed:auth-rbac` → `seed:parish-academic` → `seed:class-enrollment` → `seed:curriculum-demo` → (`seed:question-bank-demo` + Practice sessions optional for non-zero Practice block) → `seed:learning-progress-demo`.

| Method  | Route                                                                    | Permission                 | Notes                                           |
| ------- | ------------------------------------------------------------------------ | -------------------------- | ----------------------------------------------- |
| `PATCH` | `/api/v1/enrollments/:enrollmentId/lessons/:canonicalLessonKey/progress` | `learning-progress.manage` | Explicit `IN_PROGRESS` or `COMPLETED` only      |
| `GET`   | `/api/v1/enrollments/:enrollmentId/learning-progress`                    | `learning-progress.read`   | Lesson states + Practice + Exam summary         |
| `GET`   | `/api/v1/classes/:classId/learning-progress`                             | `learning-progress.read`   | Weighted class summary + paginated learner rows |

**State model:** missing row = `NOT_STARTED`. Monotonic transitions only (`NOT_STARTED → IN_PROGRESS → COMPLETED`). No reopen/reset. No passive GET tracking from Curriculum Delivery.

**Completion ratio:** enrollment `lessonsCompleted / lessonsAssigned` for current assigned curriculum tree. Class summary uses weighted opportunities (`SUM(completed) / SUM(assigned)`), not averaged learner percentages.

**Scoped access:** linked parent/guardian may PATCH lesson progress and read enrollment aggregate. Parish admin and assigned catechist may read enrollment and class aggregates. **Parent is denied class aggregate** even when linked. Catechist/parish admin/super-admin cannot PATCH learner lesson progress.

Query filters: `curriculumId`, `canonicalLessonKey` (requires `curriculumId`). No `from`/`to` date filters on aggregate APIs (intentional MVP — lesson completion is current-state; Practice date filters remain on Practice progress routes).

Postman collection: `docs/postman/Acutis-Education-Learning-Progress.postman_collection.json`

## Exam API

Formal summative assessment bounded context: exam roots, immutable published versions, class assignments, learner attempts with pinned localized question delivery, submit/grade, and policy-gated result/review.

**Parent exam-taking policy: DENIED.** Linked parents may read released results via `exam.result.read` only.

**Prerequisites (dev demo, run in order):** `seed:auth-rbac` → `seed:parish-academic` → `seed:class-enrollment` → `seed:curriculum-demo` → `seed:question-bank-demo` → `seed:exam-demo`.

```powershell
npm run seed:exam-demo
```

The seed prints `enrollmentId` and `examAssignmentId` for Postman variables. Demo exam code: `exam-demo-formal-001`.

| Method | Route                                                                      | Permission         | Notes                                  |
| ------ | -------------------------------------------------------------------------- | ------------------ | -------------------------------------- |
| `POST` | `/api/v1/parishes/:parishId/exams`                                         | `exam.manage`      | Create exam root                       |
| `POST` | `/api/v1/exams/:examId/versions`                                           | `exam.manage`      | Create draft version                   |
| `PUT`  | `/api/v1/exam-versions/:versionId/questions`                               | `exam.manage`      | Replace question list                  |
| `POST` | `/api/v1/exam-versions/:versionId/publish`                                 | `exam.publish`     | Publish immutable version              |
| `POST` | `/api/v1/parishes/:parishId/classes/:classId/exam-assignments`             | `exam.assign`      | Windowed class assignment              |
| `GET`  | `/api/v1/enrollments/:enrollmentId/exam-assignments`                       | `exam.attempt`     | Linked student only                    |
| `POST` | `/api/v1/enrollments/:enrollmentId/exam-attempts`                          | `exam.attempt`     | Start/resume attempt                   |
| `GET`  | `/api/v1/exam-attempts/:attemptId`                                         | `exam.attempt`     | Localized delivery + saved answers     |
| `PUT`  | `/api/v1/exam-attempts/:attemptId/questions/:examAttemptQuestionId/answer` | `exam.attempt`     | Upsert answer (idempotent)             |
| `POST` | `/api/v1/exam-attempts/:attemptId/submit`                                  | `exam.attempt`     | Submit + grade                         |
| `GET`  | `/api/v1/exam-attempts/:attemptId/result`                                  | `exam.result.read` | Result/review (student, parent, staff) |
| `GET`  | `/api/v1/exam-assignments/:assignmentId/attempt-summaries`                 | `exam.result.read` | Staff class summaries                  |

Postman collection: `docs/postman/Acutis-Education-Exam.postman_collection.json`

## Gamification & Faith Journey API (Points + Badges + Milestones + Missions + Faith Journey — #001–#007)

**GAMIFICATION + FAITH JOURNEY BACKEND IMPLEMENTATION COMPLETE**  
**RUNTIME VALIDATION DEFERRED TO FE INTEGRATION / STABILIZATION PHASE**

### Architecture & Design

- Module: single `gamification` module under `src/modules/gamification/` — exports `GamificationService` only.
- Persistence foundation: exactly 9 owned tables (`reward_rules`, `processed_reward_events`, `point_ledger_entries`, `badge_definitions`, `badge_awards`, `mission_definitions`, `mission_progress`, `milestone_definitions`, `milestone_achievements`).
- Faith Journey: composed dynamically via `FaithJourneyService` (internal domain capability); **no dedicated Faith Journey or timeline database table**.
- Decoupled application events: neutral in-process `ApplicationEventsModule` / `ApplicationEventPublisher`. Source modules (`learning-progress`, `practice`, `exam`, `class-operations`) emit `RewardEligibleEvent` contracts after their own commit and never import Gamification.
- Handler isolation: source-domain transactions remain independent; gamification ingest failures are isolated and logged without failing primary learning workflows.
- Immutable append-only `point_ledger_entries` (balance = `SUM(points_delta)`, lifetime = `SUM(positive points_delta)`). No direct ledger balance updates.
- Idempotent reward ingest via `processed_reward_events.event_id` and unique ledger identity `(student_id, reason_code, source_type, source_id)`.
- Count-based rules query gamification-owned `processed_reward_events` history — never source-domain repositories.
- Zero N+1 query loops: batch definition lookups via `findDefinitionsByIds` across badges, milestones, missions, and Faith Journey composition.
- Meaning and pedagogy: points and badges serve strictly as engagement and encouragement; **points never represent spiritual worth, holiness, or faith quality**.
- **Out of scope / deferred:** No leaderboards, no streaks, no student-targeted missions, no sacramental/pastoral milestones, no public child profiles, no class rankings, no outbox/queue, no runtime validation in this phase.

### Demo Seed & Postman Verification

- **Demo seed command:**
  ```powershell
  npm run seed:gamification-demo
  ```
  Prerequisites: `npm run migration:run` → `npm run seed:gamification-demo` → `npm run start:dev`.
  Safe for dev/test environments only; composes `auth-rbac`, `parish-academic`, and `class-enrollment` seed chains before populating deterministic reward rules, badges, milestones, missions, and ledger events.
- **Postman collection:**
  `docs/postman/Acutis-Education-Gamification-Faith-Journey.postman_collection.json`
  Provides complete flows for Auth, Bootstrap Context, Learner reads, Parent linked-child reads, Staff reads, Admin writes, and security/denial matrices.
  *Note: Postman and demo seed execution are deferred to the FE Integration / Stabilization Phase.*

### Permissions

| Permission | Purpose |
| ---------- | ------- |
| `gamification.read` | Summaries, point ledger, badge/milestone reads, mission progress, Faith Journey |
| `gamification.manage` | Reward rules, badge definitions, milestone definitions, mission definitions (capability-scoped) |
| `points.adjust` | Manual ledger adjustments |
| `badges.award` | Manual badge award / soft revoke |

**Capability notes:**
- Catechist has `gamification.manage` for assigned CLASS missions, but **cannot** manage reward rules or badge definitions (service deny).
- Mission definition manage: SuperAdmin GLOBAL/PARISH/CLASS; ParishAdmin own PARISH or CLASS within parish; Catechist assigned CLASS only (`scopeType: CLASS`, assigned class only; denied for PARISH/GLOBAL or unassigned CLASS).
- Milestone definition create/update/list manage is **SuperAdmin only** (ParishAdmin/Catechist denied).
- Badge definition manage: SuperAdmin GLOBAL+PARISH any; ParishAdmin own PARISH only.

### HTTP routes (#003 + #004 + #005 + #006)

| Method | Path | Permission | Scope / Actor |
| ------ | ---- | ---------- | ------------- |
| `GET` | `/api/v1/students/:studentId/gamification/summary` | `gamification.read` | Staff (SuperAdmin, ParishAdmin own parish, Catechist active assigned class) |
| `GET` | `/api/v1/students/:studentId/points` | `gamification.read` | Staff (includes staffNote) |
| `POST` | `/api/v1/students/:studentId/points/adjustments` | `points.adjust` | Staff (manual points adjustment) |
| `GET` | `/api/v1/students/:studentId/badges` | `gamification.read` | Staff scoped student badge awards |
| `GET` | `/api/v1/students/:studentId/milestones` | `gamification.read` | Staff scoped student milestones |
| `GET` | `/api/v1/students/:studentId/faith-journey` | `gamification.read` | Staff scoped student Faith Journey |
| `POST` | `/api/v1/students/:studentId/badges/:badgeId/awards` | `badges.award` | Staff manual badge award |
| `POST` | `/api/v1/students/:studentId/badges/:badgeId/revoke` | `badges.award` | Staff soft revoke |
| `GET` | `/api/v1/me/learner/gamification/summary` | `gamification.read` | Student self only (with latestAchievement) |
| `GET` | `/api/v1/me/learner/points` | `gamification.read` | Student self only (omits staffNote/awardedBy) |
| `GET` | `/api/v1/me/learner/badges` | `gamification.read` | Student self only active badges |
| `GET` | `/api/v1/me/learner/milestones` | `gamification.read` | Student self only milestones |
| `GET` | `/api/v1/me/learner/missions` | `gamification.read` | Student self only missions |
| `GET` | `/api/v1/me/learner/missions/:missionId` | `gamification.read` | Student self only mission detail |
| `GET` | `/api/v1/me/learner/faith-journey` | `gamification.read` | Student self only composed Faith Journey |
| `GET` | `/api/v1/me/parent/enrollments/:enrollmentId/gamification/summary` | `gamification.read` | Parent linked child summary |
| `GET` | `/api/v1/me/parent/enrollments/:enrollmentId/faith-journey` | `gamification.read` | Parent linked child Faith Journey |
| `GET` | `/api/v1/me/parent/enrollments/:enrollmentId/badges` | `gamification.read` | Parent linked child active badges |
| `GET` | `/api/v1/me/parent/enrollments/:enrollmentId/missions` | `gamification.read` | Parent linked child missions |
| `GET` | `/api/v1/me/parent/enrollments/:enrollmentId/milestones` | `gamification.read` | Parent linked child milestones |
| `GET` | `/api/v1/reward-rules` | `gamification.manage` | Admin reward rules |
| `POST` | `/api/v1/reward-rules` | `gamification.manage` | Admin reward rules |
| `PATCH` | `/api/v1/reward-rules/:id` | `gamification.manage` | Admin reward rules |
| `GET` | `/api/v1/badges` | `gamification.manage` | Admin badge definitions |
| `GET` | `/api/v1/badges/:badgeId` | `gamification.manage` | Admin badge definitions |
| `POST` | `/api/v1/badges` | `gamification.manage` | Admin badge definitions |
| `PATCH` | `/api/v1/badges/:badgeId` | `gamification.manage` | Admin badge definitions |
| `GET` | `/api/v1/milestones` | `gamification.manage` | SuperAdmin milestone definitions |
| `GET` | `/api/v1/milestones/:milestoneId` | `gamification.manage` | SuperAdmin milestone definitions |
| `POST` | `/api/v1/milestones` | `gamification.manage` | SuperAdmin milestone definitions |
| `PATCH` | `/api/v1/milestones/:milestoneId` | `gamification.manage` | SuperAdmin milestone definitions |
| `GET` | `/api/v1/missions` | `gamification.manage` | Scoped mission definitions |
| `POST` | `/api/v1/missions` | `gamification.manage` | Scoped mission definitions |
| `GET` | `/api/v1/missions/:missionId` | `gamification.manage` | Scoped mission definitions |
| `PATCH` | `/api/v1/missions/:missionId` | `gamification.manage` | Scoped mission definitions |
| `POST` | `/api/v1/missions/:missionId/activate` | `gamification.manage` | Scoped mission activate |
| `POST` | `/api/v1/missions/:missionId/archive` | `gamification.manage` | Scoped mission archive |
| `GET` | `/api/v1/classes/:classId/missions` | `gamification.read` | Staff class missions |
| `GET` | `/api/v1/missions/:missionId/progress` | `gamification.read` | Staff mission student progress |

### Faith Journey Composed Read Model (#006)

- Composed dynamically in `FaithJourneyService` without a dedicated database table.
- Bounded response:
  - `summary`: pointsBalance, lifetimePositivePoints, activeBadgeCount, activeMissionCount, completedMissionCount, milestonesAchievedCount, deterministic `latestAchievement`
  - `activeMissions`: eligible ACTIVE missions (capped at 10)
  - `recentBadges`: active awards with definition data (capped at 10)
  - `milestones`: achieved milestones (capped at 20)
  - `recentTimeline`: composed events sorted `occurredAt DESC` + deterministic tie-breaker (capped at 20)
- Timeline items: `POINTS`, `BADGE`, `MISSION`, `MILESTONE`. Manual point adjustment entries and duplicate bonus ledger rows are omitted from the timeline; balances reflect them.
- Privacy & data minimization: No `staffNote`, `awardedByUserId`, internal `eventId`, raw `ruleConfig`, or PII in learner or parent responses.
- Historical retention: Badges, completed missions, and milestones are student-owned and remain visible historically after enrollment transfer, class archive, or academic year close.
- Active mission eligibility: Re-evaluates dynamically against the learner's current active class and parish enrollments.
- Actor-specific `/me`: `/me/learner/*` strictly restricted to `STUDENT`; `/me/parent/*` strictly restricted to `PARENT` with active guardian links. No administrator impersonation fallback.
- **Parent full points ledger: NO** (`PARENT FULL POINT LEDGER IN MVP: NO`).
- Staff Faith Journey: Accessible only by SuperAdmin, ParishAdmin (own parish active enrollment), or Catechist (current ACTIVE assignment to student's active enrollment class). Former catechists denied.

### Badges (#004)

- Lifecycle: `DRAFT` → `ACTIVE` → `ARCHIVED` (or `DRAFT` → `ARCHIVED`). No `ARCHIVED` → `ACTIVE` in MVP.
- Award modes: `AUTOMATIC` / `MANUAL` / `BOTH`. Typed rule types only (no expression engine).
- Automatic awards on reward ingest; at most one active award per student+badge; replay is no-op.
- Optional `pointsBonus` appends immutable `BADGE_BONUS` ledger row (`sourceId` = award id). Duplicate bonus prevented by ledger identity.
- Soft revoke via `revokedAt`; bonus reversed once via compensating `REVERSAL` (no mutate/delete of original bonus).
- Duplicate manual award returns existing active award (idempotent).
- Learner responses omit `awardedByUserId`, `ruleConfig`, staff internals.
- N+1 batch definition fetching via `BadgeService.findDefinitionsByIds`.

### Milestones (#004)

- Lifecycle: `ACTIVE` / `ARCHIVED`. Archived definitions create no new achievements; history retained.
- Typed system/learning triggers only (`FIRST_LESSON_COMPLETED`, `LESSONS_COMPLETED_COUNT`, `ATTENDANCE_COUNT`, `FIRST_EXAM_COMPLETED`, `FIRST_MISSION_COMPLETED`).
- `FIRST_MISSION_COMPLETED` connects to post-commit `MISSION_COMPLETED` reward-eligible events (#005).
- **No sacramental milestones.** No points bonus on milestones by default.
- N+1 batch definition fetching via `MilestoneService.findDefinitionsByIds`.

### Missions (#005)

- Scopes: `GLOBAL`, `PARISH`, `CLASS` (composite unique index on `(scope_key, code)` where `scope_key` is deterministically computed as `GLOBAL`, `PARISH:<id>`, or `CLASS:<id>` to avoid SQL nullable unique traps).
- Lifecycle: `DRAFT` → `ACTIVE` → `ARCHIVED` (or `DRAFT` → `ARCHIVED`). Direct transitions `ARCHIVED` → `ACTIVE` and `ACTIVE` → `DRAFT` are denied.
- Active immutability: When `ACTIVE`, only `name`, `description`, and `endsAt` (time extension) may be edited; `code`, `scopeType`, `parishId`, `classId`, `conditionType`, `targetCount`, `pointsBonus`, and `startsAt` are immutable.
- Condition types: `LESSONS_COMPLETED`, `PRACTICE_COMPLETED`, `ATTENDANCE_PRESENT_OR_LATE`, `EXAMS_COMPLETED`.
- No historical backfill: Missions evaluate only events occurring while the mission is `ACTIVE` and within `[startsAt, endsAt)`. Pre-existing historical events are not backfilled.
- Progress & Completion: First matching event creates a `mission_progress` row at count 1 (or marks `COMPLETED` immediately if `targetCount = 1`). Stored `currentCount` is capped at `targetCount`. Upon completion, `status = COMPLETED`, `completedAt` is recorded, and `pointsBonus` is appended to the ledger once (`sourceId = mission_progress.id`).
- Event chaining: `MISSION_COMPLETED` is emitted after transaction commit as a `RewardEligibleEvent`. `FIRST_MISSION_COMPLETED` milestone listens for this event.
- Access: Catechists can only create and manage missions for their assigned classes. Unassigned classes or PARISH/GLOBAL scopes result in 403 Forbidden.
- Learner views: Eligible `ACTIVE` missions appear in `/api/v1/me/learner/missions` with `currentCount: 0` (zero-progress composition) even before the first progress event is recorded.
- Data privacy: PII is omitted from mission and progress responses. No leaderboard or competitive rankings.

Manual adjustment: server derives ACTIVE enrollment parish/year; `delta` abs ≤ 1000; reason required.  
Learner ledger omits `staffNote` / `awardedByUserId`.  
**PARENT FULL POINT LEDGER / PARENT BADGE-MILESTONE READS IN MVP: NO** (Faith Journey / Parent reads in #006).

### Localization API

Parish-scoped translation resource registry, async machine-translation jobs, human review/approval workflow, and learner localized delivery for curriculum and practice content. Learner GET routes never call translation providers or auto-create registry rows — only `APPROVED` revisions with a matching current source hash are served.

**Permissions:** `localization.read`, `localization.manage`, `localization.approve` (parish admin has all three; catechist read-only). Catholic glossary mutations are **super admin only** under `/api/v1/localization/glossaries/*`.

**Admin routes (prefix `/api/v1/localization`):** list/detail/sync resources, request/bulk translation, jobs list/detail/retry, revision detail/review/approve, localized preview (DB-only).

**Learner localized delivery:** Curriculum Delivery and Practice expose `requestedLocale`, `resolvedLocale`, `sourceLocale`, `translationStatus`, `isFallback`, and (where applicable) pinned `translationRevisionId`. Practice sessions snapshot the approved revision at create time.

Optional local localization demo seed (APPROVED en-US curriculum tree + one approved and one machine-translated demo question):

```powershell
npm run seed:localization-demo
```

**Prerequisites (dev demo, run in order):** `seed:auth-rbac` → `seed:parish-academic` → `seed:class-enrollment` → `seed:curriculum-demo` → `seed:question-bank-demo` → `seed:localization-demo`.

Postman collection: `docs/postman/Acutis-Education-Localization.postman_collection.json`

## CMS API (Editorial Content & Publishing — #003/7)

The CMS module (`src/modules/cms/`) provides editorial content management for parish and platform news, articles, and static pages (`PAGE`, `ARTICLE`, `NEWS`). It is completely distinct from pedagogical `Curriculum` and `LearningContent` modules.

### Scope & Visibility

- **GLOBAL Scope:** SuperAdmin managed only; visible to all anonymous and authenticated users once published.
- **PARISH Scope:** Managed by SuperAdmin or authorized ParishAdmin for their active parish; visible to authenticated users belonging to that parish once published.
- **Anonymous Reads:** `GET /api/v1/cms/entries` serves only published, non-expired `GLOBAL` entries.
- **Authenticated Reads:** Intersects actor's active parish memberships to return eligible parish entries alongside global content.
- **Slug Resolution:** `GET /api/v1/cms/entries/:slug` defaults to `GLOBAL` scope. Passing `?parishId=<uuid>` queries parish-scoped content after membership access validation.
- **Data Minimization:** Public list entries omit body and audit metadata. Public detail entries omit creator/updater IDs and internal scope keys.

### Content Lifecycle & Immutability

- **Lifecycle States:** `DRAFT` → `SCHEDULED` → `PUBLISHED` → `ARCHIVED`.
- **Transitions:** `DRAFT` transitions to `PUBLISHED` via publish action, or `SCHEDULED` when a future `scheduledFor` is set. `SCHEDULED` transitions to `PUBLISHED` on publish action or scheduled runner. `SCHEDULED` can revert to `DRAFT` when `scheduledFor` is explicitly cleared. `ARCHIVED` is terminal.
- **Immutability:** Once `PUBLISHED`, `slug`, `type`, `scopeType`, and `parishId` cannot be modified to protect public URL integrity. `ARCHIVED` entries are completely read-only.
- **No Hard Delete:** No `DELETE` endpoint is exposed in MVP; historical integrity is preserved through `ARCHIVED` state.
- **No GET-time Mutations:** Content expiration (`expiresAt`) and scheduled publication dates are evaluated at query time; row states are never mutated on GET requests.

### Scheduled Publishing

- **Pure Service Method:** `cmsService.publishDueEntries(now)` claims and transitions due `SCHEDULED` items to `PUBLISHED`.
- **CLI Runner:** `npm run cms:publish-scheduled` (`scripts/process-scheduled-cms-publications.ts`). Execution is deferred in Fast Mode.

### Route Inventory (8 Routes)

Corrected CMS route inventory (resolving the administrative draft management contract gap from 6 to 8 routes; updating total community target from 33 to 35 routes):

| Method | Path | Description | Access / Permission |
| --- | --- | --- | --- |
| `GET` | `/api/v1/cms/entries` | Public list published entries | Anonymous (GLOBAL) / Authenticated (GLOBAL + parish) |
| `GET` | `/api/v1/cms/entries/:slug` | Public entry detail by slug | Anonymous (GLOBAL) / Authenticated (`?parishId=`) |
| `POST` | `/api/v1/cms/entries` | Create new entry (DRAFT / SCHEDULED) | `cms.manage` (SuperAdmin / ParishAdmin) |
| `PATCH` | `/api/v1/cms/entries/:id` | Update editable entry fields | `cms.manage` (within scope) |
| `POST` | `/api/v1/cms/entries/:id/publish` | Immediately publish entry | `cms.manage` (within scope) |
| `POST` | `/api/v1/cms/entries/:id/archive` | Archive entry | `cms.manage` (within scope) |
| `GET` | `/api/v1/admin/cms/entries` | Admin list across all statuses | `cms.manage` (SuperAdmin all / ParishAdmin own) |
| `GET` | `/api/v1/admin/cms/entries/:id` | Admin get entry by ID | `cms.manage` (SuperAdmin all / ParishAdmin own) |

### Media & Localization Boundaries

- **Cover Media Asset:** Scalar `cover_media_asset_id` stored without TypeORM foreign relation or entity coupling to `MediaModule`.
- **Locale:** Authored directly per entry (default `vi-VN`). Exact match filtering without runtime coupling to `LocalizationModule`.

## Announcements API (Targeting, Publishing & User Feed — #004/7)

The Announcements module (`src/modules/announcements/`) provides targeted operational and community broadcasts for students, parents, catechists, and parish administrators. It is distinct from the CMS module: Announcements have audience targeting (`GLOBAL`, `PARISH`, `CLASS`, `ROLE`), user-level read/dismiss states, active display windows, and emit application events for downstream notification delivery (#006).

### Bounded Context & Architecture

- **Owned Tables:** `announcements`, `announcement_targets`, `announcement_user_states`.
- **Public Facade:** `AnnouncementsService` exported exclusively.
- **Strict Decoupling:** Zero direct dependency on `NotificationsModule` or notification entities. Publishes neutral `AnnouncementPublishedEvent` via `ApplicationEventPublisher`.
- **No Notification Fan-out Rows:** User interaction state is strictly lazy (`firstSeenAt`, `readAt`, `dismissedAt`). No pre-created recipient rows exist in the Announcements module.

### Administrative Ownership & Target Model

- **Scope Types:** `GLOBAL` (SuperAdmin only) or `PARISH` (ParishAdmin own parish, Catechist assigned class parish).
- **Audience Targets:**
  - `GLOBAL`: All authenticated platform users (SuperAdmin only).
  - `PARISH`: All members belonging to the specified parish (SuperAdmin, ParishAdmin).
  - `CLASS`: All active assigned Catechists, enrolled Students, and linked Parents of the class.
  - `ROLE`: Users holding the specified role within the targeted parish (e.g. `ROLE:<parishId>:CATECHIST`).
- **Catechist Class-Only Scope:**
  - Catechists may create/update/publish/archive announcements ONLY when root parish matches their assigned class parish, EVERY target is `CLASS`, and EVERY class is actively assigned to the Catechist.
  - Catechists are strictly forbidden from creating `GLOBAL`, `PARISH`, or `ROLE` targets.

### Lifecycle & Immutability

- **States:** `DRAFT` → `PUBLISHED` → `ARCHIVED`. `ARCHIVED` is terminal.
- **Transitions:** `DRAFT` can transition to `PUBLISHED` (via publish action) or `ARCHIVED`. `PUBLISHED` can transition to `ARCHIVED`. Transitions back to `DRAFT` or from `ARCHIVED` to `PUBLISHED` are rejected with `409 Conflict`.
- **Field Immutability:** Once `PUBLISHED`, `scopeType`, `parishId`, and `targets` are strictly immutable to preserve historical notification and delivery integrity. `ARCHIVED` entries are read-only.

### User Feed, Active Window & Lazy Read State

- **Active Display Window:** `startsAt` and `endsAt` control feed visibility without mutating publication status (`status = PUBLISHED`).
- **Audience Resolution:** `AnnouncementAudienceResolver` builds audience keys (`GLOBAL`, `PARISH:<id>`, `CLASS:<id>`, `ROLE:<id>:<role>`) in a single set-based pass using exported public APIs (`ClassModule`, `EnrollmentModule`, `StudentModule`, `ParishModule`, `AccessControlModule`).
- **Pure Feed Read:** `GET /api/v1/announcements` reads feed and left-joins user state without writing state rows. Excludes dismissed announcements.
- **Detail Marks Read:** `GET /api/v1/announcements/:id` verifies actor targeting, lazily records `firstSeenAt` and `readAt`, and returns full body.
- **Dismiss:** `POST /api/v1/announcements/:id/dismiss` marks `dismissedAt` (and guarantees `firstSeenAt` and `readAt`). Idempotent `200 OK`.

### Event Emission & Replay Safety

- **Post-Commit Event:** On publication, emits `AnnouncementPublishedEvent` with:
  - `applicationEventId`: unique UUID trace instance.
  - `operationKey`: deterministic `ANNOUNCEMENT_PUBLISHED:<announcementId>` for downstream notification deduplication.
  - `snippet`: bounded, sanitized summary (no child PII or raw body).
  - `targets`: publish-time target snapshot.

### Route Inventory (8 Routes)

| Method | Path | Description | Access / Permission |
| --- | --- | --- | --- |
| `GET` | `/api/v1/announcements` | Actor feed (active, targeted, not dismissed) | `announcements.read` (Authenticated) |
| `GET` | `/api/v1/announcements/:id` | Announcement detail (marks seen & read) | `announcements.read` (Targeted actor) |
| `POST` | `/api/v1/announcements/:id/dismiss` | Dismiss announcement from feed | `announcements.read` (Targeted actor) |
| `GET` | `/api/v1/admin/announcements` | Admin list scoped by actor authority | `announcements.manage` (Staff) |
| `POST` | `/api/v1/admin/announcements` | Create announcement draft with targets | `announcements.manage` (Staff) |
| `PATCH` | `/api/v1/admin/announcements/:id` | Update announcement (targets locked if published) | `announcements.manage` (Staff) |
| `POST` | `/api/v1/admin/announcements/:id/publish` | Publish announcement & emit event | `announcements.publish` (Staff) |
| `POST` | `/api/v1/admin/announcements/:id/archive` | Archive announcement | `announcements.manage` (Staff) |

## Project rules

See `PROJECT_RULES.md` and `AGENTS.md` for engineering, security, and workflow requirements.
