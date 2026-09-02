# EXAM #006 — Answer Save, Submit, Grade, Time Controls

**Status:** Complete  
**Date:** 2026-09-02  
**Scope:** Learner answer upsert, manual submit, auto-finalize on expiry/assignment close, grading snapshot. No full per-question review UI (#007).

## Summary

Implemented formal exam answer persistence, learner submit, lazy time-based finalization, and score computation with review-policy visibility gating. Unanswered questions count as incorrect without calling `QuestionBankService.gradeAnswer` with empty selections.

## Deliverables

### HTTP endpoints (`/api/v1`)

| Method | Path | Permission |
|--------|------|------------|
| PUT | `exam-attempts/:attemptId/questions/:examAttemptQuestionId/answer` | exam.attempt |
| POST | `exam-attempts/:attemptId/submit` | exam.attempt |

Existing GET attempt endpoint now lazy-finalizes expired attempts and may include a `result` block when review policy allows.

### Answer save

- Upsert one answer per attempt question
- `clientAnswerId` idempotency with selection mismatch → 409
- Validates selected options against pinned delivered option order
- No grading feedback while `IN_PROGRESS`
- Auto-finalizes when past `deadlineAt` before rejecting or persisting

### Submit and grade

- Pessimistic lock on attempt row
- `IN_PROGRESS` → `SUBMITTED` → grade via `QuestionBankService.gradeAnswer` → `GRADED`
- Idempotent when already `SUBMITTED` or `GRADED`
- `scorePercent = round(100 * correctCount / questionCount)`
- `passed` derived from version `passingScorePercent`

### Lazy finalization

- On GET attempt, save answer, and submit path via `ExamAttemptFinalizationService.finalizeIfExpired`
- `TIME_EXPIRED` when past attempt deadline but assignment still open
- `ASSIGNMENT_CLOSED` when assignment window has ended

### Result visibility

- `result` on GET response when `isExamScoreVisible(reviewPolicy, status, assignmentClosed)` is true
- Default policy (`AFTER_ASSIGNMENT_CLOSE`) hides score until assignment closes

### New services

- `ExamAttemptAnswerService` — save/upsert answers
- `ExamAttemptFinalizationService` — expiry finalize + submit/grade transaction

### Utilities

- `exam-selected-options.util.ts` — normalize/compare selected option IDs
- `exam-score.util.ts` — score percent and pass computation
- `exam-review-visibility.util.ts` — score visibility by review policy

## Module boundaries

- Grading uses `QuestionBankModule` public API only
- No `ExamModule → PracticeModule`
- No `LocalizationModule → ExamModule`

## Tests

- `exam-score.util.spec.ts`
- `exam-review-visibility.util.spec.ts`
- Existing exam + module-boundaries specs

## Out of scope (#007)

- Per-question correct answer / explanation reveal
- Parent/guardian result read
- Learning Progress integration

## Suggested commit

```bash
git commit -m "feat(exam): add answer save submit and grading controls"
```
