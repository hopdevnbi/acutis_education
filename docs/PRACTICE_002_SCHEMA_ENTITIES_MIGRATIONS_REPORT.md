# PRACTICE ENGINE #002 — Schema + Entities + Migrations Report

**Phase:** PRACTICE ENGINE / QUIZ DELIVERY FOUNDATION #002 / 6  
**Date:** 2026-08-31  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** PRACTICE_ENGINE_002 (persistence-only schema foundation)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Schema foundation | **PASS** |
| Migration integration | **PASS** (16 tests) |
| Mobile/offline persistence readiness | **PASS** |
| Review-wrong persistence readiness | **PASS** |
| Module boundary compliant | **PASS** |
| quality:full (pristine DB) | **PASS** |
| Docker production build | **PASS** (`catechism-api:practice-schema`) |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**Recommendation:** Proceed to **PRACTICE ENGINE #003/6 — Generation + Session Lifecycle + Question Selection + Contextual Media Groundwork**.

---

## 1. Objective

Implement persistence-only Practice foundation: module skeleton, enums, entities, migration with constraints/indexes, metadata tests, and MSSQL integration tests — no HTTP API or business services.

## 2. State inherited from #001

Design decisions from `docs/PRACTICE_001_DOMAIN_AUDIT_AND_FLOW_DESIGN_REPORT.md` applied verbatim: three owned tables, `enrollmentId` learner context, session types STANDARD/REVIEW_WRONG, idempotency keys, no progress aggregate, no PracticeDefinition, no Question Bank FK, scalar curriculum reference.

## 3. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*`
- Scalar IDs only; zero TypeORM relations
- Application UUID v4; no DB UUID defaults
- `PracticeModule` exports nothing at #002
- No RBAC seeds, no business logic, no HTTP

## 4. Files created

| Path | Purpose |
|------|---------|
| `src/modules/practice/practice.module.ts` | Module skeleton (TypeORM only) |
| `src/modules/practice/enums/practice-session-type.enum.ts` | STANDARD, REVIEW_WRONG |
| `src/modules/practice/enums/practice-session-status.enum.ts` | IN_PROGRESS, COMPLETED, ABANDONED |
| `src/modules/practice/entities/practice-session.entity.ts` | Session entity |
| `src/modules/practice/entities/practice-session-question.entity.ts` | Session question entity |
| `src/modules/practice/entities/practice-answer-attempt.entity.ts` | Answer attempt entity |
| `src/database/migrations/1788063400000-create-practice-schema.ts` | MSSQL migration |
| `src/database/practice.entities.spec.ts` | Entity metadata tests |
| `src/database/practice-uuid-generation.spec.ts` | UUID v4 tests |
| `test/integration/practice-foundation.integration-spec.ts` | MSSQL constraint tests (16) |

## 5. Files modified

| Path | Change |
|------|--------|
| `src/app.module.ts` | Register `PracticeModule` |
| `src/modules/module-boundaries.spec.ts` | Assert zero exports from PracticeModule |
| `test/integration/curriculum-demo-seed.integration-spec.ts` | Fix parish cleanup FK flake (delete `parish_memberships` before parish) |

