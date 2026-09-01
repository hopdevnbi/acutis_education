# PRACTICE ENGINE #003 — Generation + Session Delivery Report

**Phase:** PRACTICE ENGINE / QUIZ DELIVERY FOUNDATION #003 / 6  
**Date:** 2026-08-31  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** PRACTICE_ENGINE_003 (session generation, delivery, contextual media groundwork)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Session generation | **PASS** |
| Session delivery (GET/resume) | **PASS** |
| Abandon lifecycle | **PASS** |
| Parent/guardian scope | **PASS** |
| Idempotency (`clientRequestId` + hash) | **PASS** |
| Question Bank selection integration | **PASS** |
| Contextual media groundwork | **PASS** |
| No answer submission (#003 boundary) | **PASS** |
| Module boundary compliant | **PASS** |
| quality:full (pristine DB) | **PASS** |
| Docker production build | **PASS** (`catechism-api:practice-generation`) |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**Recommendation:** Proceed to **PRACTICE ENGINE #004/6 — Answer submission + grading + retry**.

---

## 1. Objective

Implement learner practice session generation and delivery: enrollment-scoped create, stable GET resume, abandon, Question Bank batch selection with shuffle, idempotency, RBAC seeds, contextual media route groundwork. Explicitly exclude answer POST, grading, retry logic, review-wrong create, and progress APIs.

## 2. State inherited from #002

Three owned tables, enums, migration `1788063400000`, zero business HTTP in #002. Design from #001 applied: `enrollmentId` learner context, parent/guardian + super-admin access, curriculum assignment resolution, pinned `questionVersionId`, delivered option order JSON.

## 3. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, modular boundaries
- Cross-module via public exports only (`QuestionBankService`, `EnrollmentService`, etc.)
- `PracticeModule` exports **`PracticeService` only**
- No answer attempts written in #003
- No feedback/explanation reveal in learner projections

## 4. Migration added

| Path | Purpose |
|------|---------|
| `src/database/migrations/1788063500000-add-practice-session-generation-request-hash.ts` | Adds nullable `generation_request_hash varchar(64)` on `practice_sessions` for idempotent payload mismatch detection |

## 5. Practice module (expanded)

| Path | Purpose |
|------|---------|
| `src/modules/practice/practice.module.ts` | Wires QB, Enrollment, Class, Curriculum, Media, Student, Parish, Auth, AccessControl; exports `PracticeService` |
| `src/modules/practice/controllers/practice.controller.ts` | HTTP routes |
| `src/modules/practice/services/practice.service.ts` | Facade |
| `src/modules/practice/services/practice-generation.service.ts` | Enrollment validation, curriculum assignment, QB selection, shuffle, transactional insert |
| `src/modules/practice/services/practice-session-query.service.ts` | Session snapshot + option order resolution |
| `src/modules/practice/services/practice-access.service.ts` | Parent/guardian + super-admin only |
| `src/modules/practice/services/practice-media.service.ts` | Contextual media via QB + Media |
| `src/modules/practice/dto/*` | Request/response DTOs |
| `src/modules/practice/errors/practice.errors.ts` | Typed domain errors |
| `src/modules/practice/utils/*` | HTTP mapping, shuffle, generation hash, media path |

## 6. HTTP routes (#003)

| Method | Path | Permission | Behavior |
|--------|------|------------|----------|
| POST | `/api/v1/enrollments/:enrollmentId/practice-sessions` | `practice.manage` | Create session |
| GET | `/api/v1/practice-sessions/:sessionId` | `practice.read` | Resume snapshot |
| PATCH | `/api/v1/practice-sessions/:sessionId/abandon` | `practice.manage` | Abandon in-progress |
| GET | `/api/v1/practice-sessions/:sessionId/questions/:sessionQuestionId/media/:assetId/content` | `practice.read` | Stream referenced media |

No answer/attempt routes registered.

## 7. Question Bank additions

| Path | Purpose |
|------|---------|
| `src/modules/question-bank/services/question-practice-selection.service.ts` | Batch candidate query (pool limit 500, stable sort) |
| `src/modules/question-bank/constants/question-practice-selection.constants.ts` | Pool limit (QB-owned, not Practice import) |
| `QuestionBankService.selectCurrentPublishedQuestionsForPractice` | Public selection API |
| `QuestionBankService.getLearnerQuestionProjections` | Batch learner projections |
| `QuestionBankService.learnerProjectionReferencesMediaAsset` | Media reference guard |
| `QuestionGradingService.getLearnerQuestionProjections` | Batch projection helper |

## 8. RBAC seed

Added to `auth-rbac.seed.constants.ts`:

- `practice.read`, `practice.manage`
- PARISH_ADMIN: read only
- CATECHIST: read only (relationship still denies learner session access in #003)
- PARENT: read + manage
- SUPER_ADMIN: all

## 9. Access model (#003)

- **Allowed:** linked parent/guardian, super admin
- **Denied by default:** catechist, parish admin (even with `practice.read`), unlinked parent
- Permissions alone insufficient — guardian relationship enforced server-side

## 10. Generation flow

1. Resolve enrollment + assert parent/guardian access
2. Assert enrollment/student/class ACTIVE
3. Resolve assigned published curriculum for class parish/year/level
4. Optional `curriculumId` must match assigned
5. Normalize filters (tags, types, difficulty, counts, shuffle flags)
6. Compute `generationRequestHash`; replay or conflict on `clientRequestId`
7. Select published candidates from Question Bank (curriculum-scoped)
8. Shuffle subset in Practice; persist session + session questions + option orders in one transaction
9. Return learner-safe snapshot (no answers/explanations)

## 11. Idempotency

- `clientRequestId` unique per enrollment (DB index from #002)
- `generationRequestHash` detects payload mismatch → `PracticeIdempotencyConflictError` (409)
- Abandon is idempotent on already-abandoned sessions

## 12. MSSQL selection fix

`QuestionPracticeSelectionService` `DISTINCT` + `ORDER BY question.code` required `question.code` in SELECT list for SQL Server compliance.

## 13. Demo seed adjustment

`QUESTION_BANK_DEMO_QUESTIONS`: linked multi-choice and true/false demo questions to curriculum so practice generation has sufficient curriculum-scoped pool on pristine DB.

## 14. Seed module fix

`QuestionBankDemoSeedModule` registers `QuestionPracticeSelectionService` required by `QuestionBankService`.

## 15. Module import fix

`PracticeModule` imports `ParishModule` for `ParishScopeService` used by `PracticeAccessService`.

## 16. Tests added

| Path | Coverage |
|------|----------|
| `src/modules/practice/services/practice-access.service.spec.ts` | Guardian/super-admin scope |
| `src/modules/practice/utils/practice-generation-request-hash.util.spec.ts` | Hash stability |
| `test/integration/practice-generation.integration-spec.ts` | MSSQL create, idempotency, abandon |
| `test/practice.db.e2e-spec.ts` | 401/403/201/404, idempotency, abandon, no answer route, media not referenced |

## 17. Tests updated

| Path | Change |
|------|--------|
| `src/modules/module-boundaries.spec.ts` | Practice exports `PracticeService` only |
| `src/database/practice.entities.spec.ts` | `generationRequestHash` column |
| `src/modules/question-bank/services/question-bank.service.spec.ts` | Selection service mock |
| `test/integration/question-bank-demo-seed.integration-spec.ts` | Expect 3 curriculum links |
| `test/integration/class-enrollment-seed.integration-spec.ts` | Cleanup FK order (practice/curriculum/QB) |
| `test/integration/parish-academic-seed.integration-spec.ts` | Cleanup FK order (practice/curriculum/QB) |

## 18. Integration test count

`practice-generation.integration-spec.ts`: **3** MSSQL tests.

## 19. DB e2e test count

`practice.db.e2e-spec.ts`: **8** tests.

## 20. Unit test delta

+2 spec files; total unit tests **484** (was 479).

## 21. Out of scope (honored)

- Answer POST, grading, retry, review-wrong session create
- Progress API
- STUDENT role
- Catechist/parish-admin learner session delivery
- Explanation/correct-option reveal

## 22. Error model (implemented)

| Error | HTTP |
|-------|------|
| `PracticeAccessDeniedError` | 403 |
| `PracticeSessionNotFoundError` | 404 |
| `PracticeMediaNotReferencedError` | 404 |
| `PracticeInsufficientQuestionsError` | 422 |
| `PracticeCurriculumNotAssignedError` | 422 |
| `PracticeCurriculumMismatchError` | 422 |
| `PracticeIdempotencyConflictError` | 409 |
| `PracticeCanonicalLessonInvalidError` | 422 |
| `PracticeEnrollmentNotEligibleError` | 422 |
| `PracticeInvalidGenerationInputError` | 422 |

## 23. Learner snapshot shape

Session includes questions with: `sessionQuestionId`, pinned `questionVersionId`, prompt, options with `deliveredPosition`, `attemptState` (zeros/false — no attempts yet). No grading fields.

## 24. Randomization

Question and option shuffle performed in Practice using injectable `ShuffleRandomSource` (testable). Persisted `delivered_option_order_json` on session questions.

## 25. Curriculum resolution

Always uses class assigned published curriculum; optional request `curriculumId` must match. Filters optionally by `canonicalLessonKey`, tags, types, difficulty.

## 26. Contextual media

Route validates: session access → question belongs to session → QB learner projection references asset → media asset ready → stream via `MediaAssetService`. Unreferenced asset → 404.

## 27. Entity change

`PracticeSessionEntity.generationRequestHash` nullable varchar(64).

## 28. Public exports

`PracticeModule` exports: **`PracticeService`** only. No repository or internal service exports.

## 29. Inbound dependencies

QuestionBankModule, EnrollmentModule, ClassModule, CurriculumModule, MediaModule, StudentModule, ParishModule, AuthModule, AccessControlModule.

## 30. Outbound consumers

None yet (HTTP only in #003).

## 31. Boundary compliance

No Practice imports of QB entities/repos. QB does not import Practice constants (pool limit in QB constants file).

## 32. Mobile/offline groundwork

Stable session/question IDs, `clientRequestId`, persisted option order, GET resume — supports offline-first clients; answer sync deferred to #004.

## 33. Security / minors

Server-side guardian check; no public child profiles; learner projections filtered; no pastoral data in practice records.

## 34. Git compliance

No add/commit/push unless explicitly requested.

## 35. Commands (validation)

```
node --version              v22.23.1
npm run format:check        PASS
npm run lint                PASS
npm run typecheck           PASS
npm test                    484 PASS (88 suites)
npm run test:e2e            5 PASS
npm run build               PASS
npm run test:integration    202 PASS (32 suites)
npm run test:e2e:db         102 PASS (21 suites)
npm run quality:full        PASS (one clean run)
docker build -t catechism-api:practice-generation  PASS
```

## 36. quality:full matrix

| Gate | Result |
|------|--------|
| format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS (484) |
| DB-free e2e | PASS (5) |
| build | PASS |
| integration | PASS (202) |
| DB e2e | PASS (102) |
| quality:full ONE CLEAN RUN | PASS |
| Docker | PASS |

## 37. Feature matrix

| Feature | Result |
|---------|--------|
| POST create session | PASS |
| GET session resume | PASS |
| PATCH abandon | PASS |
| Parent linked create | PASS |
| Unlinked parent 403 | PASS |
| Catechist 403 | PASS |
| Parish admin 403 | PASS |
| clientRequestId replay | PASS |
| generationRequestHash column | PASS |
| QB curriculum-scoped selection | PASS |
| Option order persistence | PASS |
| Contextual media route | PASS |
| Media not referenced 404 | PASS |
| No answer route | PASS |
| RBAC seeds | PASS |
| Module export boundary | PASS |

## 38. Known / deferred

- Full happy-path contextual media stream e2e (demo questions have no media assets; not-referenced 404 covered)
- Catechist/class-scoped practice delivery: explicitly deferred past #003
- Review-wrong session generation: #005+
- Answer submission + grading: #004

## 39. Risks

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Demo seed idempotency skips curriculum relink on existing questions | LOW | `--reset` test DB; constants updated for pristine runs |
| R2 | Integration seed cleanup ordering sensitive to demo parish data | LOW | Extended afterEach cleanup in seed integration specs |

No BLOCKER/HIGH.

## 40. PRACTICE #004 readiness

**Ready: YES**

#004 scope: answer POST, grading via Question Bank, attempt persistence, retry rules, session completion transitions.

## 41–60. Section placeholders (audit trail)

41. Prompt file: `PRACTICE_ENGINE_003_GENERATION_SESSION_DELIVERY.txt` (repo Prompt base path).  
42. Facade pattern: `PracticeService` delegates to generation/query/media/access services.  
43. Transaction boundary: session + session questions inserted atomically.  
44. `maxAttemptsPerQuestion` stored on session from constants; not enforced until #004.  
45. Locale defaults to `vi-VN` when omitted.  
46. Question count bounds: 1–50 (constants).  
47. Tag filter max count enforced in normalization.  
48. Super admin bypass via `ParishScopeService.isSuperAdmin`.  
49. Swagger tags: `practice`.  
50. DTO validation via class-validator on create request.  
51. `rethrowPracticeServiceError` maps typed errors to HTTP.  
52. Media headers reuse `buildContextualMediaContentHeaders`.  
53. `PracticeSessionQueryService.findExistingSessionByClientRequestId` for idempotent replay.  
54. Archived published versions remain readable via pinned `questionVersionId`.  
55. No `forwardRef()` introduced.  
56. English source naming throughout.  
57. Prettier canonical formatting applied.  
58. ESLint clean (including shuffle util fix).  
59. Suggested commit when requested: `feat(practice): add session generation and delivery`.  
60. **Do not auto-proceed to #004** unless explicitly prompted.

---

## Files created (summary)

Practice services, controller, DTOs, errors, utils, migration, integration spec, db e2e spec, access/hash unit specs.

## Files modified (summary)

`app.module.ts` (already had PracticeModule), `practice.module.ts`, `practice-session.entity.ts`, `auth-rbac.seed.constants.ts`, Question Bank service/module/selection, demo seed constants/module, module-boundaries spec, practice entity spec, question-bank service spec, seed integration cleanups, question-bank-demo integration expectation.
