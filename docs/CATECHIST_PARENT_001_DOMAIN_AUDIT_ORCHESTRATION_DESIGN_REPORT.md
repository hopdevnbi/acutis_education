# CATECHIST + PARENT #001/5 — Domain Audit + Orchestration Design

**Phase:** Catechist + Parent Supporting APIs #001 / 5 (AUDIT / DESIGN ONLY)  
**Date:** 2026-09-02  
**Prompt:** `CATECHIST_PARENT_001_DOMAIN_AUDIT_ORCHESTRATION_DESIGN.txt`  
**Git HEAD:** `0b7a529` (clean tracked tree; handoff report untracked only)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| BASELINE QUALITY:FULL | **FAIL** (integration seed cleanup — see §4) |
| BASELINE DOCKER | **PASS** (`catechism-api:family-portal-baseline`) |
| GO / NO-GO FOR IMPLEMENTATION | **GO** (design); implementation blocked on baseline fix |
| NEW MODULE REQUIRED | **YES** |
| FINAL MODULE NAME | **`family-portal`** |
| NEW BUSINESS TABLES REQUIRED | **NO** |
| NEW ORCHESTRATION PERMISSION REQUIRED | **NO** |
| CATECHIST CONTEXT CONTRACT READY | **YES** |
| CATECHIST CLASS/ROSTER CONTRACT READY | **YES** |
| PARENT CONTEXT CONTRACT READY | **YES** |
| PARENT CHILD/ENROLLMENT PROGRESS CONTRACT READY | **YES** |
| N+1 STRATEGY READY | **YES** (with 2 narrow Exam/Class batch additions) |
| PUBLIC SERVICE DEPENDENCY MAP READY | **YES** |
| ATTENDANCE DEFERRED | **YES** |
| SCHEDULE DEFERRED | **YES** |
| PRAYER DEFERRED | **YES** |
| NOTIFICATIONS DEFERRED | **YES** |
| FINAL RECOMMENDED PROMPT COUNT | **5** |
| Unresolved BLOCKER count | **1** |
| Unresolved HIGH count | **0** |
| #002 READINESS | **NO** (baseline quality:full must pass first) |

---

## 1. Objective

Design a stateless orchestration bounded context for Catechist and Parent portal APIs. Compose existing domain public services (Class, Enrollment, Student, Practice, Learning Progress, Exam) into bounded read-models under `/me/catechist/*` and `/me/parent/*`. No production code, schema, or migrations in #001.

---

## 2. Roadmap position