## 6. PracticeModule skeleton

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      PracticeSessionEntity,
      PracticeSessionQuestionEntity,
      PracticeAnswerAttemptEntity,
    ]),
  ],
})
export class PracticeModule {}
```

No controllers, providers, or exports. No QuestionBank/Enrollment/Curriculum imports.

## 7. Public exports

**None** — enforced by `module-boundaries.spec.ts`.

## 8. Enums

| Enum | Values |
|------|--------|
| `PracticeSessionType` | STANDARD, REVIEW_WRONG |
| `PracticeSessionStatus` | IN_PROGRESS, COMPLETED, ABANDONED |

## 9. practice_sessions entity/table

`practice_sessions` — `enrollmentId`, `sessionType`, `sourceSessionId`, `status`, `locale`, optional `curriculumId`/`canonicalLessonKey`, generation audit fields, idempotency `clientRequestId`, actor `createdByUserId`, lifecycle timestamps.

## 10. Session constraints

- `requested_question_count` 1–50
- `max_attempts_per_question` 1–10
- `session_type` enum CHECK
- `status` enum CHECK

## 11. Lifecycle timestamp constraints

| Status | Rule |
|--------|------|
| IN_PROGRESS | `completed_at` and `abandoned_at` NULL |
| COMPLETED | `completed_at` NOT NULL, `abandoned_at` NULL |
| ABANDONED | `abandoned_at` NOT NULL, `completed_at` NULL |

## 12. Review source constraint

- STANDARD → `source_session_id IS NULL`
- REVIEW_WRONG → `source_session_id IS NOT NULL`
- Self-reference denied: `source_session_id <> id`

## 13. Session idempotency

Filtered unique: `(enrollment_id, client_request_id) WHERE client_request_id IS NOT NULL`

## 14. Session indexes

- `(enrollment_id, status)`
- `(enrollment_id, created_at)`
- `(source_session_id)`
- `(curriculum_id, canonical_lesson_key)`

## 15. practice_session_questions entity/table

`practice_session_questions` — `practiceSessionId`, scalar `questionVersionId`, `position`, nullable `deliveredOptionOrderJson`, `createdAt`.

## 16. Question uniqueness/order

Unique `(practice_session_id, position)` and `(practice_session_id, question_version_id)`. CHECK `position >= 1`.

## 17. Delivered option JSON

Nullable `nvarchar(max)`; CHECK `ISJSON(...) = 1` when non-null.

## 18. No Question Bank FK

No SQL FK or ORM relation to `question_versions`. Scalar UUID reference only.

## 19. practice_answer_attempts entity/table

`practice_answer_attempts` — `practiceSessionQuestionId`, `attemptNumber`, `clientAnswerId`, `selectedOptionIdsJson`, `isCorrect`, `score`, `submittedByUserId`, `submittedAt`.

## 20. Attempt constraints

- `attempt_number >= 1`
- `score IN (0, 1)`
- `ISJSON(selected_option_ids_json) = 1`

## 21. Answer idempotency

Unique `(practice_session_question_id, client_answer_id)`.

## 22. Attempt number uniqueness

Unique `(practice_session_question_id, attempt_number)`.

## 23. Score constraint

`tinyint` column; DB CHECK restricts to 0 or 1.

## 24. Actor FKs

- `created_by_user_id` → `users` (NO ACTION)
- `submitted_by_user_id` → `users` (NO ACTION)
- `enrollment_id` → `enrollments` (NO ACTION)
- No ORM relations

## 25. UUID strategy

All PKs use `generateUuidV4()` at entity construction. No `NEWID()` / `@Generated` columns.

## 26. Zero ORM relations

All three entities: `@ManyToOne` / `@OneToMany` count = 0 (verified in metadata tests).

## 27. FK strategy

| Reference | FK |
|-----------|-----|
| enrollments | YES |
| users (actors) | YES |
| practice_sessions (source) | YES self-ref NO ACTION |
| question_versions | **NO** |
| curriculums | **NO** |

## 28. Cascade strategy

- `practice_session_questions` → CASCADE on session delete
- `practice_answer_attempts` → CASCADE on session question delete
- Cross-domain FKs: NO ACTION
- Source session delete blocked when review child exists (verified)

## 29. No progress aggregate

No `practice_progress` or denormalized progress columns on session questions.

## 30. No PracticeDefinition

Deferred per #001.

## 31. Mobile/offline persistence readiness

Schema supports: stable session/session-question IDs, `clientRequestId`, `clientAnswerId`, persisted question/option order, resumable lifecycle, immutable attempt history.

## 32. Review-wrong persistence readiness

`REVIEW_WRONG` + required `source_session_id`; lineage chain STANDARD → child → grandchild validated in integration tests.

## 33. Entity metadata tests

`practice.entities.spec.ts` — table names, columns, locale/JSON fields, zero relations.

## 34. UUID tests

`practice-uuid-generation.spec.ts` — v4 generation and explicit ID preservation for all three entities.

## 35. Migration integration tests

`practice-foundation.integration-spec.ts` — 16 MSSQL tests covering all constraints, idempotency, cascades, lineage, locale.

## 36. Locale/Unicode validation

Integration test persists `fr-FR` locale successfully.

## 37. Existing regression

No regressions to Question Bank, Enrollment/Class, Curriculum, Media, Auth. Fixed pre-existing curriculum-demo-seed parish membership cleanup flake exposed by full integration ordering.

## 38. Pristine quality:full

**ONE CLEAN PASS:**

| Suite | Result |
|-------|--------|
| Unit | 479 PASS |
| DB-free e2e | 5 PASS |
| Integration | 199 PASS |
| DB e2e | 94 PASS |

## 39. Docker

```bash
wsl bash -c "cd '/mnt/c/Users/admin/Desktop/DỰ ÁN GIÁO LÝ VIÊN/Acutis Education' && docker build --target production -t catechism-api:practice-schema ."
```

**PASS**

## 40. Microservice extraction readiness

Future Practice Service owns `practice_*` tables. Cross-module references remain scalar IDs (`questionVersionId`, `curriculumId`) — no shared ORM FK to Question Bank or Curriculum.

## 41. Commands

```
node --version          v22.23.1
npm --version           10.9.8
npm run format          PASS
npm run format:check    PASS
npm run lint            PASS
npm run typecheck       PASS
npm test                479 PASS
npm run test:e2e        5 PASS
npm run build           PASS
npm run quality:full    PASS (one clean run)
npm run migration:show  10 migrations applied
```

## 42. Validation matrix

| Gate | Result |
|------|--------|
| format | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS (479) |
| DB-free e2e | PASS |
| build | PASS |
| integration | PASS (199) |
| DB e2e | PASS (94) |
| quality:full ONE CLEAN RUN | PASS |
| Docker | PASS |
| three tables created | PASS |
| UUID no DB defaults | PASS |
| PracticeModule zero exports | PASS |
| zero ORM relations | PASS |
| enrollment FK | PASS |
| user actor FKs | PASS |
| no question_versions FK | PASS |
| no curriculum FK | PASS |
| session type checks | PASS |
| status checks | PASS |
| lifecycle timestamp checks | PASS |
| source-session constraint | PASS |
| self-source denied | PASS |
| questionCount bounds | PASS |
| maxAttempts bounds | PASS |
| session clientRequestId unique | PASS |
| position unique | PASS |
| questionVersion unique per session | PASS |
| option order JSON | PASS |
| attempt number unique | PASS |
| clientAnswerId unique | PASS |
| selected options JSON | PASS |
| score 0/1 | PASS |
| owned cascades | PASS |
| source session NO ACTION | PASS |
| no progress table | PASS |
| no PracticeDefinition | PASS |
| no HTTP API | PASS |
| no grading/business logic | PASS |
| no forwardRef | PASS |
| Git rule compliance | PASS (no add/commit/push) |

## 43. Known/deferred

- Same-enrollment validation for review source: application layer (#004)
- Full UUID-array shape validation for JSON columns: application layer (#003–#004)
- `practice.read` / `practice.manage` permissions: #003 seed

## 44. Out-of-scope

- Session generation, grading, retry behavior, progress APIs
- Question Bank selection/feedback contracts
- HTTP controllers, RBAC seeds
- Exam tables, PracticeDefinition, progress aggregate

## 45. PRACTICE #003 readiness

**Ready: YES** (no BLOCKER/HIGH)

#003 scope:

- `PracticeService` facade export
- Session generation + enrollment scope
- Question Bank batch selection contract
- Question/order randomization + option order persistence
- Session GET/resume + abandon
- Contextual media route groundwork
- No answer submission yet

## 46. Prompt count

**PRACTICE ENGINE #002/6 complete.** Approximately **4 prompts remain** (#003–#006).

## 47. Commit recommendation

```
git commit -m "feat(practice): add practice persistence foundation"
```

(Do not execute unless explicitly requested.)
