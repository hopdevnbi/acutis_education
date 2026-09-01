# QUESTION BANK #008 — Final Audit and Contract Readiness Report

**Phase:** QUESTION BANK / ASSESSMENT CONTENT FOUNDATION #008 / 8  
**Date:** 2026-08-31  
**Status:** PHASE COMPLETE  
**Prompt:** QUESTION BANK #008 (final audit, demo seed, Postman, quality/Docker, phase completion gate)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| QUESTION BANK DOMAIN READY | **YES** |
| FE QUESTION BANK ADMIN CONTRACT READY | **YES** |
| MOBILE QUESTION DELIVERY CONTRACT READY | **YES** |
| PRACTICE INTEGRATION CONTRACT READY | **YES** |
| EXAM INTEGRATION CONTRACT READY | **YES** |
| QUESTION BANK MULTILINGUAL FOUNDATION READY | **YES** |
| quality:full (pristine DB, ONE CLEAN RUN) | **PASS** |
| Docker production build | **PASS** (`wsl bash -lc "cd '/mnt/c/.../Acutis Education' && docker build --target production -t catechism-api:question-bank-final ."`) |
| Demo seed idempotent | **PASS** |
| Postman collection | **PASS** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

## Completion block

```
QUESTION BANK / ASSESSMENT CONTENT FOUNDATION PHASE COMPLETE

QUESTION BANK DOMAIN READY: YES

FE QUESTION BANK ADMIN CONTRACT READY: YES

MOBILE QUESTION DELIVERY CONTRACT READY: YES

PRACTICE INTEGRATION CONTRACT READY: YES

EXAM INTEGRATION CONTRACT READY: YES

QUESTION BANK MULTILINGUAL FOUNDATION READY: YES
```

---

## 1 Objective

Close the Question Bank phase with final architecture audit, idempotent demo seed, Postman collection, README hardening, pristine `quality:full`, Docker production build, and phase completion gate verdicts.

## 2 State inherited from #001–#007

- #001: Domain model, root/version design, MVP types, multilingual foundation, Practice/Exam boundary.
- #002: Seven owned tables, migrations, entities, UUID generation.
- #003: Metadata CRUD, tags, curriculum links, RBAC parish scope.
- #004: Options, correct answers, publish validation, immutability.
- #005: Clone/versioning, learner projection, grading, assessment snapshot (service-only).
- #006: Curriculum/Media integration, scoped delivery, media assetId-only refs.
- #007: Search/filter, export V1, import validate-only, OpenAPI hardening.

## 3 Rules applied

`PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`. No git add/commit/push. Module exports `QuestionBankService` only. No Practice module started.

## 4 Final findings summary/severity

| Severity | Count | Notes |
|----------|-------|-------|
| BLOCKER | 0 | — |
| HIGH | 0 | — |
| MEDIUM | 0 | — |
| LOW | 0 | No code changes required for audit |

Final audit verified bounded context, immutability, RBAC, learner safety, export/import contracts, and module boundaries. Only #008 deliverables (seed, Postman, README, report) were implemented.

## 5 Final dependency graph

```
QuestionBankModule
├── ParishModule (ParishService, ParishScopeService)
├── CurriculumModule (CurriculumService)
├── MediaModule (MediaAssetService)
├── AuthModule (JwtAuthGuard)
└── AccessControlModule (PermissionGuard)

Future: PracticeModule / ExamModule → QuestionBankService (public API only)
Forbidden: reverse deps, entity/repo export, forwardRef, cycles
```

## 6 Module boundary

`QuestionBankModule` owns controllers, internal services, entities. Exports **`QuestionBankService` only**. Verified by `module-boundaries.spec.ts`. No `forwardRef`. No cycles detected.

## 7 Data ownership

Seven owned tables: `questions`, `question_versions`, `question_options`, `question_correct_options`, `question_tags`, `question_tag_links`, `question_curriculum_links`. Parish-scoped; no cross-module entity export.

## 8 Public exports

- **HTTP:** admin authoring, search, export, import validate, tags, curriculum links.
- **Service:** `QuestionBankService` — grading, learner projection, assessment snapshot, export/import validation delegation.
- **Not exported:** repositories, entities, internal services.

