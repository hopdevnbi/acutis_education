# EXAM ENGINE #001 — Domain Audit and Formal Assessment Design Report

**Phase:** EXAM ENGINE / FORMAL ASSESSMENT #001 / 7  
**Date:** 2026-09-02  
**Status:** AUDIT / DESIGN COMPLETE  
**Prompt:** `EXAM_ENGINE_001_DOMAIN_AUDIT_AND_FORMAL_ASSESSMENT_DESIGN.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| EXAM DOMAIN DESIGN READY | **YES** |
| EXAM VERSIONING MODEL READY | **YES** |
| QUESTION SNAPSHOT MODEL READY | **YES** |
| LOCALIZATION SNAPSHOT MODEL READY | **YES** |
| ASSIGNMENT MODEL READY | **YES** |
| ATTEMPT LIFECYCLE READY | **YES** |
| TIME/EXPIRY MODEL READY | **YES** |
| ANSWER/SUBMISSION MODEL READY | **YES** |
| GRADING/RESULT MODEL READY | **YES** |
| REVIEW/REVEAL POLICY READY | **YES** |
| PARENT/STAFF ACCESS MODEL READY | **YES** |
| LEARNING PROGRESS INTEGRATION MODEL READY | **YES** |
| FE/MOBILE EXAM CONTRACT FOUNDATION READY | **YES** |
| PERSISTENCE REQUIRED NOW | **NO** (#002) |
| FINAL RECOMMENDED PROMPT COUNT | **7** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**PARENT EXAM ATTEMPT POLICY: DENIED**

Only the learner’s own linked user account may start, save answers, and submit a formal exam attempt. Linked parents/guardians may read released results per review policy but must not act as the exam taker.

**Recommendation:** Proceed to **EXAM #002/7 — Persistence + module boundary + version/assignment/attempt schema foundation** (schema/entities/migrations only; no HTTP API).

---

## 1. Objective

Design the Exam Engine bounded context for **formal, summative assessment** before any production implementation: ownership, lifecycle, snapshots, time/attempt controls, grading/results, review/reveal, RBAC, localization pinning, Learning Progress composition, and a 7-prompt delivery plan.

## 2. Current roadmap position

Completed phases: Foundation, CI/CD, Auth/RBAC, Parish/Academic, Class/Enrollment, Curriculum, Media, Question Bank, Practice, Learning Progress, Localization (#006 COMPLETE).

Current phase: **Exam Engine** (#001/7 audit only). No `ExamModule`, tables, permissions, or routes exist in `src/`.

## 3. Existing reusable foundations

| Foundation | Exam reuse |
|------------|------------|
| Question Bank `getImmutableAssessmentSnapshot`, `gradeAnswer` | Publish validation + attempt pinning + submit grading |
| Practice session question pinning (`questionVersionId`, `translationRevisionId`, `deliveredLocale`, option order JSON) | Attempt question snapshot pattern |
| Practice idempotency (`clientRequestId`, `clientAnswerId` + unique indexes) | Start + answer save replay |
| Localization `resolveLocalizedResource(s)` / `resolveLocalizedResourceWithRevision` | Pin at attempt start; replay on GET |
| Enrollment/class access services | Scoped learner + staff access |
| Curriculum triple assignment `(parishId, academicYearId, catechismLevelId)` | Class context for assignments |
| Learning Progress `exam: null` placeholder | Future composition via Exam public API |

## 4. Practice vs Exam distinction

| Dimension | Practice (formative) | Exam (summative) |
|-----------|---------------------|------------------|
| Purpose | Learning, retry, progress | Formal score, audit trail |
| Initiation | Learner/parent on demand | Admin publish + class assignment |
| Question set | Dynamic selection from filters | Fixed ordered list on published version |
| Retries | Up to 3 per question | Single answer per question per attempt |
| Feedback during attempt | `isCorrect` immediate; explanation after finalize | **No** correctness, score, or explanation leakage |
| Completion | Auto when all questions finalized | Explicit submit or time expiry auto-submit |
| Time limit | None | `durationMinutes` + assignment window |
| Max attempts | N/A (unlimited sessions) | Per assignment/version config |
| Parent as actor | **Allowed** (`practice.manage` + guardian link) | **Denied** (see §25) |
| Abandon | `ABANDONED` without consuming formal attempt budget | No abandon; attempt counts if started |
| Module | `PracticeModule` owns 3 tables | New `ExamModule` — separate bounded context |

**Do not implement Exam by copying Practice semantics.**

## 5. Exam bounded context

`ExamModule` owns:

- Exam definitions (root)
- Immutable exam versions + ordered question configuration
- Class assignments (availability window)
- Learner attempts
- Attempt question snapshots
- Attempt answers (pre-submit mutable, post-submit frozen)
- Result/finalization metadata (on attempt row)

## 6. What Exam must NOT own

| Owner | Retains |
|-------|---------|
| Question Bank | Question roots, versions, options, correctness, grading algorithms, source content hash |
| Localization | Translation revisions, locale resolution, provider jobs |
| Learning Progress | Lesson progress rows; composes exam metrics later via Exam export |
| Enrollment | Enrollment lifecycle |
| Class | Class triple, roster |
| Practice | Formative sessions — Exam must not query Practice tables |

## 7. Exam root identity

```
exams
  id (UUID)
  parishId (UUID, scoped)
  code (varchar, unique per parish)
  status: ACTIVE | INACTIVE
  createdAt, updatedAt
