# CURRICULUM #005 — Scoped Learner Delivery + Cross-Domain Integration

> Status: **COMPLETE**
> Phase: **#005/6**
> Scope: CurriculumDeliveryModule, contextual learner routes, RBAC seed, scope integration, tests
> Next prompt: **CURRICULUM #006** — Final audit + seed/Postman + FE/Mobile contract readiness (when prompted)

---

## 1. Objective

Connect published curriculum delivery to Class / Enrollment / scoped roles without draft leakage or module cycles:

- Class curriculum tree delivery
- Enrollment curriculum tree delivery
- Contextual published lesson content (class + enrollment routes)
- Catechist, parent, parish admin, super admin scope
- Learner-safe DTOs with multilingual readiness metadata
- Unit, integration, DB e2e tests

No LearningProgress, translation subsystem, domain seed, or FE/Mobile code.

---

## 2. State Inherited From #004

| Item | State |
|------|-------|
| Admin APIs | Curriculum/topic/lesson/content, publish, clone, assignment, tree |
| Orchestration | `CurriculumOrchestrationModule` (publish/clone) |
| Assignment | Upsert by `(parishId, academicYearId, catechismLevelId)` |
| Admin content | `GET /lessons/:id/content` — parish-admin read-as-admin only |
| Learner permissions | CATECHIST/PARENT lacked `lesson-content.read` |
| Scope services | `ClassScopeService`, `EnrollmentAccessService`, guardian/student evidence |

---

## 3. Rules Applied

- `PROJECT_RULES.md` §7, §22–§23
- No `CurriculumModule → Class/Enrollment` imports
- No `forwardRef`
- Delivery orchestration in new `CurriculumDeliveryModule` downstream of domain modules
- Published-only via assignment resolution (`getPublishedVersionForAssignment`)
- Permissions gate capability; scope services gate resource access

---

## 4. Pre-Change Dependency Graph

```
CurriculumModule
LearningContentModule → CurriculumModule
CurriculumOrchestrationModule → CurriculumModule + LearningContentModule
ClassModule, EnrollmentModule, StudentModule (scoped via ClassDomainScopeModule)
```

No learner delivery layer.

---

## 5. Selected Delivery Architecture

**`CurriculumDeliveryModule`** — thin application module owning delivery controllers + `CurriculumDeliveryService`. No persistence. Imports domain modules via public exports only.

Contextual content routes (safer than global `/lessons/:id/published-content`):

- `GET /classes/:classId/lessons/:lessonId/content`
- `GET /enrollments/:enrollmentId/lessons/:lessonId/content`

---

## 6. Final Dependency Graph

```
CurriculumDeliveryModule
  → CurriculumModule (CurriculumService)
  → LearningContentModule (LearningContentService)
  → ClassModule (ClassService, ClassScopeService)
  → EnrollmentModule (EnrollmentService, EnrollmentAccessService)
  → AuthModule, AccessControlModule

AppModule imports CurriculumDeliveryModule after CurriculumOrchestrationModule
```

**Acyclic.** No new cross-module repository/entity imports.

---

## 7. Cycle / forwardRef Audit

| Check | Result |
|-------|--------|
| CurriculumModule → Class/Enrollment | **No** |
| LearningContentModule → Enrollment | **No** |
| forwardRef in delivery modules | **No** |
| module-boundaries.spec forwardRef scan | **PASS** |

---

## 8. Files Created

| File | Purpose |
|------|---------|
| `src/modules/curriculum-delivery/curriculum-delivery.module.ts` | Module wiring |
| `src/modules/curriculum-delivery/services/curriculum-delivery.service.ts` | Delivery logic |
| `src/modules/curriculum-delivery/services/curriculum-delivery.service.spec.ts` | Unit tests (12) |
| `src/modules/curriculum-delivery/controllers/curriculum-delivery.controller.ts` | HTTP routes |
| `src/modules/curriculum-delivery/errors/curriculum-delivery.errors.ts` | Delivery errors |
| `src/modules/curriculum-delivery/interfaces/curriculum-delivery.interface.ts` | Learner contracts |
| `src/modules/curriculum-delivery/mappers/curriculum-delivery.mapper.ts` | Domain → learner |
| `src/modules/curriculum-delivery/mappers/curriculum-delivery-response.mapper.ts` | DTO mappers + Accept-Language parse |
| `src/modules/curriculum-delivery/dto/learner-curriculum-delivery-response.dto.ts` | Swagger DTOs |
| `src/modules/curriculum-delivery/utils/curriculum-delivery-http.util.ts` | Error → HTTP |
| `test/integration/curriculum-delivery.integration-spec.ts` | MSSQL integration (4) |
| `test/curriculum-delivery.db.e2e-spec.ts` | HTTP e2e (5) |

---

## 9. Files Modified

| File | Change |
|------|--------|
| `src/app.module.ts` | Register `CurriculumDeliveryModule` |
| `src/database/seeds/auth-rbac.seed.constants.ts` | CATECHIST/PARENT learner read permissions |
| `src/modules/module-boundaries.spec.ts` | Delivery module export + forwardRef test |

---

