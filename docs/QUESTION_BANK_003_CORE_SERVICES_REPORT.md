# QUESTION BANK #003 — Core Services Report

**Phase:** QUESTION BANK #003 / 8  
**Date:** 2026-08-31  
**Status:** IMPLEMENTATION COMPLETE (services layer only — no HTTP/DTOs/tests)

---

## Objective

Implement Question Bank core service layer: root/version CRUD, tag CRUD + link/unlink, curriculum link metadata, constants, errors, interfaces, utils, mappers — mirroring curriculum module patterns.

## Files created

| Path | Purpose |
|------|---------|
| `src/modules/question-bank/constants/question-permissions.constants.ts` | `questions.read/manage/publish` |
| `src/modules/question-bank/constants/question-list.constants.ts` | Pagination/sort whitelists |
| `src/modules/question-bank/errors/question-bank.errors.ts` | Domain error classes + publish validation issue type |
| `src/modules/question-bank/interfaces/question-bank.interface.ts` | Snapshots, inputs, response shapes |
| `src/modules/question-bank/utils/question-code.util.ts` | Kebab code max 64 |
| `src/modules/question-bank/utils/question-tag-code.util.ts` | Tag code max 64 |
| `src/modules/question-bank/utils/question-text.util.ts` | No HTML, max lengths |
| `src/modules/question-bank/mappers/question-bank.mapper.ts` | Entity → snapshot |
| `src/modules/question-bank/mappers/question-bank-response.mapper.ts` | Snapshot → response shape |
| `src/modules/question-bank/utils/question-http.util.ts` | Domain error → HTTP mapping |
| `src/modules/question-bank/services/question-bank.service.ts` | Root + version CRUD |
| `src/modules/question-bank/services/question-tag.service.ts` | Tag CRUD + link/unlink |
| `src/modules/question-bank/services/question-curriculum-link.service.ts` | Curriculum links via CurriculumService |

## Files modified

| Path | Change |
|------|--------|
| `src/modules/curriculum/errors/curriculum.errors.ts` | Added `CanonicalLessonKeyNotInCurriculumError`, `CurriculumVersionCurriculumMismatchError` |
| `src/modules/curriculum/services/curriculum.service.ts` | Added `assertCanonicalLessonKeyBelongsToCurriculum`, `assertVersionBelongsToCurriculum` |
| `src/modules/curriculum/utils/curriculum-http.util.ts` | Mapped new curriculum errors |
| `src/modules/question-bank/question-bank.module.ts` | Registered providers; imports ParishModule + CurriculumModule |

## Key behaviors

- **Atomic create:** `createQuestion` saves root + version 1 DRAFT in one transaction.
- **sourceLocale immutability:** blocked after published/archived version history (mirrors curriculum).
- **Blank draft:** `createDraftVersion` rejected when published/archived history exists (clone deferred to #005).
- **Draft create lock:** pessimistic write on question row in `createDraftVersion`.
- **Parish scope:** `ParishService.assertParishActive` on create; `getQuestionParishId` exported.
- **Curriculum links:** validated via `CurriculumService` public API only.

## Validation

| Gate | Result |
|------|--------|
| typecheck | PASS |
| lint | PASS |

## Deferred (#004+)

- HTTP controllers/DTOs
- Unit/integration/e2e tests
- RBAC seed permissions
- Option/answer CRUD and publish validation
- Module boundary export update for `QuestionBankService`
