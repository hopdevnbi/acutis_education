# PRACTICE ENGINE #005 — Progress Statistics + Contract Hardening Report

**Phase:** PRACTICE ENGINE / QUIZ DELIVERY FOUNDATION #005 / 6  
**Date:** 2026-09-01  
**Status:** IMPLEMENTATION COMPLETE — VALIDATION PASS  
**Prompt:** PRACTICE_ENGINE_005_PROGRESS_STATISTICS_CONTRACT_HARDENING (Prompt base path)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Aggregate table required | **NO** |
| Derived SQL aggregation sufficient | **PASS** |
| Enrollment progress API | **PASS** |
| Class progress API | **PASS** |
| Scoped access (enrollment) | **PASS** |
| Scoped access (class — parent denied) | **PASS** |
| STANDARD vs REVIEW_WRONG separation | **PASS** |
| No answer leakage in progress DTOs | **PASS** |
| No Question Bank calls in aggregation | **PASS** |
| Module boundary compliant | **PASS** |
| quality:full (pristine DB) | **PASS** |
| Docker production build | **PASS** (`catechism-api:practice-progress`) |
| FE PRACTICE CONTRACT READY | **YES** |
| MOBILE PRACTICE CONTRACT READY | **YES** |
| PRACTICE #006 readiness | **READY: YES** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**Recommendation:** Proceed to **PRACTICE ENGINE #006/6** when explicitly prompted.

---

## 1. Objective

Add derived practice progress/statistics APIs with scoped access and stable response contracts for frontend and mobile consumers. No aggregate tables; SQL aggregation from owned practice tables only.

## 2. State inherited from #004 / #004A

