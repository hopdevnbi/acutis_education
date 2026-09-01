# LEARNING PROGRESS #003 — Aggregation APIs + Scoped Access + Practice Composition + Lesson Progress HTTP Report

**Phase:** LEARNING PROGRESS #003 / 4  
**Date:** 2026-09-01  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** `LEARNING_PROGRESS_003_AGGREGATION_SCOPED_API.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Lesson PATCH | **PASS** |
| Enrollment aggregate GET | **PASS** |
| Class aggregate GET | **PASS** |
| Practice composition | **PASS** |
| Scoped access | **PASS** |
| FE contract ready | **YES** |
| Mobile contract ready | **YES** |
| quality:full (pristine DB) | **PASS** |
| Docker | **PASS** (`catechism-api:learning-progress-api`) |
| Aggregate table required now | **NO** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**#004 readiness:** **READY: YES** — proceed to **LEARNING PROGRESS #004/4 — Final Audit + Demo/Postman + Phase Completion**

---

## 1. Objective

Expose HTTP APIs for explicit lesson progress writes and composed learning progress reads (lesson + Practice dimensions), with scoped access, permission seeds, Swagger, and tests — without Exam, mastery scores, or aggregate tables.

## 2. State inherited from #002

- `LearningProgressModule` exports `LearningProgressService` only
- Owns `lesson_progress` table
- `LessonProgressService` with monotonic transitions, concurrency safety
- Missing row = `NOT_STARTED`
- Parent-only write policy (no super-admin impersonation)
- quality:full + Docker PASS from #002

## 3. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*`
- Modular boundaries: `PracticeService` public API only for composition
- PermissionGuard + service-layer scope checks
- No git add/commit/push

## 4. Files created

| Path | Purpose |
|------|---------|
| `src/modules/learning-progress/controllers/learning-progress.controller.ts` | HTTP routes |
| `src/modules/learning-progress/constants/learning-progress-permissions.constants.ts` | Permission codes |
| `src/modules/learning-progress/constants/learning-progress.constants.ts` | Pagination defaults |
| `src/modules/learning-progress/dto/patch-lesson-progress-request.dto.ts` | PATCH body |
| `src/modules/learning-progress/dto/learning-progress-query.dto.ts` | Query DTOs |
| `src/modules/learning-progress/dto/learning-progress-response.dto.ts` | Response DTOs + mappers |
| `src/modules/learning-progress/interfaces/learning-progress.interface.ts` | Aggregate snapshots |
| `src/modules/learning-progress/services/learning-progress-aggregation.service.ts` | Aggregation + composition |
| `src/modules/learning-progress/utils/learning-progress-http.util.ts` | Error → HTTP mapping |
| `src/modules/learning-progress/utils/learning-progress-ratio.util.ts` | Completion ratio helper |
| `src/modules/learning-progress/utils/learning-progress-ratio.util.spec.ts` | Ratio unit tests |
| `test/learning-progress.db.e2e-spec.ts` | DB e2e API tests |

## 5. Files modified

| Path | Change |
|------|--------|
| `src/modules/learning-progress/learning-progress.module.ts` | Controller, PracticeModule, Auth/AccessControl |
| `src/modules/learning-progress/services/learning-progress.service.ts` | Facade methods for HTTP |
| `src/modules/learning-progress/services/learning-progress-access.service.ts` | Read scopes + strict parent write |
| `src/modules/learning-progress/services/learning-progress-access.service.spec.ts` | Expanded access tests |
| `src/modules/learning-progress/services/lesson-progress.service.ts` | `assertCanManageLessonProgress` |
| `src/modules/learning-progress/services/lesson-progress.service.spec.ts` | Mock rename |
| `src/modules/learning-progress/errors/learning-progress.errors.ts` | Curriculum/filter/class errors |
| `src/database/seeds/auth-rbac.seed.constants.ts` | Permission seeds + role grants |

## 6. Final module architecture

```
LearningProgressModule
├── LearningProgressController (HTTP)
├── LearningProgressService (public facade)
├── LearningProgressAggregationService (internal)
├── LessonProgressService (internal)
└── LearningProgressAccessService (internal)
```

Imports: `EnrollmentModule`, `ClassModule`, `CurriculumModule`, `StudentModule`, `ParishModule`, **`PracticeModule`**, `AuthModule`, `AccessControlModule`.

## 7. PracticeModule dependency

`PracticeModule` imported for **`PracticeService.getEnrollmentProgress`** and **`PracticeService.getClassProgress`** only. No Practice entities/repositories/SQL duplication.

## 8. Public export

Unchanged: **`LearningProgressService` only**.

## 9. Permission seeds

Added to `AUTH_RBAC_SEED_PERMISSIONS`:

- `learning-progress.read`
- `learning-progress.manage`

## 10. Role grants

