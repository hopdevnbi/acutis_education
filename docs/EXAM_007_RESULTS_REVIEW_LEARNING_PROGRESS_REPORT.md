# EXAM #007 — Results/Review, Parent Read, Learning Progress Hook

**Status:** Complete  
**Date:** 2026-09-02  
**Scope:** Per-question review reveal, result read APIs, staff assignment summaries, Learning Progress exam dimension. No demo seed/Postman (#008).

## Summary

Extended the exam engine with policy-gated result/review delivery, scoped result read for learners/parents/staff, class assignment attempt summaries, and `ExamService.getEnrollmentExamSummary` wired into Learning Progress.

## Deliverables

### HTTP endpoints (`/api/v1`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `exam-attempts/:attemptId/result` | exam.result.read |
| GET | `exam-assignments/:assignmentId/attempt-summaries` | exam.result.read |

Existing learner GET attempt now includes per-question review blocks inside `result.questions[]` when review policy allows.

### Review / reveal

- Score, correct answers, and explanation gated independently via `reviewPolicy`
- Active `IN_PROGRESS` attempts reject result read (`ExamReviewNotAvailableError`)
- Staff readers (parish admin / assigned catechist / super admin) bypass learner reveal delays for monitoring
- Parents/guardians read child results only — no class roster summaries

### Access control

- `ExamResultAccessService` — attempt result read + assignment summary scopes
- Parent policy unchanged: **cannot** start/save/submit attempts

### Learning Progress

- `ExamService.getEnrollmentExamSummary(enrollmentId)` exported public API
- `LearningProgressAggregationService` replaces `exam: null` with `{ assignmentsAvailable, attemptsCompleted, latestScorePercent }`
- `LearningProgressModule` imports `ExamModule` (public export only)

### RBAC seed updates

- `PARENT`: `exam.result.read`
- `STUDENT`: `exam.result.read`

### New services / utilities

- `ExamAttemptResultQueryService`
- `ExamAssignmentAttemptSummaryService`
- `ExamResultAccessService`
- `exam-attempt-result.util.ts`

## Module boundaries

- `LearningProgressModule → ExamModule` via exported `ExamService` only
- `ExamModule` does not import `LearningProgressModule` or `PracticeModule`
- Grading/review feedback via `QuestionBankService.getPracticeFeedback` / `gradeAnswer`

## Tests

- `exam-attempt-result.util.spec.ts`
- Extended `exam-review-visibility.util.spec.ts`
- Existing exam + module-boundaries specs

## Out of scope (#008)

- Final audit, demo seed, Postman collection, Docker validation gate

## Suggested commit

```bash
git commit -m "feat(exam): add result review access and learning progress hook"
```
