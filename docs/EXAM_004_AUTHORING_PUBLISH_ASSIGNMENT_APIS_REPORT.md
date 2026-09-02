# EXAM #004 — Authoring, Publish, and Class Assignment APIs

**Status:** Complete  
**Date:** 2026-09-02  
**Scope:** HTTP APIs for exam authoring, version management, publish/clone, and class assignments. No attempt/result APIs.

## Summary

Implemented parish-scoped exam authoring and assignment APIs on top of the EXAM #003 schema shell. Cross-module access uses `ParishModule`, `ClassModule`, and `QuestionBankService` public exports only.

## Deliverables

### RBAC (seed)

- `exam.read`, `exam.manage`, `exam.publish`, `exam.assign`, `exam.attempt`, `exam.result.read`
- `PARISH_ADMIN`: read/manage/publish/assign/result.read
- `CATECHIST`: read/result.read
- `exam.attempt` seeded for future learner APIs (#005); not wired to STUDENT yet

### HTTP endpoints (`/api/v1`)

| Method | Path | Permission |
|--------|------|------------|
| POST | `parishes/:parishId/exams` | exam.manage |
| GET | `parishes/:parishId/exams` | exam.read |
| GET | `exams/:examId` | exam.read |
| PATCH | `exams/:examId` | exam.manage |
| PATCH | `exams/:examId/status` | exam.manage |
| POST | `exams/:examId/versions` | exam.manage |
| GET | `exams/:examId/versions` | exam.read |
| GET | `exam-versions/:versionId` | exam.read |
| PATCH | `exam-versions/:versionId` | exam.manage |
| GET | `exam-versions/:versionId/questions` | exam.read |
| PUT | `exam-versions/:versionId/questions` | exam.manage |
| POST | `exam-versions/:versionId/publish` | exam.publish |
| POST | `exam-versions/:versionId/clone-to-draft` | exam.manage |
| POST | `parishes/:parishId/classes/:classId/exam-assignments` | exam.assign |
| GET | `parishes/:parishId/classes/:classId/exam-assignments` | exam.read |
| GET | `exam-assignments/:assignmentId` | exam.read |
| PATCH | `exam-assignments/:assignmentId` | exam.assign |

### Services

- `ExamService` — exam root, versions, question ordering, publish/clone transactions
- `ExamVersionOrchestrationService` — publish validation orchestration (422 + issues)
- `ExamAssignmentService` — class assignments with `effectiveStatus` derived from UTC window

### Publish behavior

- Validates ≥1 question, active questions, published question versions
- Pins `questionVersionId` from `QuestionBankService` at publish
- Archives previous published version; updates `exams.currentPublishedVersionId`
- Clone-to-draft copies structure; draft questions have `questionVersionId = null`

### Module wiring

`ExamModule` imports: `ParishModule`, `ClassModule`, `QuestionBankModule`, `AuthModule`, `AccessControlModule`. Does **not** import `PracticeModule` or `LocalizationModule`.

## Tests

- `exam-code.util.spec.ts`
- `exam-assignment-status.util.spec.ts`
- Existing: `exam.entities.spec.ts`, `exam-uuid-generation.spec.ts`, `module-boundaries.spec.ts`

## Quality gates

```bash
npm run typecheck   # pass
npm run lint        # pass (after prettier)
npm test -- --testPathPattern="exam|module-boundaries"  # pass
```

## Out of scope (#005+)

- Attempt start/save/submit APIs
- Localized delivery
- Results/review learner endpoints
- Demo seed for sample exams

## Suggested commit

```bash
git commit -m "feat(exam): add authoring publish and assignment APIs"
```
