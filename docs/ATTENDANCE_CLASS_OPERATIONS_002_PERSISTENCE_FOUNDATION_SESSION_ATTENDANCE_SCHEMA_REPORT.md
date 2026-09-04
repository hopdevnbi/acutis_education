# ATTENDANCE + CLASS OPERATIONS #002/5 — Persistence Foundation + Session / Attendance Schema

**Date:** 2026-09-04  
**Mode:** IMPLEMENTATION — persistence foundation only (no HTTP business APIs)  
**Prior:** #001/5 Domain audit — GO  
**Next:** #003/5 Catechist/Admin session operations + roster + bulk attendance APIs

---

## 1. Objective

Create the `class-operations` NestJS module shell, three-table MSSQL schema, domain lifecycle/roster/attendance foundation services, RBAC permissions, module-boundary enforcement, and persistence tests — without session/attendance HTTP routes, Parent/Student routes, demo seed, or Postman.

---

## 2. State inherited

From #001:

- One module: `class-operations`
- Tables: `class_sessions`, `class_session_roster`, `attendance_records`
- Session lifecycle: `SCHEDULED → COMPLETED | CANCELLED`
- Attendance statuses: `PRESENT | ABSENT | LATE | EXCUSED` (UNMARKED = no row)
- Roster snapshot required; history table deferred
- New RBAC: `class-sessions.read/manage`, `attendance.read/manage`
- FamilyPortal / LearningProgress remain separate consumers later

---

## 3. EOL / format hygiene

| Step | Result |
|------|--------|
| `npm run format` | Ran |
| `npm run format:check` | **PASS** |
| `npm run lint` | **PASS** |

**Unrelated files touched only by formatter/EOL normalization** (no semantic diff under `git diff --ignore-cr-at-eol`):

- `src/modules/class/services/class.service.spec.ts`
- `src/modules/enrollment/services/enrollment-query.service.spec.ts`
- `src/modules/enrollment/services/enrollment-query.service.ts`
- `src/modules/enrollment/services/enrollment.service.ts`
- `src/modules/exam/services/exam.service.enrollment-summary.spec.ts`
- Family Portal controllers/DTOs/mappers/specs (7 files)
- `test/family-portal-denial-matrix.db.e2e-spec.ts`

No `.gitattributes` / `core.autocrlf` policy change.

---

## 4. Files created

- `src/modules/class-operations/**` (module, entities, enums, interfaces, mappers, services, utils, specs, constants, errors)
- `src/database/migrations/1788064100000-create-class-operations-schema.ts`
- `test/integration/class-operations-foundation.integration-spec.ts`
- `test/integration/helpers/delete-class-operations-rows-for-parish-code.util.ts`
- `docs/ATTENDANCE_CLASS_OPERATIONS_002_PERSISTENCE_FOUNDATION_SESSION_ATTENDANCE_SCHEMA_REPORT.md` (this file)

---

## 5. Files modified

- `src/app.module.ts` — register `ClassOperationsModule`
- `src/database/seeds/auth-rbac.seed.constants.ts` — 4 permissions + role matrix
- `src/modules/module-boundaries.spec.ts` — export/import/forwardRef assertions
- Integration cleanup hardening:
  - `test/integration/helpers/cleanup-auth-rbac-seed-domain-dependencies.util.ts`
  - `test/integration/class-enrollment-seed.integration-spec.ts`
  - `test/integration/curriculum-demo-seed.integration-spec.ts`
  - `test/integration/learning-progress-demo-seed.integration-spec.ts`
  - `test/integration/localization-delivery.integration-spec.ts`

---

## 6. Module shell

Path: `src/modules/class-operations/`

- `class-operations.module.ts`
- Entities / enums / interfaces / mappers / services / errors / utils / constants
- **No controllers** in #002

---

## 7. Module imports

Approved:

- `TypeOrmModule.forFeature([...owned entities])`
- `ClassModule`, `EnrollmentModule`, `StudentModule`, `ParishModule`, `AuthModule`, `AccessControlModule`

Forbidden (enforced in boundary tests): FamilyPortal, LearningProgress, Practice, Exam, Curriculum, Localization, Media.

No `forwardRef`.

---

## 8. Module exports

**Exports `ClassOperationsService` only.**  
Entities/repositories/internal services are not exported.

---

## 9. Table ownership

| Table | Owner |
|-------|--------|
| `class_sessions` | `class-operations` |
| `class_session_roster` | `class-operations` |
| `attendance_records` | `class-operations` |

---

## 10. `class_sessions` schema

PK `id` (app UUID). Columns: `class_id`, `parish_id`, `academic_year_id`, `title`, `starts_at`, `ends_at`, `status`, `cancelled_at`, `completed_at`, `created_by_user_id`, `updated_by_user_id`, `created_at`, `updated_at`.

Checks: status set; `ends_at > starts_at`; CANCELLED ↔ `cancelled_at`; COMPLETED ↔ `completed_at`.

Indexes: `(class_id, starts_at)`, `(parish_id, starts_at)`, `status`.

---

## 11. `class_session_roster` schema