| Prior phase | Status |
|-------------|--------|
| Foundation → Exam Engine (#001–#008) | Complete |
| **Catechist + Parent #001** | **This audit** |
| #002 Catechist context/class/roster | Next (after baseline fix) |
| #003 Parent context/child progress | Planned |
| #004 RBAC/security/performance hardening | Planned |
| #005 Demo seed + Postman + final gate | Planned |

Master plan estimate: 4–5 prompts. Audit confirms **5 prompts** is appropriate given N+1 batch prep and security hardening scope.

---

## 3. Baseline repository state

| Item | State |
|------|--------|
| Node | v22.23.1 |
| npm | 11.16.0 |
| Git branch | `master` |
| Tracked changes | None |
| Untracked | `docs/BACKEND_PHASE_HANDOFF_CATECHIST_PARENT_READINESS_REPORT.md` (handoff only) |
| Modules inspected | class, enrollment, student, practice, learning-progress, exam, curriculum, curriculum-delivery, localization, auth, access-control |
| `module-boundaries.spec.ts` | Present; enforces single-export pattern on domain modules |

---

## 4. Baseline quality:full

**Result: FAIL**

### Passed stages (before integration failure)

| Stage | Result |
|-------|--------|
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` (unit) | PASS — 624 tests |
| `npm run test:e2e` | PASS — 5 tests |
| `npm run build` | PASS |
| `npm run test:db:migrations` | PASS (first pass) |
| `npm run test:integration` | **FAIL** — 3 suites, 7 tests |
| `npm audit --audit-level=moderate` | PASS — 0 vulnerabilities |

### Integration failures (BLOCKER)

After `quality:full` runs `test:db:prepare --reset` and re-runs integration, seed cleanup in older integration specs does not delete Exam Engine tables before deleting `classes`:

```
FK_exam_assignments_class_id_classes_id
```

**Affected suites:**

- `test/integration/parish-academic-seed.integration-spec.ts`
- `test/integration/class-enrollment-seed.integration-spec.ts`
- `test/integration/curriculum-demo-seed.integration-spec.ts`

**Root cause:** Exam Engine (#003–#008) added `exam_assignments`, `exam_attempts`, etc. with FK to `classes` / `enrollments`, but pre-Exam seed integration cleanup SQL was not updated.

**Impact:** `#002` must not start until this is fixed (small hygiene fix in test cleanup SQL — not in #001 scope per audit-only rule).

---

## 5. Baseline Docker

**Result: PASS**

```bash
wsl bash -lc "cd '.../Acutis Education' && docker build --target production -t catechism-api:family-portal-baseline ."
```

Production image builds successfully.

---

## 6. Existing ownership map

| Domain data | Owning module | Tables (examples) |
|-------------|---------------|-------------------|
| Classes, catechist assignments | `ClassModule` | `classes`, `class_catechist_assignments` |
| Students, guardian links | `StudentModule` | `students`, `student_guardians` |
| Enrollments | `EnrollmentModule` | `enrollments` |
| Lesson progress | `LearningProgressModule` | `lesson_progress` |
| Practice sessions | `PracticeModule` | `practice_sessions`, … |
| Exams, attempts | `ExamModule` | `exams`, `exam_assignments`, `exam_attempts`, … |
| Curriculum/content | `CurriculumModule`, `LearningContentModule` | `curriculums`, `lessons`, … |

**New module owns:** none of the above (stateless orchestration).

---

## 7. Existing public APIs (audit summary)

### ClassModule exports

| Service | Key methods for orchestration |
|---------|------------------------------|
| `ClassService` | `getClassById`, `listClassesByParish` |
| `ClassCatechistAssignmentService` | `listAssignedClassIds`, `assertCatechistAssigned`, `listAssignmentsByClass` |
| `ClassScopeService` | `assertCanReadClass`, `canReadClass`, `canReadParishAsCatechist` |

**Gap:** no `getClassSnapshotsByIds(classIds[])` batch read.

### EnrollmentModule exports

| Service | Key methods |
|---------|-------------|
| `EnrollmentService` | `getEnrollmentById`, `listEnrollmentsByClass`, `listEnrollmentsByStudent` |
| `EnrollmentAccessService` | `assertCanReadEnrollment`, `canReadStudent`, `resolveAccessibleStudentIds` |
| `EnrollmentGuardianScopeService` | `canReadParishAsGuardian`, `canReadClassAsGuardian` |
| `EnrollmentQueryService` | `listStudentIdsForGuardian` (ACTIVE links only), `listActiveStudentIdsInClasses` |

### StudentModule exports

| Service | Key methods |
|---------|-------------|
| `StudentService` | `getStudentById`, `getStudentSnapshotsByIds`, `listStudentIdsByLinkedUserId` (student userId link — not guardian) |
| `StudentGuardianService` | `assertGuardianLinked` |
| `StudentAccessService` | student-scope evidence |

### PracticeModule exports

| Service | Key methods |
|---------|-------------|
| `PracticeService` | `getEnrollmentProgress`, `getClassProgress` (paginated learners + class summary) |

### LearningProgressModule exports

| Service | Key methods |
|---------|-------------|
| `LearningProgressService` | `getEnrollmentLearningProgress` (composes LP + Practice + Exam), `getClassLearningProgress` (paginated roster LP + Practice) |

### ExamModule exports

| Service | Key methods |
|---------|-------------|
| `ExamService` | `getEnrollmentExamSummary` (single enrollment) |

**Not exported (internal):** `ExamAssignmentAttemptSummaryService`, `ExamResultAccessService` — orchestration must use `ExamService` public surface only.

---

## 8. Gap analysis

| Gap | Severity | Resolution |
|-----|----------|------------|
| No unified `/me/catechist/*` or `/me/parent/*` APIs | Expected | **#002/#003** |
| `ExamService` lacks batch enrollment exam summaries | MEDIUM | Add `getEnrollmentExamSummariesByEnrollmentIds` in ExamModule (#002 prep) |
| `ClassService` lacks batch class snapshots | LOW | Add `getClassSnapshotsByIds` in ClassModule (#002 prep) or paginate class list |
| Class LP roster row lacks exam column | MEDIUM | Merge exam batch into roster composition |
| Seed integration cleanup missing exam FK deletes | **BLOCKER** | Fix test cleanup before #002 |
| Attendance, Schedule, Prayer, Notifications | N/A | Explicitly deferred |

---

## 9. New module vs EnrollmentModule

| Option | Assessment |
|--------|------------|
| **A: Extend EnrollmentModule / MeController** | **Reject.** `MeController` correctly serves STUDENT `learner-context`. Adding Catechist/Parent dashboard composition would turn Enrollment into a god module importing Practice + LP + Exam. |
| **B: Dedicated orchestration module** | **Accept.** New `FamilyPortalModule` with `/me/catechist/*` and `/me/parent/*` controllers. Enrollment keeps learner self-context only. |

**Verdict: OPTION B — dedicated module required.**

---

## 10. Module-name comparison

| Name | Pros | Cons |
|------|------|------|
| `family-engagement` | Matches product roadmap language | Implies owning engagement domain data |
| `portal-orchestration` | Clear orchestration intent | Too generic; risks becoming catch-all |
| `catechist-parent` | Explicit actors | Awkward English; poor extraction name |
| **`family-portal`** | Portal = read orchestration; covers parent + catechist family-facing UX; aligns with FE “Parent Portal / Catechist Portal” | Slightly broader than catechist-only |

---

## 11. Final module name

**FINAL MODULE NAME: `family-portal`**

- Folder: `src/modules/family-portal/`
- Facade: `FamilyPortalService`
- Controllers: `FamilyPortalCatechistController`, `FamilyPortalParentController` (or single `MeFamilyPortalController` with route prefixes)

---

## 12. Bounded-context definition

**Family Portal** is a stateless read-model orchestration layer for authenticated Catechist and Parent actors. It aggregates enrollment-scoped learning indicators from domain modules without persisting or mutating domain state. It enforces relationship-based scope (guardian link, catechist assignment) independent of RBAC role codes alone.

Future extraction boundary: could become a BFF microservice; domain modules remain source of truth.

---

## 13. Table ownership

**NEW BUSINESS TABLES REQUIRED: NO**

No entities, migrations, or repositories. MVP is GET-only orchestration.

---

## 14. Public export decision

| Export | Decision |
|--------|----------|
| `FamilyPortalService` | Export only if another module needs programmatic composition (unlikely in MVP) |
| HTTP-only | Acceptable if no cross-module programmatic consumer |

**Recommendation:** export `FamilyPortalService` for testability; keep single facade. No other module should import it in MVP (one-way dependency).

---

## 15. Dependency graph

```
FamilyPortalModule
  → ClassModule (ClassService, ClassCatechistAssignmentService, ClassScopeService)
  → EnrollmentModule (EnrollmentService, EnrollmentAccessService, EnrollmentQueryService)
  → StudentModule (StudentService, StudentGuardianService)
  → PracticeModule (PracticeService)
  → LearningProgressModule (LearningProgressService)
  → ExamModule (ExamService)
  → AuthModule, AccessControlModule

Forbidden:
  Class/Enrollment/Student/Practice/LP/Exam → FamilyPortalModule
  FamilyPortalModule → internal repos/entities of other modules
```

No `forwardRef`.

---

## 16. Cross-module boundary rules

1. Orchestration calls **exported public services only**.
2. Pass IDs and narrow read-model interfaces across boundaries — no TypeORM entities.
3. Scope checks in orchestration access coordinator **before** composition (defense in depth; domain services also enforce).
4. Do not duplicate grading, progress calculation, or exam review policy logic.
5. Do not add Attendance/Schedule/Prayer/Notification persistence here.

---

## 17. Catechist actor model

- Actor = authenticated user with **active** `class_catechist_assignments`.
- `ClassCatechistAssignmentService.listAssignedClassIds(userId)` resolves scope.
- `ClassScopeService.assertCanReadClass` for each class operation.
- Catechist **cannot** use learner attempt endpoints (exam.attempt, practice manage for foreign learners).
- `/me/catechist/*` is **not** for parish admin impersonation — admins use existing admin routes.

---

## 18. Catechist context API

**Endpoint:** `GET /api/v1/me/catechist/context`

**Purpose:** Lightweight portal bootstrap (one round trip).

**Response (minimal):**

```typescript
{
  actorUserId: string;
  assignedClassCount: number;
  parishIds: string[];           // distinct parishes from assigned classes
  // optional: firstPageClassIds for prefetch hint — omit in MVP
}
```

**Separate from class list** to keep payload small on mobile cold start.

---

## 19. Catechist class summaries API

**Endpoint:** `GET /api/v1/me/catechist/classes`

**Query:** `page`, `limit` (default/max aligned with LP constants)

**Per class item:**

| Field | Source |
|-------|--------|
| `classId` | assignment |
| `className`, `classCode` | `ClassService` |
| `parishId` | class snapshot |
| `academicYearId`, `catechismLevelId` | class snapshot |
| `activeEnrollmentCount` | `EnrollmentService.listEnrollmentsByClass` count or enrollment query |
| `classStatus` | class snapshot |
| Optional compact aggregates | defer heavy aggregates to roster endpoint |

Do **not** embed full roster here.

---

## 20. Catechist roster API

**Endpoint:** `GET /api/v1/me/catechist/classes/:classId/roster`

**Query:** `page`, `limit`, optional `curriculumId`, `canonicalLessonKey`

**Scope:** `ClassCatechistAssignmentService.assertCatechistAssigned` + `ClassScopeService.assertCanReadClass`

**Composition strategy:**

1. Call `LearningProgressService.getClassLearningProgress` for paginated LP + Practice per learner (existing batch pattern).
2. Call new `ExamService.getEnrollmentExamSummariesByEnrollmentIds` for page enrollment IDs (batch — **required**).
3. Join with `StudentService.getStudentSnapshotsByIds` for display names.

**Per learner row:**

| Field | Include |
|-------|---------|
| `studentId`, `enrollmentId` | Yes |
| `displayName` | Yes (from student snapshot) |
| `enrollmentStatus` | Yes |
| `learning` | completion metrics (from LP row) |
| `practice` | compact metrics (from LP row) |
| `exam` | assignmentsAvailable, attemptsCompleted, latestScorePercent |
| `lastLearningActivityAt` | Yes |

**Exclude:** DOB, address, phone, guardian details, raw answers, sibling data.

---

## 21. Catechist aggregate composition

Class-level summary on roster response header (not separate endpoint in MVP):

- Reuse `ClassLearningProgressSnapshot.summary` from LP service (includes class practice summary).
- Exam class-level: optional `ExamService.getClassExamSummary(classId)` in future; MVP can omit class exam aggregate header or derive from assignment list count only.

---

## 22. Parent actor model

- Actor = authenticated user with **ACTIVE** `student_guardians` link.
- `EnrollmentQueryService.listStudentIdsForGuardian` + `StudentGuardianService.assertGuardianLinked` for point checks.
- Parent **cannot** access class-wide aggregates (403 by design).
- Parent **cannot** exam attempt (403 — invariant from Exam #001A).

---

## 23. Parent context API

**Endpoint:** `GET /api/v1/me/parent/context`

**Response:**

```typescript
{
  actorUserId: string;
  linkedChildCount: number;
  activeEnrollmentCount: number;  // across all linked children
}
```

Lightweight; detail in `/children`.

---

## 24. Parent children API

**Endpoint:** `GET /api/v1/me/parent/children`

**MVP scope:**

- **ACTIVE** guardian links only (`GuardianLinkStatus.Active`).
- Per child: `studentId`, `displayName`, `studentStatus`.
- Per child: **active enrollments only** (`EnrollmentStatus.Active`) with `enrollmentId`, `classId`, `className`, `parishId`, `academicYearId`, `catechismLevelId`.
- Cross-parish children allowed if guardian linked (audit confirms guardian query is not parish-filtered).

**Exclude:** ended guardian links, ended enrollments (separate future “history” endpoint).

---

## 25. Parent enrollment progress API

**Endpoint:** `GET /api/v1/me/parent/enrollments/:enrollmentId/progress`

**Alternative rejected:** `GET /me/parent/children/:studentId/progress` — student may have multiple enrollments; enrollment is the correct aggregate root (matches LP/Practice/Exam).

**Query:** optional `curriculumId`, `canonicalLessonKey` (pass-through to LP)

**Composition:** Delegate to `LearningProgressService.getEnrollmentLearningProgress` — already returns:

- `learning`, `lessons`, `practice`, `exam`, `lastLearningActivityAt`

**Scope:** orchestration verifies guardian link to enrollment's student before delegating.

**Response:** map to `ParentEnrollmentProgressDto` (orchestration DTO — do not expose internal LP DTOs directly if field filtering needed).

---

## 26. Active vs historical children/enrollments decision

| Data | MVP |
|------|-----|
| Guardian links | ACTIVE only |
| Enrollments | ACTIVE only |
| Historical ended links/enrollments | Deferred (#004+ or separate endpoint) |

Rationale: portal MVP targets current-year family UX; history adds complexity without blocking FE portal v1.

---

## 27. Parent Exam policy

**Carry invariant — do not weaken:**

| Action | Parent |
|--------|--------|
| Start/submit formal exam | **403 DENIED** |
| Read linked child released result | **Allowed** via existing `GET /exam-attempts/:id/result` |
| Class exam summaries | **403 DENIED** |

Orchestration progress DTO includes exam **summary scalars** only (`assignmentsAvailable`, `attemptsCompleted`, `latestScorePercent`) — not raw answers.

---

## 28. Parent Practice policy

Guardian proxy for practice **remains** on existing Practice routes. Family portal exposes **read-only progress summary** via LP composition — no duplicate POST/PATCH practice routes.

---

## 29. RBAC strategy

**Reuse existing domain read permissions** on controllers:

- Catechist routes: `classes.read`, `enrollments.read`, `learning-progress.read`, `practice.read`, `exam.result.read` (already on CATECHIST role seed).
- Parent routes: `enrollments.read`, `learning-progress.read`, `practice.read`, `exam.result.read`.

**Plus** orchestration scope coordinator (guardian/assignment checks).

Role check: reject users with zero assigned classes / zero linked children with stable empty list or `403 ActorNotCatechist` / `403 ActorNotParent` as appropriate.

---

## 30. New permission decision

**NEW ORCHESTRATION PERMISSION REQUIRED: NO**

Adding `family-portal.read` would falsely imply safety without relationship scope. Permission + scope guard together are sufficient; scope is authoritative.

---

## 31. Admin impersonation decision

**`/me/catechist/*` and `/me/parent/*` are actor-specific portal routes.**

Parish admin / super admin must **not** use these for impersonation. They retain existing parish-scoped admin APIs.

Return `403` or empty actor-specific response if admin has no assignments/links (do not fall back to admin-wide data on `/me` routes).

---

## 32. Data minimization

| Actor | Allowed fields |
|-------|------------------|
| Parent child | studentId, displayName, enrollment/class identifiers, progress metrics |
| Catechist roster | studentId, enrollmentId, displayName, status, compact metrics |
| Both | ISO UTC timestamps, stable enum codes |

**Never return:** DOB, address, phone, email, guardian PII, sibling links, raw exam/practice answers, pastoral notes.

---

## 33. N+1 audit

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Catechist roster 30 learners | HIGH if per-enrollment Exam calls | **Batch** `ExamService.getEnrollmentExamSummariesByEnrollmentIds` |
| Catechist roster LP+Practice | LOW | `getClassLearningProgress` already batches |
| Parent enrollment progress | LOW | Single `getEnrollmentLearningProgress` |
| Catechist class list 10+ classes | MEDIUM | Add `ClassService.getClassSnapshotsByIds` or page assignments |
| Parent children 3–5 | LOW | Bounded naturally |

**Service-call budget (roster page, limit=25):**

- 1× scope assert
- 1× `getClassLearningProgress` (internal: enrollment page + progress query + practice batch)
- 1× `getEnrollmentExamSummariesByEnrollmentIds` (new, batch)
- 1× `getStudentSnapshotsByIds` (batch)

**Target: ≤ 5 orchestration-level calls per roster page** (excluding internal domain queries).

---

## 34. Practice public API gaps

| Need | Status |
|------|--------|
| Enrollment progress | **Exists** — `PracticeService.getEnrollmentProgress` |
| Class paginated progress | **Exists** — `PracticeService.getClassProgress` |
| Batch across arbitrary enrollment set | **Not needed** — LP class method covers roster page |

**No PracticeModule changes required for MVP.**

---

## 35. LearningProgress public API gaps

| Need | Status |
|------|--------|
| Enrollment composed progress | **Exists** — includes practice + exam |
| Class paginated roster | **Exists** — missing exam per row |

**Optional future:** extend `ClassLearningProgressLearnerRow` with exam in LP module — **not recommended** (cross-boundary concern). Prefer orchestration merges exam batch in family-portal.

---

## 36. Exam public API gaps

| Need | Status | Recommendation |
|------|--------|----------------|
| Single enrollment summary | **Exists** — `getEnrollmentExamSummary` | Keep |
| Batch enrollment summaries | **Missing** | **Add in #002 prep:** `getEnrollmentExamSummariesByEnrollmentIds(enrollmentIds: readonly string[]): Promise<Map<string, EnrollmentExamSummarySnapshot>>` |
| Assignment attempt summaries | Internal service only | Do not export; batch enrollment method sufficient for roster |

---

## 37. Class/Enrollment/Student API gaps

| Service | Gap | Recommendation |
|---------|-----|----------------|
| `ClassService` | Batch get by IDs | Add `getClassSnapshotsByIds` (#002 prep) |
| `EnrollmentQueryService` | Guardian student list | **Exists** — `listStudentIdsForGuardian` |
| `StudentService` | Batch snapshots | **Exists** — `getStudentSnapshotsByIds` |
| `ClassCatechistAssignmentService` | Assigned class IDs | **Exists** — `listAssignedClassIds` |

---

## 38. Batch API recommendations

Implement in **owning modules** before or during #002 (narrow additive public methods):

1. **ExamModule:** `ExamService.getEnrollmentExamSummariesByEnrollmentIds`
2. **ClassModule:** `ClassService.getClassSnapshotsByIds` (optional if class list paginated via assignment order)

Do not implement batch logic inside family-portal repositories.

---

## 39. Pagination / bounds

| Endpoint | Pagination |
|----------|------------|
| `/me/catechist/classes` | page/limit (max 50) |
| `/me/catechist/classes/:classId/roster` | page/limit (reuse LP max) |
| `/me/parent/children` | none MVP (bounded by guardian count); add limit if product requires |
| `/me/parent/enrollments/:id/progress` | N/A (single enrollment) |

---

## 40. Locale strategy

**MVP:** orchestration returns IDs, status codes, numeric metrics. Human-readable class/student names from domain snapshots (not translated). Curriculum lesson content localization remains on curriculum-delivery APIs.

Optional: pass `Accept-Language` through for future label fields — not required in MVP DTOs.

---

## 41. Error contract

| Error | HTTP | When |
|-------|------|------|
| `ActorNotCatechistError` | 403 | No active assignments |
| `ActorNotParentError` | 403 | No active guardian links |
| `CatechistClassAccessDeniedError` | 403 | Unassigned class |
| `ParentChildAccessDeniedError` | 403 | Unlinked student |
| `ParentEnrollmentAccessDeniedError` | 403 | Enrollment not for linked child |
| Domain not-found | 404 | Invalid UUID / missing resource where safe |
| Foreign resource | **403** preferred over 404 when id exists but out of scope |

Reuse domain errors (`GuardianNotLinkedToStudentError`, `LearningProgressClassProgressAccessDeniedError`) where applicable.

---

## 42. Attendance defer

**ATTENDANCE DEFERRED: YES**

No attendance fields in DTOs. Future `AttendanceModule` provides class-day summary via public API hook documented in #005.

---

## 43. Schedule defer

**SCHEDULE DEFERRED: YES**

No calendar endpoints. Future Schedule module integrates separately.

---

## 44. Prayer defer

**PRAYER DEFERRED: YES**

No prayer memorization fields. Optional nullable `extensions` object **not** added in MVP (YAGNI).

---

## 45. Notifications defer

**NOTIFICATIONS DEFERRED: YES**

No notification preferences or delivery in family-portal. Future module uses guardian/class targeting contracts.

---

## 46. Class materials decision

Reuse curriculum-delivery and media public APIs when FE needs content links. **No** dedicated class-materials orchestration in MVP family-portal scope.

---

## 47. Recent activity decision

**Deferred.** Recent practice session / exam attempt feed requires additional batch queries and UX contract. Out of 4–5 prompt budget unless #004 has spare capacity.

---

## 48. FE contract

Catechist portal can render from:

1. `GET /me/catechist/context`
2. `GET /me/catechist/classes`
3. `GET /me/catechist/classes/:classId/roster`

Parent portal:

1. `GET /me/parent/context`
2. `GET /me/parent/children`
3. `GET /me/parent/enrollments/:enrollmentId/progress`
4. Existing exam result route for detail drill-down

No Attendance/Schedule/Prayer/Notification UI claims in MVP contract.

---

## 49. Mobile contract

- Bounded payloads per screen
- Stable UUIDs and enum strings
- ISO UTC timestamps
- Paginated roster/classes
- ≤ 3 API calls for typical catechist class screen (context optional on return visits)

---

## 50. Test strategy (for #002–#005)

| Layer | Coverage |
|-------|----------|
| Unit | mappers, scope coordinator, composition logic |
| Integration | MSSQL composition with demo seeds |
| DB e2e | Parent A ≠ Parent B child; Catechist unassigned class 403; Parent class aggregate 403; admin `/me` routes |
| Performance | roster page service-call budget; no O(n) exam summary loops |
| Module boundaries | family-portal does not import foreign repos; domain modules do not import family-portal |

---

## 51. Risks

| Risk | Mitigation |
|------|------------|
| God module drift | Strict GET-only MVP; zero tables; single facade |
| N+1 on roster | Batch exam API in ExamModule |
| Parent class-wide leakage | Never call `getClassLearningProgress` for parent routes |
| PII exposure | DTO allow-list fields |
| Baseline regression | Fix seed cleanup before #002 |
| Permission-only checks | Mandatory relationship scope coordinator |

---

## 52. BLOCKER / HIGH / MEDIUM / LOW

| ID | Severity | Finding | Action |
|----|----------|---------|--------|
| F-001 | **BLOCKER** | `quality:full` integration fail — exam FK on seed cleanup | Fix cleanup SQL in 3 integration specs before #002 |
| F-002 | MEDIUM | Missing batch exam summary public API | Add in ExamModule (#002 prep) |
| F-003 | LOW | Missing batch class snapshot API | Add in ClassModule if class list > 1 query |
| F-004 | LOW | Handoff report untracked | Informational only |

**Unresolved BLOCKER: 1**  
**Unresolved HIGH: 0**

---

## 53. Files created

| Path | Purpose |
|------|---------|
| `docs/CATECHIST_PARENT_001_DOMAIN_AUDIT_ORCHESTRATION_DESIGN_REPORT.md` | This report |

---

## 54. Files modified

**None** (audit-only per prompt #001).

---

## 55. Commands run

```bash
git status
node --version          # v22.23.1
npm --version           # 11.16.0
npm run test:db:prepare -- --reset
npm run quality:full    # FAIL at test:integration
npm audit --audit-level=moderate  # PASS
wsl docker build --target production -t catechism-api:family-portal-baseline .
```

---

## 56. Validation summary

| Command | Result |
|---------|--------|
| format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit tests | PASS (624) |
| e2e | PASS (5) |
| build | PASS |
| test:integration | **FAIL** (7 tests / 3 suites) |
| npm audit moderate+ | PASS |
| Docker production | PASS |

---

## 57. Exact API contract (MVP)

### Catechist (all GET, JWT + scope)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/me/catechist/context` | Actor bootstrap |
| GET | `/api/v1/me/catechist/classes` | Paginated assigned class summaries |
| GET | `/api/v1/me/catechist/classes/:classId/roster` | Paginated roster + compact LP/Practice/Exam |

### Parent (all GET, JWT + scope)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/me/parent/context` | Actor bootstrap |
| GET | `/api/v1/me/parent/children` | Linked active children + active enrollments |
| GET | `/api/v1/me/parent/enrollments/:enrollmentId/progress` | Composed enrollment progress |

**Removed redundancy:** no separate `/me/parent/children/:studentId/progress`; use enrollment-scoped route.

---

## 58. Exact prompt plan (5 prompts)

| # | Title | Scope |
|---|-------|-------|
| **001** | Domain audit + orchestration design | **Done (this report)** |
| **002** | Catechist context + classes + roster | Module shell, scope coordinator, catechist controllers, batch exam API in ExamModule, tests |
| **003** | Parent context + children + enrollment progress | Parent controllers, guardian scope, LP delegation, tests |
| **004** | RBAC/security/performance/contract hardening | Denial matrix, N+1 verification, OpenAPI, README, module-boundaries spec update |
| **005** | Final audit + demo seed + Postman + quality:full + Docker | Idempotent seed, Postman collection, phase completion gate |

**Pre-#002 hygiene (recommended):** fix integration seed cleanup for exam tables (BLOCKER F-001).

---

## 59. #002 readiness

| Gate | Met |
|------|-----|
| baseline quality:full PASS | **NO** |
| Docker PASS | **YES** |
| BLOCKER=0 | **NO** (1 open) |
| HIGH=0 | **YES** |
| module boundary selected | **YES** (`family-portal`) |
| exact API contract ready | **YES** |
| N+1 strategy ready | **YES** |
| public method additions identified | **YES** |

**#002 READINESS: NO** — fix F-001 first, then proceed to:

> CATECHIST + PARENT #002/5 — Catechist Context + Assigned Class + Roster Read Models

---

## 60. Commit recommendation

**None.** Prompt #001 is audit-only; no tracked production files modified. Do not commit unless user explicitly requests.

---

**END OF REPORT**
