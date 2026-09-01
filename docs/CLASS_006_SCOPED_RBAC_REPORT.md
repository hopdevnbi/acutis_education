# CLASS #006 — Scoped RBAC / Scope Services

> Status: **COMPLETE**
> Phase: **#006/7**
> Scope: ParishScopeService, ClassScopeService, StudentAccessService, controller wiring, tests
> Next prompt: **CLASS #007** — domain seed + integration hardening (when prompted)

---

## 1. Objective

Implement scoped authorization per CLASS #001 §30–§32:

- Keep global `@RequirePermissions` for capability
- Add domain scope services with `assert*` / `can*` methods
- Wire `@CurrentUser()` into class/student/enrollment/catechist controllers
- Filter list endpoints to accessible resources
- Unit + integration tests

No Auth/RBAC schema changes. No new permissions seeded.

---

## 2. State Inherited From #005

| Item | State |
|------|-------|
| APIs | Class, student, guardian, catechist, enrollment — global permission only |
| `parish_memberships` | Entity + migration; never queried |
| Scope invariants | Designed in #001 (P-1–P-3, C-1–C-3) |
| Seed data | No membership/guardian/catechist links for sample users (#007) |

---

## 3. Architecture

```
ParishModule
└── ParishScopeService (export)
    ├── isSuperAdmin
    ├── hasActiveParishMembership
    ├── assertCanManageParish

ClassModule
└── ClassScopeService (export)
    ├── assertCanManageClass → parish admin scope
    ├── assertCanReadClass → admin | catechist assignment | parent enrollment
    └── canReadParishAsCatechist

StudentModule
└── StudentAccessService (export)
    ├── assertCanReadStudent / assertCanManageStudent
    ├── assertCanCreateStudent
    ├── canReadParishAsGuardian
    └── resolveAccessibleStudentIds (list filtering)

EnrollmentQueryService (extended)
└── Scope query helpers (guardian/catechist/student ID lists)
```

**Parish read orchestration:** `assertParishReadScope()` util (ParishModule) accepts delegate callbacks to avoid cross-module import cycles.

**Module cycles:** `forwardRef` retained for Student ↔ Enrollment ↔ Class where scope wiring required additional cross-module exports.

---

## 4. Scope Rules Implemented

### Parish admin (`PARISH_ADMIN`)

- Manage/read parish resources when active `parish_memberships` row exists
- `SUPER_ADMIN` bypasses all scope checks

### Catechist (`CATECHIST`)

- Read class resources when actively assigned to that class
- Read students enrolled in assigned classes (roster scope)
- Cannot manage classes/students/enrollments unless also parish admin

### Parent (`PARENT`)

- Read linked students via active `student_guardians`
- Read parish/class indirectly when linked child has enrollment evidence
- `GET /students` returns linked children only (not global list)

### Manage operations

- Class/enrollment/catechist mutations: parish admin scope only (+ super admin)
- Student create: super admin or any active parish membership
- Student update/guardian link: parish admin with enrollment in managed parish

---

## 5. Files Created

| Area | Files |
|------|-------|
| Scope services | `parish-scope.service.ts`, `class-scope.service.ts`, `student-access.service.ts` |
| Errors | `parish-scope.errors.ts`, `class-scope.errors.ts`, `student-access.errors.ts` |
| Util | `assert-parish-read-scope.ts` |
| Constants | `role-codes.constants.ts` |
| Tests | `parish-scope.service.spec.ts`, `scoped-authorization.integration-spec.ts` |

---

## 6. Files Modified

| File | Change |
|------|--------|
| Controllers | `@CurrentUser()` + scope assertions on class/student/guardian/enrollment/catechist routes |
| `enrollment-query.service.ts` | Guardian/catechist/student scope query helpers |
| `class-catechist-assignment.service.ts` | `hasActiveAssignmentInParish`, `listAssignedClassIds`, `getAssignmentById` |
| `student-guardian.service.ts` | `getGuardianLinkById` |
| `student.service.ts` | `listStudentIdsByLinkedUserId`, `studentIds` list filter |
| Module exports | Parish (2), Class (3), Student (3) |
| HTTP utils | Map scope errors → `403 Forbidden` |
| `README.md` | Scoped authorization section |
| `module-boundaries.spec.ts` | Updated export counts |

---

## 7. Controller Coverage

| Controller | Scope applied |
|------------|---------------|
| `ClassController` | Parish manage/read, class read/manage |
| `ClassCatechistAssignmentController` | Class manage/read |
| `StudentController` | Student create/read/manage/list filter, parish student list |
| `StudentGuardianController` | Student manage/read |
| `EnrollmentController` | Class manage/read, student read |

**Deferred:** Parish/academic-structure controllers (same global-permission gap; out of #006 class-domain scope).

---

## 8. Validation Results

| Command | Result |
|---------|--------|
| `npm run format` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS (52 suites, 229 tests) |
| `test/integration/scoped-authorization.integration-spec.ts` | PASS |
| `npm run test:integration` | PASS (class domain); `auth-rbac-seed` flake pre-existing |

---

## 9. Suggested Commit

```
feat(scope): add scoped RBAC for class domain APIs
```

---

## 10. Completion Decision

**CLASS #006 COMPLETE**

Ready for **CLASS #007** — domain seed (`parish_memberships`, guardian/catechist links, demo enrollments) when explicitly prompted.