```

Root is stable identity; mutable metadata lives on versions.

## 8. Exam version model

```
exam_versions
  id
  examId
  versionNumber (int, monotonic per exam)
  title, description, instructions (source locale text)
  sourceLocale (BCP47, e.g. vi-VN)
  durationMinutes (int, > 0)
  maxAttempts (int, >= 1)
  passingScorePercent (decimal nullable — null = no pass/fail label)
  shuffleQuestions (bit, default false)
  shuffleOptions (bit, default false)
  reviewPolicyJson (structured — see §50)
  status: DRAFT | PUBLISHED | ARCHIVED
  publishedAt, publishedByUserId
  createdAt, updatedAt
```

**Strong recommendation confirmed:** stable exam root + immutable published versions.

## 9. Root lifecycle

| Status | Meaning |
|--------|---------|
| `ACTIVE` | May have published versions and assignments |
| `INACTIVE` | Soft-disabled; no new assignments; existing attempts follow assignment rules |

Root `INACTIVE` does not delete historical attempts.

## 10. Version lifecycle

```
DRAFT → PUBLISHED → ARCHIVED
```

- **DRAFT:** mutable (title, questions, config)
- **PUBLISHED:** immutable content; used for new attempts
- **ARCHIVED:** retained for history; not assignable

Publishing a new version archives the prior `PUBLISHED` version for the same exam (single current published pointer on exam optional: `currentPublishedVersionId`).

## 11. Authoring mutation rules

- Edit only `DRAFT` versions
- Add/remove/reorder questions only in `DRAFT`
- Clone `PUBLISHED` or `ARCHIVED` → new `DRAFT` with `versionNumber + 1`
- Delete: only `DRAFT` with no attempts (or soft-delete deferred)

## 12. Question configuration model

```
exam_version_questions
  id
  examVersionId
  questionId (root — validation only)
  questionVersionId (pinned at publish time)
  sortOrder (int, explicit order)
  pointsWeight (DEFERRED — MVP equal weight)
