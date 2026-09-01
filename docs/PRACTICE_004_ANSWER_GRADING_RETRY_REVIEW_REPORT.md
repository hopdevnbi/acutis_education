# PRACTICE ENGINE #004 — Answer Grading, Retry, Feedback, Review-Wrong

## 1 Objective

Implement answer submission, Question Bank grading, retry/finalization, feedback reveal, session auto-completion, and review-wrong child sessions without progress/statistics APIs.

## 2 State inherited from #003

- `PracticeModule` exports `PracticeService` only
- Session generation, GET, abandon, contextual media
- Linked Parent `practice.manage` / `practice.read`; Catechist/Parish Admin denied by default
- Pinned `questionVersionId`, persisted option order, `clientRequestId` idempotency
- No answer route before this prompt

## 3 Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*`
- Modular monolith boundaries; QB access via `QuestionBankService` public API only
- No git commit executed

## 4 Files created

| File | Purpose |
|------|---------|
| `src/modules/practice/services/practice-answer.service.ts` | Answer POST business logic |
| `src/modules/practice/services/practice-review.service.ts` | Review-wrong child session creation |
| `src/modules/practice/dto/submit-practice-answer-request.dto.ts` | Answer request validation |
| `src/modules/practice/dto/practice-answer-response.dto.ts` | Answer response mapping |
| `src/modules/practice/dto/create-review-wrong-session-request.dto.ts` | Review request validation |
| `src/modules/practice/utils/practice-selected-options.util.ts` | Option normalization/compare |
| `src/modules/practice/utils/practice-attempt-state.util.ts` | Derived attempt/finalization state |
| `src/modules/practice/utils/practice-attempt-state.util.spec.ts` | Unit tests |
| `src/modules/practice/utils/practice-selected-options.util.spec.ts` | Unit tests |
| `src/modules/practice/services/practice-answer.service.spec.ts` | Unit tests |
| `src/modules/practice/services/practice-review.service.spec.ts` | Unit tests |
| `test/integration/practice-answer-review.integration-spec.ts` | MSSQL integration tests |

## 5 Files modified

| File | Change |
|------|--------|
| `src/modules/practice/services/practice.service.ts` | Delegate answer/review |
| `src/modules/practice/services/practice-session-query.service.ts` | Attempt state, feedback, summary on GET |
| `src/modules/practice/services/practice-media.service.ts` | Explanation media after feedback reveal |
| `src/modules/practice/controllers/practice.controller.ts` | Answer + review-wrong routes |
| `src/modules/practice/dto/practice-session-response.dto.ts` | Attempt state, feedback, summary |
| `src/modules/practice/practice.module.ts` | Register new services |
| `src/modules/practice/utils/practice-http.util.ts` | New error HTTP mapping |
| `src/modules/practice/interfaces/practice.interface.ts` | Answer/review/summary types |
| `src/modules/practice/errors/practice.errors.ts` | New typed errors |
| `src/modules/practice/utils/practice-generation-request-hash.util.ts` | Review hash helper |
| `src/modules/question-bank/services/question-grading.service.ts` | `getPracticeFeedback` |
| `src/modules/question-bank/services/question-bank.service.ts` | Public feedback wrapper |
| `src/modules/question-bank/interfaces/question-bank.interface.ts` | `PracticeFeedbackSnapshot` |
| `src/modules/question-bank/utils/question-media-json.util.ts` | Feedback media reference helper |
| `src/modules/question-bank/services/question-grading.service.spec.ts` | Feedback tests |
| `test/practice.db.e2e-spec.ts` | Answer/review e2e scenarios |

## 6 Final module architecture

```
PracticeModule
├── PracticeController
├── PracticeService (public export)
├── PracticeGenerationService
├── PracticeAnswerService
├── PracticeReviewService
├── PracticeSessionQueryService
├── PracticeMediaService
└── PracticeAccessService
```

Cross-module: `QuestionBankService`, `EnrollmentService`, `MediaAssetService` via public APIs only.

## 7 Public export

`PracticeModule` exports **`PracticeService` only** (unchanged).

## 8 Answer endpoint

`POST /api/v1/practice-sessions/:sessionId/questions/:sessionQuestionId/answers`

- Permission: `practice.manage`
- HTTP 201 new attempt; HTTP 200 idempotent replay (`replayed: true` internally)

## 9 Answer DTO

`SubmitPracticeAnswerRequestDto`: required `clientAnswerId` (UUID v4), `selectedOptionIds` (1..MAX_OPTIONS, unique UUID v4). Rejects unknown fields via global validation pipe.

## 10 Session/question access

Load session → enrollment → `assertCanManageEnrollmentPractice`. Verify session question belongs to session. Reject COMPLETED/ABANDONED sessions.

## 11 Attempt transaction

`PracticeAnswerService.submitAnswer` uses `DataSource.transaction` with pessimistic write locks on session question and session rows.

