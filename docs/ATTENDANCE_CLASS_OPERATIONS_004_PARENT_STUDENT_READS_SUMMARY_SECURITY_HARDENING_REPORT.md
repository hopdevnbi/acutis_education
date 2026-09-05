# ATTENDANCE + CLASS OPERATIONS #004/5 — Parent / Student Attendance Reads + Summary + Security / Performance / Contract Hardening

**Date:** 2026-09-05  
**Mode:** IMPLEMENTATION — learner/guardian reads + hardening  
**Prior:** #003/5 Staff session/roster/bulk attendance APIs — GO  
**Next:** #005/5 Final audit + demo seed + Postman + phase completion (not implemented here)

---

## 1. Objective

Complete enrollment attendance history/summary read contracts for staff, Parent, and Student; harden RBAC/scope, summary formula, historical roster semantics, note privacy, pagination, N+1/query design, OpenAPI/README; validate with unit/integration/DB e2e/quality:full/Docker. Do **not** implement demo seed, Postman, or declare phase complete.

---

## 2. State inherited

From #003: nine staff endpoints, three owned tables, roster freeze, bulk PUT, Catechist/ParishAdmin/SuperAdmin scope, facade-only export, green quality/Docker.

---

## 3. Files created

- Controllers: `enrollment-attendance.controller.ts`, `parent-attendance.controller.ts`, `learner-attendance.controller.ts`
- DTOs: history query, staff/learner history items + responses, attendance summary response
- Specs: `attendance-summary.util.spec.ts`, `class-operations-response.mapper.spec.ts` (extended coverage)
- `test/integration/class-operations-attendance-reads.integration-spec.ts`
- `test/class-operations-attendance-reads.db.e2e-spec.ts`
- This report

---

## 4. Files modified

- `class-operations.module.ts` — register three new controllers
- `attendance.service.ts` — set-based history + aggregate summary
- `class-operations.service.ts` — facade history/summary
- `class-operations-access.service.ts` — staff enrollment read, Parent guardian, Student self (+ role gates)
- `class-operations-http.util.ts` — `EnrollmentNotFoundError` → 404; `InvalidEnrollmentIdError` → 400
- Response mapper — staff vs learner-safe history; summary DTO
- Constants — history pagination defaults (1/20/max 50)
- `role-codes.constants.ts` — `STUDENT_ROLE_CODE`
- Access/HTTP unit specs
- `README.md` — Class Operations reads + formula + privacy

---

## 5. Final route inventory

Exactly **15** Class Operations endpoints:

1–9. Staff session/attendance routes from #003  
10. `GET /api/v1/enrollments/:enrollmentId/attendance`  
11. `GET /api/v1/enrollments/:enrollmentId/attendance-summary`  
12. `GET /api/v1/me/parent/enrollments/:enrollmentId/attendance`  
13. `GET /api/v1/me/parent/enrollments/:enrollmentId/attendance-summary`  
14. `GET /api/v1/me/learner/enrollments/:enrollmentId/attendance`  
15. `GET /api/v1/me/learner/enrollments/:enrollmentId/attendance-summary`

---

## 6. Generic enrollment history

Staff-scoped paginated history via `EnrollmentAttendanceController`. Permission `attendance.read`. Items may include `note`; never audit actor IDs. Status contract: **nullable `attendanceStatus`** (null = UNMARKED).

---

## 7. Generic enrollment summary

Same staff scope. Compact counts + `attendanceRatePercent`. No note.

---

## 8. Generic staff actor scope

- SUPER_ADMIN: global  
- PARISH_ADMIN: enrollment parish only  
- CATECHIST: ACTIVE assignment to enrollment class  
- PARENT / STUDENT: **403** on generic routes  

---

## 9. Parent history

`ParentAttendanceController` under `me/parent`. Learner-safe DTO (no `note`).

---

## 10. Parent summary

Same Parent scope; compact summary only.

---

## 11. Parent guardian scope

Order: resolve enrollment → derive `studentId` → require `PARENT` role → `StudentGuardianService.assertGuardianLinked` (ACTIVE) → query. Foreign child → 403; unknown enrollment → 404. No SuperAdmin impersonation.

---

## 12. Student history

`LearnerAttendanceController` under `me/learner`. Self enrollment only; learner-safe.

---

## 13. Student summary

Same Student self scope.

---

## 14. Student self scope