```

**MVP:** explicit ordered list authored in draft. At **publish**, resolve each `questionId` → `currentPublishedVersionId` and persist `questionVersionId`. Reject publish if any question unpublished.

## 13. Randomization decision

| Flag | Behavior |
|------|----------|
| `shuffleQuestions` | At attempt start, shuffle **copy** of version question order; persist on `exam_attempt_questions.sortOrder` |
| `shuffleOptions` | At attempt start, shuffle option order per question; persist `deliveredOptionOrderJson` |

Version table stores flags; **attempt** stores realized order (reproducible grading/display).

**REJECTED for MVP:** random pool / rule-based selection (defer to post-MVP).

## 14. Question version pinning

Every `exam_attempt_questions.questionVersionId` is frozen at attempt start from published version config (or post-shuffle reference to same version).

Historical attempts remain gradable after Question Bank publishes newer versions.

Integration: `QuestionBankService.getImmutableAssessmentSnapshot(versionId)` at start for validation only; grading uses same pinned ID at submit.

## 15. Option order snapshot

Persist `deliveredOptionOrderJson` (ordered option UUID array) on `exam_attempt_questions`, matching Practice pattern.

## 16. Locale resolution

At attempt start:

1. Read `Accept-Language` / user preferred locale / exam `sourceLocale`
2. `LocaleResolutionService.resolveLocale` → `resolvedLocale`
3. Per question: `LocalizationService.resolveLocalizedResources` for `QuestionBankVersion`

## 17. Question translation pinning

Per `exam_attempt_questions`:

- `translationRevisionId` (nullable UUID, no FK)
- `deliveredLocale` (varchar)
- `sourceContentHash` (char(64) — from QB snapshot at start)

Replay via `resolveLocalizedResourceWithRevision` — same as Practice.

## 18. Exam metadata localization architecture

**Problem:** Exam title/instructions are translatable; must avoid `Localization ↔ Exam` import cycle.

**Design (no cycle):**

1. Add `TranslationResourceType.ExamVersion` in Localization (#004+ of Exam phase, not #001).
2. Adapter lives in `LocalizationModule`, calls **`ExamService.getVersionSourceSnapshot(versionId)`** (public export) — mirrors Curriculum adapters.
3. Exam authoring uses source locale on `exam_versions`; parish admin syncs via `POST /localization/resources/sync` after publish.
4. At attempt start, Exam calls `LocalizationService.resolveLocalizedResource` for exam header fields → persist `exam_attempts.examTitleDelivered`, `instructionsDelivered`, `examTranslationRevisionId` (scalar) OR denormalized JSON snapshot on attempt.

**MVP fallback:** If translation missing, deliver source locale strings (fallback flags in response).

Exam module **never** imports Localization repositories; only `LocalizationService` public methods.

## 19. Attempt content snapshot decision

| Option | Verdict |
|--------|---------|
| A. IDs + immutable references only | **REQUIRED (MVP)** |
| B. Full rendered JSON snapshot | **DEFERRED** |

MVP: pin `questionVersionId`, option order, `translationRevisionId`, `deliveredLocale`, `sourceContentHash`. Display assembled at read time from QB + Localization pinned revision.

Optional `displayCacheJson` on attempt question — **DEFERRED** unless performance requires.

## 20. Assignment model

```
exam_assignments
  id
  examVersionId (pinned published version)
  classId
  opensAt (datetime UTC)
  closesAt (datetime UTC, > opensAt)
  status: SCHEDULED | OPEN | CLOSED | CANCELLED
  createdByUserId
  createdAt, updatedAt
```

Assignment binds **class + published version + window**; does not mutate exam content.

## 21. Assignment target decision

**MVP: class-level assignment only.**

Learner eligibility derived at attempt start: active enrollment in `classId`, assignment `OPEN`, within window.

**DEFERRED:** per-enrollment assignment exceptions, cohort subsets.

## 22. Assignment scheduling

- `opensAt` / `closesAt` stored UTC
- Status derived or materialized on read/write (lazy transition `SCHEDULED → OPEN → CLOSED`)
- Server authoritative; client timers display-only

## 23. Assignment lifecycle

| Status | New attempts |
|--------|--------------|
| `SCHEDULED` | Denied (before opensAt) |
| `OPEN` | Allowed if enrollment eligible |
| `CLOSED` | Denied |
| `CANCELLED` | Denied; in-progress attempts follow expiry/submit rules |

## 24. Enrollment / learner identity

Attempts keyed by:

- `enrollmentId` (required)
- `examAssignmentId`
- `attemptNumber` (1..maxAttempts)
- `startedByUserId` (must be student linked user — see §25)

Denormalize for audit: `classId`, `parishId`, `studentId`, `examVersionId`, `examId`.

## 25. Parent exam-taking policy

**PARENT EXAM ATTEMPT POLICY: DENIED**

Rationale:

- Formal assessment integrity for minors (platform serves ages ~3–15)
- Practice already provides guardian-assisted formative learning
- Prevents score attribution ambiguity (`submittedByUserId` ≠ learner)
- Aligns with staff non-impersonation rule

**Parent may:** read child’s released result/review per policy (§29).  
**Parent may not:** `POST` start, answer save, or submit.

## 26. Catechist policy

| Action | Catechist |
|--------|-----------|
| Author draft exams | **DEFERRED** — MVP parish admin only unless `exam.manage` granted later |
| Publish | Denied (requires `exam.publish`) |
| Assign to class | Denied unless granted `exam.assign` |
| View class attempt summaries | **Allowed** for assigned class scope (`exam.result.read`) |
| View individual attempt detail | Assigned class + enrollment in class |
| Impersonate learner submit | **Denied** |

## 27. Parish Admin policy

Full parish scope: `exam.read`, `exam.manage`, `exam.publish`, `exam.assign`, `exam.result.read`. Cannot submit attempts on behalf of learners.

## 28. Super Admin policy

Global read/manage across parishes; same non-impersonation rule.

## 29. Parent result access

Linked parent/guardian: `exam.result.read` scoped to **own child’s enrollments only**.

Never: class-wide roster results, other students’ scores, or aggregate class analytics beyond what class endpoint explicitly allows for staff.

## 30. RBAC permissions

Minimal set:

| Permission | Purpose |
|------------|---------|
| `exam.read` | List exams, versions, assignments (parish scoped) |
| `exam.manage` | Draft authoring, question config |
| `exam.publish` | Publish/archive versions |
| `exam.assign` | Create/manage class assignments |
| `exam.attempt` | Learner start/save/submit (student linked account) |
| `exam.result.read` | Results/review per scope |

Seed in `auth-rbac` during #003+. Role mapping:

- `PARISH_ADMIN`: all except super-global
- `CATECHIST`: `exam.read`, `exam.result.read` (scoped)
- `PARENT`: `exam.result.read` (child only) — not `exam.attempt`
- Student role (linked user): `exam.attempt` + `exam.result.read` (own)

## 31. Attempt lifecycle

```
IN_PROGRESS → SUBMITTED → GRADED
         ↘ (expiry auto-submit) ↗
