# ATTENDANCE + CLASS OPERATIONS #001/5 — Domain Audit + Ownership + Workflow + API Design

**Date:** 2026-09-04  
**Mode:** AUDIT / DESIGN ONLY — no production implementation  
**Prior phase:** Catechist + Parent Supporting APIs — COMPLETE  
**Next:** Persistence foundation (#002) only after GO

---

## 1. Objective

Define the Attendance + Class Operations bounded context before coding: module strategy, table ownership, session/attendance models, RBAC, bulk write contract, historical safety, Parent/Student read decisions, and a 5-prompt implementation plan.

---

## 2. Roadmap position

| Phase | Status |
|-------|--------|
| Class / Student / Catechist / Parent / Enrollment | COMPLETE (`CLASS_007A`) |
| Curriculum / Learning Content / Practice / Exam / Localization | COMPLETE (prior phases) |
| Family Portal (Catechist + Parent supporting APIs) | COMPLETE (`CATECHIST_PARENT_005`) |
| **Attendance + Class Operations** | **#001/5 AUDIT (this report)** |

No attendance, class-session, or class-meeting tables/APIs exist in `src/` today. Mentions are deferred-only in Family Portal / Class design docs.

---

## 3. Existing Class / Enrollment ownership

### Class (`ClassModule`)

- Tables: `classes`, `class_catechist_assignments`
- Class statuses: `PLANNED | ACTIVE | COMPLETED | CANCELLED` (soft lifecycle; no hard-delete)
- Catechist assignment: `ACTIVE | ENDED`; role `LEAD` only; filtered unique active `(classId, catechistUserId)`
- Public APIs: `ClassService`, `ClassCatechistAssignmentService`, `ClassScopeService`
- Permissions: `classes.read`, `classes.manage`, `class-catechists.read`, `class-catechists.manage`

### Enrollment (`EnrollmentModule`)

- Table: `enrollments` — statuses `ACTIVE | COMPLETED | WITHDRAWN | TRANSFERRED`
- Unique active: `(studentId, academicYearId, parishId) WHERE ACTIVE`
- Transfer creates new ACTIVE enrollment and marks source TRANSFERRED + `leftAt`
- Public APIs: `EnrollmentService`, `EnrollmentQueryService` (batch active-by-class/student), guardian scope ports
- Permissions: `enrollments.read`, `enrollments.manage`

**Implication:** Attendance must key off **`enrollmentId`** (CLASS_001 prior recommendation). Transfers produce new enrollment IDs; session roster snapshots preserve historical membership.

---

## 4. Existing Catechist / Parent integration

- Family Portal composes Class/Enrollment/LP/Exam read models; **exports `FamilyPortalService` only**; Attendance deferred.
- Catechist scope already proven: ACTIVE class assignment via `assertCatechistAssigned` / `ClassScopeService`.
- Parent scope: ACTIVE `student_guardians` + enrollment student derivation.
- Student: `learner.self` / enrollment self-scope patterns exist for learner APIs.
- Student entity PII is minimal (`fullName`, `status`, optional `userId`) — suitable for roster display name.

---

## 5. Module strategy options

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. One `class-operations` module** | Owns sessions + roster snapshot + attendance | Clear operations BC; ClassModule stays thin; extractable as “class ops” service | Slightly broader than “attendance-only” name |
| **B. Two modules `class-schedule` + `attendance`** | Split templates/occurrences vs marks | Clean future schedule extraction | Premature; MVP has no recurring templates; dual write path |
| **C. Attendance module consuming Class-owned sessions** | Sessions in ClassModule | Attendance thin | Turns ClassModule into god module; violates Class finalization |

---

## 6. Final module strategy

**One NestJS feature module** owning authoritative session occurrences, session roster snapshots, and attendance records.  
Recurring schedule templates are **out of MVP** and may later generate into this module’s `class_sessions` without owning attendance.

Do **not** put sessions into `ClassModule`.  
Do **not** put attendance into `FamilyPortalModule` or `LearningProgressModule`.

---

## 7. Final module name(s)

**FINAL MODULE NAME:** `class-operations`  
**Path:** `src/modules/class-operations/`  
**Nest module:** `ClassOperationsModule`  
**Primary public export (planned):** `ClassOperationsService` (facade) — or split exported `ClassSessionService` + `AttendanceService` if #002 prefers dual public APIs; still **one module**.

Internal services may include `ClassSessionService`, `AttendanceService`, `ClassSessionRosterService`, `ClassOperationsAccessService`.

---

## 8. Bounded-context definition

**In scope (MVP):**

- Create/list/get/update/cancel **class session occurrences** for a class
- Freeze/query **session roster** eligible for marking
- Bulk upsert **attendance** for a session
- Lock marks when session is **COMPLETED**
- Catechist/Admin writes; scoped reads
- Parent/Student **read** history + summary (phase #004)
- Compact Catechist “operations” list (upcoming/recent sessions + completion state)

**Out of scope:**

- Recurring schedule templates / full calendar engine
- Prayer Memorization, Notifications, messaging, lesson planner
- Writing into Learning Progress or Family Portal tables
- Hard-delete of sessions/attendance history
- Pastoral/confessional notes

---

## 9. Table ownership

| Table | Owner module |
|-------|----------------|
| `class_sessions` | `class-operations` |
| `class_session_roster` | `class-operations` |
| `attendance_records` | `class-operations` |

Class / Enrollment / Student tables remain owned by existing modules. Cross-module references use **scalar UUID** columns + SQL FKs with `ON DELETE NO ACTION` (project pattern).

---

## 10. Exact MVP table set

**NEW TABLES REQUIRED: 3**

1. `class_sessions`
2. `class_session_roster`
3. `attendance_records`

Not now: `class_schedule_templates`, `attendance_revisions`.

---

## 11. Class session model

Authoritative **occurrence** (not a template).

| Column | Type | Notes |
|--------|------|-------|
| `id` | uniqueidentifier PK | App-generated UUID v4 |
| `class_id` | uniqueidentifier NOT NULL | FK → `classes.id` |
| `parish_id` | uniqueidentifier NOT NULL | Denormalized scalar from class (query/scope) |
| `academic_year_id` | uniqueidentifier NOT NULL | Denormalized scalar from class |
| `title` | nvarchar(128) NULL | Optional short label |
| `starts_at` | datetime2 NOT NULL | **UTC** |
| `ends_at` | datetime2 NOT NULL | **UTC**; must be > `starts_at` |
| `status` | varchar(32) NOT NULL | See lifecycle |
| `cancelled_at` | datetime2 NULL | Set when CANCELLED |
| `completed_at` | datetime2 NULL | Set when COMPLETED |
| `created_by_user_id` | uniqueidentifier NOT NULL | Actor |
| `updated_by_user_id` | uniqueidentifier NULL | Last editor |
| `created_at` / `updated_at` | datetime2 | GETUTCDATE defaults |

Indexes:

- `IX_class_sessions_class_id_starts_at` `(class_id, starts_at)`
- `IX_class_sessions_parish_id_starts_at` `(parish_id, starts_at)`
- `IX_class_sessions_status`

Checks:

- `ends_at > starts_at`
- status ∈ lifecycle set
- CANCELLED ⇒ `cancelled_at IS NOT NULL`; else NULL
- COMPLETED ⇒ `completed_at IS NOT NULL`; else NULL

---

## 12. Session lifecycle

```text
SCHEDULED ──► COMPLETED
     │
     └──► CANCELLED
```

| Transition | Rules |
|------------|-------|
| create | Always `SCHEDULED` |
| PATCH metadata/times | Only while `SCHEDULED` |
| cancel | `SCHEDULED → CANCELLED` (soft); attendance optional/frozen as-is |
| complete | `SCHEDULED → COMPLETED`; **locks attendance writes** |
| reopen COMPLETED | **Not in MVP** (avoids audit complexity) |

No `RESCHEDULED` status — edit `starts_at`/`ends_at` while `SCHEDULED`.  
No hard DELETE endpoint.

---

## 13. Time / timezone model

- Persist **UTC** `datetime2` for `starts_at` / `ends_at` / mark timestamps.
- Parish has `defaultLocale` only — **no IANA timezone field** today.
- Clients convert for display; server validates ordering only.
- Future: parish timezone may be added later for local “today” helpers; not required for MVP correctness.

**TIME MODEL READY:** YES (UTC source of truth).

---

## 14. Attendance status model

Persisted mark statuses:

| Status | Meaning |
|--------|---------|
| `PRESENT` | Present |
| `ABSENT` | Absent unexcused |
| `LATE` | Present but late (counts toward presence rate) |
| `EXCUSED` | Absent with excuse |

**UNMARKED:** **absence of `attendance_records` row** (roster row may exist).  
Do **not** persist an `UNMARKED` enum value.

---

## 15. Attendance identity

**Unique key:** `(session_id, enrollment_id)`  
Attendance is enrollment/class-contextual.

Optional denormalized `student_id` on attendance row for stable display/history after transfer (copied from roster at upsert). Canonical identity remains `(sessionId, enrollmentId)`.

---

## 16. Enrollment eligibility

| Enrollment state | On roster freeze | Markable |
|------------------|------------------|----------|
| ACTIVE at freeze time | Included | Yes |
| WITHDRAWN / TRANSFERRED / COMPLETED before freeze | Excluded | N/A |
| Added ACTIVE after freeze | Not auto-included | Optional admin “refresh roster” only while SCHEDULED & zero marks (see below) |
| Class not ACTIVE | Session create rejected | N/A |

---

## 17. Session roster snapshot decision

**SESSION ROSTER SNAPSHOT REQUIRED: YES**

Table `class_session_roster`:

| Column | Notes |
|--------|-------|
| `id` | PK |
| `session_id` | FK → `class_sessions` |
| `enrollment_id` | Scalar FK → `enrollments` |
| `student_id` | Denormalized scalar FK → `students` |
| `display_name_snapshot` | nvarchar copy of `fullName` at freeze |
| `created_at` | Freeze time |

Unique: `(session_id, enrollment_id)`.

**Freeze policy:**

1. On session create (or explicit “open for marking”), snapshot all **ACTIVE** enrollments for `class_id` via `EnrollmentQueryService` / `listEnrollmentsByClass`.
2. While `SCHEDULED` and **no attendance rows yet**, Catechist/Admin may **refresh roster** once (replace snapshot) to pick up late enrollments.
3. After first attendance upsert **or** session COMPLETED/CANCELLED: roster immutable.

**Why not attendance-rows-only:** empty unmarked learners would vanish from UI; transfers would rewrite history without a frozen set.

**Why not JSON blob:** less queryable, weaker extraction/reporting.

---

## 18. Historical integrity

- Soft session cancel/complete; no cascade delete of attendance.
- SQL FKs `ON DELETE NO ACTION` to class/enrollment/student.
- Roster + attendance retain `enrollment_id` / `student_id` even if enrollment later TRANSFERRED/WITHDRAWN.
- Class ARCHIVE/COMPLETED does not delete sessions; list filters may hide cancelled by default.

**HISTORICAL RETENTION SAFE BY DESIGN: YES**

---

## 19. Catechist write policy

Writer if:

1. Authenticated user has role **CATECHIST**, and
2. ACTIVE `class_catechist_assignments` for session’s `class_id`, and
3. Holds `class-sessions.manage` / `attendance.manage` as applicable.

Today only `LEAD` assignment role exists — all ACTIVE assigned catechists may mark.  
No global-role-only bypass.

---

## 20. Admin write policy

- **PARISH_ADMIN:** parish membership matches session `parish_id` + manage permissions.
- **SUPER_ADMIN:** global.

Reuse `ClassScopeService` / `ParishScopeService` patterns; do not invent client-supplied parish trust.

---

## 21. Parent / Student write policy

| Actor | Session write | Attendance write |
|-------|---------------|------------------|
| PARENT | **NO** | **NO** |
| STUDENT | **NO** | **NO** |

---

## 22. Session permission model

| Permission | Purpose |
|------------|---------|
| `class-sessions.read` | List/get sessions; Catechist assigned / Parent linked / Student self / Admin |
| `class-sessions.manage` | Create/update/cancel/complete/refresh roster |

Do **not** overload `classes.manage` for session lifecycle (keeps Class catalog vs operations separate). Session create still requires readable/manageable class under existing class scope.

---

## 23. Attendance permission model

| Permission | Purpose |
|------------|---------|
| `attendance.read` | Session roster+marks; Parent/Student history |
| `attendance.manage` | Bulk upsert marks |

---

## 24. New RBAC permissions

**NEW RBAC PERMISSIONS REQUIRED: YES**

Proposed seed matrix (align with Exam pattern in `auth-rbac.seed.constants.ts`):

| Permission | SUPER_ADMIN | PARISH_ADMIN | CATECHIST | PARENT | STUDENT |
|------------|-------------|--------------|-----------|--------|---------|
| `class-sessions.read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `class-sessions.manage` | ✓ | ✓ | ✓ | | |
| `attendance.read` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `attendance.manage` | ✓ | ✓ | ✓ | | |

Scope still enforced in services (assignment / guardian / self / parish).

---

## 25. Attendance locking / finalization

**MVP choice: A — COMPLETED session locks attendance.**

- Upserts allowed only when `session.status === SCHEDULED`.
- Transition to COMPLETED sets `completed_at` and freezes marks + roster.
- CANCELLED: no further upserts; existing marks retained for audit; summaries exclude cancelled sessions.

No separate `attendanceFinalizedAt` column in MVP (status is enough).

---

## 26. History / revision decision

**ATTENDANCE HISTORY TABLE REQUIRED NOW: NO**

MVP fields on `attendance_records`: `marked_by_user_id`, `marked_at`, `updated_by_user_id`, `updated_at`, optional `note`.  
Immutable revision table deferred until compliance requires it.

---

## 27. Bulk marking contract

Primary API:

```http
PUT /api/v1/class-sessions/:sessionId/attendance
```

```json
{
  "records": [
    { "enrollmentId": "…", "status": "PRESENT" },
    { "enrollmentId": "…", "status": "EXCUSED", "note": "Family travel" }
  ]
}
```

Rules:

- **Transactional all-or-nothing** for the request payload.
- Each `enrollmentId` must exist on **session roster**.
- Upsert by `(sessionId, enrollmentId)`.
- **Omitted roster learners remain UNMARKED** (no row deleted unless explicit clear — MVP: no clear-all; optional future `status: null` not supported).
- To change a mark: resubmit that enrollment with new status.
- Optional per-record PATCH **deferred** (bulk PUT is enough for mobile).

---

## 28. Idempotency model

**IDEMPOTENCY MODEL:**

- PUT + unique `(session_id, enrollment_id)` ⇒ **idempotent upsert** for identical payloads.
- Retries safe if client resends same records.
- **No `clientRequestId` in MVP** (unlike Exam attempts) — session scoped PUT is naturally idempotent per enrollment set.
- Duplicate enrollment IDs in one payload → **400** validation error.

**IDEMPOTENCY MODEL READY: YES**

---

## 29. Concurrency model

**CONCURRENCY MODEL:**

- Single DB transaction for bulk upsert.
- Last successful transaction wins per enrollment (acceptable for MVP parish classroom use).
- If session status changed to COMPLETED/CANCELLED mid-flight → **409** `ClassSessionNotEditable` / `AttendanceAlreadyFinalized`.
- Optimistic row version **deferred** unless field collisions appear in #003/#004.

**CONCURRENCY MODEL READY: YES**

---

## 30. Session CRUD / API design

| Method | Route | Permission | Notes |
|--------|-------|------------|-------|
| POST | `/api/v1/classes/:classId/sessions` | `class-sessions.manage` | Create SCHEDULED + freeze roster |
| GET | `/api/v1/classes/:classId/sessions` | `class-sessions.read` | Paginated; filters: from/to/status |
| GET | `/api/v1/class-sessions/:sessionId` | `class-sessions.read` | Detail |
| PATCH | `/api/v1/class-sessions/:sessionId` | `class-sessions.manage` | Title/times while SCHEDULED |
| POST | `/api/v1/class-sessions/:sessionId/cancel` | `class-sessions.manage` | Soft cancel |
| POST | `/api/v1/class-sessions/:sessionId/complete` | `class-sessions.manage` | Complete + lock attendance |
| POST | `/api/v1/class-sessions/:sessionId/roster/refresh` | `class-sessions.manage` | Only SCHEDULED + zero marks |

No DELETE.

Optional compact operations list:

| GET | `/api/v1/me/catechist/classes/:classId/sessions/summary` | **Defer** — use class sessions list in MVP to avoid Family Portal coupling |

---

## 31. Attendance read API design

| Method | Route | Permission |
|--------|-------|------------|
| GET | `/api/v1/class-sessions/:sessionId/attendance` | `attendance.read` |
| PUT | `/api/v1/class-sessions/:sessionId/attendance` | `attendance.manage` |

Response includes roster rows LEFT JOIN marks (status null ⇒ unmarked), plus session completion flags.

Enrollment summary (Catechist/Admin/Parent/Student as scoped):

| GET | `/api/v1/enrollments/:enrollmentId/attendance-summary` | `attendance.read` |
| GET | `/api/v1/enrollments/:enrollmentId/attendance` | `attendance.read` | Paginated history |

---

## 32. Parent read API decision

**Include in this phase (prompt #004), not Family Portal.**

| Method | Route |
|--------|-------|
| GET | `/api/v1/me/parent/enrollments/:enrollmentId/attendance` |
| GET | `/api/v1/me/parent/enrollments/:enrollmentId/attendance-summary` |

Rules: PARENT role + ACTIVE guardian link to enrollment’s student (same pattern as Family Portal progress).  
**Do not** implement inside `FamilyPortalModule` in MVP — keep ownership in `class-operations`; Family Portal may later compose via public API.

**PARENT READ CONTRACT READY: YES** (designed for #004)

---

## 33. Student read API decision

**Include in this phase (prompt #004).**

| Method | Route |
|--------|-------|
| GET | `/api/v1/me/learner/enrollments/:enrollmentId/attendance` |
| GET | `/api/v1/me/learner/enrollments/:enrollmentId/attendance-summary` |

Rules: STUDENT self-scope on enrollment (existing learner patterns).

**STUDENT READ CONTRACT READY: YES** (designed for #004)

---

## 34. Attendance summary formula

For an enrollment (or class aggregate later):

**Eligible sessions** = sessions for the enrollment’s class where:

- `status = COMPLETED` (exclude CANCELLED; exclude future SCHEDULED)
- enrollment appears on that session’s **roster**

| Metric | Definition |
|--------|------------|
| `totalSessions` | Count eligible sessions |
| `presentCount` | Marks `PRESENT` |
| `lateCount` | Marks `LATE` |
| `absentCount` | Marks `ABSENT` |
| `excusedCount` | Marks `EXCUSED` |
| `unmarkedCount` | Eligible sessions with no attendance row |
| `attendanceRatePercent` | `round(100 * (presentCount + lateCount) / totalSessions)` when `totalSessions > 0`; else `0` |

**LATE** counts as attended for rate.  
**EXCUSED** does **not** count as attended (but is not ABSENT).  
**UNMARKED** lowers rate (treated as non-present). Catechist UX should discourage leaving COMPLETED sessions unmarked.

---

## 35. Class operations dashboard scope

MVP Catechist needs (via session list + attendance GET):

- Upcoming SCHEDULED sessions
- Recent COMPLETED/CANCELLED
- Per-session: roster size, marked count, completion state

Explicitly **not** in MVP: prayer, notifications, messaging, lesson planner, full calendar UI APIs.

---

## 36. Future Schedule integration

Deferred `ClassScheduleTemplate` (future module or extension) may **insert** `class_sessions` rows.  
Attendance continues to own occurrences and marks.  
No template tables in #002–#005.

---

## 37. FamilyPortal integration boundary

```text
FamilyPortal ──reads──► ClassOperations public API (future)
ClassOperations ──X──► FamilyPortal   (forbidden)
```

- Attendance data owned exclusively by `class-operations`.
- Parent attendance reads use `/me/parent/...` **in this module** for MVP (parallel to Family Portal style), not by expanding Family Portal tables.
- Later optional: Family Portal facade methods calling `ClassOperationsService`.

**FAMILY PORTAL INTEGRATION BOUNDARY READY: YES**

---

## 38. LearningProgress boundary

```text
LearningProgress ──X──► attendance tables
ClassOperations ──X──► lesson_progress writes
```

Future LP dashboards may **read** attendance summaries via public `ClassOperationsService` only. No shared tables; no cycles.

---

## 39. Cross-module dependency graph

```text
ClassOperationsModule
  → ClassModule (class snapshot, assignment assert, class scope)
  → EnrollmentModule (active enrollments, snapshots, guardian/self access helpers)
  → StudentModule (name snapshot at freeze)
  → AuthModule + AccessControlModule
  → ParishModule (parish assert/scope as needed)

ClassModule ──X──► ClassOperations
EnrollmentModule ──X──► ClassOperations
FamilyPortalModule ──X──► ClassOperations (MVP); future optional read dependency only
LearningProgressModule ──X──► ClassOperations
```

---

## 40. FK / scalar-ID strategy

- Entities: scalar UUID columns only (no TypeORM relation graphs across modules).
- Migrations: SQL FKs to `classes`, `enrollments`, `students`, `parishes`, `academic_years`, `users` with `ON DELETE NO ACTION`.
- Public APIs exchange IDs + snapshots, never entities.

---

## 41. Deletion / cascade safety

| Event | Behavior |
|-------|----------|
| Class COMPLETED/CANCELLED | Sessions retained; create new sessions may be blocked if class not ACTIVE |
| Enrollment TRANSFERRED/WITHDRAWN | Historical roster/attendance retained |
| Student INACTIVE | Historical rows retained |
| Session CANCELLED | Soft status; rows retained |
| Hard DELETE class/enrollment | Blocked by FKs / not exposed in APIs |

---

## 42. Error contract

| Error | HTTP | When |
|-------|------|------|
| validation / bad UUID | 400 | DTO/pipes |
| unauthenticated | 401 | JWT |
| `ClassSessionAccessDenied` / attendance scope | 403 | Wrong actor/scope |
| `ClassSessionNotFound` | 404 | Unknown id (or opaque 403 if leaking — prefer 404 for unknown UUID after auth) |
| `ClassSessionNotEditable` | 409 | PATCH/mark on COMPLETED/CANCELLED |
| `AttendanceAlreadyFinalized` | 409 | Mark after COMPLETED |
| `AttendanceEnrollmentNotInSessionRoster` | 422 or 400 | enrollment not on roster |
| unique violation (shouldn’t surface) | 409 | Defensive |

Only keep errors that map cleanly; align with project’s existing 422 usage where present.

---

## 43. DTO design

Module-owned HTTP DTOs (Swagger):

- `CreateClassSessionDto`, `UpdateClassSessionDto`, `ListClassSessionsQueryDto`
- `ClassSessionResponseDto`, `ClassSessionListResponseDto`
- `BulkAttendanceUpsertDto` / `AttendanceRecordInputDto`
- `SessionAttendanceResponseDto` (roster + mark)
- `EnrollmentAttendanceHistoryItemDto`, `AttendanceSummaryResponseDto`

Separate persistence entities from response DTOs; no entity leakage.

---

## 44. FE contract

**Catechist Web:**

- Session list/calendar-lite for a class
- Create/edit/cancel/complete session
- Open roster → bulk mark → save (PUT)
- See unmarked counts before complete

**Parish Admin:** same within parish.

**Parent Web:** child attendance history + summary (phase #004).

**FE CONTRACT READY: YES**

---

## 45. Mobile contract

Same as Catechist FE for assigned classes; bulk PUT retry-safe.  
Parent/Student mobile read-only history/summary.

**MOBILE CONTRACT READY: YES**  
**CATECHIST WRITE CONTRACT READY: YES**  
**BULK ATTENDANCE CONTRACT READY: YES**

---

## 46. Privacy / data minimization

- Roster: `enrollmentId`, `studentId`, `displayNameSnapshot`, mark status, optional note
- No DOB/address/phone/email/guardian contacts
- No public endpoints
- Optional `note`: max 500 chars; allowed primarily with `EXCUSED`/`ABSENT`; **no pastoral/confessional content**; never log note bodies at info level
- Parent sees linked child only; Student self only; Catechist assigned class only

---

## 47. Performance / N+1 strategy

- Roster freeze: **one** batch list of active enrollments + optional batch student names
- Attendance GET: one roster query + one attendance query by `sessionId` (JOIN/map in memory)
- Bulk PUT: single transaction; set-based upsert where practical
- History/summary: bounded queries by `enrollment_id` + session filters; indexed FKs
- No per-learner service loops across modules

---

## 48. Demo seed strategy (#005)

Orchestration seed after class-enrollment (+ optional curriculum not required):

- Ensure demo class A + ACTIVE enrollments + assigned catechist
- Create 2–3 COMPLETED sessions with mixed marks
- Create 1 upcoming SCHEDULED session unmarked
- Stable for Postman Catechist/Parent/Student flows

Script naming candidate: `seed:class-operations-demo` / `seed:attendance-demo`.

---

## 49. Postman strategy (#005)

Collection: `docs/postman/Acutis-Education-Class-Operations.postman_collection.json`

Flows: login → create session → get attendance → bulk PUT → complete → Parent/Student reads → denials (unassigned catechist, foreign child, parent write attempt).

---

## 50. Test strategy

**Unit:** lifecycle transitions, status validation, summary math, scope helpers, bulk upsert merge, lock on COMPLETED.

**Integration (MSSQL):** session create+roster freeze, refresh rules, bulk upsert, transfer does not rewrite historical roster, summaries.

**DB e2e:** assigned Catechist happy path; unassigned 403; Parent own child; foreign child 403; Student self; ParishAdmin parish; SuperAdmin; COMPLETED lock 409; duplicate enrollment in payload 400; unique constraint safety.

---

## 51. Risks / deferred

| Item | Severity | Notes |
|------|----------|-------|
| No parish IANA timezone | LOW | UTC + client conversion; “today” UX later |
| No attendance revision table | LOW | Sufficient for MVP |
| No session reopen | LOW | Avoids audit ambiguity |
| Assistant catechist roles | LOW | Only LEAD exists |
| Family Portal facade for attendance | LOW | Parallel `/me/parent` routes first |
| Recurring schedules | MEDIUM (deferred) | Explicit future integration |
| Concurrent last-write-wins | LOW | Acceptable classroom MVP |

---

## 52. BLOCKER / HIGH / MEDIUM / LOW

| Level | Count | Items |
|-------|-------|-------|
| BLOCKER | **0** | — |
| HIGH | **0** | — |
| MEDIUM | **0** (deferred schedule is intentional, not a design gap) | Recurring templates deferred by design |
| LOW | **4** | Timezone field absent; no revisions; no reopen; EOL format noise on baseline |

---

## 53. Baseline validation

| Gate | Result | Notes |
|------|--------|-------|
| `node` / `npm` | `v22.23.1` / `10.9.8` | |
| `format:check` | **FAIL** | Pre-existing CRLF (`Delete ␍`) on ~17 #004 Family Portal / related files |
| `lint` | **FAIL** | Same CRLF Prettier errors only (~3437 `prettier/prettier` fixable); no Attendance code involved |
| `typecheck` | **PASS** *(re-verified in isolated run)* | |
| `npm test` | **PASS** *(re-verified)* | |
| `build` | **PASS** *(re-verified)* | |
| `npm audit --audit-level=moderate` | **PASS** *(re-verified)* | |
| `quality:full` | **NOT RUN** | Audit-only; EOL noise would fail early; fix in #002 workspace hygiene before persistence |

Baseline does **not** block design GO. EOL drift is environmental from prior Family Portal checkout on Windows; **this audit did not modify production code**. #002 should run `npm run format` once as hygiene before/with schema work.

---

## 54. Exact API inventory (MVP)

### Sessions

1. `POST /api/v1/classes/:classId/sessions`
2. `GET /api/v1/classes/:classId/sessions`
3. `GET /api/v1/class-sessions/:sessionId`
4. `PATCH /api/v1/class-sessions/:sessionId`
5. `POST /api/v1/class-sessions/:sessionId/cancel`
6. `POST /api/v1/class-sessions/:sessionId/complete`
7. `POST /api/v1/class-sessions/:sessionId/roster/refresh`

### Attendance writes/reads (staff)

8. `GET /api/v1/class-sessions/:sessionId/attendance`
9. `PUT /api/v1/class-sessions/:sessionId/attendance`

### Enrollment-scoped reads

10. `GET /api/v1/enrollments/:enrollmentId/attendance`
11. `GET /api/v1/enrollments/:enrollmentId/attendance-summary`

### Parent / Student me-routes (#004)

12. `GET /api/v1/me/parent/enrollments/:enrollmentId/attendance`
13. `GET /api/v1/me/parent/enrollments/:enrollmentId/attendance-summary`
14. `GET /api/v1/me/learner/enrollments/:enrollmentId/attendance`
15. `GET /api/v1/me/learner/enrollments/:enrollmentId/attendance-summary`

---

## 55. Exact prompt plan

**FINAL RECOMMENDED PROMPT COUNT: 5**

| Prompt | Focus |
|--------|-------|
| **#001/5** | Domain audit + schema/API design (**this report**) |
| **#002/5** | Persistence foundation: entities, migration, enums, module shell, access stubs |
| **#003/5** | Catechist/Admin session APIs + roster freeze/refresh + bulk attendance + complete/cancel |
| **#004/5** | Parent/Student reads + summaries + RBAC/security/performance/OpenAPI hardening |
| **#005/5** | Final audit + demo seed + Postman + quality:full + Docker |

Five is cleaner than four because Parent/Student privacy scope deserves a dedicated hardening gate after write APIs exist.

---

## 56. #002 readiness

| Gate | Status |
|------|--------|
| BLOCKER=0 / HIGH=0 | YES |
| Module strategy decided | YES — one `class-operations` |
| Table set decided | YES — 3 tables |
| Lifecycle ready | YES |
| Status model ready | YES |
| Roster snapshot decision | YES |
| RBAC ready | YES — 4 new permissions |
| Historical retention safe | YES |
| Bulk contract ready | YES |
| Idempotency/concurrency ready | YES |

**GO / NO-GO FOR IMPLEMENTATION: GO**

Recommend next:

**ATTENDANCE + CLASS OPERATIONS #002/5 — PERSISTENCE FOUNDATION + SESSION / ATTENDANCE SCHEMA**

Do **not** auto-implement.

---

## 57. Commit recommendation

Audit-only; no intentional production code changes.  
**No commit recommended.**

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| GO / NO-GO FOR IMPLEMENTATION | **GO** |
| FINAL MODULE STRATEGY | **One module** |
| FINAL MODULE NAME(S) | **`class-operations`** |
| NEW TABLES REQUIRED | **3** |
| SESSION ROSTER SNAPSHOT REQUIRED | **YES** |
| ATTENDANCE HISTORY TABLE REQUIRED NOW | **NO** |
| NEW RBAC PERMISSIONS REQUIRED | **YES** |
| CATECHIST WRITE CONTRACT READY | **YES** |
| PARENT READ CONTRACT READY | **YES** |
| STUDENT READ CONTRACT READY | **YES** |
| BULK ATTENDANCE CONTRACT READY | **YES** |
| IDEMPOTENCY MODEL READY | **YES** |
| CONCURRENCY MODEL READY | **YES** |
| HISTORICAL RETENTION SAFE BY DESIGN | **YES** |
| FAMILY PORTAL INTEGRATION BOUNDARY READY | **YES** |
| FE CONTRACT READY | **YES** |
| MOBILE CONTRACT READY | **YES** |
| FINAL RECOMMENDED PROMPT COUNT | **5** |

Unresolved BLOCKER count: **0**  
Unresolved HIGH count: **0**