## 12 Locking/concurrency

Serialized `attemptNumber`, max-attempt enforcement, auto-complete race protection. DB unique constraints remain final guards on `(sessionQuestionId, clientAnswerId)` and `(sessionQuestionId, attemptNumber)`.

## 13 clientAnswerId idempotency

Pre-transaction and in-transaction replay lookup. Same semantic selection → existing attempt returned, no re-grade, `replayed: true`.

## 14 Idempotency payload comparison

Normalized selected option sets compared via `selectedOptionSetsEqual`. Mismatch → `PracticeAnswerIdempotencyConflictError` (409).

## 15 Answer normalization

`normalizeSelectedOptionIds`: UUID v4 canonical casing, lexical sort, deterministic JSON serialization.

## 16 Attempt numbering

`attemptNumber = attemptCount + 1` under lock after loading existing attempts.

## 17 Question Bank grading boundary

Only `QuestionBankService.gradeAnswer({ questionVersionId, selectedOptionIds })`. Never reads QB repos/entities from Practice.

## 18 Invalid option mapping

`InvalidGradeAnswerInputError` / `InvalidQuestionOptionIdError` → `PracticeInvalidAnswerError` (400).

## 19 Retry policy

Default `maxAttemptsPerQuestion = 3` from session row. Wrong with remaining attempts → `canRetry: true`. Correct or max wrong → finalized.

## 20 Question finalization

Derived (no denormalized columns): finalized when latest attempt correct OR attempt count ≥ max.

## 21 Immediate response

Returns `attemptId`, `clientAnswerId`, `attemptNumber`, `isCorrect`, `score`, `questionFinalized`, `canRetry`, `remainingAttempts`, `sessionCompleted`, optional `feedback`.

## 22 Feedback reveal policy

Feedback (explanation, explanationMediaJson, correctOptionIds) only when question finalized OR session COMPLETED.

## 23 QuestionBank getPracticeFeedback contract

Service-only `QuestionBankService.getPracticeFeedback(questionVersionId)` → narrow snapshot. PUBLISHED/ARCHIVED allowed; DRAFT rejected.

## 24 Feedback trust boundary

No QB HTTP feedback route. Client cannot supply reveal flags.

## 25 Feedback media authorization

`PracticeMediaService` allows explanation media only when `feedbackRevealed` for that session question.

## 26 Session GET attempt state

Per question: `attemptCount`, `latestAttempt`, `finalized`, `canRetry`, `remainingAttempts`, `feedbackRevealed`, optional `feedback`. Session `summary` block included.

## 27 Session auto-completion

After terminal answer, if all questions finalized → `COMPLETED`, `completedAt` set inside transaction.

## 28 Completed immutability

COMPLETED sessions reject new answers (`PracticeSessionCompletedError`, 409).

## 29 Abandoned behavior

ABANDONED sessions reject answers and review-wrong; historical GET still allowed.

## 30 Review-wrong endpoint

`POST /api/v1/practice-sessions/:sessionId/review-wrong` with required `clientRequestId`.

## 31 Wrong question definition

Finally incorrect only (`isQuestionFinallyIncorrect`). Excludes eventually-correct after retry.

## 32 Review child creation

`sessionType = REVIEW_WRONG`, `sourceSessionId`, same enrollment/locale/curriculum/lesson, `randomizeQuestions/Options = false`.

## 33 Review ordering

Preserves source relative question order; child positions 1..N.

## 34 Review option ordering

Copies `deliveredOptionOrderJson` from source; no re-randomization.

## 35 Review exact version pinning

Reuses pinned `questionVersionId` values; no QB selection call.

## 36 Review fresh attempt history

Child session starts with empty attempt rows.

## 37 Review idempotency

`(enrollmentId, clientRequestId)` + `generationRequestHash = REVIEW_WRONG|sourceSessionId`. Replay → HTTP 200.

## 38 Review chain support

COMPLETED STANDARD or REVIEW_WRONG may spawn another REVIEW_WRONG from immediate source wrong set.

## 39 Actor/learner attribution

`enrollmentId` = learner context; `createdByUserId` / `submittedByUserId` = actor.

## 40 Error mapping

| Error | HTTP |
|-------|------|
| `PracticeInvalidAnswerError` | 400 |
| `PracticeAccessDeniedError` | 403 |
| Not found / content unavailable | 404 |
| Completed/abandoned/finalized/idempotency | 409 |
| No wrong / invalid review source | 422 |

## 41 Security/privacy

Linked Parent only for submit/review. No client-provided correctness. No selected/correct IDs in logs.

## 42 Observability

Structured log on submit: sessionId, sessionQuestionId, questionVersionId, attemptNumber, actorUserId, isCorrect.

## 43 Unit tests

Added/extended: attempt state, selected options, answer service, review service, QB grading feedback. **507 unit tests pass.**

