# QUESTION BANK #005 — Clone, Versioning, and Grading Contracts Report

**Phase:** QUESTION BANK / ASSESSMENT CONTENT FOUNDATION #005 / 8  
**Date:** 2026-08-31  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** QUESTION_BANK_005 (clone-to-draft, hash semantics, grading contracts, tests)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Clone PUBLISHED → DRAFT | **PASS** |
| Clone ARCHIVED → DRAFT | **PASS** (same code path as PUBLISHED) |
| sourceContentHash semantics (translation-source) | **PASS** |
| Learner-safe projection (internal) | **PASS** |
| Grading contract (internal) | **PASS** |
| ARCHIVED grading | **PASS** |
| quality:full ONE CLEAN RUN | **PASS** |
| Docker `catechism-api:question-bank-versioning` | **PASS** |
| Unresolved BLOCKER/HIGH | **0** |

**Recommendation:** Proceed to **QUESTION BANK #006/8 — Curriculum/Media Integration + Scoped Authorization + Learner-Safe Projection**.

---

## 1. Objective

Harden version lineage with clone-to-draft from PUBLISHED/ARCHIVED sources, fix `sourceContentHash` translation-source semantics, add question-type mutation guards, and establish internal learner projection + objective grading contracts — without reimplementing publish (#004) or adding learner HTTP routes.

## 2. State inherited from #004

- Option/correct-answer APIs, TRUE_FALSE auto-provision, media validation, publish validation/transaction/HTTP all complete.
- `sourceContentHash` in #004 incorrectly included option row UUIDs in canonical payload.
- No clone endpoint, no grading service, no learner projection.

## 3. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`
- Module boundary: `QuestionBankModule` exports only `QuestionBankService`
- `QuestionGradingService` internal provider, not exported
- No git add/commit/push
- Publish workflow untouched

## 4. Files created

| File | Purpose |
|------|---------|
| `services/question-grading.service.ts` | Internal learner projection, grading, assessment snapshot |
| `services/question-grading.service.spec.ts` | Unit tests for grading contracts |
| `utils/question-source-content-hash.util.spec.ts` | Hash stability semantics tests |
| `test/integration/question-bank-clone-grading.integration-spec.ts` | MSSQL clone + grading integration |
| `test/question-bank-clone.db.e2e-spec.ts` | HTTP clone e2e (`qb005-e2e-` prefix) |

## 5. Files modified

| File | Change |
|------|--------|
| `utils/question-source-content-hash.util.ts` | Exclude option UUID from hash payload |
| `errors/question-bank.errors.ts` | Clone, type-change, grading errors |
| `interfaces/question-bank.interface.ts` | Learner/grading/snapshot interfaces |
| `services/question-bank.service.ts` | Clone transaction, type guards, grading delegation |
| `services/question-bank.service.spec.ts` | Clone + type-change unit tests |
| `controllers/question-version.controller.ts` | `POST clone-to-draft` endpoint |
| `utils/question-http.util.ts` | HTTP mapping for new errors |
| `question-bank.module.ts` | Register `QuestionGradingService` (not exported) |
| `test/database/load-test-environment.ts` | Force generous auth throttle in test runs |

## 6. Final module architecture

```
QuestionBankModule
├── exports: QuestionBankService
├── providers:
│   ├── QuestionBankService (public facade)
│   ├── QuestionOptionService (internal)
│   ├── QuestionGradingService (internal) ← NEW
│   ├── QuestionTagService
│   └── QuestionCurriculumLinkService
└── controllers: QuestionController, QuestionVersionController, QuestionTagController
```

Cross-module: ParishModule, CurriculumModule, MediaModule, AuthModule, AccessControlModule via public APIs only.

## 7. Clone route

`POST /api/v1/question-versions/:versionId/clone-to-draft`  
Permission: `questions.manage`  
Response: `QuestionAuthoringResponseDto` (201 Created)

## 8. Clone transaction

Single transaction via `cloneVersionToDraft` → `cloneVersionToDraftTransaction`:

1. Load source version
2. Assert PUBLISHED or ARCHIVED
3. Assert `answerDefinitionJson` null (objective MVP)
4. Lock question root (`pessimistic_write`)
5. Assert root ACTIVE
6. Assert no existing DRAFT
7. Compute `max(versionNumber) + 1`
8. Insert new DRAFT with copied content fields
9. Deep-copy options with new UUIDs
10. Remap correct-answer rows
11. Recompute `sourceContentHash`
12. Return authoring snapshot

Unique constraint violations map to `QuestionDraftAlreadyExistsError` (409).

## 9. Root locking

Pessimistic write lock on `QuestionEntity` before draft existence check and version insert — same pattern as curriculum clone and `createDraftVersion`.

## 10. Version-number concurrency

`MAX(versionNumber) + 1` inside locked transaction; unique index `UQ_question_versions_question_id_version_number` as final guard → `QuestionVersionNumberConflictError`.

## 11. One-DRAFT concurrency

`UQ_question_versions_question_id_draft` unique filtered index + pre-check; loser gets 409 `QuestionDraftAlreadyExistsError`.

## 12. Option ID remapping

Each cloned option receives a new `generateUuidV4()` ID. Old→new map built during insert; option row IDs never preserved across versions.

## 13. Correct-answer remapping

Source `question_correct_options` rows remapped through option ID map. Orphan mapping → `QuestionCloneSourceInvalidError`.

## 14. Content field copy

Copied: `questionType`, `prompt`, `instruction`, `explanation`, `promptMediaJson`, `explanationMediaJson`, `difficulty`.  
`answerDefinitionJson` forced to `null` for objective MVP types.

## 15. Root-scoped tags/links behavior

Tags and curriculum links are root-level (#003). Clone does **not** duplicate them — preserved on question root without duplication.

## 16. sourceContentHash audit

#004 hash included `option.id` in canonical JSON, causing pure clones to produce different hashes despite identical translatable content.

## 17. Hash semantic correction

Hash payload options now include only: `code`, `text`, `mediaAssetId`, `sortOrder`.  
Excluded: option row UUID, correct-answer mappings.

## 18. Hash clone stability

Pure clone with identical translatable content → same `sourceContentHash` as source published version (verified in integration + e2e).

## 19. Hash mutation triggers

Hash recomputed after translatable content/options change (via existing `recomputeSourceContentHash`). Correct-answer-only changes do not alter hash.

## 20. Published immutability

PUBLISHED/ARCHIVED versions remain read-only; no new write endpoints added. Clone reads source immutably.

## 21. Archive semantics

ARCHIVED is terminal for edits, valid as clone source, gradable for historical exams. Publish of newer draft archives previous PUBLISHED (#004 behavior confirmed).

## 22. Root inactive behavior

`QuestionInactiveError` (409) on clone, publish, and draft mutations when root INACTIVE.

## 23. Question type mutation with options

`updateDraftVersion`: if options or correct answers exist, `questionType` change rejected with `QuestionTypeChangeNotAllowedError` (409).

## 24. TRUE_FALSE transition policy

Changing TO `TRUE_FALSE`: requires no existing options/correct answers; then `ensureTrueFalseOptions` auto-provisions.  
Changing AWAY: requires cleared options/correct answers first (same guard).

## 25. Option replace/correct-answer integrity

#004 `replaceDraftOptions` deletes correct-answer rows before replacing options — no stale FK mappings. Unchanged.

## 26. Authoring clone snapshot

Clone returns full authoring snapshot; fetchable via `GET /question-versions/:id/authoring`.

## 27. Internal learner projection

`QuestionBankService.getLearnerQuestionProjection(versionId)` → `LearnerQuestionProjection` with prompt, instruction, difficulty, prompt media, options (id/text/media/sortOrder only).

## 28. Answer leakage tests

Unit test asserts projection omits: `correctOptionIds`, `answerDefinitionJson`, `explanation`, `code`, audit fields.

## 29. Internal grading contract

`QuestionBankService.gradeAnswer(input)` delegates to `QuestionGradingService`. No HTTP endpoint.

## 30. SINGLE_CHOICE grading

Exactly one selected option; exact-set match; score 0|1.

## 31. MULTIPLE_CHOICE grading

Exact-set semantics; order irrelevant; no partial credit.

## 32. TRUE_FALSE grading

Same as SINGLE_CHOICE; correctness by option UUID.

## 33. Invalid answer handling

`InvalidGradeAnswerInputError` for: unknown option, duplicate IDs, wrong selection count, cross-version option ID.

## 34. ARCHIVED grading support

`gradeAnswer` and `getImmutableAssessmentSnapshot` allow PUBLISHED and ARCHIVED.

## 35. DRAFT grading denial

`QuestionVersionNotGradableError` (409) for DRAFT versions.

## 36. Immutable assessment snapshot

`getImmutableAssessmentSnapshot` includes `correctOptionIds`, `sourceLocale`, `sourceContentHash`, options — no actor PII.

## 37. Historical exam readiness

Archived versions remain readable and gradable; root `currentPublishedVersionId` points to latest publish after v2 publish.

## 38. Media clone/revalidation semantics

Clone copies media JSON refs as-is; publish of cloned draft revalidates via existing #004 media validation gate.

## 39. Swagger

`POST clone-to-draft` documented on `QuestionVersionController` with `QuestionAuthoringResponseDto`.

## 40. Unit tests

| Suite | New/extended tests |
|-------|-------------------|
| `question-source-content-hash.util.spec.ts` | 5 (stability, mutation, UUID exclusion) |
| `question-grading.service.spec.ts` | 10 (projection, grading, snapshot) |
| `question-bank.service.spec.ts` | +4 (clone rejects, type-change guard) |

## 41. Integration tests

`question-bank-clone-grading.integration-spec.ts` — 4 tests: clone hash stability, publish v2/archive v1, draft conflict, learner/snapshot contracts.

## 42. DB e2e

`question-bank-clone.db.e2e-spec.ts` (`qb005-e2e-`) — 5 tests: auth, clone success, 409 conflict, inactive root, no grading HTTP.

## 43. Existing regression

#003 metadata, #004 options/publish, Curriculum/Media/Auth — all pass in `quality:full`.

## 44. pristine quality:full

```
npm run test:db:prepare -- --reset && npm run quality:full
```
**ONE CLEAN PASS** — exit code 0.

## 45. Docker

```
wsl docker build --target production -t catechism-api:question-bank-versioning .
```
**PASS**

## 46. Multilingual readiness

`sourceContentHash` stable over pure clone; `sourceLocale` on root unchanged; hash excludes volatile option UUIDs and correct-answer mappings.

## 47. Security/privacy

- No learner answer persistence
- Learner projection omits explanation and correct answers
- Server-side parish scope on clone endpoint
- No PII in assessment snapshot

## 48. Microservice extraction

Grading/projection contracts are service methods on `QuestionBankService` — future Practice/Exam modules consume via exported facade without entity leakage.

## 49. Commands

| Command | Result |
|---------|--------|
| `node --version` | v22.23.1 |
| `npm --version` | 11.16.0 |
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS (450 tests, 81 suites) |
| `npm run test:e2e` | PASS (5 tests, 2 suites) |
| `npm run build` | PASS |
| `npm run test:db:migrations` | PASS |
| `npm run test:integration` | PASS (172 tests, 27 suites) |
| `npm run test:e2e:db` | PASS (83 tests, 18 suites) |
| `npm run quality:full` | PASS |

## 50. Validation matrix

| Check | Result |
|-------|--------|
| format | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS (450) |
| DB-free e2e | PASS (5) |
| build | PASS |
| quality | PASS |
| pristine DB reset | PASS |
| migrations | PASS |
| integration | PASS (172) |
| DB e2e | PASS (83) |
| quality:full ONE CLEAN RUN | PASS |
| Docker | PASS |
| no cycle | PASS |
| no forwardRef | PASS |
| clone PUBLISHED | PASS |
| clone ARCHIVED | PASS |
| reject clone DRAFT | PASS |
| reject existing DRAFT | PASS |
| inactive root reject | PASS |
| version increment | PASS |
| new option IDs | PASS |
| correct mapping remap | PASS |
| content copied | PASS |
| root tags/links preserved | PASS |
| old published immutable | PASS |
| old archived readable | PASS |
| source hash stable over pure clone | PASS |
| option UUID excluded from hash | PASS |
| correct-answer excluded from hash | PASS |
| prompt/option text mutation changes hash | PASS |
| learner projection no answer leakage | PASS |
| explanation omitted | PASS |
| single grading | PASS |
| multiple exact-set grading | PASS |
| true/false grading | PASS (via SINGLE_CHOICE path) |
| duplicate answer IDs denied | PASS |
| cross-version option denied | PASS |
| DRAFT grading denied | PASS |
| ARCHIVED grading allowed | PASS |
| immutable assessment snapshot | PASS |
| no learner HTTP grading endpoint | PASS |
| no SHORT_TEXT/NUMBER | PASS |
| no partial credit | PASS |
| no entity/repo export | PASS |
| prior regression | PASS |
| Git rule compliance | PASS |

## 51. Known/deferred

- `QuestionCloneConflictError` not needed; unique constraint maps to `QuestionDraftAlreadyExistsError`
- TRUE_FALSE dedicated grading test uses same code path as SINGLE_CHOICE
- Test throttle override in `load-test-environment.ts` ensures deterministic full e2e suite

## 52. Out-of-scope

Practice/Exam modules, learner HTTP routes, search/import/export, translations, SHORT_TEXT/NUMBER, partial credit, randomization.

## 53. QUESTION BANK #006 readiness

No unresolved BLOCKER/HIGH. Recommend **QUESTION BANK #006/8**.

## 54. Prompt count

**QUESTION BANK #005/8 complete** — approximately **3 prompts remain** (#006–#008).

## 55. Commit recommendation

```
git commit -m "feat(question-bank): add version cloning and grading contracts"
```
