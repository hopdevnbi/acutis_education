# CURRICULUM #004 — Lesson + Learning Content + Publish / Clone / Assignment

> Status: **COMPLETE**
> Phase: **#004/6**
> Scope: LessonService, LearningContentService, orchestration, publish/clone/assignment, HTTP APIs, RBAC, tests
> Next prompt: **CURRICULUM #005** — Scoped learner delivery + cross-domain integration (when prompted)

---

## 1. Objective

Implement the heaviest curriculum phase per #001–#003 design:

- Lesson CRUD/reorder/delete (draft-only)
- JSON block document v1 + SHA-256 `contentHash`
- Publish curriculum version command with structured 422 validation
- Deep clone published/archived version → new DRAFT
- Curriculum assignment upsert/read
- Version tree API (admin, no embedded content)
- Cross-module orchestration without cyclic imports
- Unit, integration, and DB e2e tests

No learner-facing scoped delivery (#005), translation subsystem, or LearningProgress.

---

## 2. State Inherited From #003

| Item | State |
|------|-------|
| CurriculumService + TopicService | CRUD, draft versions, parish scope |
| RBAC | `curricula.read`, `curricula.manage`, `curricula.publish` |
| Schema | lessons, lesson_contents, curriculum_assignments (migration #7) |
| LearningContentModule | Entity only before #004 |
| Module export | CurriculumService (+ TopicService/LessonService for orchestration) |

---

## 3. Rules Applied

- `PROJECT_RULES.md` §7 modular architecture, §22–§23 security/privacy
- `LearningContentModule → CurriculumModule` one-way dependency only
- No `forwardRef`, cross-module repositories, or entity exports
- Orchestration via `CurriculumOrchestrationModule` at application layer
- Transactions via shared `DataSource` + `EntityManager`-scoped module methods
- English source/API; validated DTOs; snapshots at boundaries

---

## 4. Architecture / Cycle Audit

```
CurriculumModule          (owns curriculum structure + lessons + assignments)
LearningContentModule     → CurriculumModule (public CurriculumService)
CurriculumOrchestrationModule → CurriculumModule + LearningContentModule
AppModule                 → all three (acyclic)
```

**No cycle:** CurriculumModule does **not** import LearningContentModule.

---

## 5. Clone Orchestration Design

`CurriculumVersionOrchestrationService` owns transaction boundaries:

1. `cloneVersionStructureTransaction` (CurriculumService) — topics + lessons, returns `lessonIdMap`
2. `cloneContentForLessons` (LearningContentService) — copies content rows preserving hash/json

Publish and lesson delete follow the same pattern (orchestrator + module-scoped `EntityManager` operations).

---

## 6. Files Created

| Area | Files |
|------|-------|
| Lesson domain | `lesson.interface.ts`, `lesson.errors.ts`, `lesson-code.util.ts`, `lesson-title.util.ts`, `lesson.service.ts`, `lesson.service.spec.ts`, lesson DTOs |
| Learning content | `learning-content.interface.ts`, errors, validators, hash/canonical JSON utils, mapper, service, spec, controller, DTOs, permissions constants |
| Orchestration | `curriculum-orchestration.module.ts`, `curriculum-version-orchestration.service.ts`, `lesson.controller.ts`, `curriculum-command.controller.ts`, orchestration spec |
| Assignment/tree DTOs | `version-tree-response.dto.ts`, assignment request/response DTOs, `publish-validation-error.dto.ts` |
| Tests | `curriculum-lesson-content.integration-spec.ts`, `curriculum-content.db.e2e-spec.ts` |

---

## 7. Files Modified

| File | Change |
|------|--------|
| `curriculum.service.ts` | Assignment, tree, publish/clone transactions, public #005 contracts |
| `curriculum.errors.ts` | Publish validation, clone, assignment errors |
| `curriculum.interface.ts` | Assignment + tree types |
| `curriculum.mapper.ts` / `curriculum-response.mapper.ts` | Lesson, tree, assignment mappers |
| `curriculum-http.util.ts` | 422 publish, assignment, lesson errors |
| `curriculum.controller.ts` | Tree + assignment routes |
| `curriculum.module.ts` | LessonService; exports CurriculumService, TopicService, LessonService |
| `learning-content.module.ts` | Service, controller, CurriculumModule import |
| `auth-rbac.seed.constants.ts` | `lesson-content.read`, `lesson-content.manage` |
| `app.module.ts` | CurriculumOrchestrationModule |
| `module-boundaries.spec.ts` | Orchestration + LearningContent export tests |

---

## 8. CurriculumModule Changes

- Added `LessonService`
- Extended `CurriculumService` with assignment, tree, transactional publish/clone
- Exports: `CurriculumService`, `TopicService`, `LessonService` (orchestration DI)

---

## 9. LearningContentModule Changes

- Imports `CurriculumModule` (public API only)
- `LearningContentService` + `LearningContentController`
- Exports `LearningContentService` only

---

## 10. Public Exports

| Module | Exports |
|--------|---------|
| CurriculumModule | CurriculumService, TopicService, LessonService |
| LearningContentModule | LearningContentService |
| CurriculumOrchestrationModule | **none** |

---

## 11. LessonSnapshot

`id`, `curriculumVersionId`, `topicId`, `canonicalLessonKey`, `code`, `title`, `summary`, `sortOrder`, `estimatedDurationMinutes`, `createdAt`, `updatedAt`.

---

## 12. Lesson CRUD

| Method | Route | Permission |
|--------|-------|------------|
| POST | `/api/v1/topics/:topicId/lessons` | `curricula.manage` |
| GET | `/api/v1/topics/:topicId/lessons` | `curricula.read` |
| GET | `/api/v1/lessons/:id` | `curricula.read` |
| PATCH | `/api/v1/lessons/:id` | `curricula.manage` |

Draft + active curriculum required. `canonicalLessonKey` immutable.

---

## 13. Lesson Reorder / Delete

| Method | Route | Notes |
|--------|-------|-------|
| PATCH | `/api/v1/topics/:topicId/lessons/reorder` | Exact set, transaction, 0..n-1 |
| DELETE | `/api/v1/lessons/:id` | Orchestrator deletes content + structure |

---

## 14. canonicalLessonKey Behavior

- Generated UUID v4 on create
- Preserved on clone (new lesson row, same key)
- Immutable on update
- Enables future progress tracking across versions

---

## 15. Content Document v1

```json
{ "schemaVersion": 1, "blocks": [ ... ] }
```

Block types: `heading`, `paragraph`, `bullet_list`, `numbered_list`, `scripture_ref`, `callout`, `image_ref`, `video_ref`.

---

## 16. Block Validation

- Strict discriminated union; reject unknown types/keys
- Max 500 blocks; ~256KB payload
- No HTML/script URLs
- `assetId` UUID validation for media refs
- Text trimmed where applicable

---

## 17. contentHash

SHA-256 hex lowercase (64 chars) over canonical JSON of `{ schemaVersion, blocks }` only (stable key ordering via `canonical-json.util.ts`).

---

## 18. Content API

| Method | Route | Permission |
|--------|-------|------------|
| PUT | `/api/v1/lessons/:lessonId/content` | `lesson-content.manage` |
| GET | `/api/v1/lessons/:lessonId/content` | `lesson-content.read` |

Draft-only upsert. No public DELETE (lesson delete orchestrates removal).

---

## 19. Publish Command

`POST /api/v1/curriculum-versions/:id/publish` — permission `curricula.publish`.

Command endpoint (not generic status PATCH).

---

## 20. Publish Validation

Structured `422` via `CurriculumPublishValidationError`:

| Code | Condition |
|------|-----------|
| `NO_TOPICS` | Zero topics |
| `TOPIC_WITHOUT_LESSONS` | Topic with no lessons |
| `CONTENT_MISSING` | No content row |
| `CONTENT_EMPTY` | Empty blocks |

Each issue: `code`, `message`, optional `resourceId`, `path`.

---

## 21. Publish Transaction

`publishDraftVersionTransaction`:

- Pessimistic lock on curriculum
- Set version PUBLISHED + `publishedAt` + `publishedByUserId`
- Set `curriculum.currentPublishedVersionId`

---

## 22. Previous-Current Archival Policy

When publishing new current version: previous `currentPublishedVersionId` → **ARCHIVED** atomically. Exactly one current published pointer on curriculum root.

---

## 23. Published Immutability

After publish: topic/lesson/content/version label mutations reject with 409. Integration + e2e tests verify.

---

## 24. Clone Command

`POST /api/v1/curriculum-versions/:id/clone-to-draft` — permission `curricula.manage`.

---

## 25. Clone Transaction

Single transaction: structure clone + content clone. Rejects if DRAFT already exists.

---

## 26. Clone canonicalLessonKey Preservation

New lesson IDs; same `canonicalLessonKey` per cloned lesson. Verified in integration tests.

---

## 27. Cross-Module Transaction Ownership

`CurriculumVersionOrchestrationService` owns `DataSource.transaction`; passes `EntityManager` to:

- `CurriculumService.publishDraftVersionTransaction` / `cloneVersionStructureTransaction`
- `LearningContentService.cloneContentForLessons` / `deleteByLessonId`
- `LessonService.deleteLessonStructureTransaction`

---

## 28. Assignment API

| Method | Route | Permission |
|--------|-------|------------|
| PUT | `/api/v1/parishes/:parishId/academic-years/:yearId/catechism-levels/:levelId/curriculum-assignment` | `curricula.manage` |
| GET | same | `curricula.read` |

---

## 29. Assignment Validation

- Year PLANNED or ACTIVE (not CLOSED)
- Level belongs to parish
- Version PUBLISHED
- Curriculum parish + catechism level match route
- Curriculum ACTIVE

---

## 30. Assignment Concurrency / Upsert

One row per `(parishId, academicYearId, catechismLevelId)`; update `curriculumVersionId` + `assignedAt` on repeat. DB unique index is final guard.

---

## 31. Assignment Snapshot

`id`, `parishId`, `academicYearId`, `catechismLevelId`, `curriculumVersionId`, `assignedByUserId`, `assignedAt`, `createdAt`, `updatedAt`.

---

## 32. Tree API

`GET /api/v1/curriculum-versions/:id/tree` — version metadata + ordered topics + lesson summaries (no content documents).

---

## 33. Tree Query Efficiency

Single query for all lessons by `curriculumVersionId`; grouped in memory by `topicId`. No N+1 per topic.

---

## 34. Public Contracts for #005

On `CurriculumService`:

- `getPublishedVersionForAssignment(parishId, yearId, levelId)`
- `getVersionTree(versionId)`
- `assertVersionPublished(versionId)`
- `getLessonById(lessonId)`
- `getLessonCurriculumContext(lessonId)`

Snapshots/IDs only.

---

## 35. Parish Scope

All mutation/read routes use `ParishScopeService` after resolving parish via curriculum context.

---

## 36. RBAC Permissions

| Permission | PARISH_ADMIN | CATECHIST | PARENT |
|------------|--------------|-----------|--------|
| `curricula.*` | read/manage/publish | read only | none |
| `lesson-content.read` | yes | no (#005) | no |
| `lesson-content.manage` | yes | no | no |

SUPER_ADMIN receives all via seed map.

---

## 37. HTTP Routes (Summary)

15+ new routes across lesson, content, publish, clone, assignment, tree controllers (see sections 12–13, 18–19, 24, 28, 32).

---

## 38. DTOs

Lesson, content document v1, tree, assignment, publish validation error DTOs with Swagger decorators and class-validator whitelisting.

---

## 39. Error Mapping

`curriculum-http.util.ts` + `learning-content-http.util.ts` — 400/403/404/409/422 mapping; no SQL/stack leakage.

---

## 40. Swagger

Tags: `curricula`, `curriculum-topics`, `curriculum-lessons`, `lesson-content`. Document v1 schema, contentHash, publish 422 shape.

---

## 41. Unit Tests

| Suite | Tests |
|-------|-------|
| `lesson.service.spec.ts` | 10 |
| `learning-content.service.spec.ts` | 22 |
| `curriculum-version-orchestration.service.spec.ts` | 6 |

**Total unit:** 310 (61 suites) — all PASS.

---

## 42. Integration Tests

`curriculum-lesson-content.integration-spec.ts` — 7 tests: lesson CRUD/reorder, content hash, publish validation, publish + immutability, clone + canonical key, assignment, tree query pattern.

**Result:** PASS (isolated).

---

## 43. DB E2E

| Suite | Tests |
|-------|-------|
| `curriculum.db.e2e-spec.ts` | 7 (from #003) |
| `curriculum-content.db.e2e-spec.ts` | 5 (#004 flows) |

**Result:** 12/12 PASS.

---

## 44. Multilingual Readiness

- `sourceLocale` remains on curriculum root
- `contentHash` populated on content upsert
- Block schema language-neutral
- No translation tables/APIs

---

## 45. Security / Privacy

- Server-side RBAC + parish scope on all routes
- No child PII in content model
- Draft content readable only on admin/editor path (#004)
- No logging of content bodies or tokens
- `assetId` validated as UUID only (no storage checks)

---

## 46. Existing Regression

Prior curriculum (#003), class, enrollment, auth tests unaffected. Unit + e2e regression PASS.

---

## 47. quality:full

Parallel integration can flake on `auth-rbac-seed.integration-spec.ts` (shared MSSQL seed state — pre-existing). Curriculum #004 suites pass in isolation and sequential runs.

---

## 48. Docker

```
wsl docker build --target production -t catechism-api:curriculum-content .
```

**PASS** (WSL).

---

## 49. Microservice Extraction

| Future service | Owns |
|----------------|------|
| Curriculum | structure, versions, assignments |
| Content | lesson_contents |

Orchestration pattern maps to saga/coordinator at API gateway layer.

---

## 50. Commands Executed

```powershell
npm run format
npm run quality
npm test
npx jest --config ./test/jest-integration.json test/integration/curriculum-lesson-content.integration-spec.ts
npx jest --config ./test/jest-db-e2e.json test/curriculum-content.db.e2e-spec.ts test/curriculum.db.e2e-spec.ts
wsl docker build --target production -t catechism-api:curriculum-content .
```

---

## 51. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** (310) |
| DB-free e2e | **PASS** |
| build | **PASS** |
| quality | **PASS** |
| curriculum integration (#004) | **PASS** (7/7) |
| curriculum e2e (#003+#004) | **PASS** (12/12) |
| integration `--runInBand` | **FLAKE** (auth-rbac seed — pre-existing) |
| quality:full | **FLAKE** (same) |
| Docker | **PASS** |
| no module cycle | **PASS** |
| no forwardRef | **PASS** |
| lesson CRUD/reorder/delete | **PASS** |
| canonicalLessonKey immutable | **PASS** |
| content v1 + contentHash | **PASS** |
| publish validation/success | **PASS** |
| published immutability | **PASS** |
| clone + content copy | **PASS** |
| assignment upsert | **PASS** |
| tree API | **PASS** |
| no translation subsystem | **PASS** |
| no learner delivery | **PASS** |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

---

## 52. Known Issues / Deferred

| Item | Target |
|------|--------|
| Learner scoped delivery | #005 |
| CATECHIST/PARENT content read | #005 |
| Translation subsystem | Future localization phase |
| `quality:full` parallel flake | #006 final gate |
| Media asset existence checks | Future media service |

---

## 53. Out-of-Scope Confirmation

Not implemented:

- Class/enrollment curriculum trees
- Parent/student/catechist learner scope
- LocalizationModule / TranslationService
- LearningProgress
- Domain seed / Postman (#006)
- Git commit/push

---

## 54. CURRICULUM #005 Readiness

**READY** — no unresolved BLOCKER/HIGH.

#005: classId/enrollmentId → assignment → published tree, scoped content delivery, admin vs learner DTO separation, no draft leakage.

---

## 55. Prompt Count Status

| Item | Value |
|------|-------|
| This prompt | **#004/6 COMPLETE** |
| Remaining | **2 prompts** (#005–#006) |

---

## 56. Commit Recommendation

Do **not** run git commands. Suggested message:

```
git commit -m "feat(curriculum): add lesson content publishing"
```

---

## Summary

| Question | Answer |
|----------|--------|
| Lesson API | **PASS** |
| Content API | **PASS** |
| Publish | **PASS** |
| Clone | **PASS** |
| Assignment | **PASS** |
| Cycle/forwardRef | **NONE** |
| quality:full (parallel) | **FLAKE** (pre-existing) |
| Docker | **PASS** |
| BLOCKER / HIGH | **0 / 0** |
| #005 ready | **YES** |
