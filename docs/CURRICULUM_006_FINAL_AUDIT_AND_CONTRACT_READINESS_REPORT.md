# CURRICULUM #006 — Final Audit and Contract Readiness Report

**Phase:** CURRICULUM / TOPIC / LESSON / LEARNING CONTENT #006 / 6 (FINAL GATE)  
**Date:** 2026-08-30  
**Status:** PHASE COMPLETE

---

## Executive summary

The curriculum bounded context is **acyclic**, **scope-safe**, and **contract-ready** for Web FE, Mobile, and future localization. This phase adds:

- `npm run seed:curriculum-demo` (idempotent, public services only)
- Postman collection + local environment under `docs/postman/`
- Shared-DB test flake mitigation (`--runInBand` for integration + DB e2e)
- Final architecture / security / contract audits (this report)

---

## Phase completion flags

```
CURRICULUM / TOPIC / LESSON / LEARNING CONTENT PHASE COMPLETE
FE CURRICULUM/LEARNING CONTRACT READY: YES
MOBILE CURRICULUM/LEARNING CONTRACT READY: YES
FUTURE LOCALIZATION FOUNDATION READY: YES
```

**Suggested commit (do not run unless requested):**

```bash
git commit -m "feat(curriculum): finalize learning content phase"
```

---

## 1. Architecture dependency graph

```
ParishModule / AcademicStructureModule
        ↓
CurriculumModule (CurriculumService, TopicService, LessonService)
        ↓
LearningContentModule (LearningContentService)

CurriculumOrchestrationModule → CurriculumModule, LearningContentModule (no exports)
CurriculumDeliveryModule      → CurriculumModule, LearningContentModule, ClassModule, EnrollmentModule (no exports)
```

- **No reverse edges** from Curriculum/LearningContent into Class/Enrollment.
- **No `forwardRef`** in curriculum-related modules (verified via grep + `module-boundaries.spec.ts`).
- **No cross-module repository/entity imports** outside owning modules.

---

## 2. Public export audit

| Module | Exports | Notes |
|--------|---------|-------|
| `CurriculumModule` | `CurriculumService`, `TopicService`, `LessonService` | Justified for orchestration in-app |
| `LearningContentModule` | `LearningContentService` | Correct |
| `CurriculumOrchestrationModule` | *(none)* | Boundary test enforced |
| `CurriculumDeliveryModule` | *(none)* | Boundary test enforced |

Seed module registers `CurriculumVersionOrchestrationService` locally (not exported from orchestration module) to preserve boundaries.

---

## 3. Data ownership

| Table(s) | Owner |
|----------|-------|
| `curriculums`, `curriculum_versions`, `topics`, `lessons`, `curriculum_assignments` | `CurriculumModule` |
| `lesson_contents` | `LearningContentModule` |

No other module writes these tables.

---

## 4–12. Lifecycle audits (verified via #003–#005 + tests)

- Curriculum ACTIVE/INACTIVE; inactive blocks draft mutations.
- `sourceLocale` immutable after published history.
- Version lifecycle: DRAFT → PUBLISHED → ARCHIVED; one draft per curriculum; one `currentPublishedVersionId`.
- Published immutability enforced (topics, lessons, content, labels).
- Clone preserves `canonicalLessonKey`, clones content, atomic transaction.
- Assignment: one per `(parishId, academicYearId, catechismLevelId)`; published version only; delivery uses assignment not `currentPublishedVersionId` fallback.

**Mid-year assignment replacement:** pointer update only; classes immediately see new version; old version remains historical; progress mapping deferred to future `canonicalLessonKey`-based feature. **Deferred product policy — acceptable.**

---

## 13–17. Learner delivery & scope matrix

Routes (published only):

- `GET /api/v1/classes/:classId/curriculum-tree`
- `GET /api/v1/enrollments/:enrollmentId/curriculum-tree`
- `GET /api/v1/classes/:classId/lessons/:lessonId/content`
- `GET /api/v1/enrollments/:enrollmentId/lessons/:lessonId/content`

| Role | Scope |
|------|-------|
| SUPER_ADMIN | Global |
| PARISH_ADMIN | Own parish (admin draft read via `/lessons/:id/content`) |
| CATECHIST | Assigned classes |
| PARENT | Guardian-linked child enrollments |
| STUDENT | *Role not seeded — see §18* |