- Answer submission, grading, retry, review-wrong session create implemented (#004)
- #004A validation gate **ACCEPTED** (`quality:full`, integration 33/33, DB e2e 21/21, Docker)
- Uncommitted #004A stabilization fixes retained in working tree (answer idempotency, UUID normalization, seed isolation)

## 3. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, modular boundaries
- Cross-module via public exports only (`EnrollmentService`, `ClassService`, `ParishScopeService`, etc.)
- `PracticeModule` exports **`PracticeService` only**
- No Question Bank dependency in progress aggregation
- No answer/correct-option/explanation fields in progress responses

## 4. Environment audit

| Item | Value |
|------|-------|
| OS | Windows 10 (win32 10.0.18362) |
| Node | v22.23.1 |
| npm | 11.16.0 |
| MSSQL Docker | `catechism-mssql` healthy on `localhost:14330` (WSL) |
| Validation date | 2026-09-01 |

## 5. New HTTP routes (#005)

| Method | Path | Permission | Behavior |
|--------|------|------------|----------|
| GET | `/api/v1/enrollments/:enrollmentId/practice/progress` | `practice.read` | Enrollment-scoped derived metrics |
| GET | `/api/v1/classes/:classId/practice/progress` | `practice.read` | Class summary + paginated learner rows |

Query filters (both routes): `curriculumId`, `canonicalLessonKey`, `from`, `to` (session `startedAt` window).  
Class route additionally: `page`, `limit` (default 1/20, max 100).

## 6. Files created

| Path | Purpose |
|------|---------|
| `src/modules/practice/constants/practice-progress.constants.ts` | Pagination defaults/max |
| `src/modules/practice/interfaces/practice-progress.interface.ts` | Domain read models |
| `src/modules/practice/utils/practice-progress-accuracy.util.ts` | Ratio helper (0 when denominator 0) |
| `src/modules/practice/utils/practice-progress-accuracy.util.spec.ts` | Unit tests |
| `src/modules/practice/dto/practice-progress-query.dto.ts` | Query validation |
| `src/modules/practice/dto/practice-progress-response.dto.ts` | Swagger + response mappers |
| `src/modules/practice/services/practice-progress.service.ts` | SQL aggregation service |
| `test/integration/practice-progress.integration-spec.ts` | MSSQL integration (3 tests) |

## 7. Files modified

| Path | Change |
|------|--------|
| `src/modules/practice/controllers/practice.controller.ts` | Two GET progress endpoints |
| `src/modules/practice/services/practice.service.ts` | Facade: `getEnrollmentProgress`, `getClassProgress` |
| `src/modules/practice/services/practice-access.service.ts` | Enrollment + class progress scopes |
| `src/modules/practice/services/practice-access.service.spec.ts` | Progress access unit coverage |
| `src/modules/practice/errors/practice.errors.ts` | Progress validation + class denied errors |
| `src/modules/practice/utils/practice-http.util.ts` | HTTP mapping for new errors |
| `src/modules/practice/practice.module.ts` | Register `PracticeProgressService` |
| `test/practice.db.e2e-spec.ts` | Progress e2e cases (parent, unlinked, class roles) |

## 8. Also in working tree (#004A validation fixes, not #005 scope)

| Path | Fix |
|------|-----|
| `src/modules/practice/services/practice-answer.service.ts` | Idempotent replay on COMPLETED session; UUID normalization |
| `src/modules/practice/services/practice-session-query.service.ts` | UUID normalization in `latestAttempt` |
| Multiple `test/integration/*` + `test/auth-rbac-dev.db.e2e-spec.ts` | Seed/FK isolation for full suite order |

## 9. Aggregation design

- **No aggregate table** — metrics computed at read time from `practice_sessions`, `practice_session_questions`, `practice_answer_attempts`
- **STANDARD** and **REVIEW_WRONG** session types reported separately
- **First attempt** = `ROW_NUMBER() ... ORDER BY attempt_number ASC`
- **Final attempt** = `ROW_NUMBER() ... ORDER BY attempt_number DESC`
- **questionsAttempted** = distinct session questions with ≥1 attempt (retries not double-counted)
- **Accuracy denominators** (STANDARD): total questions in COMPLETED standard sessions (per #001 design)
- **lastPracticedAt**: `MAX(submitted_at)` over attempts in filtered scope
- Class **summary** aggregates entire class (not pagination-limited); learner list paginated via enrollment roster

## 10. Enrollment progress response shape

```json
{
  "enrollmentId": "uuid",
  "filters": { "curriculumId", "canonicalLessonKey", "from", "to" },
  "standard": {
    "sessionsCompleted", "inProgressSessions", "abandonedSessions",
    "questionsAttempted", "firstAttemptCorrect", "finalCorrect",
    "firstAttemptAccuracy", "finalAccuracy"
  },
  "review": {
    "sessionsCompleted", "questionsAttempted", "finalCorrect",
    "finalAccuracy", "uniqueQuestionVersionsReviewed"
  },
  "lastPracticedAt": "ISO-8601 | null"
}
```

## 11. Class progress response shape

```json
{
  "classId": "uuid",
  "filters": { ... },
  "summary": {
    "learnersWithPractice", "sessionsCompleted", "questionsAttempted",
    "firstAttemptCorrect", "finalCorrect",
    "firstAttemptAccuracy", "finalAccuracy", "lastPracticedAt"
  },
  "learners": {
    "items": [{ "enrollmentId", "studentId", "sessionsCompleted", "questionsAttempted",
                "firstAttemptAccuracy", "finalAccuracy", "lastPracticedAt" }],
    "page", "limit", "total", "totalPages"
  }
}
```

## 12. Access model — enrollment progress

| Actor | Allowed |
|-------|---------|
| Super Admin | Yes |
| Linked parent/guardian | Yes |
| Parish Admin (active parish membership) | Yes |
| Assigned catechist (enrollment class) | Yes |
| Unlinked parent | No (403) |
| Permission alone (no relationship) | No |

## 13. Access model — class progress

| Actor | Allowed |
|-------|---------|
| Super Admin | Yes |
| Parish Admin (class parish) | Yes |
| Assigned catechist | Yes |
| Parent (even linked) | No — `PracticeClassProgressAccessDeniedError` (403) |

## 14. Error model (new)

| Error | HTTP |
|-------|------|
| `PracticeAccessDeniedError` | 403 (enrollment progress) |
| `PracticeClassProgressAccessDeniedError` | 403 (class progress) |
| `PracticeProgressInvalidDateRangeError` | 400 (`from` > `to`) |
| `PracticeProgressCanonicalLessonRequiresCurriculumError` | 400 (lesson filter without curriculum) |

## 15. Privacy / leakage controls

- Progress DTOs expose counts and ratios only
- No `selectedOptionIds`, `correctOptionIds`, `explanation`, prompts, or option text
- DB e2e asserts JSON body does not contain leakage field names

## 16. SQL implementation notes

- Raw `DataSource.query` with typed `queryRows<T>()` boundary (ESLint-safe)
- Parameterized `@n` placeholders for MSSQL
- Optional filters via `(@k IS NULL OR column = @k)` pattern
- `IN (@i, @j, ...)` built via `buildInClausePlaceholders`

## 17. Bug fixed during validation

**SQL parameter index mismatch:** `queryStandardMetrics`, `queryReviewMetrics`, and `queryClassLearnerMetrics` used `baseIndex = 5` while only two leading parameters (`session_type`, `status`) precede enrollment IDs. Corrected to `baseIndex = 2`. Symptom: `Incorrect syntax near ','` on MSSQL.

## 18. ESLint fix

`queryRows<T>()` private helper centralizes `unknown` → `T[]` cast from `dataSource.query` return type, eliminating `@typescript-eslint/no-unsafe-*` violations across aggregation methods.

## 19. Unit tests

| Suite | Tests |
|-------|-------|
| `practice-progress-accuracy.util.spec.ts` | 3 |
| `practice-access.service.spec.ts` (updated) | progress scope cases |

**Total unit:** 93 suites, **513** tests — **PASS**

## 20. DB-free e2e

2 suites, 5 tests — **PASS**

## 21. Integration tests

`practice-progress.integration-spec.ts` — **3/3 PASS**

| Test | Assertion |
|------|-----------|
| Zero metrics | No activity → all zeros, `lastPracticedAt` null |
| Retry no double-count | 1 question, wrong then correct → `questionsAttempted = 1`, accuracies 0/1 |
| Review separate | Review session IN_PROGRESS → review counts 0, standard completed |

**Total integration:** 34 suites, **208** tests — **PASS**

## 22. DB e2e tests (practice progress)

| Test | Assertion |
|------|-----------|
| Linked parent enrollment progress | 200, metrics, no leakage |
| Unlinked parent enrollment | 403 |
| Parent class progress | 403 |
| Catechist + parish admin class | 200 |

**Total DB e2e:** 21 suites, **109** tests — **PASS**

## 23. quality:full

**PASS** — format, lint, typecheck, unit, db-free e2e, migrations, integration, pristine reset, DB e2e.

## 24. Docker production build

```bash
docker build --target production -t catechism-api:practice-progress .
```

**PASS**

## 25. Module boundary

- `PracticeProgressService` internal to Practice module
- `PracticeService` facade only public export
- No cross-module entity/repository imports
- Enrollment/class data via snapshot IDs and list APIs

## 26. Out of scope (honored)

- Aggregate/materialized progress tables
- Student self-service role
- Parent class roster progress
- Question Bank calls during aggregation
- Leaderboards, badges, spiritual analytics framing
- PRACTICE #006 features (export, notifications, etc.)

## 27. FE contract readiness

**YES** — Stable JSON field names, Swagger DTOs, ISO-8601 dates, ratio accuracies 0–1, explicit filter echo in response, pagination metadata on class learners.

## 28. Mobile contract readiness

**YES** — Same REST contract; no streaming; no client-side auth decisions; 403/400 error codes documented.

## 29. Aggregate table decision

**NO** — Current session/attempt volume supports on-read SQL aggregation. Revisit only if profiling shows read latency issues at scale.

## 30. PRACTICE #006 readiness

**READY: YES** — Progress foundation complete; #006 may add adjacent features per next prompt without schema prerequisite.

## 31. Risks

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Heavy class-wide SQL on large rosters | MEDIUM | Pagination on learners; summary query single pass; monitor in production |
| R2 | Filter param `canonicalLessonKey` typed as UUID in DTO | LOW | Matches existing practice session column type |
| R3 | #004A fixes uncommitted alongside #005 | LOW | Separate commits recommended when user requests |

No BLOCKER/HIGH.

## 32–65. Audit trail

32. Prompt: `PRACTICE_ENGINE_005_PROGRESS_STATISTICS_CONTRACT_HARDENING.txt`.  
33. Facade delegates: `PracticeService` → `PracticeProgressService`.  
34. Filters normalized in `normalizeFilters()` with date-order validation.  
35. `canonicalLessonKey` filter requires `curriculumId`.  
36. Class summary uses `queryClassSummaryMetrics` (whole class, active enrollments).  
37. Learner rows join enrollment roster page with per-enrollment metrics map.  
38. `calculatePracticeAccuracy(0, 0)` returns 0.  
39. Review `questionsAttempted` counts completed review session questions.  
40. Review in-progress sessions excluded from review completed counts.  
41. Standard in-progress/abandoned counted in `standard` bucket session counts.  
42. `practice.read` permission on both routes; relationship enforced in service.  
43. `PracticeClassProgressAccessDeniedError` distinct from generic access denied.  
44. `rethrowPracticeServiceError` maps 400 for progress validation errors.  
45. Swagger tags remain `practice`.  
46. English naming throughout.  
47. Prettier canonical formatting applied.  
48. ESLint clean after `queryRows` helper.  
49. TypeScript strict — no `@ts-ignore`.  
50. No `forwardRef()` introduced.  
51. Integration spec uses demo seeds (auth, parish, class, curriculum, QB).  
52. `afterEach` deletes practice sessions for test enrollment.  
53. Integration uses `QuestionType.SingleChoice` for deterministic grading.  
54. DB e2e uses seeded parent/catechist/parish-admin tokens.  
55. UUID normalization via `normalizeUuid` in learner metrics map.  
56. Constants: default page 1, limit 20, max 100.  
57. No new migrations (#005).  
58. No new owned tables (#005).  
59. Question version uniqueness metric for review only.  
60. Session filter date applies to `practice_sessions.started_at`.  
61. Curriculum filter matches `practice_sessions.curriculum_id`.  
62. Class route uses `EnrollmentStatus.Active` roster.  
63. Catechist assignment checked via `ClassCatechistAssignmentService`.  
64. Suggested commit when requested: `feat(practice): add scoped progress statistics`.  
65. **Do not auto-proceed to #006** unless explicitly prompted.

---

## Suggested git commits (when user requests)

1. `fix(practice): stabilize answer review validation` — #004A fixes  
2. `feat(practice): add scoped progress statistics` — #005 scope
