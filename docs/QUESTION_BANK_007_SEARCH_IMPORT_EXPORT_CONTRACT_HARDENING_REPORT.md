# QUESTION BANK #007 — Search / Import / Export Contract Hardening Report

## 1 Objective

Harden admin search/filter, list row summaries, read-only export V1, validate-only import, OpenAPI contracts, and integration readiness for FE admin, mobile delivery, and future Practice/Exam modules.

## 2 State inherited from #006

- Scoped delivery, learner projection, preview, grading, curriculum/media integration, RBAC parish scope.
- Basic `listQuestionsByParish` filtered only `status`, `sourceLocale`, and code `search`.
- No export/import endpoints.

## 3 Rules applied

`PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`. Module exports `QuestionBankService` only. No git add/commit/push.

## 4 Files created

- `src/modules/question-bank/constants/question-import.constants.ts`
- `src/modules/question-bank/utils/question-export-option-key.util.ts`
- `src/modules/question-bank/utils/question-export-option-key.util.spec.ts`
- `src/modules/question-bank/dto/question-list-version-summary.dto.ts`
- `src/modules/question-bank/dto/question-list-item-response.dto.ts`
- `src/modules/question-bank/dto/question-export-package-v1.dto.ts`
- `src/modules/question-bank/dto/question-import-validation-response.dto.ts`
- `src/modules/question-bank/services/question-export.service.ts`
- `src/modules/question-bank/services/question-export.service.spec.ts`
- `src/modules/question-bank/services/question-import-validation.service.ts`
- `src/modules/question-bank/services/question-import-validation.service.spec.ts`
- `src/modules/question-bank/controllers/question-import.controller.ts`
- `test/integration/question-bank-search-export.integration-spec.ts`
- `test/question-bank-search-export.db.e2e-spec.ts`

## 5 Files modified

- `src/modules/question-bank/constants/question-list.constants.ts`
- `src/modules/question-bank/dto/question-list-query.dto.ts`
- `src/modules/question-bank/dto/question-list-response.dto.ts`
- `src/modules/question-bank/interfaces/question-bank.interface.ts`
- `src/modules/question-bank/errors/question-bank.errors.ts`
- `src/modules/question-bank/services/question-bank.service.ts`
- `src/modules/question-bank/services/question-bank.service.spec.ts`
- `src/modules/question-bank/mappers/question-bank-response.mapper.ts`
- `src/modules/question-bank/controllers/question.controller.ts`
- `src/modules/question-bank/controllers/question-version.controller.ts`
- `src/modules/question-bank/utils/question-http.util.ts`
- `src/modules/question-bank/question-bank.module.ts`
- `README.md`

## 6 Final module architecture

```
QuestionBankModule
├── controllers: QuestionController, QuestionVersionController, QuestionTagController, QuestionImportController
├── providers (internal): QuestionExportService, QuestionImportValidationService, QuestionOptionService, ...
└── exports: QuestionBankService only
```

Public delegation: `QuestionBankService.exportQuestionVersion()`, `validateQuestionImport()`.

## 7 Search endpoint

`GET /api/v1/parishes/:parishId/questions` — `questions.read` + parish admin scope.

## 8 Root-row search semantics

One row per question root. `DISTINCT` + `COUNT(DISTINCT question.id)` when tag/curriculum/effective-version joins are used.

## 9 Effective-version semantics

For `questionType`, `difficulty`, `versionStatus`, and prompt `search`: **DRAFT if present, else current PUBLISHED** via `COALESCE(draftVersion.*, publishedVersion.*)`.

## 10 Unicode text/code search

Parameterized `LIKE` with `ESCAPE '\\'` on `question.code`, `draftVersion.prompt`, `publishedVersion.prompt`. Vietnamese Unicode supported (MVP, no full-text index).

## 11 Status filters

`status` filters question root lifecycle (`ACTIVE` / `INACTIVE`).

## 12 Type/difficulty filters

Applied to effective version fields.

## 13 hasDraft/hasPublished

- `hasDraft`: EXISTS draft version row.
- `hasPublished`: `currentPublishedVersionId` points to a `PUBLISHED` version (archived-only history does not count).

## 14 Tag filters

`tagId` or `tagCode` via inner join on `question_tag_links` + `question_tags` (same parish).

## 15 Curriculum filters

`curriculumId` via inner join on `question_curriculum_links`.

## 16 canonicalLessonKey filter

Optional with `curriculumId`. **400** if `canonicalLessonKey` without `curriculumId`.

## 17 Pagination

`page >= 1`, default `limit=20`, max `100`.

## 18 Sorting

Whitelist: `code`, `status`, `sourceLocale`, `createdAt`, `updatedAt`. Default `updatedAt DESC`.

## 19 Query performance/N+1

List page fetches question roots first; draft/published summaries batch-loaded in two queries per page (no per-row version N+1).

## 20 Index decision

No new indexes added. Existing parish/status and link indexes deemed sufficient for MVP.

## 21 Search result DTO

`QuestionListItemResponseDto`: root metadata + `currentDraftVersion` / `currentPublishedVersion` summaries + `hasDraft` / `hasPublished`. No options, answers, explanation, or media JSON.

## 22 FE authoring contract audit

Existing authoring routes remain sufficient: create, draft edit, options, correct answers, tags, curriculum links, media refs, publish validation, publish, clone, preview, search/filter.

## 23 Publish validation UX contract