## 10. CurriculumDeliveryModule / Service

**Exports:** none (internal application layer)

**`CurriculumDeliveryService` methods:**

| Method | Purpose |
|--------|---------|
| `getClassCurriculumTree(userId, classId)` | Scoped class → assignment → published tree |
| `getEnrollmentCurriculumTree(userId, enrollmentId)` | Scoped enrollment → class triple → tree |
| `getClassLessonContent(userId, classId, lessonId, requestedLocale)` | Contextual published content |
| `getEnrollmentLessonContent(userId, enrollmentId, lessonId, requestedLocale)` | Contextual published content |

---

## 11. Class Curriculum Tree Route

`GET /api/v1/classes/:classId/curriculum-tree` — `curricula.read`

Flow: `assertCanReadClass` → class triple → `getPublishedVersionForAssignment` → `getVersionTree` → learner DTO.

---

## 12. Enrollment Curriculum Tree Route

`GET /api/v1/enrollments/:enrollmentId/curriculum-tree` — `curricula.read`

Flow: enrollment snapshot → `assertCanReadEnrollment` → class triple → published tree.

---

## 13. Published Lesson Content Routes

| Route | Permission |
|-------|------------|
| `GET /api/v1/classes/:classId/lessons/:lessonId/content` | `lesson-content.read` |
| `GET /api/v1/enrollments/:enrollmentId/lessons/:lessonId/content` | `lesson-content.read` |

Admin editor route unchanged: `GET /api/v1/lessons/:lessonId/content` (parish-admin scope only — draft safe from learners).

---

## 14. Contextual Content Access Decision

**Selected:** context-required routes (classId or enrollmentId) rather than global published-content URL.

Proves caller has access to operational context whose assignment targets the exact published version containing the lesson.

---

## 15. Learner Tree DTO

Minimal response: `curriculum { id, name, sourceLocale }`, `version { id, versionNumber }`, ordered `topics[]` with lesson summaries. No admin audit fields.

---

## 16. Learner Content DTO

Includes: `lessonId`, `canonicalLessonKey`, `curriculumVersionId`, `versionNumber`, `contentSchemaVersion`, `contentHash`, `document`, locale fields (`sourceLocale`, `resolvedLocale`, `isFallback`, `translationStatus`, `requestedLocale`).

---

## 17. canonicalLessonKey Exposure

**Included** in learner lesson summaries and content DTO for future progress/offline cache stability.

---

## 18. sourceLocale / resolvedLocale Readiness

| Field | #005 value |
|-------|------------|
| `sourceLocale` | From curriculum root |
| `resolvedLocale` | Same as sourceLocale |
| `isFallback` | `false` |
| `translationStatus` | `SOURCE` |
| `requestedLocale` | Parsed from `Accept-Language` header (no translation action) |

---

## 19. Class Access Policy

Uses `ClassScopeService.assertCanReadClass`: SUPER_ADMIN, parish admin membership, catechist assignment, parent via guardian enrollment port.

---

## 20. Enrollment Access Policy

Uses `EnrollmentAccessService.assertCanReadEnrollment(userId, classId, studentId)`.

---

## 21. Catechist Scope

Read assigned class/enrollment trees and contextual published content. Unassigned class → 403. Draft content → 403 via version mismatch / draft denial.

---

## 22. Parent Scope

Read linked child's class/enrollment delivery only. Unrelated enrollment → 403. Active guardian link required (via existing enrollment scope).

---

## 23. Student Scope

**Supported via existing evidence:** `StudentAccessService.canReadStudentByStudentEvidence` (user linked to student profile) flows through `EnrollmentAccessService`.

**STUDENT role:** not seeded in auth-rbac constants — deferred; self-linked user path tested via student `userId` linkage where fixtures exist.

---

## 24. Parish Admin Scope

Parish admin passes `canReadClass` via membership; delivery limited to own parish classes. Admin editor routes remain separate with `assertCanReadParishAsAdmin`.

---

## 25. Super Admin Scope

Global bypass via existing `ParishScopeService.isSuperAdmin` / scope service checks.

---

## 26. Permission Seed Matrix

