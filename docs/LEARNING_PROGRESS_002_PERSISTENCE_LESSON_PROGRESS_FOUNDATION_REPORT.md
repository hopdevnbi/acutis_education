# LEARNING PROGRESS #002 — Persistence + Lesson Progress Foundation Report

**Phase:** LEARNING PROGRESS #002 / 4  
**Date:** 2026-09-01  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** `LEARNING_PROGRESS_002_PERSISTENCE_LESSON_PROGRESS_FOUNDATION.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Schema foundation | **PASS** |
| Transition model | **PASS** |
| Lesson versioning snapshot | **PASS** |
| Module boundary compliant | **PASS** |
| quality:full (pristine DB, one clean run) | **PASS** |
| Docker production build | **PASS** (`catechism-api:learning-progress-foundation`) |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**#003 readiness:** **READY: YES** — proceed to **LEARNING PROGRESS #003/4 — Aggregation APIs + Scoped Access + Practice Composition + Lesson Progress HTTP**

---

## 1. Objective

Implement Learning Progress persistence foundation: module skeleton, `lesson_progress` table, entity, migration, internal services (lesson progress + access), monotonic transition engine, concurrency safety, and tests — **no HTTP controller**, no Practice composition, no aggregate APIs.

## 2. State inherited from #001

Applied verbatim from `docs/LEARNING_PROGRESS_001_DOMAIN_AUDIT_AND_MODEL_DESIGN_REPORT.md`:

- `enrollmentId` as learner aggregate root
- Learning Progress owns `lesson_progress` only
- Practice remains source of truth for practice metrics (composition deferred to #003)
- Hybrid model: missing row = `NOT_STARTED`; persisted rows = `IN_PROGRESS` | `COMPLETED`
- Explicit lesson writes only (no passive GET tracking)
- Monotonic transitions; no reopen/reset in MVP
- Parent-only learner-action writes (no super-admin impersonation)
- Curriculum context derived server-side from enrollment → class → assignment
- Persistence required now; 4-prompt plan unchanged

## 3. Product-policy decisions locked

| Policy | #002 implementation |
|--------|---------------------|
| Explicit tracking | `setLessonProgress` only; no CurriculumDelivery side effects |
| Monotonic states | `NOT_STARTED → IN_PROGRESS → COMPLETED` via pure transition util |
| Idempotent same-state | IN_PROGRESS→IN_PROGRESS, COMPLETED→COMPLETED preserve timestamps/actors |
| No reset | `NOT_STARTED` not a write target; no row delete-on-reset |
| Active enrollment writes | `EnrollmentStatus.Active` required for writes |
| Parent actor | `LearningProgressAccessService` → linked parent via `StudentAccessService` |
| No catechist/admin writes | Access service denies non-parent actors at write time |
| Version snapshot | `assignedCurriculumVersionId` set on first write, never overwritten |
| Carry-forward | Same `(enrollmentId, curriculumId, canonicalLessonKey)` survives republish |
| New enrollment | Fresh namespace; no cross-enrollment copy |

## 4. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*`
- Modular monolith boundaries: cross-module via public services only
- Scalar UUID FKs; zero TypeORM relations on `LessonProgressEntity`
- Application UUID v4 generation; no DB UUID defaults
- TypeScript strict; explicit return types
- No git add/commit/push

## 5. Files created

