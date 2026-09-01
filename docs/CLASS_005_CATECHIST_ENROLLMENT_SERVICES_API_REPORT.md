# CLASS #005 — Catechist Assignment + Enrollment Services + APIs

> Status: **COMPLETE**
> Phase: **#005/7**
> Scope: ClassCatechistAssignmentService, EnrollmentService, HTTP APIs, RBAC seed, tests
> Next prompt: **CLASS #006** — scoped RBAC / scope services (when prompted)

---

## 1. Objective

Implement catechist assignment and enrollment mutation layers per CLASS #001 design:

- **Catechist assignments:** assign (LEAD), list by class, end (ENDED)
- **Enrollments:** enroll, list by class/student, get by id, status update (COMPLETED/WITHDRAWN), transfer command
- Permissions: `class-catechists.read/manage`, `enrollments.read/manage`
- Unit, integration, and DB e2e tests

---

## 2. State Inherited From #004

| Item | State |
|------|-------|
| Schema | `class_catechist_assignments`, `enrollments` complete (#002) |
| EnrollmentQueryService | Read-only parish student list (#004) |
| StudentModule | Student + guardian services; imports EnrollmentModule for parish list |
| ClassModule | ClassService only (#003) |
| RBAC | Class/student permissions wired; enrollment/catechist permissions planned in #001 |

---

## 3. Rules Applied

- ClassModule exports `ClassService` + `ClassCatechistAssignmentService`
- EnrollmentModule exports `EnrollmentQueryService` + `EnrollmentService`
- Cross-module: `EnrollmentService` uses `StudentService.assertStudentActive`, `ClassService.assertClassAcceptsEnrollment` (public APIs only)
- StudentModule ↔ EnrollmentModule circular import resolved with `forwardRef` (controller orchestration from #004 + enrollment mutations from #005)
- Global RBAC; scoped catechist/parent access deferred to #006
- UUID snapshots normalized in mappers (fixed `class.mapper.ts` consistency)

---

## 4. Files Created

| Area | Files |
|------|-------|
| Catechist service | `class-catechist-assignment.service.ts`, `.spec.ts` |
| Catechist controller | `class-catechist-assignment.controller.ts` |
| Catechist domain | DTOs, errors, interfaces, mappers, constants, HTTP util |
| Enrollment service | `enrollment.service.ts`, `.spec.ts` |
| Enrollment controller | `enrollment.controller.ts` |
| Enrollment domain | DTOs (create, list, transfer, status), errors, mappers, constants, HTTP util |
| Tests | `test/integration/enrollment.integration-spec.ts`, `test/enrollment.db.e2e-spec.ts` |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `class.module.ts` | UsersModule import; catechist service/controller; export catechist service |
| `enrollment.module.ts` | StudentModule, ClassModule, AuthModule; controller; export EnrollmentService |
| `student.module.ts` | `forwardRef(() => EnrollmentModule)` for circular dep |
| `class.mapper.ts` | Normalize UUID fields in snapshots |
| `auth-rbac.seed.constants.ts` | Catechist + enrollment permissions + role matrix |
| `module-boundaries.spec.ts` | ClassModule (2 exports), EnrollmentModule (2 exports) |
| `README.md` | Catechist + enrollment API tables |

---

## 6. Module Architecture

```
ClassModule
├── ClassService
├── ClassCatechistAssignmentService (export)
└── imports: UsersModule (catechist user validation)

EnrollmentModule
├── EnrollmentQueryService (export)
├── EnrollmentService (export)
├── forwardRef(() => StudentModule)
└── imports: ClassModule

StudentModule
├── forwardRef(() => EnrollmentModule)  ← parish student list orchestration
└── exports: StudentService, StudentGuardianService
```

---

## 7. API Endpoints

### Catechist assignments

| Method | Path | Permission |
|--------|------|------------|
| `POST` | `/api/v1/classes/:classId/catechists` | `class-catechists.manage` |
| `GET` | `/api/v1/classes/:classId/catechists` | `class-catechists.read` |
| `PATCH` | `/api/v1/class-catechist-assignments/:id/status` | `class-catechists.manage` |

### Enrollments

| Method | Path | Permission |
|--------|------|------------|
| `POST` | `/api/v1/classes/:classId/enrollments` | `enrollments.manage` |
| `GET` | `/api/v1/classes/:classId/enrollments` | `enrollments.read` |
| `GET` | `/api/v1/students/:studentId/enrollments` | `enrollments.read` |
| `GET` | `/api/v1/enrollments/:id` | `enrollments.read` |
| `PATCH` | `/api/v1/enrollments/:id/status` | `enrollments.manage` |
| `POST` | `/api/v1/enrollments/:id/transfer` | `enrollments.manage` |

---

## 8. Business Rules

### Catechist assignment

- LEAD role only (future roles rejected)
- Catechist user must exist and be ACTIVE
- One ACTIVE assignment per catechist/class (DB unique index → `CatechistAssignmentAlreadyActiveError`)
- End via PATCH status → ENDED only

### Enrollment

- Enroll: ACTIVE student + ACTIVE class (`ClassService.assertClassAcceptsEnrollment`)
- One ACTIVE enrollment per student/parish/academic year (DB unique index → `StudentAlreadyEnrolledInParishYearError`)
- Status PATCH: ACTIVE → COMPLETED or WITHDRAWN only (not TRANSFERRED via PATCH)
- Transfer: transactional; source ACTIVE → TRANSFERRED; new ACTIVE row in target class (same parish + year, different class)

---

## 9. RBAC Seed Matrix

| Permission | PARISH_ADMIN | CATECHIST | PARENT |
|------------|:------------:|:---------:|:------:|
| `class-catechists.read` | ✓ | ✓ | |
| `class-catechists.manage` | ✓ | | |
| `enrollments.read` | ✓ | ✓ | ✓ |
| `enrollments.manage` | ✓ | | |

Re-run `npm run seed:auth-rbac` after deploy to pick up new permissions.

---

## 10. Implementation Notes

### Circular dependency

`StudentModule` (since #004) imports `EnrollmentModule` for `EnrollmentQueryService` in parish student list. `EnrollmentModule` (#005) imports `StudentModule` for `StudentService`. Resolved with mutual `forwardRef` at module level and `@Inject(forwardRef(() => StudentService))` in `EnrollmentService`.

### UUID normalization

MSSQL returns uppercase UUIDs. `class.mapper.ts` now normalizes IDs like other domain mappers. Transfer parish/year comparison uses `normalizeUuid` on both sides.

---

## 11. Validation Results

| Command | Result |
|---------|--------|
| `npm run format` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS (51 suites, 226 tests) |
| `npm run test:integration` | PASS (14 suites, incl. enrollment) |
| `test/enrollment.db.e2e-spec.ts` | PASS |
| `docker build -t catechism-api:enrollment-api .` | PASS (WSL) |

**Note:** Full `test:e2e:db` parallel run may flake on `parish.db.e2e-spec.ts` / `auth-rbac-dev.db.e2e-spec.ts` (pre-existing parallel permission cleanup). Enrollment/class/student e2e pass on isolated run.

---

## 12. Suggested Commit

```
feat(enrollment): add catechist assignment and enrollment API
```

---

## 13. Completion Decision

**CLASS #005 COMPLETE**

Ready for **CLASS #006** — scoped RBAC / scope services when explicitly prompted.