## 9 Question root model

Parish-scoped root with `code`, `status` (ACTIVE/INACTIVE), `sourceLocale`, `currentPublishedVersionId`, audit fields. One root row per question in list/search.

## 10 Version lifecycle

Monotonic `versionNumber`. At most one DRAFT. Publishing sets PUBLISHED, archives prior PUBLISHED, updates `currentPublishedVersionId`. ARCHIVED versions remain readable/gradable.

## 11 Immutability

PUBLISHED and ARCHIVED versions reject mutation. DRAFT is fully editable (metadata, options, correct answers, media refs).

## 12 Clone/version lineage

Clone from PUBLISHED/ARCHIVED creates new DRAFT with new option UUIDs; correct mappings remapped. Historical versions preserved.

## 13 sourceContentHash

Semantic hash over translatable source content (prompt, options text, media refs). Excludes option UUIDs, correct-answer mappings, audit timestamps. Stable on pure clone; changes when display content changes.

## 14 MVP question types

`SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE` — active and tested.

## 15 Deferred question types

`SHORT_TEXT`, `NUMBER`, `LONG_TEXT`, `ORDERING`, `MATCHING`, `FILL_IN_THE_BLANK` — not implemented.

## 16 Option/correct-answer semantics

Options replaced atomically on draft. Correct answers reference same-version option UUIDs. SINGLE_CHOICE: exactly one correct. MULTIPLE_CHOICE: exact-set, order irrelevant.

## 17 TRUE_FALSE semantics

Two internal options with codes `true`/`false`. Correctness by option UUID. Option code not exposed in learner projection.

## 18 MULTIPLE_CHOICE scoring

Exact-set grading via `QuestionGradingService`. No partial credit. Duplicate selected IDs rejected.

## 19 Publish validation

Requires prompt, difficulty, valid option count, correct answers, empty `answerDefinitionJson`, valid READY IMAGE media (when referenced), DRAFT status, ACTIVE root. Returns `422` with structured issues.

## 20 Learner-safe projection

Excludes correct answers, `answerDefinitionJson`, explanation, option code, actor IDs, storage internals. DRAFT allowed for admin preview only; learner delivery rejects DRAFT.

## 21 Grading contract

Service-to-service only (`QuestionGradingService` via `QuestionBankService`). Supports PUBLISHED/ARCHIVED. Rejects DRAFT, unknown/cross-version options, duplicates, invalid cardinality. No learner answer persistence.

## 22 Assessment snapshot

Service-only immutable snapshot with version, options, correct answers, `sourceContentHash`, `sourceLocale`. No HTTP endpoint.

## 23 Curriculum integration

Same-parish enforcement. ACTIVE curriculum for new links. `canonicalLessonKey` validated against curriculum lineage. Historical links survive inactive curriculum. No direct `lessonId`/`topicId` FK.

## 24 Media integration

`assetId` only in question JSON. Validates exists/READY/IMAGE on publish. No Media FK, bucket, key, path, or URL persistence.

## 25 RBAC final matrix

| Role | Read | Manage | Publish |
|------|------|--------|---------|
| SUPER_ADMIN | all | all | all |
| PARISH_ADMIN | own parish | own parish | own parish |
| CATECHIST | own parish | denied | denied |
| PARENT | denied | denied | denied |

## 26 CATECHIST policy

Read-only parish scope (`questions.read`). Manage/publish denied (403). Verified in integration/e2e and Postman.

## 27 Search/filter final contract

`GET /parishes/:parishId/questions` — effective version (DRAFT else PUBLISHED), Unicode search, root status, type, difficulty, hasDraft/hasPublished, tag/curriculum filters, pagination, whitelist sort. No answers in list.

## 28 Export V1

`GET /question-versions/:id/export` — `schemaVersion: 1`, export-local option keys, tag codes, curriculum links. No actor PII. Media assetIds environment-local.

## 29 Import validate-only

`POST /parishes/:parishId/question-imports/validate` — no DB writes, no commit endpoint. Validates schema, types, keys, conflicts, tags, curriculum, media, bounds.

## 30 Security/privacy

