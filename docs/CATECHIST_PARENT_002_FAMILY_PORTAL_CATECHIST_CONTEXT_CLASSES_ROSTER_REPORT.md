# CATECHIST_PARENT #002 — Family Portal Catechist Context / Classes / Roster

**Date:** 2026-09-02  
**Scope:** Catechist portal read APIs only (no Parent routes)  
**Module:** `family-portal`

---

## Summary

Implemented stateless Family Portal orchestration for catechist actors:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/v1/me/catechist/context` | Bootstrap: assigned class count + distinct parish IDs |
| GET | `/api/v1/me/catechist/classes` | Paginated assigned class summaries (max limit 50) |
| GET | `/api/v1/me/catechist/classes/:classId/roster` | Paginated roster with learning, practice, exam metrics |

---

## Batch APIs added (owning modules)

| Module | Method | Notes |
|--------|--------|-------|
| `ClassService` | `getClassSnapshotsByIds` | Batch class snapshots by ID |
| `EnrollmentQueryService` | `getEnrollmentSnapshotsByIds` | Batch enrollment snapshots |
| `EnrollmentQueryService` | `countActiveEnrollmentsByClassIds` | Batch active enrollment counts |
| `ExamService` | `getEnrollmentExamSummariesByEnrollmentIds` | Refactored single summary to shared builder; no N+1 on roster page |

---

## Architecture

- **Module:** `src/modules/family-portal/` — no TypeORM, no entities/migrations
- **Export:** `FamilyPortalService` only
- **Dependencies:** Class, Enrollment, Student, LearningProgress, Exam, Auth, AccessControl (public APIs only)
- **RBAC:** Reuses `classes.read`, `enrollments.read`, `learning-progress.read` + actor role check (`CATECHIST`)
- **Scope:** `ClassCatechistAssignmentService` for class assignment; zero assignments → empty lists (not admin impersonation)
- **Roster composition:** LP `getClassLearningProgress` + batch exam/student/enrollment merge (≤5 orchestration calls per roster page)

---

## Files added / changed

### New module

- `src/modules/family-portal/` (module, service, controller, DTOs, mappers, errors, access service)

### Owning module updates

- `src/modules/class/services/class.service.ts`
- `src/modules/enrollment/services/enrollment-query.service.ts`
- `src/modules/exam/services/exam.service.ts`

### Wiring

- `src/app.module.ts` — imports `FamilyPortalModule`
- `src/modules/module-boundaries.spec.ts` — Family Portal export/boundary tests

### Tests

- Unit: `family-portal-access.service.spec.ts`, `catechist-portal.service.spec.ts`, `exam.service.enrollment-summary.spec.ts`
- DB e2e: `test/family-portal-catechist.db.e2e-spec.ts` (5 cases)

---

## Validation

| Gate | Result |
|------|--------|
| `npm run build` | PASS |
| Unit tests (126 suites) | PASS |
| Integration (after `test:db:prepare --reset`) | PASS (236) |
| DB e2e (129 tests incl. family-portal) | PASS |
| Docker `production` target | PASS (`catechism-api:family-portal-catechist-002`) |

**Note:** `quality:full` integration step can fail if the test DB is dirty from prior e2e runs in the same session (pre-existing ordering: integration runs before `--reset`). Clean reset + integration passes.

---

## Security / privacy

- Server-side catechist role + assignment scope enforced
- Parent actors receive 403 on catechist routes
- Roster exposes display name + compact learning metrics only (no DOB, guardian PII, raw answers)
- Unassigned class → 403

---

## #003 readiness

**YES** — Parent context / children / enrollment progress can proceed on `family-portal` module shell.

---

## Suggested commit

```
feat(family-portal): add catechist portal read models
```

**Git commit not performed** (per prompt scope).