PK `id`. Columns: `session_id`, `enrollment_id`, `student_id`, `display_name_snapshot` (nvarchar 128), `created_at`.

Unique: `(session_id, enrollment_id)`. Indexes on `session_id`, `enrollment_id`.

---

## 12. `attendance_records` schema

PK `id`. Columns: `session_id`, `enrollment_id`, `student_id`, `status`, `note` (nvarchar 500), `marked_by_user_id`, `marked_at`, `updated_by_user_id`, timestamps.

Unique: `(session_id, enrollment_id)`. Status CHECK: PRESENT/ABSENT/LATE/EXCUSED only.

---

## 13. Session enum

`ClassSessionStatus`: `SCHEDULED | COMPLETED | CANCELLED`

---

## 14. Attendance enum

`AttendanceStatus`: `PRESENT | ABSENT | LATE | EXCUSED`  
No `UNMARKED` persistence.

---

## 15. FK strategy

All cross-module FKs: `ON DELETE NO ACTION`, `ON UPDATE NO ACTION`.  
Scalar UUID columns only; no TypeORM cross-module relations.

---

## 16. Delete / cascade strategy

No hard-delete APIs. Historical rows retained. Parent class/enrollment delete blocked while sessions/attendance exist (verified in integration).

Test helpers delete attendance → roster → sessions before enrollments/classes.

---

## 17. Index strategy

As designed in #001; no redundant `(class_id, status, starts_at)` composite added.

---

## 18. Migration

`1788064100000-create-class-operations-schema.ts`  
Order: sessions → roster → attendance.  
`down()` drops reverse with `dropTable(..., true, true, true)`.

---

## 19. Entity design

TypeORM entities mirror tables; app-generated UUID PKs; varchar enums; datetime2 timestamps; entity indexes align with migration unique/non-unique indexes.

---

## 20. Public snapshot / interface design

- `ClassSessionSnapshot`
- `SessionRosterEntrySnapshot`
- `AttendanceRecordSnapshot`
- `AttendanceEnrollmentSummary`

No entity exposure outside the module.

---

## 21. ClassSessionService foundation

Create / get / find / list-by-class / update (SCHEDULED only) / transition (SCHEDULED → COMPLETED|CANCELLED).  
Optional `EntityManager` on create for transactional freeze.

---

## 22. RosterService foundation

List/count/find; `freezeInitialRoster`; `replaceRoster` guarded by immutability helper (SCHEDULED + zero attendance marks).

---

## 23. AttendanceService foundation

List by session/enrollment; count; transactional upsert with roster membership checks; enrollment summary primitive (COMPLETED sessions only).

---

## 24. ClassOperationsService facade

