# EXAM #005 — Attempt Generation + Localized Delivery

**Status:** Complete  
**Date:** 2026-09-02  
**Scope:** Learner attempt start/resume, pinned question localization, GET delivery contract. No answer save/submit/grade (#006).

## Summary

Implemented formal exam attempt generation for linked student accounts only. Questions are pinned at start with shuffle, localization revision IDs, and immutable assessment snapshots. Exam header metadata is delivered in **source locale** per EXAM #001A (no `LocalizationModule → ExamModule` cycle).

## Deliverables

### RBAC

- `STUDENT` role seeded with `exam.attempt`
- Parent/guardian accounts remain denied (self-scope via `LearnerSelfScopeService`)

### HTTP endpoints (`/api/v1`)

| Method | Path | Permission |
|--------|------|------------|
| GET | `enrollments/:enrollmentId/exam-assignments` | exam.attempt |
| POST | `enrollments/:enrollmentId/exam-attempts` | exam.attempt |
| GET | `exam-attempts/:attemptId` | exam.attempt |

### Attempt start behavior

- Validates assignment `OPEN`, active enrollment/student/class, max attempts
- One `IN_PROGRESS` attempt per (enrollment, assignment) — resume on duplicate start
- Optional `clientRequestId` idempotency (unique index from schema)
- Pins `questionVersionId`, `sourceContentHash`, `translationRevisionId`, option order
- Shuffles questions/options per version flags
- `deadlineAt = min(startedAt + durationMinutes, assignment.closesAt)`
- Exam title/instructions stored as source-locale strings on attempt row

### GET attempt delivery

- Returns `serverTime`, `deadlineAt`, localized questions (no explanation/correctness leakage)
- Replays pinned translations via `resolveLocalizedResourceWithRevision`
- Returns `answers[]` structure (empty until #006 save APIs)

### Module wiring

`ExamModule` imports: `EnrollmentModule`, `StudentModule`, `LocalizationModule` (+ existing deps).  
**Does not** import `PracticeModule`.  
**LocalizationModule does not** import `ExamModule` (boundary test added).

## Tests

- `exam-deadline.util.spec.ts`
- `exam-shuffle.util.spec.ts`
- Existing exam + module-boundaries specs

## Quality gates

```bash
npm run typecheck   # pass
npm run lint        # pass
npm test -- --testPathPattern="exam|module-boundaries"  # 49 pass
npm run build       # pass
```

## Out of scope (#006)

- Answer save / submit / grade / lazy expiry finalize
- Result/review reveal
- Parent result read

## Suggested commit

```bash
git commit -m "feat(exam): add attempt generation and localized delivery"
```