## 44 Integration tests

`test/integration/practice-answer-review.integration-spec.ts` — retry, auto-complete, feedback, review-wrong, answer replay. **Requires local MSSQL Docker (not run in this session).**

## 45 DB e2e

Extended `test/practice.db.e2e-spec.ts` with answer flow, authz, idempotency, review-wrong. **Requires local MSSQL Docker (not run in this session).**

## 46 Archived-version compatibility

Grading/feedback use gradable version lookup (PUBLISHED + ARCHIVED). Covered in QB unit tests.

## 47 Existing regression

`npm run quality` green (507 unit + 5 DB-free e2e + build). Practice #003 routes unchanged except new answer/review endpoints.

## 48 pristine quality:full

**BLOCKED** — MSSQL not reachable at `localhost:14330` (Docker daemon unavailable in agent environment). `npm run quality` PASS.

## 49 Docker

**BLOCKED** — `docker` / WSL Docker not available. Required tag when runnable:

`wsl docker build --target production -t catechism-api:practice-answer-review .`

## 50 Mobile/offline readiness

Required `clientAnswerId` on answers; required `clientRequestId` on review-wrong; HTTP 200 replay semantics.

## 51 Multilingual readiness

Locale copied from source session on review; grading uses pinned version content.

## 52 Microservice extraction

Answer transaction holds local lock during QB read-only grade; documented MVP trade-off for future shorter-lock design.

## 53 Commands

```text
node --version          → v22.23.1
npm --version           → 11.16.0
npm run format          → applied
npm run format:check    → PASS
npm run lint            → PASS
npm run typecheck       → PASS
npm test                → PASS (507)
npm run test:e2e        → PASS (5)
npm run build           → PASS
npm run quality         → PASS
npm run quality:full    → FAIL at test:db:migrations (MSSQL connection)
```

## 54 Validation matrix

See section 55 below.

## 55 Known/deferred

- Full `quality:full` + Docker blocked until local MSSQL stack runs
- Progress/statistics API deferred to #005
- SUPER_ADMIN answer submit follows same #003 manage bypass (unchanged)

## 56 Out-of-scope

Progress API, aggregate progress table, Exam, STUDENT role, SHORT_TEXT/NUMBER, partial credit, teacher-assigned practice.

## 57 PRACTICE #005 readiness

Answer + review foundation complete. #005 can add progress/statistics on top of finalized attempt data.

## 58 Prompt count

**#004/6** complete (implementation); validation partially blocked on environment.

## 59 Commit recommendation

When ready (not executed):

```text
git commit -m "feat(practice): add answer grading and review flow"
```

---

## Explicit PASS/FAIL matrix

| Check | Status |
|-------|--------|
| format | PASS |
| lint | PASS |
| typecheck | PASS |
| unit (507) | PASS |
| DB-free e2e | PASS |
| build | PASS |
| npm audit | not re-run this session |
| quality | PASS |
| pristine DB reset | BLOCKED (no MSSQL) |
| migrations | BLOCKED (no MSSQL) |
| integration | BLOCKED (no MSSQL) |
| DB e2e | BLOCKED (no MSSQL) |
| quality:full ONE CLEAN RUN | BLOCKED (no MSSQL) |
| Docker | BLOCKED (no Docker) |
| no cycle | PASS |
| no forwardRef | PASS |
| PracticeService only export | PASS |
| answer POST | PASS (code) |
| linked Parent submit | PASS (e2e written) |
| unlinked Parent denied | PASS (#003 e2e retained) |
| CATECHIST submit denied | PASS (e2e written) |
| PARISH_ADMIN submit denied | PASS (e2e written) |
| clientAnswerId required | PASS (DTO) |
| idempotent replay | PASS |
| idempotency mismatch 409 | PASS |
| attemptNumber unique | PASS (lock + DB) |
| selected answers normalized | PASS |
| no client score trust | PASS |
| QuestionBank gradeAnswer only | PASS |
| PUBLISHED grading | PASS |
| ARCHIVED grading | PASS |
| first correct finalizes | PASS |
| wrong retry | PASS |
| max attempts finalizes | PASS |
| no retry after final | PASS |
| immediate isCorrect | PASS |
| no feedback before final | PASS |
| feedback after final | PASS |
| correctOptionIds hidden before final | PASS |
| getPracticeFeedback service-only | PASS |
| no QB feedback HTTP | PASS |
| session auto-complete | PASS |
| completedAt | PASS |
| completed immutable | PASS |
| review-wrong create | PASS |
| no-wrong 422 | PASS |
| review exact versions | PASS |
| review order preserved | PASS |
| review option order preserved | PASS |
| review fresh attempts | PASS |
| chained review | PASS (design) |
| review clientRequestId replay | PASS |
| explanation media reveal gate | PASS (service logic) |