No answer leakage in list/preview/learner APIs. No public grading HTTP. No generic learner browse. Cross-parish denied server-side. No PII in export. Parameterized queries. No raw HTML storage. No secrets in Postman defaults (uses local seed passwords documented in README).

## 31 Multilingual readiness

`sourceLocale` on root; `sourceContentHash` per version; Unicode search; stable type/status codes; correctness independent of display strings; no runtime translation in module.

## 32 FE admin readiness

**FE QUESTION BANK ADMIN CONTRACT READY: YES**

Supports list/search/filter, create/edit, options/correct answers, tags, curriculum links, media refs, publish validation/publish, clone, preview, export, import validate, status management.

## 33 Mobile delivery readiness

**MOBILE QUESTION DELIVERY CONTRACT READY: YES**

Mobile consumes published immutable versions through future Practice/Exam contextual routes, not direct generic Question Bank learner API. Learner projection contract stable.

## 34 Practice readiness

**PRACTICE INTEGRATION CONTRACT READY: YES**

`QuestionBankService` exposes grading, learner projection, selection metadata, assessment snapshots for Practice module integration.

## 35 Exam readiness

**EXAM INTEGRATION CONTRACT READY: YES**

Same service contracts as Practice; immutable published versions and exact-set grading suitable for formal assessment snapshots.

## 36 Demo seed

Idempotent `npm run seed:question-bank-demo` after auth-rbac, parish-academic, class-enrollment, curriculum-demo.

Stable codes:
- `qb-demo-single-001` (SINGLE_CHOICE, published, tags, curriculum link)
- `qb-demo-multi-001` (MULTIPLE_CHOICE, published)
- `qb-demo-tf-001` (TRUE_FALSE, published)
- `qb-demo-draft-001` (SINGLE_CHOICE, DRAFT for editor testing)

## 37 Seed idempotency

`test/integration/question-bank-demo-seed.integration-spec.ts` — first run creates records; second run creates zero duplicates; published versions and correct answers valid.

## 38 Postman collection

`docs/postman/Acutis-Education-Question-Bank.postman_collection.json` — 19 flows with test scripts (auth, authoring lifecycle, export, clone v2, search/filter, import validate, CATECHIST read/manage, PARENT denied).

## 39 README/docs

Question Bank section expanded: bounded context, lifecycle, RBAC, authoring flow, search, export/import, Curriculum/Media, Practice/Exam boundary, multilingual, demo seed command.

## 40 Swagger/OpenAPI

Controllers annotated with `@ApiTags`, operation summaries, DTO types for list/export/import validation. Swagger at `/api/docs` when enabled.

## 41 Unit tests

**84 suites, 469 tests — PASS**

## 42 Integration tests

**30 suites, 183 tests — PASS** (includes new `question-bank-demo-seed.integration-spec.ts`)

## 43 DB e2e

