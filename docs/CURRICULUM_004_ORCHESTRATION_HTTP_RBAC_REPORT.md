# CURRICULUM #004 — Orchestration, HTTP API, RBAC

> Status: **COMPLETE**
> Scope: Publish/clone orchestration, lesson & content controllers, curriculum assignment, RBAC seed

---

## 1. Objective

Wire CURRICULUM #004 service layer into HTTP APIs:

- Publish/clone version orchestration with validation
- Lesson CRUD (DELETE via orchestrator)
- Lesson content GET/PUT
- Curriculum assignment GET/PUT
- Version tree GET
- RBAC seed for `lesson-content.*`
- Module boundaries for `CurriculumOrchestrationModule`

---

## 2. Files Created

| File | Purpose |
|------|---------|
| `src/modules/curriculum-orchestration/curriculum-orchestration.module.ts` | Orchestration module |
| `src/modules/curriculum-orchestration/services/curriculum-version-orchestration.service.ts` | Publish/clone/delete orchestration |
| `src/modules/curriculum-orchestration/controllers/lesson.controller.ts` | Lesson HTTP routes |
| `src/modules/curriculum-orchestration/controllers/curriculum-command.controller.ts` | Publish/clone/assignment routes |
| `src/modules/learning-content/controllers/learning-content.controller.ts` | Lesson content GET/PUT |
| `src/modules/curriculum/dto/version-tree-response.dto.ts` | Version tree response |
| `src/modules/curriculum/dto/upsert-curriculum-assignment-request.dto.ts` | Assignment upsert body |
| `src/modules/curriculum/dto/curriculum-assignment-response.dto.ts` | Assignment response |
| `src/modules/curriculum/dto/publish-validation-error.dto.ts` | Swagger 422 schema |

---

## 3. Files Modified

| File | Change |
|------|--------|
| `src/modules/curriculum/errors/curriculum.errors.ts` | Publish/clone/assignment errors |
| `src/modules/curriculum/interfaces/curriculum.interface.ts` | Assignment snapshot/input types |
| `src/modules/curriculum/services/curriculum.service.ts` | Assignment + transactional publish/clone |
| `src/modules/curriculum/services/lesson.service.ts` | `deleteLessonStructureTransaction` |
| `src/modules/curriculum/mappers/curriculum.mapper.ts` | Assignment snapshot mapper |
| `src/modules/curriculum/mappers/curriculum-response.mapper.ts` | Tree + assignment DTO mappers |
| `src/modules/curriculum/utils/curriculum-http.util.ts` | 422 publish, assignment errors |
| `src/modules/curriculum/controllers/curriculum.controller.ts` | `GET curriculum-versions/:id/tree` |
| `src/modules/curriculum/curriculum.module.ts` | Export TopicService + LessonService |
| `src/modules/learning-content/learning-content.module.ts` | Controller + auth/parish imports |
| `src/modules/learning-content/mappers/learning-content.mapper.ts` | Response DTO mapper |
| `src/modules/learning-content/utils/learning-content-http.util.ts` | Parish scope mapping |
| `src/database/seeds/auth-rbac.seed.constants.ts` | `lesson-content.*` permissions |
| `src/app.module.ts` | Register `CurriculumOrchestrationModule` |
| `src/modules/module-boundaries.spec.ts` | Orchestration boundary tests |
| `src/modules/curriculum/services/curriculum.service.spec.ts` | Mock new dependencies |

---

## 4. HTTP Routes

| Method | Route | Permission |
|--------|-------|------------|
| POST | `curriculum-versions/:id/publish` | `curricula.publish` |
| POST | `curriculum-versions/:id/clone-to-draft` | `curricula.manage` |
| GET | `curriculum-versions/:id/tree` | `curricula.read` |
| GET/PUT | `parishes/:parishId/academic-years/:yearId/catechism-levels/:levelId/curriculum-assignment` | read/manage |
| POST/GET/PATCH/DELETE | `topics/:topicId/lessons`, `lessons/:id`, reorder | `curricula.*` |
| GET/PUT | `lessons/:lessonId/content` | `lesson-content.*` |

Publish validation failures return **422** with `{ message, issues[] }`.

---

## 5. Validation Results

| Gate | Result |
|------|--------|
| typecheck | **PASS** |
| module-boundaries + curriculum/lesson/content specs | **PASS** (79 tests) |

---

## 6. Module Boundaries

```
CurriculumOrchestrationModule
├── imports: CurriculumModule, LearningContentModule, Auth, AccessControl, Parish
├── exports: (none)
└── controllers: LessonController, CurriculumCommandController

CurriculumModule exports: CurriculumService, TopicService, LessonService
LearningContentModule exports: LearningContentService only
```
