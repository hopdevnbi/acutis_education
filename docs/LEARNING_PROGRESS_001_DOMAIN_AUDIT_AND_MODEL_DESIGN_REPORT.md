# LEARNING PROGRESS #001 — Domain Audit + Model Design Report

**Phase:** LEARNING PROGRESS #001 / 4  
**Date:** 2026-09-01  
**Status:** AUDIT COMPLETE — DESIGN READY  
**Prompt:** `LEARNING_PROGRESS_001_DOMAIN_AUDIT_AND_MODEL_DESIGN.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| LEARNING PROGRESS DOMAIN DESIGN READY | **YES** |
| LEARNER IDENTITY MODEL READY | **YES** |
| LESSON PROGRESS OWNERSHIP READY | **YES** |
| PRACTICE INTEGRATION MODEL READY | **YES** |
| FUTURE EXAM EXTENSION MODEL READY | **YES** |
| HISTORICAL/VERSIONING MODEL READY | **YES** |
| PARENT/CATECHIST SCOPE READY | **YES** |
| PERSISTENCE REQUIRED NOW | **YES** |
| FINAL RECOMMENDED PROMPT COUNT | **4** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**#002 readiness:** **READY: YES** — proceed to **LEARNING PROGRESS #002 — Persistence + Lesson Progress Foundation**

---

## 1. Objective

Define the bounded context, ownership, persistence strategy, access model, and implementation roadmap for **Learning Progress** — a learner-centric read/aggregation domain spanning curriculum lesson completion, Practice outcomes, and future Exam outcomes — without duplicating Practice progress or violating modular monolith boundaries.

**This prompt is audit/design only.** No production code, schema, or API was implemented.

## 2. Current roadmap position

| Phase | Status |
|-------|--------|
| Backend Foundation | Complete |
| CI/CD Foundation | Complete |
| Auth/User/RBAC | Complete |
| Parish + Academic Structure | Complete |
| Class + Student + Enrollment | Complete |
| Curriculum + Learning Content | Complete |
| Media | Complete |
| Question Bank | Complete |
| Practice Engine (#001–#006) | **COMPLETE** |
| **Learning Progress (#001–#004)** | **#001 audit (this report)** |
| Exam Engine | Not started |

## 3. Completed dependencies

Learning Progress depends on stable public contracts from:

- **Enrollment** — `EnrollmentService`, `EnrollmentAccessService`, `EnrollmentSnapshot`
- **Class** — `ClassService`, `ClassScopeService`, `ClassCatechistAssignmentService`
- **Student** — `StudentAccessService` (guardian/self evidence)
- **Parish** — `ParishScopeService`
- **Curriculum** — `CurriculumService` (assignment, version tree, `canonicalLessonKey`)
- **Curriculum Delivery** — HTTP-only today; no exported service
- **Learning Content** — content documents (no progress)
- **Practice** — `PracticeService.getEnrollmentProgress`, `getClassProgress`

All prerequisite phases report BLOCKER/HIGH = 0 at completion.

## 4. Existing progress inventory

| Domain | Persisted learner state? | HTTP/API | Owner |
|--------|--------------------------|----------|-------|
| Curriculum structure | No | Admin CRUD | `curriculum` |
| Curriculum assignment | Admin `assignedAt` only | Orchestration routes | `curriculum` |
| Learner curriculum tree | No | GET tree (read-only) | `curriculum-delivery` |
| Learner lesson content | No | GET content/media (read-only) | `curriculum-delivery` |
| Learning content blocks | No | Admin upsert | `learning-content` |
| Practice sessions/attempts | Yes | Full practice lifecycle | `practice` |
| Practice progress metrics | Derived (no aggregate table) | GET progress routes | `practice` |
| Exam | None | None | — |
| **Lesson completion** | **None** | **None** | **GAP** |

**Conclusion:** The only mature learner progress surface today is **Practice-specific**. Broader “learning progress” does not exist.

## 5. Existing Practice progress inventory

**Routes:**

- `GET /api/v1/enrollments/:enrollmentId/practice/progress`
- `GET /api/v1/classes/:classId/practice/progress`

**Public facade:** `PracticeService.getEnrollmentProgress`, `PracticeService.getClassProgress`

**Metrics (STANDARD / REVIEW_WRONG separated):**

- Session counts (in-progress, abandoned, completed)
- `questionsAttempted`, first/final correct counts, accuracies (0–1)
- `lastPracticedAt`
- Class summary + paginated learner rows

**Filters:** `curriculumId`, `canonicalLessonKey`, `from`, `to` (session `startedAt`)

**Access:** Enrollment progress — super admin, linked parent, parish admin (parish scope), assigned catechist. Class progress — staff only; **parent denied**.

**Ownership:** Practice module owns source tables and aggregation SQL. Learning Progress must **compose**, not duplicate.

## 6. Existing CurriculumDelivery learner-state inventory

**Module:** `src/modules/curriculum-delivery/` — **exports nothing** (HTTP-only).

**Learner routes (read-only, no side effects):**

| Route | Purpose |
|-------|---------|
| `GET .../classes/:classId/curriculum-tree` | Published tree for class triple |
| `GET .../enrollments/:enrollmentId/curriculum-tree` | Same via enrollment |
| `GET .../classes|enrollments/.../lessons/:lessonId/content` | Lesson content document |
| `GET .../.../media/:assetId/content` | Contextual media stream |

**DTO fields:** `canonicalLessonKey`, lesson metadata, content blocks — **no** `startedAt`, `completedAt`, `status`, `progressPercent`, block-level state.

**Access:** `ClassScopeService`, `EnrollmentAccessService` (broader than Practice session manage).

**Gap:** Delivery GET does not and should not (MVP) implicitly record progress. No module owns lesson completion writes.

## 7. Existing Enrollment/Class context

**EnrollmentSnapshot:** `{ id, studentId, classId, parishId, academicYearId, status, enrolledAt, ... }`

**ClassSnapshot:** `{ id, parishId, academicYearId, catechismLevelId, ... }`

**Curriculum assignment:** One published version per `(parishId, academicYearId, catechismLevelId)` via `curriculum_assignments`. All active enrollments in a class share the same assigned curriculum.

**Lifecycle:** One ACTIVE enrollment per student per parish+academic year. Transfer creates new enrollment row; old row `TRANSFERRED`.

**Implication:** Progress keyed by `enrollmentId` naturally scopes to academic period and class context.

## 8. Bounded context definition

**Learning Progress** is a **learner progress read-model domain** that:

1. **Owns** persisted lesson/learning completion state (new)
2. **Composes** Practice summary via `PracticeService` public API (no Practice table access)
3. **Reserves** an Exam summary extension point (no Exam implementation now)
4. **Exposes** enrollment-scoped and class-scoped aggregate HTTP read APIs (+ explicit lesson progress writes)

It is **not** curriculum authoring, enrollment management, practice session delivery, question bank analytics, student profile, or a data warehouse.

## 9. What LearningProgress must NOT own

- Practice session lifecycle, attempts, grading
- Duplicate Practice aggregate SQL or tables
- Curriculum/version/topic/lesson structure
- Learning content documents
- Enrollment/class/student master data
- Question Bank statistics
- Exam attempts/results (until Exam module exists)
- Mastery scores, rankings, spiritual analytics
- Global event log / analytics warehouse (MVP)

## 10. Learner identity decision

**Primary key: `enrollmentId`**

| Rationale | Detail |
|-----------|--------|
| Academic context | Enrollment binds student + class + parish + academic year |
| Parent scope | Reuse guardian → student → enrollment chain |
| Catechist scope | Reuse assigned class → roster |
| Future STUDENT role | Map authenticated student to active enrollment(s) |
| Anti-pattern rejected | `userId`-only aggregates (loses year/class context) |

**Secondary identifiers in rows/filters:** `studentId`, `curriculumId`, `canonicalLessonKey` — never replace enrollment as aggregate root.

## 11. Enrollment scope

All Learning Progress aggregates and lesson progress rows are **scoped to a single enrollment**.

- New academic-year enrollment = **fresh progress** (no automatic carry-forward)
- Transfer enrollment = **new enrollmentId** → new progress namespace unless explicit future transfer policy added
- Historical enrollments (`TRANSFERRED`, `COMPLETED`) may remain readable for staff; writes target ACTIVE enrollments only

## 12. Curriculum context

Progress attribution dimensions:

| Field | Use |
|-------|-----|
| `enrollmentId` | Aggregate root |
| `curriculumId` | Curriculum family (stable across versions) |
| `assignedCurriculumVersionId` | Snapshot of version at completion/start (audit) |
| `canonicalLessonKey` | Stable lesson identity across version clones |

**Do not** key progress on volatile `lessonId` (version-scoped row id) as primary identity.

**Topic identity:** No stable topic semantic key exists today. Topic progress is **out of scope for MVP**; use lesson-level only via `canonicalLessonKey`.

## 13. Lesson identity

From `LessonService`:

- `canonicalLessonKey` generated as UUID v4 on lesson create
- **Immutable** after create (mutation throws)
- **Preserved** on curriculum version clone (new `lesson.id`, same key)

Already consumed by Practice sessions and Question Bank curriculum links — proven stable hook for cross-version correlation.

## 14. Topic identity

**No stable topic key** in current schema (`topics` are version-scoped with generated ids).

**Decision:** Do not invent topic-level progress in MVP. Report lesson completion only; topic rollups can be derived at read time from assigned curriculum tree if needed later.

## 15. Historical stability

Progress must not silently change when:

| Change | Mitigation |
|--------|------------|
| Lesson text/content edits | Progress keyed on `canonicalLessonKey`, not content hash |
| New curriculum version published | Completion keyed on canonical key + curriculumId; optional `assignedCurriculumVersionId` for audit |
| Practice question version changes | Practice metrics remain Practice-owned; Learning Progress calls PracticeService |
| Tag/QB changes | No Learning Progress dependency on QB |
| Class assignment change | New enrollment → new progress scope |

**Policy gap (MEDIUM):** If product later requires “content materially changed → reset completion”, that is a **future explicit invalidation policy**, not MVP.

## 16. Lesson completion semantics (MVP recommendation)

**Current code defines no product behavior.** Conservative MVP proposal:

| State | Meaning | How set |
|-------|---------|---------|
| `NOT_STARTED` | No explicit learner action | Default (no row or explicit default) |
| `IN_PROGRESS` | Learner explicitly started | Explicit write action |
| `COMPLETED` | Learner explicitly completed | Explicit write action |

**Rules:**

- Passive GET of curriculum tree or lesson content **does not** change state (no implicit tracking)
- Completion is **explicit user/guardian action** (learner-facing actor), not derived from view duration
- **Block-level progress:** **DEFERRED** (no per-block state in MVP)
- Reopen policy: allow `COMPLETED → IN_PROGRESS` only if product approves; **MVP recommend monotonic** `NOT_STARTED → IN_PROGRESS → COMPLETED` without reopen

**Open question (MEDIUM):** Confirm with product owner before #002 implementation.

## 17. Existing lesson progress owner decision

| Module | Owns lesson completion? |
|--------|-------------------------|
| CurriculumDelivery | **No** — read-only delivery |
| LearningContent | **No** — static documents |
| Curriculum | **No** — structure only |
| Practice | **No** — quiz metrics only |

**Decision:** **`learning-progress` module owns `lesson_progress` persistence and write APIs.**

CurriculumDelivery must not gain write side effects on GET.

## 18. Practice contribution

**Integration model:** Learning Progress **composes** Practice via public `PracticeService`:

```typescript
// Existing public methods — reuse as-is
getEnrollmentProgress(input: GetEnrollmentPracticeProgressInput)
getClassProgress(input: GetClassPracticeProgressInput)
```

**Embedded in Learning Progress response** as a `practice` dimension (subset or full mirror — decide in #003):

- `sessionsCompleted`, accuracies, `lastPracticedAt`, review summary
- Same filters where applicable (`curriculumId`, `canonicalLessonKey`, date range)

**Do not:**

- Query `practice_sessions` / attempts from Learning Progress
- Duplicate Practice SQL aggregations
- Expose answer/correct-option fields

**On-demand vs projection:** **On-demand via PracticeService for MVP.** Practice already optimized aggregation; duplicate projection tables rejected unless profiling proves need (LOW future option).

## 19. Future Exam extension

Exam module does not exist. Design extension now:

```typescript
// Future optional dimension on aggregate DTO — omit or null until Exam exists
exam?: {
  examsAssigned: number;
  examsCompleted: number;
  // pass/fail only if Exam product defines
} | null;
```

**No Exam tables, columns, or permissions in #002–#003.** Extension point only in interface/DTO design.

## 20. Overall progress percentage decision

**Do not invent one universal weighted score** mixing lesson completion, practice accuracy, and future exam scores.

**Expose dimensions separately:**

| Dimension | Metric |
|-----------|--------|
| `learning` | `lessonsCompleted / lessonsAssigned` → `completionRatio` (0–1) |
| `practice` | Existing Practice metrics (via PracticeService) |
| `exam` | Future separate block |

If a top-level `overallCompletionRatio` is ever exposed, it should reflect **curriculum lesson completion only**, not practice accuracy or exam scores.

## 21. Mastery decision

**REJECTED** — no `masteryScore`, faith/spiritual ranking, behavioral scores, or leaderboards. Consistent with Practice Engine policy (PROJECT_RULES minors + Practice #001 design).

## 22. Read-model vs persistence options

| Option | Description | Verdict |
|--------|-------------|---------|
| **A** Pure aggregation | Compose Curriculum tree counts + PracticeService on every read | Insufficient — no lesson state source |
| **B** Full projection tables | Event-driven duplicates of Practice + lessons | Over-engineered for MVP; no event bus |
| **C Hybrid | **Persist lesson progress** + **compose Practice on demand** | **SELECTED** |

## 23. Final persistence decision

**PERSISTENCE REQUIRED NOW: YES**

Learning Progress must own **`lesson_progress`** (name tentative) because no other module stores learner lesson completion.

Practice remains source of truth for practice metrics (derived read, not duplicated).

No global `learning_activity_events` table in MVP.

## 24. Proposed owned tables

| Table | Verdict |
|-------|---------|
| `lesson_progress` | **REQUIRED** (#002) |
| `learning_progress` (enrollment snapshot) | **REJECTED** for MVP — compute aggregates at read |
| `learning_activity_events` | **DEFERRED** — use `startedAt`/`completedAt`/`updatedAt` on lesson_progress + Practice `lastPracticedAt` |

## 25. `lesson_progress` candidate

Proposed minimal schema (subject to #002 migration review):

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID v4 PK | |
| `enrollment_id` | UUID FK → enrollments | Aggregate scope |
| `curriculum_id` | UUID | Curriculum family |
| `canonical_lesson_key` | UUID | Stable lesson identity |
| `assigned_curriculum_version_id` | UUID nullable | Version at first start (audit) |
| `status` | enum | `NOT_STARTED` \| `IN_PROGRESS` \| `COMPLETED` |
| `started_at` | datetime nullable | Set on transition to IN_PROGRESS |
| `completed_at` | datetime nullable | Set on COMPLETED |
| `updated_at` | datetime | |
| `created_at` | datetime | |

**Unique constraint:** `(enrollment_id, curriculum_id, canonical_lesson_key)`

**Indexes:** `(enrollment_id)`, `(enrollment_id, status)` for class rollups

## 26. Versioning / `canonicalLessonKey` policy

**Recommended policy (Option A variant):**

- Completion is tied to **`(enrollmentId, curriculumId, canonicalLessonKey)`**
- When parish publishes curriculum v2 with cloned lessons (same canonical keys), **completion carries forward** within the same curriculum family and enrollment
- Store `assigned_curriculum_version_id` at first interaction for audit; do not invalidate completion on republish unless future explicit invalidation policy added

**Rejected for MVP:**

- Option B (completion tied only to exact `curriculumVersionId`) — poor UX on republish
- Automatic invalidation on content change — undefined product rule

## 27. Academic-year carry-forward policy

**Default: NO carry-forward**

- Progress rows belong to `enrollmentId`
- New year → new enrollment → empty lesson progress
- Explicit cross-year transfer policy is **out of scope** unless product requests later

## 28. Parent access

| Action | Linked parent/guardian |
|--------|------------------------|
| Read enrollment learning progress | **Yes** (mirror Practice enrollment progress scope) |
| Read class learning progress | **No (403)** — mirror Practice class rule |
| Write lesson progress (start/complete) | **Yes** — learner-facing actions on linked enrollment (same as Practice manage scope: guardian + super admin) |

Permissions alone insufficient — require `StudentAccessService` guardian evidence.

## 29. Catechist access

| Action | Assigned catechist |
|--------|-------------------|
| Read enrollment learning progress | **Yes** (assigned class) |
| Read class learning progress | **Yes** (assigned class) |
| Write lesson progress | **No** — unless product explicitly requires catechist marking (deferred; default deny) |

## 30. Parish Admin access

| Action | Parish admin (active parish membership) |
|--------|----------------------------------------|
| Read enrollment progress | **Yes** (parish scope) |
| Read class progress | **Yes** (parish scope) |
| Write lesson progress | **No** (deferred admin correction) |

## 31. Super Admin access

Global read. Writes only via same learner-facing APIs or future admin correction (deferred).

## 32. Future Student scope

No STUDENT role now. Design enrollment-scoped self-access later:

- Resolve student's ACTIVE enrollment(s)
- Apply same read/write as guardian for own enrollment

## 33. Enrollment progress API design (audit — #003)

**Proposed:**

```
GET /api/v1/enrollments/:enrollmentId/learning-progress
```

**Query filters (align with Practice):** `curriculumId`, `canonicalLessonKey`, `from`, `to` (on lesson progress timestamps)

**Response shape (conceptual):**

```json
{
  "enrollmentId": "uuid",
  "filters": { ... },
  "curriculum": {
    "curriculumId": "uuid",
    "assignedVersionId": "uuid",
    "lessonsAssigned": 12,
    "lessonsStarted": 3,
    "lessonsCompleted": 2,
    "completionRatio": 0.1667
  },
  "practice": { "... Practice enrollment snapshot subset ..." },
  "exam": null,
  "lastLearningActivityAt": "ISO-8601 | null"
}
```

**Permission:** new `learning-progress.read` (or reuse pattern — decide in #002/#003)

## 34. Class progress API design (audit — #003)

**Proposed:**

```
GET /api/v1/classes/:classId/learning-progress?page=1&limit=20
```

**Structure:** class summary (lessons + practice rollups) + paginated learner rows (lesson counts + practice summary per learner).

**Parent denied** (403). Pagination required — avoid nested giant payloads.

## 35. Lesson progress write API decision

**Proposed (LearningProgress owns state):**

```
PATCH /api/v1/enrollments/:enrollmentId/lessons/:canonicalLessonKey/progress
Body: { "status": "IN_PROGRESS" | "COMPLETED" }
```

**Validation:**

- Enrollment ACTIVE
- `canonicalLessonKey` belongs to assigned curriculum for enrollment's class triple
- Valid state transitions enforced server-side

**Permission:** `learning-progress.manage` (guardian + super admin MVP)

Implement in **#003** after #002 persistence.

## 36. Recent activity decision

**`lastLearningActivityAt`** = max of:

- Latest `lesson_progress.updated_at` (or `completed_at`)
- Practice `lastPracticedAt` from composed Practice summary

Computed at read time in #003 — no separate event log in MVP.

## 37. Practice public contract gaps

| Gap | Severity | Mitigation |
|-----|----------|------------|
| No batch enrollment progress method | MEDIUM | For class view, call `getClassProgress` once for practice dimension; lesson metrics batched in own SQL |
| Practice class API already paginated | — | Reuse for class learning progress composition |
| Filter alignment | LOW | Pass same filter object to PracticeService |

**No Practice module changes required for MVP** unless batch API profiling shows N+1 (unlikely — class practice already batched).

## 38. CurriculumDelivery contract gaps

| Gap | Mitigation in Learning Progress |
|-----|--------------------------------|
| No exported service | Use `CurriculumService.getPublishedVersionForAssignment` + `getVersionTree` via Class/Enrollment context |
| No lesson count API | Count lessons in assigned published tree at read time (cache optional later) |
| No progress | Owned by Learning Progress |

**Do not** add progress writes to CurriculumDelivery.

## 39. Enrollment/Class contract gaps

No blocking gaps. Use:

- `EnrollmentService.getEnrollmentById`, `listEnrollmentsByClass`
- `ClassService.getClassById`
- Existing access services for scope

## 40. Batch / performance risks

| Risk | Mitigation |
|------|------------|
| Class lesson rollup scans all enrollments | Single SQL `GROUP BY enrollment_id` with `IN (...)` for page |
| Lesson assigned count per request | One tree fetch per request; acceptable for MVP class sizes |
| Practice + lesson double fanout | Parallel compose; consider merged endpoint internally in service |
| N+1 access checks | Batch scope via roster membership, not per-row `canReadStudent` loops |

## 41. N+1 prevention

Follow Practice `#005` patterns:

- Paginate roster via `listEnrollmentsByClass`
- Batch lesson metrics: `WHERE enrollment_id IN (@...) GROUP BY enrollment_id`
- One `getClassProgress` call for practice dimension per class request
- Avoid `StudentAccessService` in per-learner loops

## 42. Security / minors

- No public child directory
- Progress DTOs: counts, ratios, timestamps, statuses only
- No practice answers, correct options, explanations in Learning Progress responses
- No unnecessary PII duplication (student display names optional via existing student read APIs)
- Do not frame metrics as spiritual worth

## 43. Multilingual readiness

- Status enums and counters are locale-neutral
- Do not persist translated labels
- `canonicalLessonKey` is language-neutral
- Lesson titles for UI come from Curriculum Delivery, not Learning Progress aggregates

## 44. Microservice extraction boundary

Future **Learning Progress service** consumes:

- Enrollment/Class HTTP APIs
- Curriculum assignment/tree HTTP API
- Practice progress HTTP API
- Future Exam HTTP API

Owns: `lesson_progress` table only.

No shared ORM across services. Current modular monolith module boundary matches extraction seam.

## 45. Future eventing strategy

**Not implemented in MVP.** Identify future events for extraction:

- `LessonProgressChanged`
- `PracticeSessionCompleted` (consumer optional)
- `ExamCompleted` (future)

