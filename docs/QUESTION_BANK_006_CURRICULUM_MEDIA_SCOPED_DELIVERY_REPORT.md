# QUESTION BANK #006 — Curriculum/Media Integration + Scoped Delivery Report

**Phase:** QUESTION BANK / ASSESSMENT CONTENT FOUNDATION #006 / 8  
**Date:** 2026-08-31  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** QUESTION_BANK_006 (curriculum validation, learner delivery, preview, selection contract, RBAC)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Curriculum integration | **PASS** |
| Media validation (inherited #004) | **PASS** |
| Scoped authorization | **PASS** |
| Practice/Exam service contracts | **PASS** |
| quality:full ONE CLEAN RUN | **PASS** |
| Docker `catechism-api:question-bank-integration` | **PASS** |
| Unresolved BLOCKER/HIGH | **0** |

**QUESTION BANK PUBLIC SERVICE CONTRACT READY FOR PRACTICE/EXAM: YES**

---

## 1. Objective

Harden curriculum link validation for new links, enforce learner-safe delivery contracts (reject DRAFT for service projection), add author/admin preview HTTP, expose `getCurrentPublishedQuestionForSelection` for Practice/Exam integration, and finalize CATECHIST read-only parish scope — without implementing Practice/Exam modules or public grading HTTP.

## 2. State inherited from #005

- `QuestionGradingService`: `getLearnerQuestionProjection`, `gradeAnswer`, `getImmutableAssessmentSnapshot`
- Clone-to-draft, translation-source `sourceContentHash`, internal grading contracts
- Curriculum links existed but `createLink` did not reject INACTIVE curriculum for new links
- CATECHIST seed: `questions.read` only; PARENT has no `questions.*`
- Media validation from #004 unchanged

## 3. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`
- `QuestionBankModule` exports only `QuestionBankService`
- No git add/commit/push
- Cross-module: `CurriculumService`, `MediaAssetService` public APIs only

## 4. Files created

| File | Purpose |
|------|---------|
| `dto/question-version-preview-response.dto.ts` | Learner-safe preview HTTP DTO |
| `test/integration/question-bank-scoped-delivery.integration-spec.ts` | MSSQL scoped delivery integration |
| `test/question-bank-scoped.db.e2e-spec.ts` | HTTP RBAC + preview e2e (`qb006-e2e-`) |

## 5. Files modified

| File | Change |
|------|--------|
| `curriculum/services/curriculum.service.ts` | `assertCurriculumActiveById` public method |
| `services/question-curriculum-link.service.ts` | Reject INACTIVE curriculum on new links |
| `services/question-grading.service.ts` | Deliverable check, `getQuestionVersionPreview`, shared projection builder |
| `services/question-bank.service.ts` | Preview delegate, `getCurrentPublishedQuestionForSelection` |
| `controllers/question-version.controller.ts` | `GET .../preview` route |
| `errors/question-bank.errors.ts` | `QuestionVersionNotDeliverableError`, `QuestionNoPublishedVersionError` |
| `interfaces/question-bank.interface.ts` | `PublishedQuestionSelectionSnapshot`, `QuestionVersionPreview` |
| `mappers/question-bank-response.mapper.ts` | `toQuestionVersionPreviewResponse` |
| `utils/question-http.util.ts` | HTTP mapping for new errors |
| `services/*.spec.ts` | Unit tests for new behavior |

## 6. Final dependency graph

```
QuestionBankModule
├── exports: QuestionBankService
├── providers: QuestionBankService, QuestionGradingService (internal), ...
├── controllers: QuestionController, QuestionVersionController, QuestionTagController
└── imports: ParishModule, CurriculumModule, MediaModule, AuthModule, AccessControlModule
```

## 7. Module boundary

`QuestionBankModule` exports **only** `QuestionBankService`. No entity/repository export. No `forwardRef`. No cycles.

## 8. Curriculum public contracts

Uses `CurriculumService.getCurriculumById`, `assertCurriculumActiveById` (new), `assertCanonicalLessonKeyBelongsToCurriculum`, `assertVersionBelongsToCurriculum`.

## 9. Curriculum link validation

`createLink` now calls `assertCurriculumActiveById` after parish match. New links to INACTIVE curriculum throw `CurriculumInactiveError`.

## 10. canonicalLessonKey validation

Unchanged from #003 — validated via `assertCanonicalLessonKeyBelongsToCurriculum` when provided.

## 11. authoringCurriculumVersionId validation

Unchanged from #003 — validated via `assertVersionBelongsToCurriculum` when provided.

## 12. Cross-parish link security

Unchanged — `QuestionCurriculumParishMismatchError` when curriculum parish ≠ question parish.

## 13. Curriculum inactive behavior

- **New links:** denied (`CurriculumInactiveError`)
- **Historical links:** preserved; `listLinksByQuestion` still returns them after curriculum deactivation

## 14. Media validation architecture

Inherited from #004 — `MediaAssetService` only; no changes in #006.

## 15–18. Prompt/explanation/option media + publish revalidation

Inherited from #004 — READY IMAGE validation on draft save and publish revalidation.

## 19. Media lifecycle implications

Published content immutable; if media later becomes unavailable, historical published versions remain stored but future publish of new drafts would block. Runtime delivery may show broken media refs — Practice/Exam must handle contextual media routes.

## 20. Learner delivery surface decision

No generic learner question browsing HTTP. Service-to-service `getLearnerQuestionProjection` only for PUBLISHED/ARCHIVED.

## 21. Practice/Exam service contracts

Public via `QuestionBankService`:
- `getLearnerQuestionProjection(questionVersionId)` — PUBLISHED/ARCHIVED only
- `gradeAnswer(input)` — service-to-service
- `getImmutableAssessmentSnapshot(questionVersionId)` — service-to-service
- `getCurrentPublishedQuestionForSelection(questionId)` — new

## 22. Published/archived projection policy

`getLearnerQuestionProjection` uses `findDeliverableVersionEntity` — throws `QuestionVersionNotDeliverableError` for DRAFT.

## 23. Current published selection contract

`getCurrentPublishedQuestionForSelection(questionId)`:
- Root ACTIVE
- `currentPublishedVersionId` exists and version status PUBLISHED
- Returns `PublishedQuestionSelectionSnapshot`: questionId, questionVersionId, questionType, sourceLocale, sourceContentHash
- Throws `QuestionInactiveError`, `QuestionNoPublishedVersionError`

## 24. Author/admin preview route decision

`GET /api/v1/question-versions/:versionId/preview` — `questions.read` + parish scope. Allows DRAFT/PUBLISHED/ARCHIVED for editor preview.

## 25. Preview/learner-safe DTO

`QuestionVersionPreviewResponseDto`: prompt, instruction, difficulty, promptMediaJson, options (id/text/mediaAssetId/sortOrder). No correct answers, explanation, option code, audit fields.

## 26. Answer leakage protection

Projection builder omits `correctOptionIds`, `explanation`, `answerDefinitionJson`, option `code`, audit actor fields.

## 27. Option code exposure decision

Option `code` omitted from learner-safe projection and preview DTO.

## 28. Explanation exposure policy

`explanation` and `explanationMediaJson` omitted from learner-safe surfaces.

## 29. Question media access strategy

Projection carries `mediaAssetId` only. No generic Media learner route.

## 30. Why generic Media learner access remains denied

Learner roles must not browse media assets directly; future Practice/Exam creates contextual delivery routes (analogous to Curriculum delivery).

## 31. CATECHIST authoring policy FINAL

CATECHIST: `questions.read` own parish only. NO `questions.manage`, NO `questions.publish`. Seed verified unchanged.

## 32. CATECHIST read scope

Parish membership + `questions.read` → list questions, preview versions in own parish.

## 33. Parent/Student direct access policy

PARENT: no `questions.*` permissions. No Question Bank API access. STUDENT deferred.

## 34. Version-by-id scope

Preview and version routes resolve question → parish → `assertCanReadParishAsAdmin`.

## 35. Root tags/links mutability

Tags and curriculum links remain root-level metadata; can mutate after publish. Grading does not depend on them.

## 36. Assessment snapshot trust boundary

`getImmutableAssessmentSnapshot` — internal service only; not exposed via HTTP.

## 37. Grade contract trust boundary

`gradeAnswer` — internal service only; no public HTTP grading route (verified 404).

## 38. Practice integration contract

1. `getCurrentPublishedQuestionForSelection(questionId)`
2. `getLearnerQuestionProjection(versionId)`
3. Render
4. Submit option IDs
5. `gradeAnswer`
6. Practice owns attempt/progress and feedback policy

## 39. Exam integration contract

1. Exam publish snapshots exact `questionVersionIds`
2. Stores option delivery order
3. Renders immutable snapshot
4. Grading uses exact version
5. Newer publish never changes active/historical exam

## 40. Swagger/OpenAPI

Preview route documented with `@ApiOperation`, `@ApiOkResponse(QuestionVersionPreviewResponseDto)`. No answer fields.

## 41. Public service contract readiness

**QUESTION BANK PUBLIC SERVICE CONTRACT READY FOR PRACTICE/EXAM: YES**

## 42. Unit tests

| Area | Tests |
|------|-------|
| Curriculum inactive new link denied | PASS |
| Historical link list after inactive | PASS |
| Learner projection DRAFT denied | PASS |
| Preview allows DRAFT | PASS |
| `getCurrentPublishedQuestionForSelection` happy/failure | PASS |
| Answer leakage (extended) | PASS |

## 43. Integration tests

`test/integration/question-bank-scoped-delivery.integration-spec.ts` — 4 tests: inactive curriculum, learner/preview policy, published selection, published projection.

## 44. DB e2e

`test/question-bank-scoped.db.e2e-spec.ts` — 6 tests: CATECHIST read 200, manage/publish 403, cross-parish 403, PARENT 403, SUPER_ADMIN preview, no grading HTTP.

## 45. Existing regression

#003–#005, Curriculum, Media, Auth — all pass in quality:full.

## 46. pristine quality:full

**PASS** — one clean run after `npm run test:db:prepare -- --reset`.

## 47. Docker

**PASS** — `wsl docker build --target production -t catechism-api:question-bank-integration .`

## 48. Multilingual readiness

`sourceLocale` on root; translation-semantic `sourceContentHash`; no runtime translation tables.

## 49. Security/privacy

Least privilege RBAC; no answer leakage; parish scope on version routes; minors platform rules upheld.

## 50. Microservice extraction

`QuestionBankService` facade preserves future extraction boundary.

## 51. Commands

```
node --version
npm --version
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=moderate
npm run quality
npm run test:db:prepare -- --reset
npm run test:db:migrations
npm run test:integration
npm run test:e2e:db
npm run quality:full
npm run migration:show
wsl docker build --target production -t catechism-api:question-bank-integration .
```

## 52. Validation matrix

| Check | Result |
|-------|--------|
| format | PASS |
| lint | PASS |
| typecheck | PASS |
| unit (458) | PASS |
| DB-free e2e (5) | PASS |
| build | PASS |
| npm audit | PASS |
| quality | PASS |
| pristine DB reset | PASS |
| migrations | PASS |
| integration (176) | PASS |
| DB e2e (89) | PASS |
| quality:full ONE CLEAN RUN | PASS |
| Docker | PASS |
| no cycle | PASS |
| no forwardRef | PASS |
| QuestionBankService only export | PASS |
| curriculum same-parish link | PASS |
| canonicalLessonKey validation | PASS |
| invalid canonicalLessonKey denied | PASS |
| authoring version valid | PASS |
| authoring version mismatch denied | PASS |
| inactive curriculum new link denied | PASS |
| historical link preserved | PASS |
| prompt IMAGE media validation | PASS (inherited) |
| explanation IMAGE validation | PASS (inherited) |
| option IMAGE validation | PASS (inherited) |
| missing asset denied | PASS (inherited) |
| wrong category denied | PASS (inherited) |
| publish media revalidation | PASS (inherited) |
| learner projection no answers | PASS |
| learner projection no explanation | PASS |
| learner projection no option code | PASS |
| no generic learner HTTP question route | PASS |
| no public grading HTTP | PASS |
| assessment snapshot service-only | PASS |
| CATECHIST read own parish | PASS |
| CATECHIST manage denied | PASS |
| CATECHIST publish denied | PASS |
| PARENT direct access denied | PASS |
| cross-parish denied | PASS |
| SUPER_ADMIN allowed | PASS |
| Practice/Exam service contracts ready | PASS |
| no entity/repo export | PASS |
| no translation tables | PASS |
| prior regression | PASS |
| Git rule compliance | PASS |

## 53. Known/deferred

- Contextual learner media routes (Practice/Exam)
- SHORT_TEXT/NUMBER question types
- Search/import/export (#007)

## 54. Out-of-scope

PracticeModule, ExamModule, learner sessions, public grading HTTP, translations, partial credit.

## 55. QUESTION BANK #007 readiness

No unresolved BLOCKER/HIGH. Ready for **QUESTION BANK #007/8 — Search/Filter + Import/Export + OpenAPI hardening**.

## 56. Prompt count

QUESTION BANK #006/8 complete. Approximately 2 prompts remain (#007–#008).

## 57. Commit recommendation

```
git commit -m "feat(question-bank): add scoped delivery integration"
```
