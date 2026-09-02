# EXAM #008 — Final Audit, Demo Seed, Postman, Phase Completion

**Status:** Complete  
**Date:** 2026-09-02  
**Scope:** Phase completion gate for Exam Engine. Demo seed, Postman collection, README, audit report. No new business features.

## Executive verdict

**PHASE COMPLETE — VALIDATION PASS**

| Gate | Result |
|------|--------|
| BLOCKER | 0 |
| HIGH | 0 |
| Architecture / module boundaries | PASS |
| Learner delivery + no leakage (IN_PROGRESS) | PASS |
| Parent attempt denied | PASS |
| Demo seed idempotent | PASS (unit + integration spec) |
| Postman collection | PASS |
| typecheck / lint / build / unit tests | PASS |

## Phase deliverables (#002–#008 summary)

| # | Scope | Status |
|---|--------|--------|
| 002 | Student learner self-scope | Done |
| 003 | Schema + module shell | Done |
| 004 | Authoring + publish + assignment | Done |
| 005 | Attempt generation + localized delivery | Done |
| 006 | Answer save + submit + grade | Done |
| 007 | Results/review + Learning Progress hook | Done |
| 008 | Final audit + demo + Postman | Done |

## HTTP route inventory (Exam Engine)

### Admin / authoring (`exam.read`, `exam.manage`, `exam.publish`, `exam.assign`)

- `POST /parishes/:parishId/exams`
- `GET /parishes/:parishId/exams`
- `GET /exams/:examId`, `PATCH /exams/:examId`, `PATCH /exams/:examId/status`
- `POST /exams/:examId/versions`, `GET /exams/:examId/versions`
- `GET/PATCH /exam-versions/:versionId`, `GET/PUT /exam-versions/:versionId/questions`
- `POST /exam-versions/:versionId/publish`, `POST /exam-versions/:versionId/clone-to-draft`
- `POST/GET /parishes/:parishId/classes/:classId/exam-assignments`, `GET/PATCH /exam-assignments/:assignmentId`

### Learner (`exam.attempt`)

- `GET /enrollments/:enrollmentId/exam-assignments`
- `POST /enrollments/:enrollmentId/exam-attempts`
- `GET /exam-attempts/:attemptId`
- `PUT /exam-attempts/:attemptId/questions/:examAttemptQuestionId/answer`
- `POST /exam-attempts/:attemptId/submit`

### Result read (`exam.result.read`)

- `GET /exam-attempts/:attemptId/result`
- `GET /exam-assignments/:assignmentId/attempt-summaries`

## Access-control matrix (MVP)

| Actor | Attempt | Read own result | Read child result | Class summaries |
|-------|---------|-----------------|-------------------|-----------------|
| Linked student | Yes | Yes | — | No |
| Parent/guardian | **No (403)** | — | Yes (policy) | **No** |
| Parish admin | No | Yes (staff policy) | Yes | Yes |
| Assigned catechist | No | Yes (staff policy) | No | Yes |
| Super admin | No | Yes | Yes | Yes |

## Module boundaries

- `ExamModule` exports `ExamService` only
- No `ExamModule → PracticeModule`
- No `LocalizationModule → ExamModule`
- `LearningProgressModule → ExamModule` via public `ExamService.getEnrollmentExamSummary`

## Demo seed

```powershell
npm run seed:exam-demo
```

**Prerequisites:** auth-rbac → parish-academic → class-enrollment → curriculum-demo → question-bank-demo

Creates idempotently:

- Exam `exam-demo-formal-001`
- Published version (2 QB demo questions, `AFTER_SUBMIT` review policy)
- Open class assignment on demo class A
- Logs `enrollmentId` and `examAssignmentId` for Postman

**Files:**

- `src/database/seeds/exam-demo.seed.constants.ts`
- `src/database/seeds/exam-demo.seed.service.ts`
- `src/database/seeds/exam-demo-seed.module.ts`
- `scripts/seed-exam-demo.ts`
- `test/integration/exam-demo-seed.integration-spec.ts`

## Postman

`docs/postman/Acutis-Education-Exam.postman_collection.json`

Flows: auth (admin/student/parent/catechist) → learner start/save/submit → result → parent result read → staff summaries → parent denied attempt.

**Manual variable:** set `enrollmentId` from seed output before learner requests.

## Quality gates (this session)

```bash
npm run typecheck   # pass
npm run lint        # pass
npm test -- --testPathPattern="exam|module-boundaries"  # pass
npm run build       # pass
```

Integration spec `exam-demo-seed.integration-spec.ts` runs under `npm run test:integration` when MSSQL test DB is available.

## Suggested commit

```bash
git commit -m "feat(exam): add demo seed postman and phase completion audit"
```
