# CATECHIST_PARENT #003 — Family Portal Parent Context / Children / Enrollment Progress

**Date:** 2026-09-02  
**Scope:** Parent portal read APIs only  
**Module:** `family-portal` (extends #002 shell)

---

## Summary

Implemented parent actor orchestration under `/api/v1/me/parent/*`:

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/v1/me/parent/context` | Bootstrap: linked child count + active enrollment count |
| GET | `/api/v1/me/parent/children` | Active guardian links + active enrollments with class metadata |
| GET | `/api/v1/me/parent/enrollments/:enrollmentId/progress` | Composed LP + practice + exam progress for linked child |

---

## Batch API added (owning module)

| Module | Method | Notes |
|--------|--------|-------|
| `EnrollmentQueryService` | `listActiveEnrollmentsByStudentIds` | Single query for all linked children; avoids N+1 on children list |

---

## Architecture decisions

- **Actor model:** PARENT role required; zero guardian links → empty context/children (not admin impersonation)
- **Scope:** `StudentGuardianService.assertGuardianLinked` before enrollment progress; guardian student list via `EnrollmentQueryService.listStudentIdsForGuardian`
- **No class-wide aggregates:** Parent routes never call `getClassLearningProgress`
- **Progress delegation:** `LearningProgressService.getEnrollmentLearningProgress` after guardian scope check
- **RBAC:** Reuses `enrollments.read`, `learning-progress.read`, `practice.read`, `exam.result.read`
- **MVP data scope:** ACTIVE guardian links and ACTIVE enrollments only (historical deferred)

---

## Files added / changed

### Parent portal layer

- `src/modules/family-portal/controllers/family-portal-parent.controller.ts`
- `src/modules/family-portal/services/parent-portal.service.ts`
- `src/modules/family-portal/interfaces/parent-portal.interface.ts`
- `src/modules/family-portal/mappers/parent-portal.mapper.ts`
- `src/modules/family-portal/dto/parent-*.dto.ts`

### Updated

- `family-portal-access.service.ts` — `assertParentActor`, `assertGuardianLinkedToStudent`
- `family-portal.errors.ts` — `ActorNotParentError`, `ParentEnrollmentAccessDeniedError`
- `family-portal-permissions.constants.ts` — `FAMILY_PORTAL_PARENT_READ_PERMISSIONS`
- `family-portal-http.util.ts` — parent + guardian error mapping
- `family-portal.service.ts`, `family-portal.module.ts`
- `enrollment-query.service.ts` — batch active enrollments by student IDs

### Tests

- Unit: `parent-portal.service.spec.ts`, updated `family-portal-access.service.spec.ts`
- DB e2e: `test/family-portal-parent.db.e2e-spec.ts` (5 cases)

---

## Validation

| Gate | Result |
|------|--------|
| `npm run build` | PASS |
| Family-portal unit tests | PASS (11) |
| Parent DB e2e | PASS (5) |
| Catechist DB e2e (regression) | PASS (from #002) |

---

## Security / privacy

- Parent cannot access catechist routes; catechist cannot access parent routes (403)
- Enrollment progress requires guardian link to enrollment's student
- Unknown enrollment → 404; unlinked student would → 403 via guardian check
- Response minimizes PII: display name + compact progress metrics only

---

## #004 readiness

**YES** — RBAC/security/performance hardening can proceed (denial matrix, OpenAPI polish, N+1 verification).

---

## Suggested commit

```
feat(family-portal): add parent portal read models
```

**Git commit not performed** (per workflow).