Public orchestration: create session+roster, refresh roster, update/complete/cancel session, upsert attendance, reads/summaries.  
Does not expose unsafe bypass of lifecycle/access (HTTP access still #003).

---

## 25. Access service shell

`ClassOperationsAccessService` uses public Class/Enrollment/Student/Parish/AccessControl APIs for SuperAdmin / ParishAdmin / assigned Catechist / Parent guardian / Learner self readiness. Full HTTP denial mapping deferred to #003/#004.

---

## 26. RBAC permissions

Added:

- `class-sessions.read`
- `class-sessions.manage`
- `attendance.read`
- `attendance.manage`

Constants: `class-operations-permissions.constants.ts`.

---

## 27. RBAC role matrix

| Permission | SUPER_ADMIN | PARISH_ADMIN | CATECHIST | PARENT | STUDENT |
|------------|-------------|--------------|-----------|--------|---------|
| class-sessions.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| class-sessions.manage | ✓ | ✓ | ✓ | | |
| attendance.read | ✓ | ✓ | ✓ | ✓ | ✓ |
| attendance.manage | ✓ | ✓ | ✓ | | |

Permission ≠ scope.

---

## 28. Lifecycle guards

Utils: `assertClassSessionEditable`, `assertClassSessionTransition`, `isAttendanceWritable`, `isRosterRefreshAllowed`.  
No reopen from COMPLETED/CANCELLED.

---

## 29. Roster immutability guards

`assertRosterMutable` — refresh only while SCHEDULED and attendance count = 0.

---

## 30. Attendance identity

Unique `(sessionId, enrollmentId)`. Upsert semantics. Duplicate enrollment IDs in one payload → `DuplicateAttendanceEnrollmentInputError`.

---

## 31. Summary formula foundation

Eligible: COMPLETED sessions where enrollment is on roster.

Metrics: totalSessions, presentCount, lateCount, absentCount, excusedCount, unmarkedCount.

Rate: `round(100 * (present + late) / totalSessions)` or `0` if totalSessions = 0.  
CANCELLED/SCHEDULED excluded; EXCUSED not present; UNMARKED lowers rate.

---

## 32. Error model

- `ClassSessionNotFoundError`
- `ClassSessionNotEditableError`
- `InvalidClassSessionTransitionError`
- `AttendanceEnrollmentNotInSessionRosterError`
- `AttendanceAlreadyFinalizedError`
- `DuplicateAttendanceEnrollmentInputError`
- Plus foundation helpers: invalid id/time/status/note/roster immutable

Access-specific HTTP errors deferred.

---

## 33. Note / time model

Note max 500; never logged. UTC datetime2 source of truth. No parish timezone migration.

---

## 34. Module boundaries

Boundary tests assert facade export, approved imports, no reverse Class/Enrollment → ClassOperations import, no forwardRef.

---

## 35. Unit tests

Lifecycle, roster immutability, attendance status/duplicates/notes, summary math. Module boundaries covered in existing suite.

---

## 36. Integration tests

`class-operations-foundation.integration-spec.ts`:

1. Tables exist  
2. No DB UUID default on PK  
3. Create SCHEDULED session  
4. Reject `endsAt <= startsAt`  
5. Reject invalid session status  
6. Roster create + duplicate reject  
7. Attendance create + duplicate reject + UNMARKED reject  
8. Class delete NO ACTION while session exists  
9. COMPLETED/CANCELLED timestamp CHECKs  
10. FK delete action = NO_ACTION  

---

## 37. DB migrations

`npm run test:db:migrations` **PASS** (includes `1788064100000`).

---

## 38. DB e2e regression

`npm run test:e2e:db` **PASS** — 27 suites / 150 tests.

---

## 39. quality:full

**PASS** (exit 0): format, lint, typecheck, unit 131/664, e2e 2/5, build, DB reset, migrations, integration 44/248, e2e:db 27/150.

---

## 40. npm audit

`npm audit --audit-level=moderate` — **PASS** (0 vulnerabilities).

---

## 41. Docker

`docker build --target production -t catechism-api:class-operations-persistence .`  
**PASS** (via WSL + ASCII junction `C:\acutis-build` due to Unicode path). Image tagged successfully.

---

## 42. Commands

```text
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=moderate
npm run test:db:prepare -- --reset
npm run test:db:migrations
npm run test:integration
npm run test:e2e:db
npm run quality:full
docker build --target production -t catechism-api:class-operations-persistence .
```

---

## 43. Validation matrix

| Gate | Result |
|------|--------|
| format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS (131 / 664) |
| e2e | PASS |
| build | PASS |
| integration | PASS (44 / 248) |
| e2e:db | PASS (27 / 150) |
| quality:full | PASS |
| npm audit | PASS |
| Docker | PASS |

---

## 44. Risks / deferred

- HTTP session CRUD / bulk attendance (#003)
- Parent/Student read APIs (#004)
- Demo seed / Postman / final audit (#005)
- Recurring schedule templates
- Attendance revision history table
- Optimistic concurrency / `clientRequestId`
- Full access-error HTTP mapping
- Parish IANA timezone

---

## 45. BLOCKER / HIGH / MEDIUM / LOW

| Severity | Count | Notes |
|----------|-------|-------|
| BLOCKER | **0** | |
| HIGH | **0** | |
| MEDIUM | **0** | |
| LOW | **1** | Windows Unicode path requires junction for Docker; documented |

---

## 46. #003 readiness

| Gate | Status |
|------|--------|
| BLOCKER=0 / HIGH=0 | YES |
| Module foundation ready | YES |
| 3 tables/migration ready | YES |
| Lifecycle/status ready | YES |
| Roster snapshot foundation | YES |
| Historical retention safe | YES |
| Permissions ready | YES |
| Module boundaries clean | YES |
| integration PASS | YES |
| DB e2e regression PASS | YES |
| quality:full PASS | YES |
| Docker PASS | YES |

**#003 READINESS: YES**

Recommend:

**ATTENDANCE + CLASS OPERATIONS #003/5 — CATECHIST / ADMIN SESSION OPERATIONS + ROSTER + BULK ATTENDANCE APIs**

Do **not** auto-implement.

---

## 47. Commit recommendation

Tracked production changes exist. Suggested message (do not execute from this agent):

```text
git commit -m "feat(class-operations): add session attendance persistence foundation"
```

Do not print `git add`. Do not run commit/push from this prompt.

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| CLASS OPERATIONS MODULE FOUNDATION READY | **YES** |
| THREE-TABLE SCHEMA READY | **YES** |
| CLASS SESSION SCHEMA READY | **YES** |
| SESSION ROSTER SNAPSHOT SCHEMA READY | **YES** |
| ATTENDANCE RECORD SCHEMA READY | **YES** |
| HISTORICAL RETENTION SAFE | **YES** |
| FK/DELETE POLICY READY | **YES** |
| SESSION LIFECYCLE FOUNDATION READY | **YES** |
| ATTENDANCE STATUS FOUNDATION READY | **YES** |
| ROSTER IMMUTABILITY FOUNDATION READY | **YES** |
| RBAC PERMISSIONS READY | **YES** |
| MODULE BOUNDARY READY | **YES** |
| FULL INTEGRATION | **PASS** |
| DB E2E REGRESSION | **PASS** |
| SELF-CONTAINED QUALITY:FULL | **PASS** |
| NPM AUDIT | **PASS** |
| DOCKER | **PASS** |

Unresolved BLOCKER count: **0**  
Unresolved HIGH count: **0**  
Unresolved MEDIUM count: **0**

**#003 READINESS: YES**