Order: resolve enrollment → require `STUDENT` role → `LearnerSelfScopeService.assertActingAsLinkedStudent` → query. No client-controlled `studentId`.

---

## 15. Cross-actor denial matrix

| Route family | Allowed | Denied |
| ------------ | ------- | ------ |
| Generic staff | Assigned Catechist, own-parish ParishAdmin, SuperAdmin | Unassigned Catechist, foreign ParishAdmin, Parent, Student |
| `/me/parent` | Linked Parent | Foreign child, Catechist, Student, ParishAdmin, SuperAdmin |
| `/me/learner` | Student self | Foreign enrollment, Parent, Catechist, ParishAdmin, SuperAdmin |

---

## 16. Historical roster semantics

History/summary use **session roster membership**, not current enrollment status. Rows remain after `TRANSFERRED` / `WITHDRAWN` / `COMPLETED`.

---

## 17. Session eligibility

Included: `COMPLETED` ∩ roster. Excluded: `CANCELLED`, `SCHEDULED`.

---

## 18. Summary formula

```
attendanceRatePercent = totalSessions > 0
  ? round(100 * (presentCount + lateCount) / totalSessions)
  : 0
```

LATE counts as present; EXCUSED does not; UNMARKED lowers rate. Same formula for all actors.

---

## 19. Zero / UNMARKED semantics

Counts and rate use numeric `0`, never null. History uses **Option A**: nullable `attendanceStatus` (null = UNMARKED). Persistence enum unchanged.

---

## 20. Note privacy

Staff history may include `note`. Parent/Student history omit `note` property entirely. Summaries never include notes.

---

## 21. Audit-field privacy

No `markedByUserId` / `updatedByUserId` / `createdByUserId` in responses.

---

## 22. DTO boundaries

ClassOperations-owned HTTP DTOs only. No entity leakage.

---

## 23. Controller ownership

All three new controllers live in `class-operations`. FamilyPortal / Enrollment controllers unchanged.

---

## 24. Pagination / sorting

`page` default 1, `limit` default 20, max 50. Sort: `startsAt DESC`, `sessionId DESC`. Response includes `page`, `limit`, `total`, `totalPages`, `items`.

---

## 25. Query design

History: set-based `class_session_roster` JOIN `class_sessions` LEFT JOIN `attendance_records`, filter COMPLETED, paginate/order in SQL.  
Summary: single aggregate `COUNT`/`SUM(CASE…)` query.

---

## 26. Index review