| Path | Purpose |
|------|---------|
| `src/modules/learning-progress/learning-progress.module.ts` | Module; exports facade only |
| `src/modules/learning-progress/enums/lesson-progress-status.enum.ts` | Public + persisted status enums |
| `src/modules/learning-progress/errors/learning-progress.errors.ts` | Domain errors |
| `src/modules/learning-progress/interfaces/lesson-progress.interface.ts` | Snapshots and service inputs |
| `src/modules/learning-progress/entities/lesson-progress.entity.ts` | TypeORM entity |
| `src/modules/learning-progress/utils/lesson-progress-transition.util.ts` | Pure transition engine |
| `src/modules/learning-progress/utils/lesson-progress-transition.util.spec.ts` | Transition unit tests |
| `src/modules/learning-progress/services/lesson-progress.service.ts` | Core persistence logic |
| `src/modules/learning-progress/services/lesson-progress.service.spec.ts` | Service unit tests |
| `src/modules/learning-progress/services/learning-progress-access.service.ts` | Parent write authorization |
| `src/modules/learning-progress/services/learning-progress-access.service.spec.ts` | Access unit tests |
| `src/modules/learning-progress/services/learning-progress.service.ts` | Public facade |
| `src/database/migrations/1788063600000-create-lesson-progress-schema.ts` | MSSQL migration |
| `src/database/learning-progress.entities.spec.ts` | Entity metadata tests |
| `src/database/learning-progress-uuid-generation.spec.ts` | UUID v4 tests |
| `test/integration/learning-progress-foundation.integration-spec.ts` | Schema/FK/unique constraint tests |
| `test/integration/learning-progress-lesson.integration-spec.ts` | End-to-end service flow with demo seeds |

## 6. Files modified

| Path | Change |
|------|--------|
| `src/app.module.ts` | Register `LearningProgressModule` |
| `src/modules/module-boundaries.spec.ts` | Assert `LearningProgressService` only export |
| `src/modules/curriculum/services/curriculum.service.ts` | Add `assertCanonicalLessonKeyBelongsToVersion()` public API |

## 7. LearningProgressModule

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([LessonProgressEntity]),
    EnrollmentModule,
    ClassModule,
    CurriculumModule,
    StudentModule,
  ],
  providers: [LearningProgressService, LessonProgressService, LearningProgressAccessService],
  exports: [LearningProgressService],
})
export class LearningProgressModule {}
```

No controllers. No `PracticeModule` import. No `forwardRef`.

## 8. Public export

**`LearningProgressService` only** — enforced by `module-boundaries.spec.ts`.

Internal (not exported): `LessonProgressService`, `LearningProgressAccessService`, `LessonProgressEntity`, repositories.

## 9. Dependency graph

```
LearningProgressModule
  → EnrollmentModule (EnrollmentService)
  → ClassModule (ClassService)
  → CurriculumModule (CurriculumService.assertCanonicalLessonKeyBelongsToVersion, getPublishedVersionForAssignment)
  → StudentModule (StudentAccessService via LearningProgressAccessService)