**20 suites, 94 tests — PASS** (unchanged count from #007; all regression green in `quality:full`)

## 44 Existing regression

Auth, Parish, Class/Enrollment, Curriculum/LearningContent, Media, QuestionBank — all PASS in pristine `quality:full`.

## 45 pristine quality:full

**ONE CLEAN PASS** after `npm run test:db:prepare -- --reset && npm run quality:full`.

## 46 Docker production build

**PASS** — `catechism-api:question-bank-final` image built via WSL bash with Unicode workspace path.

## 47 Docker runtime decision

Runtime smoke skipped (not required for gate). Image builds and includes `dist/`, production deps, uploads directory. Optional manual: `docker run` + health check.

## 48 Microservice extraction

Boundary clean: `QuestionBankService` public API, owned tables, no cross-module entity leakage. Extractable as assessment-content service.

## 49 Files created

- `src/database/seeds/question-bank-demo.seed.constants.ts`
- `src/database/seeds/question-bank-demo.seed.service.ts`
- `src/database/seeds/question-bank-demo-seed.module.ts`
- `scripts/seed-question-bank-demo.ts`
- `test/integration/question-bank-demo-seed.integration-spec.ts`
- `docs/postman/Acutis-Education-Question-Bank.postman_collection.json`
- `docs/QUESTION_BANK_008_FINAL_AUDIT_AND_CONTRACT_READINESS_REPORT.md`

## 50 Files modified

- `package.json` — added `seed:question-bank-demo`
- `README.md` — expanded Question Bank section, Postman reference, demo seed commands

## 51 Commands

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
npm run seed:question-bank-demo
wsl bash -lc "cd '/mnt/c/Users/admin/Desktop/DỰ ÁN GIÁO LÝ VIÊN/Acutis Education' && docker build --target production -t catechism-api:question-bank-final ."
```

## 52 Explicit validation matrix

| Check | Result |
|-------|--------|
| format | PASS |
| lint | PASS |
| typecheck | PASS |
| unit (84/469) | PASS |
| DB-free e2e (2/5) | PASS |
| build | PASS |
| npm audit | PASS |
| quality | PASS |
| pristine DB reset | PASS |
| migrations | PASS |
| integration (30/183) | PASS |
| DB e2e (20/94) | PASS |
| quality:full ONE CLEAN RUN | PASS |
| Docker build | PASS |
| no cycle | PASS |
| no forwardRef | PASS |
| QuestionBankService only export | PASS |
| 7 owned tables isolated | PASS |
| parish ownership | PASS |
| one DRAFT | PASS |
| immutable PUBLISHED | PASS |
| immutable ARCHIVED | PASS |
| clone PUBLISHED | PASS |
| clone ARCHIVED | PASS |
| source hash semantic stability | PASS |
| SINGLE_CHOICE | PASS |
| MULTIPLE_CHOICE | PASS |
| TRUE_FALSE | PASS |
| no unsupported active question type | PASS |
| correct answer same-version integrity | PASS |
| exact-set multiple grading | PASS |
| no partial credit | PASS |
| publish validation | PASS |
| media revalidation | PASS |
| learner projection no answers | PASS |
| learner projection no explanation | PASS |
| grade service-only | PASS |
| archived grading | PASS |
| assessment snapshot service-only | PASS |
| curriculum same-parish | PASS |
| canonicalLessonKey | PASS |
| no direct topic FK | PASS |
| media assetId only | PASS |
| no media FK | PASS |
| CATECHIST read-only | PASS |
| PARENT denied | PASS |
| cross-parish denied | PASS |
| search unique roots | PASS |
| Unicode search | PASS |
| tag/curriculum filters | PASS |
| export V1 schema | PASS |
| export option keys | PASS |
| import validate no write | PASS |
| no import commit | PASS |
| FE admin contract ready | YES |
| Mobile delivery contract ready | YES |
| Practice contract ready | YES |
| Exam contract ready | YES |
| multilingual ready | YES |
| demo seed | PASS |
| seed idempotent | PASS |
| Postman | PASS |
| README/OpenAPI | PASS |
| no answer leakage | PASS |
| no public grading | PASS |
| no generic learner browse | PASS |
| no secrets | PASS |
| no entity/repo export | PASS |
| prior regression | PASS |
| Git rule compliance | PASS (no add/commit/push) |

## 53 Known/deferred

- Import **commit** endpoint not implemented (by design).
- Cross-environment curriculum/media portability requires external mapping.
- Runtime Docker smoke optional.
- Deferred question types (SHORT_TEXT, ORDERING, etc.).
- Practice/Exam modules not started.

## 54 Out-of-scope

Practice module implementation, Exam module implementation, learner attempt persistence, runtime translation, AI generation, spreadsheet import, frontend/mobile code.

## 55 Final completion decision

**QUESTION BANK / ASSESSMENT CONTENT FOUNDATION PHASE COMPLETE**

All mandatory gates PASS. BLOCKER/HIGH = 0.

## 56 Next backend phase recommendation

**PRACTICE / QUIZ DELIVERY FOUNDATION**

Question Bank now provides immutable published versions, learner-safe projections, grading, selection metadata, and Curriculum/Media integration. Do not implement automatically.

## 57 Prompt count

QUESTION BANK #008/8 complete. Phase complete.

## 58 Commit recommendation

When ready to commit (not executed by agent):

```
git commit -m "feat(question-bank): finalize assessment content foundation"
```

Do not run `git add`. Do not push.
