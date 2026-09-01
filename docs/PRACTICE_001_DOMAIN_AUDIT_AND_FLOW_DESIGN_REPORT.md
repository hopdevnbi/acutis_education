# PRACTICE ENGINE #001 — Domain Audit and Flow Design Report

**Phase:** PRACTICE ENGINE / QUIZ DELIVERY FOUNDATION #001 / 6  
**Date:** 2026-08-31  
**Status:** AUDIT / DESIGN COMPLETE  
**Prompt:** PRACTICE_ENGINE_001 (domain audit + session/attempt/scoring/review/progress design)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| PRACTICE DOMAIN DESIGN READY | **YES** |
| SESSION MODEL READY | **YES** |
| ANSWER/GRADING FLOW READY | **YES** |
| RETRY/REVIEW-WRONG MODEL READY | **YES** |
| PROGRESS MODEL READY | **YES** |
| PARENT/LEARNER SCOPE READY | **YES** |
| QUESTION BANK INTEGRATION MODEL READY | **YES** |
| MOBILE/OFFLINE FOUNDATION READY | **YES** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**Recommendation:** Proceed to **PRACTICE ENGINE #002/6 — Schema + Entities + Migrations + Module Boundaries** (persistence-only; no HTTP API).

---

## 1 Objective

Design a future-safe Practice Engine bounded context for formative learner quiz delivery: session generation, immutable question snapshots, answer attempts, server-side grading via Question Bank, retry/review-wrong, progress metrics, scoped Parent/Catechist access, mobile/offline idempotency, and strict separation from Exam — **without implementing production code**.

## 2 State inherited from Question Bank