Existing `IX_class_session_roster_enrollment_id` and `IX_attendance_records_enrollment_id` sufficient for MVP. **No new migration** (do not edit #002 migration).

---

## 27. N+1 / performance

No per-session loops or per-row Class/Student lookups for history/summary.

---

## 28. FamilyPortal boundary

FamilyPortal unchanged. ClassOperations owns `/me/parent/.../attendance` routes. No ClassOperations import into FamilyPortal.

---

## 29. LearningProgress boundary

No LearningProgress import/write. Attendance remains independent.

---

## 30. Security / data minimization

No global learner lookup; guardian/self only on `/me`; staff scoped; no `/me` impersonation; no note leak to Parent/Student; no learner PII/audit IDs on these reads.

---

## 31. HTTP error contract

401 unauthenticated; 403 scope/role denial; 404 unknown enrollment/session; 400 invalid id / validation.

---

## 32. OpenAPI

All six endpoints documented: bearer auth, permission, actor/scope semantics, UUID param, pagination (history), response DTOs, 400/401/403/404.

---

## 33. README

Class Operations section updated with staff + Parent/Student reads, formula, roster semantics, eligibility, LATE/EXCUSED/UNMARKED, note privacy, generic vs `/me`, pagination. Phase **not** claimed complete.

---

## 34. Module boundaries

One module; three owned tables; exports `ClassOperationsService` only; no FamilyPortal/LearningProgress; no `forwardRef`; no foreign entities/repositories.

---

## 35. Unit tests

Summary zero/PRESENT/LATE/ABSENT/EXCUSED/UNMARKED/rounding; access matrix Parent/Student/`/me` denial; learner-safe mapper omits note/audit IDs; HTTP enrollment 404 mapping.

---

## 36. Integration tests

COMPLETED included; CANCELLED/SCHEDULED excluded; unmarked; summary counts/% exact; withdrawal preserves history; stable pagination; note present on staff history path.

---

## 37. DB e2e

Generic staff matrix (1–7), Parent me (8–15), Student me (16–22), privacy/eligibility/pagination/401 (23–30) covered in `class-operations-attendance-reads.db.e2e-spec.ts`.

---

## 38. Staff API regression

`class-operations-staff.db.e2e-spec.ts` retained and PASS alongside #004 suite.

---

## 39. Self-contained quality:full

**PASS** (`npm run quality:full` exit 0).

---

## 40. npm audit

**PASS** — `npm audit --audit-level=moderate` → 0 vulnerabilities.  
Production image: `docker run --rm catechism-api:class-operations-reads npm audit --omit=dev --audit-level=moderate` → 0 vulnerabilities.

---

## 41. Docker

**PASS** — `docker build --target production -t catechism-api:class-operations-reads .` (via WSL + `C:\acutis-build` junction).

---

## 42. Commands

```
node --version
npm --version
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=moderate
npm run quality
npm run test:db:prepare -- --reset
npm run test:db:migrations
npm run test:integration
npm run test:e2e:db
npm run quality:full
docker build --target production -t catechism-api:class-operations-reads .
```

---

## 43. Validation matrix

| Check | Result |
| ----- | ------ |
| Unit (class-ops focused) | PASS |
| Integration (attendance reads + staff) | PASS |
| DB e2e (reads + staff regression) | PASS |
| quality:full | PASS |
| npm audit (moderate) | PASS (0) |
| Docker (`catechism-api:class-operations-reads`) | PASS |
| Docker prod audit | PASS (0) |

---

## 44. Risks / deferred

- Demo seed / Postman / phase completion → #005  
- Recurring schedules, notifications, revision history, reopen, DELETE → out of scope  
- Composite `(enrollment_id, session_id)` index deferred until measured need  

---

## 45. BLOCKER / HIGH / MEDIUM / LOW

| Severity | Count | Notes |
| -------- | ----- | ----- |
| BLOCKER | 0 | |
| HIGH | 0 | |
| MEDIUM | 0 | |
| LOW | 0 | Open Jest handle warning on isolated integration run mitigated via `AppDataSource.destroy` in suite `afterAll` |

---

## 46. #005 readiness

**YES**

Proceed to:

**ATTENDANCE + CLASS OPERATIONS #005/5 — FINAL AUDIT + DEMO SEED + POSTMAN + PHASE COMPLETION**

Do **not** implement #005 automatically.

---

## 47. Commit recommendation

```
git commit -m "feat(class-operations): add parent student attendance reads"
```

Do **not** run `git add` / commit / push from the agent.

---

## REQUIRED VERDICTS

- GENERIC STAFF ATTENDANCE HISTORY READY: **YES**
- GENERIC STAFF ATTENDANCE SUMMARY READY: **YES**
- GENERIC ATTENDANCE READ ACTORS: SuperAdmin, ParishAdmin (own parish), assigned Catechist
- PARENT ATTENDANCE HISTORY READY: **YES**
- PARENT ATTENDANCE SUMMARY READY: **YES**
- PARENT GUARDIAN SCOPE SAFE: **YES**
- STUDENT ATTENDANCE HISTORY READY: **YES**
- STUDENT ATTENDANCE SUMMARY READY: **YES**
- STUDENT SELF SCOPE SAFE: **YES**
- ADMIN / STAFF SCOPE SAFE: **YES**
- ACTOR-SPECIFIC /ME IMPERSONATION SAFE: **YES**
- SUMMARY FORMULA READY: **YES**
- HISTORICAL ROSTER SEMANTICS READY: **YES**
- NOTE PRIVACY SAFE: **YES**
- DATA MINIMIZATION READY: **YES**
- PAGINATION/SORTING READY: **YES**
- N+1/PERFORMANCE READY: **YES**
- OPENAPI READY: **YES**
- README READY: **YES**
- MODULE BOUNDARY READY: **YES**
- STAFF API REGRESSION: **PASS**
- FULL INTEGRATION: **PASS**
- DB E2E: **PASS**
- SELF-CONTAINED QUALITY:FULL: **PASS**
- NPM AUDIT: **PASS**
- DOCKER: **PASS**

Unresolved BLOCKER count: **0**  
Unresolved HIGH count: **0**  
Unresolved MEDIUM count: **0**

**#005 READINESS:** YES