Sync composition sufficient until scale or multi-service deployment requires outbox/events.

## 46. Error model (planned)

| Error | HTTP |
|-------|------|
| `LearningProgressAccessDeniedError` | 403 |
| `LearningProgressNotFoundError` | 404 |
| `LearningProgressInvalidFilterError` | 400 |
| `LessonProgressInvalidTransitionError` | 409 or 422 |
| `CurriculumProgressContextMismatchError` | 422 |

Implement in #002–#003.

## 47. Risks / open questions

| ID | Question | Severity |
|----|----------|----------|
| OQ1 | Confirm explicit start/complete vs passive view | MEDIUM |
| OQ2 | Monotonic completion vs allow reopen | MEDIUM |
| OQ3 | New permission codes vs reuse `lesson-content.read` | LOW |
| OQ4 | Class summary cost at very large rosters | MEDIUM |
| OQ5 | Content-change invalidation policy | LOW (future) |

## 48. BLOCKER / HIGH / MEDIUM / LOW

| Severity | Count | Items |
|----------|-------|-------|
| BLOCKER | **0** | — |
| HIGH | **0** | — |
| MEDIUM | **4** | OQ1, OQ2, OQ4, performance monitoring |
| LOW | **2** | OQ3, OQ5 |
| INFORMATIONAL | — | Exam deferred, topic progress deferred, eventing deferred |