| Role | Grants |
|------|--------|
| SUPER_ADMIN | read (via all-permissions map) |
| PARISH_ADMIN | read |
| CATECHIST | read |
| PARENT | read + manage |

## 11. Lesson progress PATCH

`PATCH /api/v1/enrollments/:enrollmentId/lessons/:canonicalLessonKey/progress`

Permission: `learning-progress.manage`

## 12. Write DTO

```json
{ "status": "IN_PROGRESS" | "COMPLETED" }
```

`NOT_STARTED` rejected by DTO validation.

## 13. Parent write scope

Linked parent/guardian (or future self-linked student) via `StudentGuardianService.assertGuardianLinked` — **without** super-admin bypass.

## 14. Staff/admin write denial

Catechist, Parish Admin, Super Admin denied learner-action writes (403). Verified in DB e2e.

## 15. Transition/error mapping

| Error | HTTP |
|-------|------|
| `LessonProgressInvalidTargetStatusError` | 400 |
| `LearningProgressCanonicalLessonRequiresCurriculumError` | 400 |
| `LearningProgressAccessDeniedError` | 403 |
| `LearningProgressClassProgressAccessDeniedError` | 403 |
| `EnrollmentNotFoundError` | 404 |
| `LessonProgressInvalidTransitionError` | 409 |
| `LearningProgressEnrollmentNotWritableError` | 422 |
| `LearningProgressCanonicalLessonInvalidError` | 422 |
| `LearningProgressCurriculumMismatchError` | 422 |

## 16. Enrollment aggregate GET

`GET /api/v1/enrollments/:enrollmentId/learning-progress`

Permission: `learning-progress.read`

## 17. Enrollment read scope

Super Admin, Parish Admin (same parish), assigned Catechist, linked Parent. Unrelated denied.

## 18. Learning dimension

Returns `curriculumId`, `assignedCurriculumVersionId`, `lessonsAssigned`, `lessonsStarted`, `lessonsCompleted`, `completionRatio`.

## 19. Assigned lesson count

Derived from one `CurriculumService.getVersionTree()` call for assigned published version.

## 20. Lesson-state synthesis

All assigned `canonicalLessonKey` values returned with `NOT_STARTED` / `IN_PROGRESS` / `COMPLETED` for FE tree merge.

## 21. Completion ratio semantics

`lessonsCompleted / lessonsAssigned`; returns `0` when denominator is `0`.

## 22. Curriculum republish behavior

Progress keyed by `(enrollmentId, curriculumId, canonicalLessonKey)` — same key carries forward across republished versions.

## 23. Removed/new lesson behavior

Removed keys excluded from current tree denominator; historical rows remain persisted. New keys appear as `NOT_STARTED` and increase denominator.

## 24. Practice composition

Enrollment: one `PracticeService.getEnrollmentProgress` call. Class: one `PracticeService.getClassProgress` call.

## 25. Practice DTO mapping

Compact standard/review metrics + `lastPracticedAt`. No answers, options, or session internals.

## 26. Exam extension field decision

Response includes `exam: null` — reserved, no Exam module.

## 27. lastLearningActivityAt

Enrollment: `max(latest lesson_progress.updatedAt in scope, practice.lastPracticedAt)`. Class summary: max across class lesson activity and practice class summary.

## 28. Filter semantics

Optional `curriculumId`, `canonicalLessonKey`. Mismatch with assigned curriculum → 422. `canonicalLessonKey` without `curriculumId` → 400.

## 29. Date-filter decision

**No `from`/`to` on learning aggregate MVP** — avoids mixed semantics with Practice activity windows. Practice composition uses unfiltered progress (same as no date query).

## 30. Class aggregate GET

`GET /api/v1/classes/:classId/learning-progress`

## 31. Class access

Super Admin, Parish Admin (same parish), assigned Catechist. **Parent denied** (403).

## 32. Class roster

ACTIVE enrollments; pagination `page` default 1, `limit` default 20, max 100.

## 33. Class summary

Full-roster weighted summary: `learnersTotal`, `learnersWithLearningActivity`, `lessonAssignmentsTotal`, `lessonsStarted`, `lessonsCompleted`, `completionRatio`, practice block, `lastLearningActivityAt`.

## 34. Weighted completion ratio

`SUM(completed opportunities) / SUM(assigned opportunities)` — never average learner percentages.

## 35. Class learner rows

Compact: `enrollmentId`, `studentId`, learning counts/ratio, practice compact summary, `lastLearningActivityAt`. No nested full lesson arrays.

## 36. Zero-activity learners

Included with zero counts, `completionRatio: 0`, `lastLearningActivityAt: null`.

## 37. Pagination

Aligned with Practice class progress pagination parameters on same page request.

## 38. Historical enrollment strategy

- **ACTIVE:** current assigned published curriculum tree
- **Non-ACTIVE with progress rows:** tree from stored `assignedCurriculumVersionId`
- **Non-ACTIVE without rows:** safe zeroed learning dimension (no false precision)