```

Optional `VOIDED` — **DEFERRED** (admin correction post-MVP).

`autoSubmitReason`: `LEARNER_SUBMIT` | `TIME_EXPIRED` | `ASSIGNMENT_CLOSED` (metadata column).

## 32. Attempt start flow

Validate atomically:

1. Assignment `OPEN`, now ∈ [opensAt, closesAt]
2. Enrollment active, student active, class active
3. `attemptNumber = completedAttempts + 1 <= maxAttempts`
4. No other `IN_PROGRESS` attempt for (enrollmentId, assignmentId)
5. Load published `examVersionId` from assignment
6. Build question list (shuffle if configured)
7. Resolve localization per question + exam header
8. Persist attempt + attempt_questions in one transaction
9. Set `startedAt`, `deadlineAt = min(startedAt + duration, closesAt)`

## 33. One-active-attempt policy

**Max one `IN_PROGRESS` attempt per (enrollmentId, examAssignmentId).**

Concurrent starts: second request returns existing in-progress attempt (idempotent) or `409` if `clientRequestId` conflict.

## 34. Attempt numbering

`attemptNumber` sequential per (enrollment, assignment). Consumed when attempt reaches `SUBMITTED`/`GRADED` (including auto-submit). Abandoned in-progress still counts if started — **no Practice-style abandon**.

## 35. Max-attempt policy

Enforced at start. Completed/submitted attempts count toward `maxAttempts`. `IN_PROGRESS` counts as started attempt slot (prevents start spam).

## 36. Start idempotency

- `clientRequestId` UUID optional but recommended (mobile)
- Unique: `(enrollmentId, examAssignmentId, clientRequestId)` filtered index
- Same requestId + same semantic hash → return existing attempt `200`
- Same requestId + different hash → `ExamSubmitConflict` / idempotency conflict `409`

## 37. Duration / deadline model

- `durationMinutes` from version
- `deadlineAt = MIN(startedAt + durationMinutes, assignment.closesAt)`
- All mutations check `now <= deadlineAt` (or trigger auto-submit)

## 38. Assignment close vs active attempt

If `closesAt` passes while `IN_PROGRESS`:

- Next GET or answer save triggers lazy finalize with `autoSubmitReason = ASSIGNMENT_CLOSED`
- Grade saved answers; unanswered = incorrect

## 39. Time expiry / autosubmit

No background scheduler required for MVP.

**Lazy finalization** on: answer save, GET attempt, submit.

If `now > deadlineAt` and `IN_PROGRESS` → transition to `SUBMITTED`, grade, `GRADED`, `autoSubmitReason = TIME_EXPIRED`.

Use transaction + row lock on attempt (pessimistic, like Practice answer submit).

## 40. Answer persistence model

```
exam_attempt_answers
  id
  examAttemptQuestionId (unique — one current answer per question)
  selectedOptionIdsJson
  savedAt
  savedByUserId
  clientAnswerId (idempotency)
