# CURRICULUM #004 — Learning Content Domain

> Status: **COMPLETE** (service layer)
> Scope: LearningContentService, content document model, validation, hashing, CurriculumService lesson helpers

---

## 1. Objective

Implement the LearningContent domain service layer for draft lesson JSON content:

- `ContentDocumentV1` block model (8 block types)
- Strict validation, canonical JSON hashing (SHA-256)
- `LearningContentService` with upsert/get/delete/publish-validation/clone
- `CurriculumService` extensions for lesson context and version tree
- Module export: `LearningContentService` only

No HTTP controllers, RBAC seed wiring, or LessonService CRUD in this slice.

---

## 2. Files Created

| File | Purpose |
|------|---------|
| `src/modules/learning-content/interfaces/learning-content.interface.ts` | Document/snapshot contracts |
| `src/modules/learning-content/errors/learning-content.errors.ts` | Domain errors |
| `src/modules/learning-content/utils/canonical-json.util.ts` | Stable JSON serialization |
| `src/modules/learning-content/utils/content-hash.util.ts` | SHA-256 content hash |
| `src/modules/learning-content/utils/content-document-v1.validator.ts` | Strict document validation |
| `src/modules/learning-content/utils/learning-content-http.util.ts` | Error → HTTP mapping |
| `src/modules/learning-content/mappers/learning-content.mapper.ts` | Entity ↔ snapshot |
| `src/modules/learning-content/services/learning-content.service.ts` | Business logic |
| `src/modules/learning-content/services/learning-content.service.spec.ts` | Unit tests |
| `src/modules/learning-content/constants/learning-content-permissions.constants.ts` | Permission codes |
| `src/modules/learning-content/dto/content-document-v1.dto.ts` | Swagger DTOs |
| `src/modules/learning-content/dto/upsert-lesson-content-request.dto.ts` | Re-export |
| `src/modules/learning-content/dto/lesson-content-response.dto.ts` | Re-export |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `src/modules/learning-content/learning-content.module.ts` | Import CurriculumModule, export LearningContentService |
| `src/modules/curriculum/services/curriculum.service.ts` | Lesson context, version tree, publish/assignment helpers |
| `src/modules/curriculum/errors/curriculum.errors.ts` | Lesson + assignment errors |
| `src/modules/curriculum/interfaces/curriculum.interface.ts` | VersionTree types |
| `src/modules/curriculum/mappers/curriculum.mapper.ts` | Lesson + version-tree mappers |
| `src/modules/module-boundaries.spec.ts` | Assert LearningContentService export |

---

## 4. LearningContentService API

| Method | Purpose |
|--------|---------|
| `upsertLessonContent(lessonId, input)` | Create/update content (DRAFT only) |
| `getLessonContent(lessonId)` | Read snapshot |
| `deleteByLessonId(lessonId, entityManager?)` | Delete for orchestration |
| `validateLessonHasNonEmptyContent(lessonId)` | Publish guard |
| `collectPublishValidationIssues(versionId, entityManager?)` | Version-wide publish issues |
| `cloneContentForLessons(lessonIdMap, entityManager)` | Clone rows preserving hash/json |

---

## 5. CurriculumService Extensions

| Method | Purpose |
|--------|---------|
| `getLessonById(lessonId)` | Lesson snapshot |
| `getLessonCurriculumContext(lessonId)` | Parish/version/topic context |
| `assertVersionPublished(versionId)` | Publish guard |
| `getVersionTree(versionId)` | Topics + lessons tree |
| `getPublishedVersionForAssignment(parishId, yearId, levelId)` | Assignment resolution |

Uses existing `lesson.interface.ts` for `LessonSnapshot` / `LessonCurriculumContext`.

---

## 6. Content Model

- `schemaVersion`: 1
- Blocks: heading (1–3), paragraph, bullet_list, numbered_list, scripture_ref, callout (info/tip/important), image_ref, video_ref
- Limits: 500 blocks, ~256KB serialized JSON
- Hash: SHA-256 lowercase hex over canonical `{ schemaVersion, blocks }`
- Rejects HTML tags, script URLs, unknown keys/types, invalid UUID assetIds

---

## 7. Module Boundaries

```
LearningContentModule
├── TypeOrmModule.forFeature([LessonContentEntity])
├── CurriculumModule → CurriculumService
├── LearningContentService (exported)
```

Cross-module: LearningContent → Curriculum via public `CurriculumService` only.

---

## 8. Validation Results

| Gate | Result |
|------|--------|
| typecheck | **PASS** |
| learning-content.service.spec | **PASS** (22 tests) |
| module-boundaries.spec | **PASS** |

---

## 9. Out of Scope

- LessonService CRUD / HTTP controllers
- RBAC seed for `lesson-content.*` permissions
- Publish/clone orchestration commands
- Asset upload subsystem

---

## 10. Next Steps (#004 continuation)

- LessonService + lesson HTTP API
- Learning content controller + RBAC seed
- Publish/clone version workflow wiring `collectPublishValidationIssues`
