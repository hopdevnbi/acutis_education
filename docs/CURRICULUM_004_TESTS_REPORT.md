# CURRICULUM #004 — Tests Report

> Status: **COMPLETE**

## Test files

| File | Tests | Result |
|------|-------|--------|
| `test/integration/curriculum-lesson-content.integration-spec.ts` | 7 | PASS |
| `src/modules/curriculum-orchestration/services/curriculum-version-orchestration.service.spec.ts` | 6 | PASS |
| `test/curriculum-content.db.e2e-spec.ts` | 5 | PASS |

**Total new tests: 18**

## Fixes discovered during test runs

1. **`LearningContentService.cloneContentForLessons`** — normalize `sourceContent.lessonId` when looking up `lessonIdMap` (MSSQL uppercase UUIDs).
2. **`ContentDocumentV1Dto` / `UpsertLessonContentRequestDto`** — add `class-validator` + `@Type` decorators so global `ValidationPipe` whitelist retains `document` on PUT.

## Module exports

`CurriculumModule` already exports `CurriculumService`, `TopicService`, and `LessonService`; no change required.

## Commands

```bash
npm run test:integration -- --testPathPattern=curriculum-lesson-content.integration-spec
npm test -- --testPathPattern=curriculum-version-orchestration.service.spec
npm run test:e2e:db -- --testPathPattern=curriculum-content.db.e2e-spec
```