```

Pre-submit: **upsert** current answer (overwrite).  
Post-submit: table immutable (guard via attempt status).

**DEFERRED:** full answer revision history table (`exam_answer_revisions`).

## 41. Answer edit / history decision

**MVP:** single current answer per question, editable until submit.  
**REJECTED for MVP:** immutable per-save revision chain (audit satisfied by attempt + submit timestamp).

## 42. Answer save idempotency

- `clientAnswerId` per question
- Unique `(examAttemptQuestionId, clientAnswerId)`
- Replay same payload → `200` prior state
- Conflict → `ExamAnswerInvalid` / idempotency `409`

No grading feedback in response body during `IN_PROGRESS`.

## 43. Submit / finalize flow

`POST .../submit`:

1. Lock attempt
2. Verify `IN_PROGRESS`, not expired (or idempotent if already submitted)
3. Status → `SUBMITTED`
4. For each question: `gradeAnswer` via QuestionBankService
5. Compute `correctCount`, `questionCount`, `scorePercent`
6. Apply `passingScorePercent` if non-null → `passed` bit
7. Status → `GRADED`, set `submittedAt`, `gradedAt`, `autoSubmitReason`
8. Idempotent replay returns same result

## 44. Submit concurrency

Pessimistic lock on `exam_attempts` row. Duplicate submit → same `GRADED` payload.

## 45. Unanswered behavior

Unanswered questions graded as incorrect (`score 0`). Submit allowed without answering all questions unless future `requireAllAnswered` flag added (**DEFERRED**).

## 46. Grading integration

**Only** `QuestionBankService.gradeAnswer({ questionVersionId, selectedOptionIds })`.

No direct SQL on `question_correct_options`. No client-supplied score.

## 47. Score model

MVP equal weight:

- `correctCount`
- `questionCount`
- `scorePercent = round(100 * correctCount / questionCount)`

## 48. Passing threshold

`passingScorePercent` nullable on version. If null, omit `passed` in result DTO. If set, compute `passed = scorePercent >= passingScorePercent`.

No spiritual/faith quality scoring.

## 49. Result snapshot

Persist on `exam_attempts`:

- `questionCount`, `correctCount`, `scorePercent`
- `passed` (nullable bit)
- `submittedAt`, `gradedAt`
- `autoSubmitReason`

Never recompute from mutable exam version config.

## 50. Review / reveal policy

Structured `reviewPolicyJson` on version:

```typescript
{
  scoreVisibility: 'NEVER' | 'AFTER_SUBMIT' | 'AFTER_ASSIGNMENT_CLOSE';
  correctAnswerVisibility: 'NEVER' | 'AFTER_SUBMIT' | 'AFTER_ASSIGNMENT_CLOSE';
  explanationVisibility: 'NEVER' | 'AFTER_SUBMIT' | 'AFTER_ASSIGNMENT_CLOSE';
}
```

Active `IN_PROGRESS` GET: questions + saved selections only — **no** `isCorrect`, **no** correct option IDs, **no** explanation, **no** score.

## 51. Active attempt leakage prevention

DTO mapper strips grading fields by attempt status + review policy. Integration tests mandatory (#005+).

## 52. Result / review DTO concept

`ExamAttemptResultDto` (after reveal): score fields + per-question review blocks when policy allows.

`ExamAttemptInProgressDto`: `serverTime`, `deadlineAt`, questions, `savedAnswers`, localization metadata.

## 53. Question Bank integration

Public API only:

- `getImmutableAssessmentSnapshot` — publish validation
- `getLearnerQuestionProjection` — in-progress display (no answers)
- `gradeAnswer` — submit
- `getPracticeFeedback` — **not used**; build exam review from snapshot + policy

## 54. Localization integration

Public API only:

- `resolveLocalizedResources` at start
- `resolveLocalizedResourceWithRevision` at GET

Register `ExamVersion` adapter in Localization when Exam exposes `getVersionSourceSnapshot`.

## 55. Learning Progress integration

Exam **does not write** `lesson_progress`.

Later #006: `LearningProgressAggregationService` calls `ExamService.getEnrollmentExamSummary(enrollmentId)`:

```typescript
exam: {
  assignmentsAvailable: number;
  attemptsCompleted: number;
  latestScorePercent: number | null;
} | null
```

Replace hardcoded `exam: null` when Exam API stable.

## 56. Curriculum linkage

**Optional** `curriculumId` on `exam_versions` for reporting/filtering only — **DEFERRED**.

MVP: class assignment implies curriculum context via class triple.

## 57. Class / academic context

Denormalize on attempt: `parishId`, `academicYearId`, `catechismLevelId`, `classId` from class snapshot at start.

## 58. Historical stability

Published version immutable. Attempt pins version ID. Assignment pins `examVersionId`. Question versions pinned per attempt question.

## 59. Table candidates

| Table | Verdict |
|-------|---------|
| `exams` | **REQUIRED** |
| `exam_versions` | **REQUIRED** |
| `exam_version_questions` | **REQUIRED** |
| `exam_assignments` | **REQUIRED** |
| `exam_attempts` | **REQUIRED** |
| `exam_attempt_questions` | **REQUIRED** |
| `exam_attempt_answers` | **REQUIRED** |
| `exam_answer_revisions` | **DEFERRED** |
| `exam_results` (separate) | **REJECTED** — result columns on `exam_attempts` |

## 60. Final table ownership plan

All above REQUIRED tables owned by `ExamModule`. No shared tables with Practice.

## 61. Cross-module FK policy

- **No ORM relations** to QuestionBank, Localization, Curriculum entities
- Scalar UUIDs: `questionVersionId`, `translationRevisionId`, `enrollmentId`, `classId`, `studentId`
- **SQL FK allowed** within exam-owned tables
- `enrollmentId` / `classId`: FK optional — prefer scalar + validation via EnrollmentService/ClassService (match Practice)

## 62. Module dependency graph

```
ExamModule
  → QuestionBankModule (export QuestionBankService)
  → LocalizationModule (export LocalizationService, LocaleResolutionService)
  → EnrollmentModule (export EnrollmentService)
  → ClassModule (export ClassService)
  → StudentModule (export StudentAccessService / StudentService)
  → AccessControlModule
  → AuthModule