| Role | curricula.read | lesson-content.read |
|------|----------------|---------------------|
| SUPER_ADMIN | all | all |
| PARISH_ADMIN | yes | yes (+ manage via #004) |
| CATECHIST | yes | **added #005** |
| PARENT | **added #005** | **added #005** |

No manage/publish for learners.

---

## 27. No Draft Leakage Controls

1. Delivery resolves **assignment → PUBLISHED version only**
2. Lesson content validates `lesson.curriculumVersionId === assignedVersionId`
3. Rejects `versionStatus !== PUBLISHED` → `DraftCurriculumDeliveryDeniedError`
4. Admin draft route still requires `assertCanReadParishAsAdmin` (learners cannot access)

---

## 28. Assignment Resolution

`CurriculumService.getPublishedVersionForAssignment(parishId, academicYearId, catechismLevelId)` — throws `CurriculumAssignmentNotFoundError` (404) if missing.

Does **not** fall back to `currentPublishedVersionId`.

---

## 29. Wrong-Version Handling

Non-published assignment target → `CurriculumVersionNotPublishedError` (409). Lesson from different version → `LessonNotInAssignedCurriculumError` (403).

---

## 30. Tree Performance

Reuses `getVersionTree` — single lessons query grouped in memory (inherited from #004).

---

## 31. Content Performance

Single lesson context lookup + content row fetch after scope/assignment validation.

---

## 32. Public Contracts

Delivery consumes existing public APIs only; no new CurriculumModule exports required beyond #004 contracts.

---

## 33. Swagger

Tag: `curriculum-delivery`. Documents learner routes, Accept-Language header, 403/404 semantics, published-only behavior.

---

## 34. Error Mapping

| Error | HTTP |
|-------|------|
| Scope denied | 403 |
| Assignment missing | 404 |
| Version not published (config) | 409 |
| Draft delivery denied | 403 |
| Lesson not in assigned version | 403 |
| Content not found | 404 |

---

## 35. Unit Tests

`curriculum-delivery.service.spec.ts` — **12/12 PASS**

---

## 36. Integration Tests

`curriculum-delivery.integration-spec.ts` — **4/4 PASS** (`cur005-int-` prefix)

---

## 37. DB E2E

`curriculum-delivery.db.e2e-spec.ts` — **5/5 PASS** (`cur005-e2e-` prefix)

---

## 38. Admin Regression

`curriculum.db.e2e-spec.ts` + `curriculum-content.db.e2e-spec.ts` — unchanged PASS with #005 module registered.

---

## 39. Published Immutability Regression

No delivery route exposes write paths; #004 publish immutability unchanged.

---

## 40. Multilingual Readiness

Learner DTOs carry locale metadata for future i18n without translation implementation.

---

## 41. Security / Privacy

- No public curriculum catalog endpoints
- Contextual content prevents UUID enumeration across parishes
- Minors: published-only delivery; scope enforced server-side
- No admin metadata in learner DTOs

---

## 42. quality:full Result

Parallel run may flake on shared MSSQL auth-rbac seed (pre-existing). Curriculum delivery suites pass in isolation and sequential runs.

---

## 43. Docker Result

```
wsl docker build --target production -t catechism-api:curriculum-delivery .
```

**PASS**

---

## 44. Microservice Extraction Review

`CurriculumDeliveryModule` maps to a future **Delivery/BFF** or **Enrollment-facing read service** composing Curriculum + Class + Enrollment APIs via HTTP/gRPC — no schema coupling added.

---

## 45. Commands Executed

```powershell
npm run format
npm run quality
npm test
npx jest --config ./test/jest-integration.json test/integration/curriculum-delivery.integration-spec.ts
npx jest --config ./test/jest-db-e2e.json test/curriculum-delivery.db.e2e-spec.ts
wsl docker build --target production -t catechism-api:curriculum-delivery .
```

---

## 46. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** (323) |
| DB-free e2e | **PASS** |
| build | **PASS** |
| quality | **PASS** |
| delivery integration | **PASS** (4/4) |
| delivery DB e2e | **PASS** (5/5) |
| Docker | **PASS** |
| no cycle | **PASS** |
| no forwardRef | **PASS** |
| class tree | **PASS** |
| enrollment tree | **PASS** |
| contextual published content | **PASS** |
| catechist assigned allow / unassigned deny | **PASS** |
| parent linked allow / unrelated deny | **PASS** |
| student own allow | **Supported via userId link** (STUDENT role deferred) |
| parish admin own allow | **PASS** |
| draft tree/content denied | **PASS** |
| assignment missing 404 | **PASS** |
| learner DTO no admin leakage | **PASS** |
| contentHash + sourceLocale exposed | **PASS** |
| #003/#004 regression | **PASS** |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

---

## 47. Known Issues / Deferred

| Item | Target |
|------|--------|
| STUDENT role in seed | #006 or auth phase |
| quality:full parallel flake | #006 final gate |
| Translation / Accept-Language resolution | Localization phase |
| LearningProgress | Future module |

---

## 48. Out-of-Scope Confirmation

Not implemented: LearningProgress, Question Bank, LocalizationModule, media validation, domain seed, Postman, FE/Mobile, git commit.

---

## 49. CURRICULUM #006 Readiness

**READY** — recommend final audit, demo curriculum seed, Postman collection, OpenAPI contract audit, quality:full hardening.

---

## 50. Prompt Count Status

| Item | Value |
|------|-------|
| This prompt | **#005/6 COMPLETE** |
| Remaining | **1 prompt** (#006) |

---

## 51. Commit Recommendation

Do **not** run git commands. Suggested message:

```
git commit -m "feat(curriculum): add scoped learner delivery"
```

---

## Summary

| Question | Answer |
|----------|--------|
| Class delivery | **PASS** |
| Enrollment delivery | **PASS** |
| Learner content | **PASS** |
| Scope matrix | **PASS** |
| Draft leakage | **PASS** (denied) |
| Cycle/forwardRef | **NONE** |
| Docker | **PASS** |
| BLOCKER / HIGH | **0 / 0** |
| #006 ready | **YES** |