`422` with `issues[]` documented via `QuestionPublishValidationErrorDto` (codes unchanged from #004–#006).

## 24 Export strategy

Read-only JSON export now; import commit deferred.

## 25 Export endpoint

`GET /api/v1/question-versions/:versionId/export` — `questions.read` + parish scope.

## 26 QuestionExportPackageV1

`schemaVersion: 1`, source code/locale, version fields, media asset-ref JSON, export-local option keys, `correctOptionKeys`, `tagCodes`, `curriculumLinks`.

## 27 Export option key strategy

Unique option `code` when present; else deterministic `opt-1`, `opt-2`, …

## 28 Correct answer export mapping

`correctOptionKeys` reference export keys (not DB option UUIDs).

## 29 Media portability

`mediaAssetId` / media JSON asset refs are **environment-local**. Documented in OpenAPI and README.

## 30 Curriculum portability

Export uses `curriculumId` + `canonicalLessonKey` (UUIDs are environment-specific). No curriculum code lookup API yet — cross-env import requires mapping.

## 31 Tag portability

Export/import use **tag code**. Validate resolves existing parish tag; no auto-create.

## 32 Import strategy

Validate-only in #007; commit deferred until safe bulk mutation is specified.

## 33 Validate-only endpoint

`POST /api/v1/parishes/:parishId/question-imports/validate` — `questions.manage`.

## 34 Import issue model

`{ code, path?, message, severity: ERROR|WARNING }`.

## 35 Import security/limits

`options <= MAX_OPTIONS (10)`, `tagCodes <= 50`, `curriculumLinks <= 50`. No raw HTML acceptance beyond existing text parsers.

## 36 Import no-write guarantee

Validate path performs read-only lookups only (tag/curriculum/media/code conflict checks).

## 37 OpenAPI audit

List query DTO, list item DTO, export V1 DTO, import validation response, preview DTO, publish 422 schema documented on controllers.

## 38 Stable errors

400 filter errors, 401/403 auth, 404 not found, 409 conflicts, 422 publish validation.

## 39 FE admin readiness

**FE QUESTION BANK ADMIN CONTRACT READY: YES**

## 40 Mobile delivery readiness

**MOBILE QUESTION DELIVERY CONTRACT READY: YES** (via immutable `questionVersionId`, learner projection, no answer leakage; no mobile authoring).

## 41 Practice readiness

**PRACTICE INTEGRATION CONTRACT READY: YES** (`getCurrentPublishedQuestionForSelection`, learner projection, grading, archived support via immutable version id).

## 42 Exam readiness

**EXAM INTEGRATION CONTRACT READY: YES** (immutable assessment snapshot, stable option order, no mutable root dependency).

## 43 Rendering contract

`SINGLE_CHOICE` → single select; `MULTIPLE_CHOICE` → multi select exact-set server scoring; `TRUE_FALSE` → two options. Client never infers correctness.

## 44 Multilingual readiness

`sourceLocale` on root/export; Unicode search; correctness independent of display text; no runtime translation.

## 45 Security/privacy

Parish-scoped search; no learner PII in export; no storage internals; export read-only; import validate manage-only; no public grading HTTP.

## 46 Unit tests

Added/extended: `question-bank.service.spec.ts` (search filters), `question-export.service.spec.ts`, `question-import-validation.service.spec.ts`, `question-export-option-key.util.spec.ts`.

## 47 Integration tests

`test/integration/question-bank-search-export.integration-spec.ts` — Unicode search, tag/curriculum filters, export, validate no-write, hasPublished.

## 48 DB e2e

`test/question-bank-search-export.db.e2e-spec.ts` (`qb007-e2e-` prefix) — CATECHIST search, PARENT denied, cross-parish denied, export read, import validate manage, CATECHIST import denied, invalid package, no commit endpoint.

## 49 Existing regression

#003–#006, Curriculum, Media, Auth suites pass in pristine `quality:full`.

## 50 pristine quality:full

**PASS** — `npm run test:db:prepare -- --reset && npm run quality:full` one clean run.

## 51 Docker

**PASS** — `wsl docker build --target production -t catechism-api:question-bank-contracts .`

## 52 README/contracts

Added Question Bank API section (search semantics, export V1, validate-only import, Practice/Exam boundary).

## 53 Microservice extraction

QuestionBankModule boundary unchanged; export/import validate exposed via `QuestionBankService` public methods for future Practice/Exam.

## 54 Commands

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
wsl docker build --target production -t catechism-api:question-bank-contracts .
```

## 55 Validation matrix

| Check | Result |
|-------|--------|
| format | PASS |
| lint | PASS |
| typecheck | PASS |
| unit (84 suites, 469 tests) | PASS |
| DB-free e2e (2 suites, 5 tests) | PASS |
| build | PASS |
| npm audit | PASS |
| integration (29 suites, 180 tests) | PASS |
| DB e2e (20 suites, 94 tests) | PASS |
| quality:full ONE CLEAN RUN | PASS |
| Docker | PASS |
| unique root rows | PASS |
| export/import contracts | PASS |
| OpenAPI | PASS |
| module export QuestionBankService only | PASS |

## 56 Known/deferred

- Import **commit** endpoint not implemented (by design).
- Cross-environment curriculum/media portability requires external migration/mapping.
- Curriculum lookup by code not available for import remapping.

## 57 Out-of-scope

PracticeModule, ExamModule, learner attempts, translations, SHORT_TEXT/NUMBER, partial credit, AI generation, spreadsheet import, demo seed/Postman (#008).

## 58 QUESTION BANK #008 readiness

No BLOCKER/HIGH items. Ready for final audit + demo seed + Postman + phase completion.

## 59 Prompt count

QUESTION BANK #007/8 complete. Approximately **1 prompt remains** (#008).

## 60 Commit recommendation

```
git commit -m "feat(question-bank): harden search and admin contracts"
```

(Do not run git add/commit/push per task rules.)