Forbidden:
  Exam → Practice
  Practice → Exam
  LearningProgress → Exam repositories (public ExamService only)
  Localization → Exam repositories (public ExamService for adapter only)
```

## 63. Microservice extraction

Exam cohesive: authoring, assignment, attempt, grading orchestration in one service boundary. Snapshots + scalar IDs enable future split.

## 64. Security / minors

- No parent exam-taking
- No staff impersonation
- No cross-parish IDOR
- No class-wide parent result views
- Server-side deadline and scoring
- No answer content in logs

## 65. Offline / mobile

- Start online (creates server attempt)
- Idempotent answer saves
- Local cache allowed; server wins on conflict
- Submit requires online (MVP)
- Reconnect after expiry: GET triggers finalize + returns `GRADED`

## 66. Resume / server-time contract

`GET exam-attempts/:id` returns:

- `serverTime` (UTC ISO)
- `startedAt`, `deadlineAt`
- `status`, `attemptNumber`, `maxAttempts`
- `questions[]` with pinned localization
- `answers[]` (selected options only)
- `examTitle`, `instructions` (delivered locale)

## 67. Concurrency strategy

- Pessimistic row lock on attempt for answer save + submit + expiry finalize
- Unique indexes for idempotency keys
- Serializable transaction for attempt start (one active attempt)

## 68. Abandon policy

**REJECTED** — no learner abandon. Leaving exam consumes attempt slot; auto-submit on expiry/close.

## 69. Void / manual correction

Admin void/regrade — **DEFERRED** post-MVP.

## 70. Exam statistics

MVP class summary (staff): `attemptsStarted`, `attemptsGraded`, `averageScorePercent` — optional in #006. No per-question analytics engine.

## 71. FE admin contract

Draft CRUD, question ordering, publish/clone, assign to class, list attempts/results, configure review policy — routes under `/api/v1/parishes/:parishId/exams/*` (exact paths in #003).

## 72. FE learner contract

List available assignments, start/resume attempt, save answer, submit, view result when policy allows, `serverTime`/`deadlineAt`, locale metadata.

## 73. Mobile contract

Idempotent start/save, resume, pinned localization, server deadline, safe reconnect — mirrors Practice mobile patterns without per-question feedback.

## 74. Error model

Domain errors (HTTP mapped in `exam-http.util.ts`):

`ExamNotFound`, `ExamVersionNotFound`, `ExamVersionNotDraft`, `ExamVersionNotPublished`, `ExamAssignmentNotFound`, `ExamAssignmentNotOpen`, `ExamAssignmentClosed`, `ExamAttemptLimitReached`, `ExamAttemptAlreadyActive`, `ExamAttemptNotFound`, `ExamAttemptNotInProgress`, `ExamAttemptExpired`, `ExamAnswerInvalid`, `ExamSubmitConflict`, `ExamAccessDenied`, `ExamReviewNotAvailable`, `ExamIdempotencyConflict`.

## 75. Logging / privacy

Log attempt ID, status transitions, assignment ID. **Never** log answer payloads, correct answers, or question text.

## 76. Timezone

DB UTC. `opensAt`/`closesAt`/`deadlineAt` UTC. FE formats with user locale/timezone.

## 77. Demo / Postman plan (#007)

Demonstrate: draft → publish → assign → learner start (vi-VN + en-US pin) → save/resume → submit → grade → result reveal → second attempt if allowed → parent read result → staff class summary → RBAC denials.

## 78. Test strategy

| Layer | Focus |
|-------|-------|
| Unit | Lifecycle, deadline math, review policy mapper, idempotency |
| Integration | Start, save, submit, grade, expiry lazy finalize |
| DB e2e | RBAC matrix, parent denied attempt, leakage |
| Concurrency | Double start, double submit, save vs expiry |

Fake clock for deadline tests.

## 79. Risks / open questions

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R-001 | Very young learners cannot take formal exam without parent | LOW | Product uses Practice for formative; exams for older levels |
| R-002 | Exam metadata translation lags content | MEDIUM | Source fallback + admin sync workflow |
| R-003 | Lazy expiry depends on traffic | LOW | Acceptable MVP; optional cron post-MVP |

## 80. BLOCKER / HIGH / MEDIUM / LOW

| Severity | Count | Items |
|----------|-------|-------|
| BLOCKER | 0 | — |
| HIGH | 0 | — |
| MEDIUM | 1 | R-002 metadata translation workflow (addressed in §18) |
| LOW | 2 | R-001, R-003 |

## 81. Files created

- `docs/EXAM_001_DOMAIN_AUDIT_AND_FORMAL_ASSESSMENT_DESIGN_REPORT.md`

## 82. Files modified

None (audit-only per prompt).

## 83. Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## 84. Validation

Audit-only — no production code changes. Validation run on unchanged tree (see §84 execution note below).

## 85. Out-of-scope (#001)

Entities, migrations, controllers, services, permissions, seeds, Postman, Docker changes, dependencies.

## 86. Final prompt count

**7 prompts** (confirmed):

| # | Scope |
|---|--------|
| 001 | Domain audit + design (this report) |
| 002 | Schema + entities + migrations + module shell |
| 003 | Exam authoring + publish + assignment APIs |
| 004 | Attempt generation + snapshots + localized delivery GET |
| 005 | Answer save + submit + grade + time/attempt controls |
| 006 | Results/review + Learning Progress hook + contract hardening |
| 007 | Final audit + demo seed + Postman + quality/Docker |

## 87. EXAM #002 readiness

**READY: YES**

- No BLOCKER/HIGH
- Parent policy decided (DENIED)
- Table model and module boundary defined
- Practice/Localization/QB integration paths clear

**Next:** `EXAM_002` — persistence + `ExamModule` shell + migrations for tables in §59.

## 88. Commit recommendation

Audit-only — **no commit recommended** per prompt workflow.

---

## Final summary

| Topic | Decision |
|-------|----------|
| Exam vs Practice | Separate summative bounded context |
| Parent attempts | **DENIED** |
| Versioning | Root + immutable published versions |
| Assignment | Class-level windowed assignment |
| Attempt time | `deadlineAt = min(start+duration, closesAt)` |
| Answers | Upsert until submit; idempotent saves |
| Localization | Pin QB revision + optional ExamVersion adapter |
| Prompt count | **7** |
| #002 ready | **YES** |
