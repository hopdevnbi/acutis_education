# QUESTION BANK #004 — Options, Correct Answers, and Publish Workflow Report

**Phase:** QUESTION BANK / ASSESSMENT CONTENT FOUNDATION #004 / 8  
**Date:** 2026-08-31  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** QUESTION_BANK_004 (options/answers services, publish workflow, HTTP API, tests)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| QuestionOptionService (internal) | **PASS** |
| Publish validation (`collectPublishValidationIssues`) | **PASS** |
| Publish transaction (`publishDraftVersion`) | **PASS** |
| TRUE_FALSE auto-provision | **PASS** |
| Media JSON validation via MediaAssetService | **PASS** |
| sourceContentHash recompute | **PASS** |
| HTTP routes + RBAC | **PASS** |
| Module boundary (`QuestionBankService` export only) | **PASS** |
| Unit tests | **PASS** |
| Integration tests | **PASS** |
| DB e2e (qb004) | **PASS** |
| Docker production build | **PASS** |
| Unresolved BLOCKER count | **0** |

**Recommendation:** Proceed to **QUESTION BANK #005/8 — Clone Draft from Published Version**.

---

## 1. Objective

Implement draft option/correct-answer management, structured publish validation, immutable publish workflow, authoring HTTP API, and tests — without clone (#005) or learner delivery/grading.

## 2. Files created

### Constants / utils

| File | Purpose |
|------|---------|
| `constants/question-option.constants.ts` | MIN/MAX options, TRUE_FALSE codes |
| `utils/question-option-code.util.ts` | Slug-style option codes (varchar 32) |
| `utils/question-option-text.util.ts` | Option text validation (max 512, no HTML) |
| `utils/question-media-json.util.ts` | Prompt/explanation media JSON schema + asset validation |
| `utils/question-source-content-hash.util.ts` | SHA-256 canonical JSON per design §47 |
| `utils/canonical-json.util.ts` | Deterministic JSON serialization |

### Services

| File | Purpose |
|------|---------|
| `services/question-option.service.ts` | Internal option/correct-answer CRUD, TRUE_FALSE provision, hash recompute |

### DTOs

| File | Purpose |
|------|---------|
| `dto/question-option-response.dto.ts` | Option list response |
| `dto/replace-question-options-request.dto.ts` | PUT options body |
| `dto/set-correct-options-request.dto.ts` | PUT correct-options body |
| `dto/question-authoring-response.dto.ts` | Authoring snapshot response |
| `dto/publish-validation-error.dto.ts` | Swagger 422 contract |

### Tests

| File | Coverage |
|------|----------|
| `services/question-option.service.spec.ts` | 5 unit tests |
| `test/integration/question-bank-options-publish.integration-spec.ts` | 3 MSSQL integration tests |
| `test/question-bank-options.db.e2e-spec.ts` | 4 HTTP e2e tests (`qb004-e2e-` prefix) |

## 3. Files modified

| Path | Change |
|------|--------|
| `services/question-bank.service.ts` | Publish validation/publish, authoring snapshot, media validation on draft update, TRUE_FALSE integration, hash recompute |
| `services/question-bank.service.spec.ts` | +3 publish unit tests |
| `controllers/question-version.controller.ts` | Options, correct-options, authoring, publish routes |
| `question-bank.module.ts` | Import `MediaModule`, register `QuestionOptionService` |
| `errors/question-bank.errors.ts` | Option/media/publish errors |
| `interfaces/question-bank.interface.ts` | Option/authoring snapshots + inputs |
| `mappers/question-bank.mapper.ts` | `toQuestionOptionSnapshot` |
| `mappers/question-bank-response.mapper.ts` | Option/authoring response mappers |
| `utils/question-http.util.ts` | HTTP mapping for new errors + media errors |

## 4. API surface (#004)

| Method | Route | Permission |
|--------|-------|------------|
| GET | `/api/v1/question-versions/:versionId/options` | `questions.read` |
| PUT | `/api/v1/question-versions/:versionId/options` | `questions.manage` |
| PUT | `/api/v1/question-versions/:versionId/correct-options` | `questions.manage` |
| GET | `/api/v1/question-versions/:versionId/authoring` | `questions.read` |
| POST | `/api/v1/question-versions/:versionId/publish` | `questions.publish` |

Publish failures return **422** with structured `issues[]` (codes per design §38).

## 5. Publish validation codes

`PROMPT_REQUIRED`, `INVALID_OPTION_COUNT`, `CORRECT_ANSWER_REQUIRED`, `TOO_MANY_CORRECT_ANSWERS`, `ANSWER_OPTION_NOT_FOUND`, `DUPLICATE_OPTION_CODE`, `OPTION_REPRESENTATION_REQUIRED`, `DIFFICULTY_REQUIRED`, `ASSET_NOT_FOUND`, `ASSET_NOT_READY`, `ASSET_CATEGORY_MISMATCH`, `DRAFT_ONLY`, `ANSWER_DEFINITION_NOT_ALLOWED` (objective types must have empty `answer_definition_json`).

## 6. TRUE_FALSE behavior

On create/update when type is `TRUE_FALSE` and no options exist, auto-provisions two options with codes `true`/`false` and placeholder text `True`/`False` (satisfies DB representation CHECK; authors may localize via replace-options).

## 7. Module boundary

```typescript
exports: [QuestionBankService]
```

`QuestionOptionService` remains internal. Media accessed only via `MediaAssetService` public export.

## 8. Test results

| Suite | Result |
|-------|--------|
| `question-option.service.spec.ts` | 5/5 PASS |
| `question-bank.service.spec.ts` | 13/13 PASS |
| `question-bank-options-publish.integration-spec.ts` | 3/3 PASS |
| `question-bank-options.db.e2e-spec.ts` | 4/4 PASS |
| Unit total (full `npm test`) | 431/431 PASS |
| Integration total | 168/168 PASS |
| DB e2e total | 78/78 PASS (includes pre-existing curriculum-delivery flake risk under full sequential load) |

### Commands run

- `npm run test:db:prepare -- --reset && npm run quality:full` — PASS (after fixes)
- `wsl docker build --target production -t catechism-api:question-bank-options-publish .` — PASS

## 9. Deferred (by design)

- Clone draft from published (#005)
- Learner delivery / grading (`gradeAnswer`)
- `SHORT_TEXT` / `NUMBER` answer_definition_json types

## 10. Notes

- MSSQL UUID casing: publish validation normalizes option IDs when matching correct answers.
- TRUE_FALSE placeholder text is authoring-default only; correctness remains option UUID-based.

---

**Sign-off:** QUESTION BANK #004 complete. Ready for #005 clone workflow.