## 49. Files created (#001)

| Path |
|------|
| `docs/LEARNING_PROGRESS_001_DOMAIN_AUDIT_AND_MODEL_DESIGN_REPORT.md` |

## 50. Files modified (#001)

**None** (audit-only — no production source changes)

Note: `README.md` Practice section from prior PRACTICE #006 may remain uncommitted separately; not part of #001 scope.

## 51. Commands run

```powershell
npm run quality
# format:check, lint, typecheck, unit (513), e2e (5), build — all PASS
```

No DB mutation (per #001 prompt). Full `quality:full` deferred to implementation prompts.

## 52. Validation

| Step | Result |
|------|--------|
| format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit tests | PASS — 93 suites, 513 tests |
| db-free e2e | PASS — 2 suites, 5 tests |
| build | PASS |

## 53. Out of scope (#001)

Entities, migrations, module, services, controllers, permissions, seeds, Postman, production code, Exam implementation, topic-level progress, block-level progress, event bus, aggregate Practice tables, mastery scores.

## 54. Final prompt count recommendation

**4 prompts** (persistence required; versioning policy fits in #002; not complex enough for 5).

| Prompt | Scope |
|--------|-------|
| **#001** | Audit + design (this report) |
| **#002** | `lesson_progress` schema, entity, migration, internal service, state transitions |
| **#003** | Aggregation APIs, access scope, Practice composition, lesson write route |
| **#004** | Final audit, demo/Postman, quality:full, Docker, phase completion |

If #002 product questions (OQ1/OQ2) block implementation, resolve in #002 report before #003 — does not require a 5th prompt unless product adds block-level progress scope.

## 55. LEARNING PROGRESS #002 readiness

**READY: YES**

Recommend next prompt:

**LEARNING PROGRESS #002 — Persistence + Lesson Progress Foundation**

Deliverables: migration, entity, enums, errors, internal `LessonProgressService`, transition rules, unit tests, module skeleton (no HTTP yet or minimal internal only per #002 prompt when written).

## 56. Commit recommendation

**Audit-only — no commit recommended.**

No tracked production source files were modified in #001. Report lives under gitignored `docs/`.

---

## Appendix A — Practice HTTP route reference (do not duplicate)

See `docs/PRACTICE_006_FINAL_AUDIT_DEMO_POSTMAN_PHASE_COMPLETION_REPORT.md` for full Practice route inventory.

## Appendix B — CurriculumDelivery access dependency map

```
getEnrollmentCurriculumTree
  → EnrollmentService.getEnrollmentById
  → EnrollmentAccessService.assertCanReadEnrollment
  → ClassService.getClassById
  → CurriculumService.getPublishedVersionForAssignment
  → CurriculumService.getVersionTree
```

Learning Progress should reuse the same enrollment/class access primitives, not reimplement scope logic differently.

## Appendix C — Module boundary plan (#002–#003)

| Module | Exports |
|--------|---------|
| `LearningProgressModule` | **`LearningProgressService` only** (facade) |
| Internal | `LessonProgressService`, `LearningProgressAccessService`, aggregation helpers |

Inbound deps: `EnrollmentModule`, `ClassModule`, `StudentModule`, `ParishModule`, `CurriculumModule`, `PracticeModule`, `AccessControlModule`

**Forbidden:** Import Practice repositories/entities; import CurriculumDelivery internals.

---

**LEARNING PROGRESS #001 — COMPLETE**
