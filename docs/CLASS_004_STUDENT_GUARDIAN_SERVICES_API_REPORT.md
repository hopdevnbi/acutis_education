# CLASS #004 — Student + Guardian Services + APIs

> Status: **COMPLETE**
> Phase: **#004/7**
> Scope: StudentService, StudentGuardianService, EnrollmentQueryService, HTTP APIs, RBAC seed, tests
> Next prompt: **CLASS #005** — Catechist Assignment + Enrollment Services + APIs (when prompted)

---

## 1. Objective

Implement Student and Guardian application layers and HTTP APIs per CLASS #001/#002/#003 design:

- `StudentService` — profile CRUD, assert active, optional `userId` link via `UserAccountService`
- `StudentGuardianService` — link/end guardians, assert guardian linked
- `EnrollmentQueryService` — read-only parish student list support (ACTIVE enrollments)
- Controllers with JWT + global permission guards
- Permissions: `students.read`, `students.manage`, `student-guardians.read`, `student-guardians.manage`
- Unit, integration, and DB e2e tests

No catechist assignment or enrollment mutation APIs yet (#005).

---

## 2. State Inherited From #003

| Item | State |
|------|-------|
| Tables | `students`, `student_guardians`, `enrollments` (schema complete) |
| StudentModule | Entity skeleton only |
| EnrollmentModule | Entity skeleton only |
| UsersModule | Exports `UserAccountService` |
| RBAC | Class permissions wired; student permissions planned in #001 |

---

## 3. Rules Applied

- Module exports: `StudentService`, `StudentGuardianService`; `EnrollmentQueryService` from EnrollmentModule
- Cross-module user validation via `UserAccountService` only
- Parish student list orchestrated at controller layer using `EnrollmentQueryService` + `StudentService`
- `StudentService` does not import enrollment repositories
- Global RBAC; scoped guardian/parent access deferred to #006
- Minimal child PII (`fullName` only)

---

## 4. Files Created

| Area | Files |
|------|-------|
| Student services | `student.service.ts`, `student-guardian.service.ts`, specs |
| Enrollment read | `enrollment-query.service.ts`, `enrollment-query.interface.ts` |
| Controllers | `student.controller.ts`, `student-guardian.controller.ts` |
| DTOs | create/update/list/query/response DTOs for student + guardian |
| Domain | errors, interfaces, mappers, utils, constants |
| Tests | `student.integration-spec.ts`, `student.db.e2e-spec.ts`, `student-full-name.util.spec.ts` |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `student.module.ts` | Services, controllers, imports, exports |
| `enrollment.module.ts` | `EnrollmentQueryService` provider + export |
| `auth-rbac.seed.constants.ts` | Student + guardian permissions + role matrix |
| `module-boundaries.spec.ts` | Updated export expectations |
| `README.md` | Student API table |

---

## 6. Module Architecture

```
StudentModule
├── TypeOrmModule.forFeature([StudentEntity, StudentGuardianEntity])
├── UsersModule           → UserAccountService
├── ParishModule          → ParishService (parish exists check)
├── EnrollmentModule      → EnrollmentQueryService (controller orchestration)
├── AuthModule + AccessControlModule
├── StudentService        (exported)
├── StudentGuardianService (exported)
├── StudentController
└── StudentGuardianController

EnrollmentModule
├── TypeOrmModule.forFeature([EnrollmentEntity])
└── EnrollmentQueryService (exported — read-only)
```

---

## 7. Public Exports

| Module | Export |
|--------|--------|
| StudentModule | `StudentService`, `StudentGuardianService` |
| EnrollmentModule | `EnrollmentQueryService` |

Public methods for downstream modules:

- `StudentService.assertStudentActive(studentId)`
- `StudentGuardianService.assertGuardianLinked(guardianUserId, studentId)`

---

## 8. Student Lifecycle

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Default on create; profile usable |
| `INACTIVE` | Soft-deactivated; history preserved |

Updates allowed on `fullName`, optional `userId` link/unlink, and `status`.

---

## 9. Guardian Link Rules

- Link requires existing student + active guardian user account
- Default status `ACTIVE`; `startsAt` = now; `endsAt` null
- End link via `PATCH .../status` with `ENDED` only (sets `endsAt`, clears `isPrimary`)
- At most one ACTIVE primary guardian per student (application check before insert)
- Filtered unique indexes enforce one ACTIVE link per `(studentId, guardianUserId)`
- Re-link after ENDED creates a new row (audit-friendly)

---

## 10. HTTP API

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

**Parish student list semantics:** distinct students with at least one **ACTIVE** enrollment in the parish (optional `academicYearId`, `search` on `fullName`).

---

## 11. RBAC Seed Updates

| Permission | PARISH_ADMIN | CATECHIST | PARENT |
|------------|:------------:|:---------:|:------:|
| `students.read` | ✓ | ✓ | ✓ |
| `students.manage` | ✓ | | |
| `student-guardians.read` | ✓ | ✓ | ✓ |
| `student-guardians.manage` | ✓ | | |

Re-run `npm run seed:auth-rbac` after deploy to pick up new permissions.

---

## 12. Implementation Notes

### EnrollmentQueryService

Minimal read facade owned by EnrollmentModule for parish student discovery. Uses `GROUP BY` on MSSQL (avoids `SELECT DISTINCT` + `ORDER BY` restriction).

### Module import exception

`StudentModule` imports `EnrollmentModule` for controller-level parish list orchestration only. Business services remain decoupled from enrollment persistence.

---

## 13. Validation Results

| Command | Result |
|---------|--------|
| `npm run format` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS (49 suites) |
| `npm run test:integration` | PASS (13 suites, incl. student) |
| `test/student.db.e2e-spec.ts` | PASS |
| `docker build -t catechism-api:student-api .` | PASS (WSL) |

**Note:** `quality:full` e2e may flake on `auth-rbac-dev.db.e2e-spec.ts` (pre-existing parallel seed cleanup). Student/class/parish e2e pass on clean reset.

---

## 14. Suggested Commit

```
feat(student): add student and guardian management API
```

---

## 15. Completion Decision

**CLASS #004 COMPLETE**

Ready for **CLASS #005** — Catechist Assignment + Enrollment Services + APIs when explicitly prompted.