## 39. Access service

Expanded `LearningProgressAccessService` with `assertCanReadEnrollmentProgress`, `assertCanReadClassProgress`, `assertCanManageLessonProgress`. Uses `ParishScopeService`, `ClassCatechistAssignmentService`, `StudentGuardianService`, `StudentService`.

## 40. Error contract

Consistent JSON error bodies via global exception filter; domain errors mapped in `learning-progress-http.util.ts`.

## 41. Swagger/OpenAPI

Controller annotated with `@ApiTags('learning-progress')`, operation summaries, response types, 400/403/409/422 docs.

## 42. FE readiness

**FE LEARNING PROGRESS CONTRACT READY: YES**

Supports lesson mark start/complete, lesson state synthesis, completion ratio, Practice dimension, last activity, parent child view, staff class view.

## 43. Mobile readiness

**MOBILE LEARNING PROGRESS CONTRACT READY: YES**

Idempotent PATCH, stable `canonicalLessonKey`, authoritative GET, locale-neutral status enums, server-side progress truth.

## 44. Security/minors

No child directory, no answer leakage, no lesson content text, no mastery/spiritual ranking, no raw actor PII in responses.

## 45. Practice call count

Enrollment route: **1** Practice call. Class route: **1** Practice call (regardless of page size).

## 46. Curriculum call count

Enrollment route: **1** assignment resolution + **1** tree fetch. Class route: **1** assignment + **1** tree fetch.

## 47. Lesson SQL aggregation

Batch `SELECT ... FROM lesson_progress WHERE enrollment_id IN (...)` — no per-learner queries.

## 48. N+1 audit

No per-learner StudentAccess checks, no per-learner Practice calls, no per-learner Curriculum calls. Class summary uses one batched progress query + full roster enrollment list (paginated loop for >100 learners).

## 49. Performance fixture

Demo class/enrollment/curriculum seeds sufficient for MVP class sizes. No aggregate table added.

## 50. Aggregate-table final decision

**LEARNING PROGRESS AGGREGATE TABLE REQUIRED NOW: NO**

Derived reads from `lesson_progress` + Practice public API remain acceptable for MVP scale.

## 51. Unit tests

- `learning-progress-access.service.spec.ts` — parent write/read, catechist read, parent class deny, super-admin write deny
- `learning-progress-ratio.util.spec.ts` — ratio edge cases
- Existing #002 unit tests retained (transition, lesson-progress service)

## 52. Integration tests

Existing #002 integration tests (`learning-progress-foundation`, `learning-progress-lesson`) remain green.

## 53. DB e2e

`test/learning-progress.db.e2e-spec.ts` — 401, parent PATCH/GET, unlinked 403, catechist/admin write 403, super-admin write 403, class GET scopes, backward transition 409, no answer leakage.

## 54. Existing regression

537 unit + 216 integration + 116 DB e2e — all PASS. Practice, Curriculum, Auth unchanged except permission seeds.

## 55. Pristine quality:full

```bash
npm run test:db:prepare -- --reset
npm run quality:full
```

**PASS** — exit code 0, one clean run.

## 56. Docker

```bash
docker build --target production -t catechism-api:learning-progress-api .
```

**PASS**

## 57. Multilingual readiness

Status enums and counters locale-neutral. Lesson titles remain in Curriculum Delivery, not Learning Progress responses.

## 58. Microservice extraction

HTTP routes + `LearningProgressService` facade remain extraction boundary. Composition would become cross-service HTTP calls to Practice and Curriculum in future split.

## 59. Commands

All required commands executed successfully (format, lint, typecheck, unit, e2e, build, audit, quality, migrations, integration, e2e:db, quality:full, migration:show, Docker).

## 60. Validation matrix

All explicit PASS/FAIL items from prompt §Explicit PASS/FAIL: **PASS** (see #002 report pattern; 50+ gates verified).

## 61. Known/deferred

| Item | Target |
|------|--------|
| Postman collection | #004 |
| README API section update | #004 |
| Date filters on aggregate | Deferred (intentional MVP omission) |
| Class review metrics on learner rows | Compact standard-only from Practice class row |
| Student self-write role | Post-MVP |

## 62. Out-of-scope (confirmed)

Exam, mastery score, topic/block progress, event bus, analytics warehouse, notifications, passive GET tracking, aggregate snapshot tables.

## 63. LEARNING PROGRESS #004 readiness

**READY: YES** — recommend **LEARNING PROGRESS #004/4 — Final Audit + Demo/Postman + quality:full + Docker + Phase Completion**.

## 64. Prompt count

LEARNING PROGRESS **#003/4 complete**. Approximately **1 prompt remains** (#004).

## 65. Commit recommendation

When ready:

```
git commit -m "feat(learning-progress): add aggregate progress APIs"
```

(Do not run unless explicitly requested.)