| Completed artifact | Practice relevance |
|--------------------|-------------------|
| Immutable PUBLISHED/ARCHIVED versions | Session pins exact `questionVersionId`; grading works on archived versions |
| `getLearnerQuestionProjection` | Delivery DTO — no answers/explanation/option code |
| `gradeAnswer({ questionVersionId, selectedOptionIds })` | Server-side 0/1 scoring; exact-set MULTIPLE_CHOICE |
| `getImmutableAssessmentSnapshot` | Exam-oriented; Practice uses projection + feedback contract instead |
| `getCurrentPublishedQuestionForSelection` | Single-question lookup; insufficient for batch selection |
| Admin search/filter (#007) | Parish-scoped filters (tag, curriculum, difficulty, type) — basis for generation query in #003 |
| Curriculum links on root | `curriculumId` + `canonicalLessonKey` for generation filters |
| CATECHIST read-only on Question Bank admin | Practice uses enrollment scope, not `questions.read` for learners |
| No generic learner Question Bank HTTP | Practice owns learner routes |

Question Bank phase: **COMPLETE** (quality:full PASS, Docker PASS, BLOCKER/HIGH = 0).

## 3 Existing Practice/Quiz code audit

**Result: greenfield.**

- Grep across `src/` finds **zero** `practice`, `Practice`, or quiz-delivery modules
- No practice tables, migrations, permissions, or tests
- Safe to introduce `PracticeModule` without schema conflicts
- Exam module also absent (by design)

## 4 Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*`
- Modular monolith: `PracticeModule` owns practice persistence; consumes Question Bank via `QuestionBankService` only
- Minors privacy: progress attributed to `enrollmentId`; no public child profiles; no answer leakage in delivery GET
- English for codes, enums, APIs, schema; Unicode for learner-visible strings
- Audit-only: **no production source or schema modified**

## 5 Bounded context

**Decision: `PracticeModule`** (single cohesive bounded context for formative quiz delivery).

Practice owns:

- Practice sessions and lifecycle
- Session question references (immutable `questionVersionId` + order)
- Delivered option order per session question
- Answer attempt history
- Retry/review state
- Progress query (derived from raw data initially)

Practice does **not** own:

- Question content, options, correct answers (`QuestionBankModule`)
- Curriculum structure (`CurriculumModule`)
- Media storage (`MediaModule`)
- Exam attempts (`ExamModule` — future, separate)

## 6 Practice vs Exam boundary

| Dimension | Practice (formative) | Exam (formal — future) |
|-----------|---------------------|------------------------|
| Purpose | Learn, retry, review wrong | High-stakes assessment |
| Question selection | Flexible generation filters | Fixed snapshot at exam publish |
| Retry | Allowed per policy | Typically single attempt |
| Feedback timing | Immediate `isCorrect`; explanation after attempt/completion | Often delayed until close |
| Progress | Tracked per enrollment | Exam score/report separate |
| Tables | `practice_*` only | `exam_*` only (future) |
| Grading | `QuestionBankService.gradeAnswer` | Same contract, different snapshot source |

**Never reuse Practice attempt tables for Exam.**

## 7 PracticeDefinition decision

**Decision: defer `PracticeDefinition` / teacher-authored templates for MVP.**

Rationale:

- Product requirement is "generate bài luyện" with filters, not reusable template library
- Simpler schema and API surface for #002–#004
- Templates can be added later as optional `practiceDefinitionId` on session without breaking MVP

MVP creates **generated learner sessions directly** from generation inputs.

## 8 Session definition

A **PracticeSession** is created once per generation request (or review-wrong flow):

- Bound to exactly one **active `enrollmentId`** (learner context)
- Contains an immutable ordered list of **`questionVersionId`s** (pinned at creation)
- Stores generation parameters for audit (`curriculumId`, `canonicalLessonKey`, filters, counts, randomization flags)
- Stores **`locale`** for delivery (from enrollment/class parish default or explicit request)
- Resumable while `IN_PROGRESS`
- Completes when all session questions reach a **final answered state** (see retry policy)

## 9 Session lifecycle

```
                    ┌─────────────┐
     generate ──────►│ IN_PROGRESS │◄──── resume
                    └──────┬──────┘
                           │ all questions final-answered
                           ▼
                    ┌─────────────┐
                    │  COMPLETED  │
                    └──────┬──────┘
                           │ optional review-wrong
                           ▼
              new REVIEW_WRONG session (IN_PROGRESS → COMPLETED)

     abandon (soft) ──► ABANDONED (read-only historical)
```

- **IN_PROGRESS:** delivery + answer submission allowed
- **COMPLETED:** read-only; can spawn REVIEW_WRONG child session
- **ABANDONED:** soft terminal; no new answers; retained for audit

No hard delete of sessions in MVP.

## 10 Session type

| Type | Purpose |
|------|---------|
| `STANDARD` | Normal generated practice from Question Bank selection |
| `REVIEW_WRONG` | Child session from completed STANDARD; only wrong questions from source |

`sourceSessionId` nullable; required for `REVIEW_WRONG`.

## 11 Learner identity

**Decision: `enrollmentId` is the learner context for every practice session.**

An enrollment uniquely ties:

- `studentId` → child learner record
- `classId` → parish, academic year, catechism level
- Active enrollment status gate

Progress, authorization, and curriculum assignment resolution all flow from enrollment → class triple.

## 12 enrollmentId decision

Why not `studentId` alone:

- Practice is always in class/academic-year context
- Curriculum assignment is per `(parishId, academicYearId, catechismLevelId)` from class
- Parent/Catechist scope already implemented via enrollment/class paths
- Future STUDENT login maps user → student → enrollment(s)

API entry: `POST /api/v1/enrollments/:enrollmentId/practice-sessions`

## 13 Actor vs learner

| Field | Meaning |
|-------|---------|
| `enrollmentId` on session | **Learner** whose progress is recorded |
| `createdByUserId` | User who started the session (Parent proxy allowed) |
| `submittedByUserId` on attempt | User who submitted the answer |

Progress metrics attribute to **enrollment**, not actor.

## 14 Parent proxy policy

**Decision: allow linked Parent to start, read, and submit practice on behalf of child for MVP.**

Rationale:

- No dedicated STUDENT role/login yet
- `StudentGuardianService` / `EnrollmentAccessService.canReadStudent` already supports parent evidence
- Matches curriculum delivery pattern (parent reads enrollment content)

Constraints:

- Parent must pass `assertCanReadEnrollment(userId, classId, studentId)` (or guardian link equivalent)
- Actor always recorded separately from learner enrollment
- No impersonation by Catechist or Parish Admin by default

## 15 Catechist role

**Decision: Catechist read-only on practice progress; cannot submit learner answers.**

| Action | Catechist |
|--------|-----------|
| Start session for learner | **Denied** |
| Submit answers | **Denied** |
| Read session delivery | **Denied** (unless future teacher-assigned mode) |
| Read progress for assigned class enrollments | **Allowed** |

Scope via `ClassCatechistAssignmentService.listAssignedClassIds` → enrollments in those classes.

Teacher-assigned practice templates deferred post-MVP.

## 16 Generation inputs

```typescript
interface CreatePracticeSessionInput {
  readonly enrollmentId: string;
  readonly clientRequestId?: string; // idempotency
  readonly locale?: string; // default: question sourceLocale or parish default
  readonly curriculumId?: string;
  readonly canonicalLessonKey?: string;
  readonly tagIds?: readonly string[];
  readonly tagCodes?: readonly string[];
  readonly questionTypes?: readonly QuestionType[];
  readonly difficulty?: QuestionDifficulty;
  readonly questionCount: number;
  readonly randomizeQuestions?: boolean; // default true
  readonly randomizeOptions?: boolean; // default true
  readonly createdByUserId: string;
}
```

Bounds: `questionCount` min 1, max e.g. 50 (constant in #002); tag/link array caps aligned with import limits.

## 17 Generation scope

All selected questions must satisfy:

- Same **parish** as enrollment's class
- Root **ACTIVE**
- **Current PUBLISHED** version only (`currentPublishedVersionId` → PUBLISHED status)
- MVP types only: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE`
- Matching optional filters (curriculum link, tag, difficulty, type)
- No duplicate `questionVersionId` within one session

Never select DRAFT or stale version pointers.

## 18 Curriculum-aware generation

1. Resolve enrollment → class → `(parishId, academicYearId, catechismLevelId)`
2. Resolve assigned curriculum via `CurriculumService.getPublishedVersionForAssignment(...)` (same as curriculum delivery)
3. If `curriculumId` supplied: must match assigned curriculum (or be omitted to use assigned)
4. If `canonicalLessonKey` supplied: validate belongs to assigned curriculum lineage via `CurriculumService.assertCanonicalLessonKeyBelongsToCurriculum`
5. Question candidates filtered via `question_curriculum_links` metadata on Question Bank roots

Question Bank links are root-level; selection resolves **current published version** per matching root.

## 19 Question selection contract

**Gap (implement in Question Bank #003 or Practice #003):**

Add narrow public method on `QuestionBankService`:

```typescript
selectCurrentPublishedQuestionsForPractice(input: {
  parishId: string;
  questionCount: number;
  curriculumId?: string;
  canonicalLessonKey?: string;
  tagIds?: string[];
  tagCodes?: string[];
  questionTypes?: QuestionType[];
  difficulty?: QuestionDifficulty;
  excludeQuestionVersionIds?: string[];
}): Promise<readonly PublishedQuestionSelectionSnapshot[]>;
```

Implementation uses existing list/filter query internals — **not** admin HTTP list endpoint. Returns exact `questionVersionId`s for pinning.

If candidates < `questionCount`: throw `PRACTICE_INSUFFICIENT_QUESTIONS` (422).

## 20 Exact version snapshot

At session creation (single transaction):

1. Select N published version IDs
2. Insert `practice_sessions` row
3. Insert N `practice_session_questions` rows with `position`, `questionVersionId`
4. If `randomizeOptions`: compute and persist `deliveredOptionOrderJson` per question from learner projection option IDs

**Never re-query** `currentPublishedVersionId` for an existing session question.

If a pinned version later becomes ARCHIVED: session remains deliverable and gradable (Question Bank already supports ARCHIVED grading).

## 21 Question ordering

- Persist `position` (1..N) on `practice_session_questions`
- If `randomizeQuestions`: Fisher-Yates shuffle once at creation; persist order
- Reload always returns same order — no re-shuffle on GET

## 22 Option ordering

- If `randomizeOptions`: shuffle option IDs once per session question at creation
- Persist as JSON array of UUIDs in `deliveredOptionOrderJson`
- Delivery GET applies order when mapping learner projection options
- Correctness still by option UUID via `gradeAnswer` — order irrelevant to grading

## 23 Session question model

**Table: `practice_session_questions`**

| Column | Purpose |
|--------|---------|
| `id` | PK UUID v4 |
| `practiceSessionId` | FK → practice_sessions |
| `questionVersionId` | Immutable pin |
| `position` | 1..N order in session |
| `deliveredOptionOrderJson` | nullable; JSON array of option UUIDs |
| `createdAt` | audit |

Optional denormalized `latestCorrect` / `attemptCount` deferred — derive from attempts unless performance requires (#005 revisit).

Unique: `(practiceSessionId, position)`, `(practiceSessionId, questionVersionId)`.

## 24 Answer attempt model

**Table: `practice_answer_attempts`**

| Column | Purpose |
|--------|---------|
| `id` | PK UUID v4 |
| `practiceSessionQuestionId` | FK → practice_session_questions |
| `attemptNumber` | 1..maxAttemptsPerQuestion |
| `clientAnswerId` | UUID v4 client idempotency key |
| `selectedOptionIdsJson` | JSON array of option UUIDs |
| `isCorrect` | from Question Bank |
| `score` | 0 or 1 |
| `submittedByUserId` | actor |
| `submittedAt` | timestamp |

**Full history retained** — no overwrite of latest only.

## 25 Answer payload

MVP payload (objective types only):

```json
{ "selectedOptionIds": ["uuid", "..."] }
```

Validated:

- Non-empty for MULTIPLE_CHOICE
- Exactly one for SINGLE_CHOICE / TRUE_FALSE
- No duplicates
- All IDs belong to session question's version (via delivered projection option set)

No free-text or numeric answers in MVP.

## 26 Grading boundary

**Practice never reads `question_correct_options` or Question Bank repositories.**

Flow:

1. Practice validates attempt payload and session state
2. Calls `QuestionBankService.gradeAnswer({ questionVersionId, selectedOptionIds })`
3. Persists `isCorrect`, `score` on attempt row
4. Returns immediate feedback `{ isCorrect, score }` to client — **not** correct option IDs

## 27 Immediate feedback

**Decision: return `isCorrect` and `score` (0|1) on every successful answer submission.**

Rationale: formative practice; mobile UX expects instant feedback.

Do **not** return `correctOptionIds` in answer response.

## 28 Explanation reveal

**Decision: explanation revealed only when question reaches final answered state** (see retry policy) **or** session is COMPLETED.

Delivery mechanism:

- Practice-owned DTO field on session GET after reveal condition met
- Sourced via new **`getPracticeFeedback(questionVersionId)`** on Question Bank (service-only)

Not included in initial learner projection or answer POST response until reveal gate passes.

## 29 Correct-answer reveal

**Decision: correct option IDs revealed only after final attempt on question OR session COMPLETED** — same gate as explanation.

Use `getPracticeFeedback` returning `{ explanation, explanationMediaJson, correctOptionIds }`.

Never expose via generic Question Bank HTTP.

## 30 Retry policy

**Decision (MVP defaults stored on session row):**

| Setting | Default |
|---------|---------|
| `maxAttemptsPerQuestion` | **3** |
| Retry after wrong | **Allowed** until max attempts or correct |
| Final answered state | Correct **OR** attemptNumber reached maxAttemptsPerQuestion |

After final wrong attempt: question locked; explanation/correct answers may reveal per §28–29.

Constants in `practice-session.constants.ts`; not a configurable policy engine.

## 31 Review-wrong design

From **COMPLETED** `STANDARD` session:

1. Identify session questions where **final attempt was incorrect** (or never correct)
2. If none: `PRACTICE_NO_WRONG_QUESTIONS`
3. Create new `REVIEW_WRONG` session with `sourceSessionId` set
4. Copy exact wrong `questionVersionId`s (same order or re-shuffle per flags — **default preserve relative order, no re-randomize**)
5. Fresh attempt history (attemptNumber resets per new session)

Original STANDARD session remains immutable COMPLETED.

## 32 Review session relationship

```
STANDARD session (COMPLETED)
    └── REVIEW_WRONG session (IN_PROGRESS → COMPLETED)
            └── optional chained REVIEW_WRONG (from new wrong set)
```

`sourceSessionId` FK nullable on `practice_sessions`.

Review sessions do **not** call Question Bank selection — only reuse pinned version IDs from wrong set.

## 33 Completion

**Auto-complete** when every session question has reached final answered state:

- `status` → `COMPLETED`
- `completedAt` → now
- Unlock full explanation/correct-answer reveal on GET (if not already per-question)

No separate complete endpoint required if auto-completion is reliable in answer submission transaction.

## 34 Resume/abandon

- **Resume:** GET session returns full state for `IN_PROGRESS` (metadata, questions in order, attempts, canRetry flags)
- **Abandon:** optional `PATCH .../abandon` or implicit timeout deferred; MVP supports explicit abandon setting `ABANDONED` — no answer submission after

Abandoned sessions retained for audit; excluded from active progress denominators.

## 35 Answer idempotency

**Decision: require `clientAnswerId` (UUID v4) on every answer POST.**

Unique index: `(practiceSessionQuestionId, clientAnswerId)`

Duplicate POST with same `clientAnswerId`: return **existing attempt result** (200/201 same body) — no second attempt row.

## 36 Generation idempotency

**Decision: optional but recommended `clientRequestId` on session create.**

Unique index: `(enrollmentId, clientRequestId)` where `clientRequestId IS NOT NULL`

Duplicate create with same id: return existing session snapshot.

Mobile offline queue friendly.

## 37 Concurrency

- Answer submission: pessimistic lock on `practice_session_questions` row (or session row) while assigning `attemptNumber`
- Session generation: single transaction for session + all session questions + option orders
- Idempotency unique indexes as final guard → map to 409 `PRACTICE_DUPLICATE_ANSWER` or return existing

## 38 Scoring

| Metric | Definition |
|--------|------------|
| Per-attempt score | 0 or 1 from Question Bank |
| Per-question final | Latest attempt's `isCorrect` after final state |
| Session final score | Count of questions with final `isCorrect` / total questions |
| firstAttemptCorrectCount | Questions where attemptNumber=1 was correct |
| finalCorrectCount | Questions final correct at completion |

No partial credit. No weighted difficulty in MVP.

## 39 First-attempt accuracy

```
firstAttemptAccuracy = firstAttemptCorrectCount / totalQuestions
```

Report label: **"First-attempt accuracy"** — not "mastery".

## 40 Final accuracy

```
finalAccuracy = finalCorrectCount / totalQuestions
```

At session completion; uses final per-question outcome after retries.

## 41 Progress architecture

**Decision: raw sessions + session questions + attempts are source of truth.**

Initial progress API **derives** aggregates via SQL queries — no `practice_progress` aggregate table in MVP (#002).

Derived metrics per enrollment (and optional lesson breakdown):

- `sessionsCompleted` (STANDARD only)
- `reviewSessionsCompleted`
- `questionsAttempted`
- `firstAttemptCorrect` / `finalCorrect`
- `firstAttemptAccuracy` / `finalAccuracy`
- `wrongReviewedCount`
- `lastPracticedAt`

## 42 Aggregate-table decision

**Defer aggregate table** until #005 profiling shows need.

If added later: `practice_enrollment_progress` keyed by `(enrollmentId, curriculumId, canonicalLessonKey)` — updated on session COMPLETED event.

## 43 Progress API

```
GET /api/v1/enrollments/:enrollmentId/practice/progress
```

Query params optional: `curriculumId`, `canonicalLessonKey`, date range.

Authorization:

- Parent/guardian: linked enrollment
- Catechist: assigned class
- Parish admin: parish scope
- Super admin: all

Response: derived metrics only — no answer leakage.

## 44 Review progress semantics

- `sessionsCompleted` counts **STANDARD** COMPLETED only
- `reviewSessionsCompleted` counts **REVIEW_WRONG** COMPLETED separately
- Review sessions do not inflate standard completion rate

## 45 Question-level progress decision

**Defer per-question enrollment aggregate** (e.g. "question X mastered") until product requires spaced repetition.

Derive "times wrong / times seen" from attempt history if needed for analytics UI later.

## 46 Security scopes

Authorization is **enrollment-scoped relationship first**, permission second:

| Capability | Gate |
|------------|------|
| Create/read/submit session | `EnrollmentAccessService` + active enrollment |
| Read progress | Enrollment read OR catechist assigned class OR parish admin |
| Admin impersonation | Denied by default |

Permissions (seed in #003):

- `practice.read` — progress + session read for scoped enrollments
- `practice.manage` — start session, submit answers (Parent proxy)
- No `practice.publish` (no publish workflow)

Catechist: `practice.read` only.

Parent: `practice.read` + `practice.manage` for linked child enrollments.

Parish admin: both for parish enrollments (optional read-only manage for support — default deny manage unless product requires).

## 47 Parent scope

Reuse:

- `StudentGuardianService.assertGuardianLinked`
- `EnrollmentAccessService.assertCanReadEnrollment`

Practice service validates enrollment active + student active before session ops.

## 48 Catechist scope

- `ClassCatechistAssignmentService.listAssignedClassIds(userId)`
- Filter enrollments / progress to those class IDs only
- No session start/submit

## 49 Parish admin scope

- `ParishScopeService.assertCanReadParishAsAdmin` for progress reads
- Session management for support: defer unless explicit product need

## 50 Future student scope

When STUDENT role exists:

- `practice.read` + `practice.manage` on own enrollments only
- Map `userId` → `studentId` → active `enrollmentId`(s)
- Same session model — no schema change

## 51 Session API

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/v1/enrollments/:enrollmentId/practice-sessions` | Generate STANDARD session |
| GET | `/api/v1/practice-sessions/:sessionId` | Resume delivery state |
| PATCH | `/api/v1/practice-sessions/:sessionId/abandon` | Soft abandon (optional MVP) |

GET response includes learner-safe projections, option order, attempt summaries, `canRetry`, reveal flags — no premature correct answers.

## 52 Answer API

```
POST /api/v1/practice-sessions/:sessionId/questions/:sessionQuestionId/answers
Body: { clientAnswerId, selectedOptionIds[] }
Response: { attemptId, attemptNumber, isCorrect, score, questionFinalized, sessionCompleted }
```

Reject if session not IN_PROGRESS, question finalized, or invalid options.

## 53 Review API

```
POST /api/v1/practice-sessions/:sessionId/review-wrong
Response: new REVIEW_WRONG session summary (id, questionCount)
```

Requires source session COMPLETED + STANDARD type.

## 54 Progress API

See §43.

## 55 Contextual media design

Mirror curriculum delivery pattern:

```
GET /api/v1/practice-sessions/:sessionId/questions/:sessionQuestionId/media/:assetId/content
```

Flow:

1. Validate actor enrollment access to session
2. Validate `sessionQuestionId` belongs to session
3. Validate `assetId` referenced in that question's learner projection / media JSON
4. Stream via `MediaAssetService` (same as class/enrollment lesson media)

## 56 Media security

- No generic learner `GET /media/assets/:id/content` for Parent/child
- Contextual route only
- No signed URL persistence in Practice tables
- `assetId` validated against pinned version projection at request time

## 57 QuestionBank feedback contract gap

**New service-only method (implement #003 or early #004):**

```typescript
getPracticeFeedback(questionVersionId: string): Promise<{
  explanation: string | null;
  explanationMediaJson: string | null;
  correctOptionIds: readonly string[];
}>;
```

- Allowed for PUBLISHED and ARCHIVED versions
- Not exposed on Question Bank HTTP
- Practice controls when to include in session GET

## 58 QuestionBank selection contract gap

**New method:** `selectCurrentPublishedQuestionsForPractice` (see §19).

Admin `listQuestionsByParish` is not suitable for learner generation (pagination, wrong consumer, no sampling).

## 59 Enrollment/Curriculum contract gaps

| Need | Status |
|------|--------|
| `EnrollmentService.getEnrollmentById` | **Exists** |
| `EnrollmentAccessService.assertCanReadEnrollment` | **Exists** |
| `CurriculumService.getPublishedVersionForAssignment` | **Exists** (curriculum delivery uses) |
| `CurriculumService.assertCanonicalLessonKeyBelongsToCurriculum` | **Exists** |
| Resolve class triple from enrollment | **Exists** via ClassService |

No Curriculum schema changes required.

## 60 Multilingual readiness

- Store `session.locale` at creation (BCP 47-like, e.g. `vi-VN`)
- Delivery uses Question Bank source content for MVP (no runtime translation)
- Future: `translationRevisionId` per session question when localization module exists
- Progress APIs locale-agnostic (counts/ratios)
- Unicode throughout (`nvarchar`)

## 61 Offline/mobile readiness

| Requirement | Design support |
|-------------|----------------|
| Stable session IDs | UUID v4 at create |
| Persisted question/option order | `position`, `deliveredOptionOrderJson` |
| Resume | GET session full state |
| Idempotent answer submit | `clientAnswerId` unique |
| Idempotent session create | `clientRequestId` unique per enrollment |
| Retry-safe | Duplicate id returns same result |

## 62 Observability

Log (info): `sessionId`, `enrollmentId`, `sessionQuestionId`, `questionVersionId`, `attemptNumber`, `actorUserId`, `action`

Do **not** log: full prompts, selected answers, correct option IDs, student names.

## 63 practice_sessions candidate

```sql
practice_sessions (
  id UNIQUEIDENTIFIER PK,
  enrollment_id UNIQUEIDENTIFIER NOT NULL FK → enrollments,
  session_type VARCHAR(32) NOT NULL, -- STANDARD | REVIEW_WRONG
  source_session_id UNIQUEIDENTIFIER NULL FK → practice_sessions,
  status VARCHAR(32) NOT NULL, -- IN_PROGRESS | COMPLETED | ABANDONED
  locale VARCHAR(32) NOT NULL,
  curriculum_id UNIQUEIDENTIFIER NULL,
  canonical_lesson_key UNIQUEIDENTIFIER NULL,
  requested_question_count INT NOT NULL,
  max_attempts_per_question INT NOT NULL DEFAULT 3,
  randomize_questions BIT NOT NULL,
  randomize_options BIT NOT NULL,
  client_request_id UNIQUEIDENTIFIER NULL,
  created_by_user_id UNIQUEIDENTIFIER NOT NULL FK → users,
  started_at DATETIME2 NOT NULL,
  completed_at DATETIME2 NULL,
  abandoned_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL,
  updated_at DATETIME2 NOT NULL,
  UQ (enrollment_id, client_request_id) WHERE client_request_id IS NOT NULL
)
```

## 64 practice_session_questions candidate

```sql
practice_session_questions (
  id UNIQUEIDENTIFIER PK,
  practice_session_id UNIQUEIDENTIFIER NOT NULL FK → practice_sessions ON DELETE CASCADE,
  question_version_id UNIQUEIDENTIFIER NOT NULL,
  position INT NOT NULL,
  delivered_option_order_json NVARCHAR(MAX) NULL,
  created_at DATETIME2 NOT NULL,
  UQ (practice_session_id, position),
  UQ (practice_session_id, question_version_id)
)
```

No FK to `question_versions` (cross-module reference by ID only — Question Bank owns table).

## 65 practice_answer_attempts candidate

```sql
practice_answer_attempts (
  id UNIQUEIDENTIFIER PK,
  practice_session_question_id UNIQUEIDENTIFIER NOT NULL FK → practice_session_questions ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  client_answer_id UNIQUEIDENTIFIER NOT NULL,
  selected_option_ids_json NVARCHAR(MAX) NOT NULL,
  is_correct BIT NOT NULL,
  score TINYINT NOT NULL, -- 0 or 1
  submitted_by_user_id UNIQUEIDENTIFIER NOT NULL FK → users,
  submitted_at DATETIME2 NOT NULL,
  UQ (practice_session_question_id, client_answer_id),
  UQ (practice_session_question_id, attempt_number)
)
```

## 66 progress schema decision

**No progress tables in #002.**

Derive in #005; add aggregate only if proven necessary.

## 67 FK strategy

| FK | Policy |
|----|--------|
| `enrollment_id` → enrollments | YES — learner context |
| `created_by_user_id`, `submitted_by_user_id` → users | YES |
| `source_session_id` → practice_sessions | YES — same module |
| `question_version_id` | **No FK** to Question Bank — ID reference only |
| `curriculum_id` | **No FK** — ID reference; validate at generation |

ON DELETE CASCADE: session questions + attempts when session deleted (admin cleanup only — no user delete in MVP).

## 68 indexes/uniqueness

- `practice_sessions(enrollment_id, status)` — list active sessions
- `practice_sessions(enrollment_id, created_at DESC)` — progress queries
- `practice_session_questions(practice_session_id)`
- `practice_answer_attempts(practice_session_question_id)`
- Idempotency uniques as above

## 69 dependency graph

```
PracticeModule
  → QuestionBankModule (QuestionBankService)
  → EnrollmentModule (EnrollmentService, EnrollmentAccessService)
  → ClassModule (ClassService, ClassScopeService, ClassCatechistAssignmentService)
  → CurriculumModule (CurriculumService) — assignment + lesson key validation
  → MediaModule (MediaAssetService) — contextual media stream
  → AuthModule / AccessControlModule

Future ExamModule ──► QuestionBankModule (not PracticeModule)

Forbidden:
  QuestionBank → Practice
  Practice → QuestionBank entities/repos
  forwardRef / cycles
```

Mirror **`CurriculumDeliveryModule`** pattern: application/delivery layer consuming domain public APIs.

## 70 public exports

**#002 skeleton:** export **`PracticeService`** only (name TBD — `PracticeService` or `PracticeSessionService` as facade).

Internal: `PracticeGenerationService`, `PracticeAnswerService`, `PracticeProgressService` — not exported.

Update `module-boundaries.spec.ts` in #002.

## 71 permissions/RBAC

| Permission | PARISH_ADMIN | CATECHIST | PARENT | SUPER_ADMIN |
|------------|--------------|-----------|--------|-------------|
| `practice.read` | ✓ parish | ✓ assigned class progress | ✓ linked child | ✓ |
| `practice.manage` | ✓ parish (optional) | ✗ | ✓ linked child | ✓ |

No `practice.publish`. No STUDENT role in MVP.

Relationship checks always applied — permissions alone insufficient.

## 72 error model

| Error | HTTP | When |
|-------|------|------|
| `PRACTICE_INSUFFICIENT_QUESTIONS` | 422 | Not enough candidates |
| `PRACTICE_SESSION_NOT_FOUND` | 404 | |
| `PRACTICE_SESSION_COMPLETED` | 409 | Submit on completed |
| `PRACTICE_SESSION_ABANDONED` | 409 | Submit on abandoned |
| `PRACTICE_QUESTION_NOT_FOUND` | 404 | Bad sessionQuestionId |
| `PRACTICE_RETRY_NOT_ALLOWED` | 409 | Finalized question |
| `PRACTICE_DUPLICATE_ANSWER` | 409 | Conflict without idempotency key reuse path |
| `PRACTICE_INVALID_OPTION` | 400 | Bad option IDs |
| `PRACTICE_NO_WRONG_QUESTIONS` | 422 | Review-wrong with none |
| `PRACTICE_ACCESS_DENIED` | 403 | Scope failure |

Typed errors in `practice.errors.ts`; map via `practice-http.util.ts`.

## 73 transactions

| Operation | Transaction boundary |
|-----------|---------------------|
| Create session | Session + all session questions + option orders |
| Submit answer | Lock question row; insert attempt; maybe complete session |
| Review-wrong create | New session + questions in one transaction |
| Progress read | Read-only |

## 74 microservice extraction

Future **Practice Service** owns `practice_*` tables.

Consumes HTTP/gRPC:

- Question Bank: projection, grade, feedback, selection
- Enrollment/Class: scope validation
- Curriculum: assignment resolution
- Media: asset read

No shared ORM with Question Bank.

## 75 risks/open questions

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Parent proxy vs authentic learner submission | LOW | Record `submittedByUserId`; revisit when STUDENT login |
| R2 | `maxAttemptsPerQuestion=3` may not match all parishes | LOW | Constant on session; configurable later |
| R3 | Selection performance at scale | MEDIUM | Index question roots; limit questionCount max 50 |
| R4 | No aggregate progress table | LOW | Derive first; measure in #005 |
| R5 | Teacher-assigned practice | LOW | Deferred |
| R6 | Cross-parish enrollment edge cases | LOW | Enrollment implies single class parish |

No BLOCKER or HIGH items.

## 76 files created

| Path | Purpose |
|------|---------|
| `docs/PRACTICE_001_DOMAIN_AUDIT_AND_FLOW_DESIGN_REPORT.md` | This report |

## 77 files modified

**None.** Audit-only prompt — no production source changes.

## 78 commands

```bash
npm run format:check   # PASS (no source changes)
npm run lint           # PASS
npm run typecheck      # PASS
npm test               # PASS
npm run test:e2e       # PASS
npm run build          # PASS
```

No DB migration or `quality:full` required for audit-only work.

## 79 validation

| Gate | Result |
|------|--------|
| format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS |
| DB-free e2e | PASS |
| build | PASS |
| Git working tree (production src) | Unchanged |

## 80 out-of-scope

- Schema, entities, migrations (#002)
- HTTP API (#003–#005)
- Exam module
- STUDENT role
- Translation tables / runtime MT
- AI question generation
- Teacher practice templates
- Partial credit / mastery scoring
- Frontend/mobile code

## 81 PRACTICE #002 readiness

**Ready: YES** (no BLOCKER/HIGH)

#002 scope (persistence-only):

- `PracticeModule` skeleton
- Enums + entities for three tables
- Migration with constraints/indexes
- UUID + idempotency unique indexes
- `module-boundaries.spec.ts` update
- Entity metadata tests
- **No** HTTP, generation, grading, or progress logic

## 82 prompt count

**PRACTICE ENGINE #001/6 complete.** Approximately **5 prompts remain** (#002–#006).

## 83 commit recommendation

**None.** Audit-only prompt with no tracked production source changes.

---

## Final summary

| Topic | Decision |
|-------|----------|
| Module | `PracticeModule` |
| Learner context | `enrollmentId` |
| Actor tracking | `createdByUserId`, `submittedByUserId` |
| Parent MVP | Can start/read/submit for linked child |
| Catechist | Progress read only |
| Session types | STANDARD, REVIEW_WRONG |
| Version pinning | Exact `questionVersionId` at create |
| Retry | max 3 attempts per question; immediate isCorrect |
| Review wrong | New child session from wrong questions |
| Progress | Derived from attempts; no aggregate table MVP |
| Grading | `QuestionBankService.gradeAnswer` only |
| Feedback gap | Add `getPracticeFeedback` (service-only) |
| Selection gap | Add `selectCurrentPublishedQuestionsForPractice` |
| Media | Contextual session-scoped stream route |
| Exam | Separate future module — never share tables |