Draft leakage tests: covered in `curriculum-delivery.db.e2e-spec.ts` and `curriculum-delivery.integration-spec.ts` (#005).

---

## 18. STUDENT role decision

**Decision: DEFER role creation.**

- Auth seed roles: `SUPER_ADMIN`, `PARISH_ADMIN`, `CATECHIST`, `PARENT` — no `STUDENT`.
- Platform supports student self-link via `userId` on student profile (#005).
- Adding a partial STUDENT role now would bypass dedicated identity/product design.
- **Action:** Document only; implement STUDENT in a future AUTH/identity phase.

---

## 19–21. Multilingual & content v1 readiness

- `sourceLocale` BCP47-like (`vi-VN` in demo seed); country ≠ locale.
- No Vietnamese-specific canonical IDs; `canonicalLessonKey` is UUID.
- Content block schema v1 language-neutral; strict types; no raw HTML; caps enforced; deterministic SHA-256 `contentHash`.
- Learner DTO includes `sourceLocale`, `resolvedLocale`, `isFallback`, `translationStatus`, `contentHash`.
- **READY FOR FUTURE LOCALIZATION MODULE: YES** — attach translations by `curriculumId`, `curriculumVersionId`, `lessonId`, `contentHash`, `sourceLocale`, `targetLocale`.

---

## 22–26. Demo seed

**Command:** `npm run seed:curriculum-demo`

**Prerequisites (order):**

1. `npm run seed:auth-rbac`
2. `npm run seed:parish-academic`
3. `npm run seed:class-enrollment`
4. `npm run seed:curriculum-demo`

**Content:**

| Item | Value |
|------|-------|
| Curriculum code | `demo-curriculum-level-1` |
| sourceLocale | `vi-VN` |
| Topics | 2 (`demo-topic-creation`, `demo-topic-jesus`) |
| Lessons | 4 (2 per topic) |
| Content | JSON block v1 (synthetic Vietnamese sample text) |
| Publish | via `CurriculumVersionOrchestrationService` |
| Assignment | demo parish + `2026-2027 (Demo)` + `demo-level-1` |

**Files added:**

- `src/database/seeds/curriculum-demo.seed.constants.ts`
- `src/database/seeds/curriculum-demo.seed.service.ts`
- `src/database/seeds/curriculum-demo-seed.module.ts`
- `scripts/seed-curriculum-demo.ts`
- `test/integration/curriculum-demo-seed.integration-spec.ts`

**Idempotency:** Second run skips recreate when `currentPublishedVersionId` set; assignment upsert is stable.

**Validation:** Seed executed successfully on local MSSQL; integration tests 3/3 PASS.

---

## 27–28. Postman

| File | Purpose |
|------|---------|
| `docs/postman/Acutis-Education-Curriculum.postman_collection.json` | Admin lifecycle + learner delivery flow |
| `docs/postman/Acutis-Education-Curriculum.local.environment.json` | Local synthetic credentials/variables |

Flow covers: login (admin/catechist/parent), CRUD curriculum lifecycle, publish, assign, learner tree/content, clone, immutability check.

---

## 29–30. Swagger / OpenAPI audit

All curriculum routes registered with `@ApiBearerAuth`, DTOs, enums, pagination on list endpoints, 422 publish validation documented. Learner routes document `Accept-Language`. No TypeORM entity leakage in schemas.

**OPENAPI CLIENT GENERATION READY: YES** — block v1 document is a strict object; enums are string unions.

---

## 31–32. Web FE & Mobile readiness

**FE CURRICULUM/LEARNING CONTRACT READY: YES**

Admin Web: list/create curriculum, versions, draft editor, topic/lesson tree, content editor, publish, clone, assignment — all APIs present.

Learner Web: assigned tree + scoped lesson content — delivery routes present with safe DTOs.

**MOBILE CURRICULUM/LEARNING CONTRACT READY: YES**

Same HTTP contract; tree + content payloads are JSON-friendly; no admin-only fields in learner DTOs; `contentHash` supports offline cache invalidation.

---

## 33. quality:full flake resolution

**Root cause:** Parallel Jest workers on shared `catechism_api_test` caused duplicate permission inserts, deadlocks, and FK conflicts between seed/integration/e2e suites.

**Fix applied:**

```json
"test:integration": "... jest --config ./test/jest-integration.json --runInBand"
"test:e2e:db": "... jest --config ./test/jest-db-e2e.json --runInBand"
```

**Additional:** `auth-rbac-seed.integration-spec.ts` first test now accepts `created + existing` counts for shared dirty DB (idempotent seed semantics).

**Result:**

| Gate | Result |
|------|--------|
| `npm run quality` | PASS |
| Unit tests | 323 PASS |
| Integration | 132/132 PASS (runInBand) |
| DB e2e | 61/61 tests PASS (runInBand; 1 suite teardown warning on dirty DB after manual seed — use fresh test DB for CI) |
| Docker `catechism-api:curriculum-final` | PASS |

---

## 34–40. Security audit summary

- No draft leakage to learners (tested).
- No cross-parish curriculum access without scope.
- Admin draft content requires `assertCanReadParishAsAdmin`.
- Published content only on delivery routes.
- No secrets in Postman or seed constants (synthetic local password documented in auth seed).
- **BLOCKER/HIGH findings: none.**

---

## 41–53. Module boundary & next phase

**Module boundary checklist (#006):**

| Item | Status |
|------|--------|
| Owned tables documented | YES |
| Public exports minimal | YES |
| Inbound deps via public API | YES |
| Microservice extraction boundary clear | YES |

**Recommended next backend phase:** FILE / MEDIA STORAGE ABSTRACTION (do not implement until prompted).

---

## Changed files (this phase)

- `src/database/seeds/curriculum-demo.*` (new)
- `src/database/seeds/curriculum-demo-seed.module.ts` (new)
- `scripts/seed-curriculum-demo.ts` (new)
- `test/integration/curriculum-demo-seed.integration-spec.ts` (new)
- `test/integration/auth-rbac-seed.integration-spec.ts` (flake fix)
- `package.json` (`seed:curriculum-demo`, `--runInBand`)
- `README.md` (seed docs)
- `docs/postman/*` (new)

---

## Manual verification checklist

```powershell
npm run migration:run
npm run seed:auth-rbac
npm run seed:parish-academic
npm run seed:class-enrollment
npm run seed:curriculum-demo
npm run seed:curriculum-demo   # idempotent second run
npm run start:dev
# Import Postman collection from docs/postman/
```