```

No inbound dependencies from other modules yet. No cycles.

## 10. Data ownership

| Table | Owner |
|-------|-------|
| `lesson_progress` | `learning-progress` |

Not owned: enrollments, curriculum structures, practice sessions, aggregate snapshots, events.

## 11. LessonProgressStatus

| Value | Persisted? | Meaning |
|-------|------------|---------|
| `NOT_STARTED` | No | Derived when no row exists |
| `IN_PROGRESS` | Yes | Learner started lesson |
| `COMPLETED` | Yes | Learner completed lesson |

`LessonProgressPersistedStatus` enum limits DB values to `IN_PROGRESS` | `COMPLETED`.  
`LessonProgressTargetStatus` type = write targets only (`InProgress` | `Completed`).

## 12. NOT_STARTED persistence decision

**Missing row = NOT_STARTED.** No persisted NOT_STARTED rows. DB CHECK constraint allows only `IN_PROGRESS` and `COMPLETED`. Public snapshots expose `NOT_STARTED` from service layer when `findOne` returns null.

## 13. lesson_progress schema

Columns: `id`, `enrollment_id`, `curriculum_id`, `canonical_lesson_key`, `assigned_curriculum_version_id`, `status`, `started_at`, `started_by_user_id`, `completed_at`, `completed_by_user_id`, `created_at`, `updated_at`.

## 14. Actor attribution decision

- `started_by_user_id` NOT NULL — set once on first write (IN_PROGRESS or direct COMPLETED)
- `completed_by_user_id` NULL until completion; set on first COMPLETED transition
- Idempotent COMPLETED replay does not replace `completed_by_user_id` or `completed_at`
- Actor is the authenticated user performing the write (parent today); not inferred as learner student record

## 15. Enrollment FK

`enrollment_id → enrollments.id` — SQL FK, `ON DELETE NO ACTION`. No ORM relation.

## 16. Curriculum FK decision

**No SQL FK** to curriculum-owned tables. `curriculum_id`, `assigned_curriculum_version_id`, and `canonical_lesson_key` stored as scalar UUIDs. Validated via `CurriculumService` at application layer.

## 17. Unique identity

Unique index: `(enrollment_id, curriculum_id, canonical_lesson_key)` — one progress row per enrollment lesson identity within curriculum family.

## 18. assignedCurriculumVersion snapshot

Captured from `getPublishedVersionForAssignment()` at **first write**. Never updated on subsequent writes or curriculum republish. Preserves audit: "first interaction under version X".

## 19. Carry-forward policy

Progress keyed by `(enrollmentId, curriculumId, canonicalLessonKey)` carries across published version bumps sharing the same canonical lesson key within one enrollment. New enrollment (new academic year / transfer) starts with no rows (NOT_STARTED everywhere).

## 20. New enrollment policy

No automatic progress copy across enrollments. Each `enrollmentId` is an independent progress namespace.

## 21. Timestamps

- `started_at`: set once on first write; immutable thereafter
- `completed_at`: set on first COMPLETED transition; immutable on idempotent replay
- `created_at` / `updated_at`: TypeORM audit columns

## 22. DB constraints

- `CK_lesson_progress_status`: status IN (`IN_PROGRESS`, `COMPLETED`)
- `CK_lesson_progress_status_timestamps`: IN_PROGRESS ⇒ completed fields NULL; COMPLETED ⇒ completed fields NOT NULL
- FK: `enrollment_id`, `started_by_user_id`, `completed_by_user_id` → respective tables

## 23. Indexes

- `UQ_lesson_progress_enrollment_id_curriculum_id_canonical_lesson_key` (unique)
- `IX_lesson_progress_enrollment_id_status`
- `IX_lesson_progress_enrollment_id_curriculum_id`
- `IX_lesson_progress_enrollment_id_updated_at`

## 24. UUID strategy

Application-generated RFC UUID v4 via `generateUuidV4()` on entity instantiation. No database UUID defaults (verified in integration test). Snapshots normalize UUIDs to lowercase via `normalizeUuid()` for consistent API output across MSSQL driver casing.

## 25. Zero ORM relations

`LessonProgressEntity` uses scalar `@Column` UUIDs only. No `@ManyToOne` / `@JoinColumn`.

## 26. Snapshot/interface

`LessonProgressSnapshot`: `{ id, enrollmentId, curriculumId, canonicalLessonKey, assignedCurriculumVersionId, status, startedAt, completedAt }` — no PII, no learner names, no spiritual framing fields.

## 27. LessonProgressService

Public application methods (via facade):

- `getLessonProgress({ enrollmentId, canonicalLessonKey })`
- `setLessonProgress({ enrollmentId, canonicalLessonKey, targetStatus, actorUserId })`
- `listEnrollmentLessonProgress({ enrollmentId, curriculumId? })`

Write path: validate target → assert enrollment ACTIVE → assert parent access → resolve curriculum context → transaction with pessimistic lock → insert or transition.

## 28. Curriculum validation

Server derives `curriculumId` and `assignedCurriculumVersionId` from enrollment → class → published assignment. Client cannot supply/trust curriculum identifiers on write.

## 29. canonicalLessonKey validation

New public method on `CurriculumService`:

```typescript
assertCanonicalLessonKeyBelongsToVersion(versionId, canonicalLessonKey)
```

Counts lessons in assigned version tree; throws `CanonicalLessonKeyNotInCurriculumError` (mapped to `LearningProgressCanonicalLessonInvalidError`).

## 30. Enrollment ACTIVE rule

`setLessonProgress` throws `LearningProgressEnrollmentNotWritableError` when enrollment status ≠ `ACTIVE`. Read (`getLessonProgress`) allowed regardless (for future aggregate reads on historical enrollments).

## 31. LearningProgressAccessService

Internal service delegating to `StudentAccessService.canReadStudentByStudentEvidence()`. Write authorization = linked parent/guardian evidence for the enrolled student.

## 32. Parent write policy

**Linked parent only** for learner-action writes. Aligns with Practice learner-action security model. Super-admin does **not** bypass write checks.

## 33. Catechist/Admin write policy

No catechist, parish admin, or super-admin lesson completion writes in #002. Read scopes deferred to #003 HTTP layer.

## 34. Permission code decision

`learning-progress.read` / `learning-progress.manage` **deferred to #003** when HTTP routes and RBAC seeds are bundled with controller + OpenAPI. #002 uses relationship-based parent check only.

## 35. Transition engine

Pure function `assertLessonProgressTransition(currentStatus, targetStatus)` in `lesson-progress-transition.util.ts`. Denies backward transitions and any regression to NOT_STARTED (type system excludes NOT_STARTED as target).

## 36. Idempotency

Same-state transitions return existing snapshot without mutating timestamps or actor fields. Verified in unit and integration tests.

## 37. Concurrency/race handling

First-write race: transaction + pessimistic write lock + unique constraint catch (`2627`/`2601`) → reload row and re-apply transition. Integration test confirms single row after concurrent-style replay.

## 38. Transaction boundary

All writes wrapped in `dataSource.transaction()`. Lock acquired via `findOne({ lock: { mode: 'pessimistic_write' } })`.

## 39. Missing row = NOT_STARTED

`getLessonProgress` returns synthetic snapshot with `id: null`, `status: NOT_STARTED`, null timestamps when no persisted row.

## 40. List persisted rows

`listEnrollmentLessonProgress` returns only persisted rows for enrollment (optional `curriculumId` filter). Does not synthesize NOT_STARTED entries for untouched lessons (aggregate tree merge deferred to #003).

## 41. Passive GET no-tracking audit

No changes to `curriculum-delivery` module. No hooks on curriculum tree/content GET. Confirmed: delivery routes remain read-only with zero progress side effects.

## 42. No block/topic progress

Only lesson-level `canonicalLessonKey` granularity. No topic or content-block progress tables or APIs.

## 43. No Practice composition yet

No `PracticeModule` import. No aggregate metrics, no `lastPracticedAt` merge, no enrollment/class summary endpoints.

## 44. Security/minors

- Server-side authorization on every write
- Least privilege: parent linked to student only
- No cross-student progress exposure in services
- No PII in progress snapshots
- No framing of progress as spiritual worth

## 45. Multilingual readiness

Progress rows store no locale-specific content. Lesson identity is UUID `canonicalLessonKey`; content locale remains in curriculum/learning-content modules.

## 46. Microservice extraction

Module owns `lesson_progress` table exclusively. Depends on other modules only through exported services and scalar IDs. No shared entities across boundaries. Future extraction: move table + `LearningProgressService` with stable snapshot contracts.

## 47. Unit tests

| Suite | Coverage |
|-------|----------|
| `lesson-progress-transition.util.spec.ts` | All allowed/denied transitions |
| `lesson-progress.service.spec.ts` | Context resolution, insert, idempotent COMPLETED |
| `learning-progress-access.service.spec.ts` | Parent allow / non-parent deny |
| `learning-progress.entities.spec.ts` | Entity metadata |
| `learning-progress-uuid-generation.spec.ts` | UUID v4 assignment |

## 48. Integration tests

| Suite | Coverage |
|-------|----------|
| `learning-progress-foundation.integration-spec.ts` | Table exists, no DB UUID default, FK set, unique + CHECK constraints |
| `learning-progress-lesson.integration-spec.ts` | NOT_STARTED read, IN_PROGRESS→COMPLETED flow, direct COMPLETED, inactive enrollment deny (demo seeds) |

## 49. DB e2e/migration tests

Migration `CreateLessonProgressSchema1788063600000` included in migration test suite. Full `quality:full` runs pristine reset → migrations → integration → e2e:db.

## 50. Existing regression

All prior module tests pass within single `quality:full` run (532 unit + 216 integration + 109 DB e2e). No modifications to Practice, Curriculum Delivery, or Enrollment business logic beyond additive `assertCanonicalLessonKeyBelongsToVersion`.

## 51. Pristine quality:full

Executed:

```bash
npm run test:db:prepare -- --reset
npm run quality:full
```

**PASS** — one clean run, exit code 0.

## 52. Docker

```bash
docker build --target production -t catechism-api:learning-progress-foundation .
```

**PASS** — production image builds successfully.

## 53. Commands

| Command | Result |
|---------|--------|
| `npm run format` | PASS |
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS (532 tests) |
| `npm run test:e2e` | PASS (5 tests) |
| `npm run build` | PASS |
| `npm audit --audit-level=moderate` | PASS |
| `npm run quality` | PASS |
| `npm run test:db:prepare -- --reset` | PASS |
| `npm run test:db:migrations` | PASS |
| `npm run test:integration` | PASS (216 tests) |
| `npm run test:e2e:db` | PASS (109 tests) |
| `npm run quality:full` | PASS |
| `npm run migration:show` | Lists `CreateLessonProgressSchema1788063600000` |
| Docker production build | PASS |

## 54. Validation matrix

| Gate | Result |
|------|--------|
| format | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS |
| DB-free e2e | PASS |
| build | PASS |
| npm audit | PASS |
| quality | PASS |
| pristine DB reset | PASS |
| migrations | PASS |
| integration | PASS |
| DB e2e | PASS |
| quality:full ONE CLEAN RUN | PASS |
| Docker | PASS |
| no cycle | PASS |
| no forwardRef | PASS |
| LearningProgressService only export | PASS |
| exactly one owned table | PASS |
| no aggregate table | PASS |
| no event table | PASS |
| no topic/block table | PASS |
| UUID app-generated | PASS |
| zero ORM relations | PASS |
| enrollment FK | PASS |
| actor FK policy | PASS |
| no curriculum FK | PASS |
| unique enrollment/curriculum/canonicalLesson | PASS |
| assigned version snapshot | PASS |
| missing row = NOT_STARTED | PASS |
| explicit tracking only | PASS |
| no passive GET mutation | PASS |
| NOT_STARTED → IN_PROGRESS | PASS |
| NOT_STARTED → COMPLETED | PASS |
| IN_PROGRESS → COMPLETED | PASS |
| same-state idempotency | PASS |
| COMPLETED → IN_PROGRESS denied | PASS |
| timestamps stable | PASS |
| actor attribution stable | PASS |
| active enrollment write only | PASS |
| canonical lesson validation | PASS |
| curriculum assignment derived | PASS |
| version carry-forward | PASS (design; republish scenario covered by schema identity) |
| new enrollment fresh progress | PASS (design) |
| concurrency safe | PASS |
| no Practice composition | PASS |
| no Exam | PASS |
| no mastery | PASS |
| prior regression | PASS |
| Git compliance | PASS (no add/commit/push) |

## 55. Known/deferred

| Item | Target |
|------|--------|
| Permission seeds (`learning-progress.read/manage`) | #003 |
| HTTP PATCH lesson progress | #003 |
| Enrollment/class aggregate GET | #003 |
| Practice composition | #003 |
| Catechist/parish admin read scopes | #003 |
| OpenAPI / Postman | #004 |
| Student self-write (future role) | Post-MVP |

**Note:** Integration tests require pristine DB reset before `quality:full` when local DB accumulates seed data from prior runs (documented operational requirement, consistent with other seed-heavy integration suites).

## 56. Out-of-scope (confirmed not implemented)

- Aggregate learning progress HTTP APIs
- Class-level progress endpoints
- Practice metrics composition
- Exam dimension
- Block/topic progress
- Event bus / activity feed
- Mastery scores
- Aggregate snapshot tables
- HTTP controller

## 57. LEARNING PROGRESS #003 readiness

**READY: YES** — no unresolved BLOCKER/HIGH.

Recommend **LEARNING PROGRESS #003/4**:

- `PATCH` lesson progress HTTP
- `GET` enrollment + class learning-progress aggregates
- Parent/Catechist/Parish Admin read scopes + permission seeds
- Curriculum tree completion counts
- `PracticeService` composition
- `lastLearningActivityAt`
- FE/Mobile contracts + OpenAPI

## 58. Prompt count

LEARNING PROGRESS **#002/4 complete**. Approximately **2 prompts remain** (#003–#004).

## 59. Commit recommendation

When ready to commit tracked changes:

```
git commit -m "feat(learning-progress): add lesson progress foundation"
```

(Do not run unless explicitly requested.)
