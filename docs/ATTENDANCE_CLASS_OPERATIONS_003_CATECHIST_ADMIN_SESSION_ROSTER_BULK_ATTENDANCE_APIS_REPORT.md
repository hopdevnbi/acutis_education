# ATTENDANCE + CLASS OPERATIONS #003/5 — Catechist / Admin Session Roster + Bulk Attendance APIs

**Date:** 2026-09-05  
**Mode:** IMPLEMENTATION — staff HTTP APIs only  
**Prior:** #002/5 Persistence foundation — GO  
**Next:** #004/5 Parent/Student reads + summary + security/performance hardening

---

## 1. Objective

Implement the nine staff-facing class session and attendance routes with Catechist/ParishAdmin/SuperAdmin scope, roster freeze/refresh, bulk PUT attendance, OpenAPI, tests, and README — without Parent/Student history routes, demo seed, or Postman.

---

## 2. State inherited

From #002: `class-operations` module, three tables, lifecycle/status enums, roster immutability helpers, RBAC permissions, facade `ClassOperationsService`, access shell, quality/Docker green.

---

## 3. Files created

- Controllers: `class-sessions.controller.ts`, `class-session-attendance.controller.ts`
- DTOs: create/update/list query, session response/list, bulk attendance, attendance response items
- `utils/class-operations-http.util.ts` (+ unit spec)
- `mappers/class-operations-response.mapper.ts`
- Specs: access service, http util
- `test/integration/class-operations-staff.integration-spec.ts`
- `test/class-operations-staff.db.e2e-spec.ts`
- This report

---

## 4. Files modified

- `class-operations.module.ts` — register controllers
- `class-operations.service.ts` — staff orchestration (create for class, counts, attendance view, bulk client upsert, transactional refresh)
- `class-operations-access.service.ts` — full staff asserts
- `class-session.service.ts` — paginated DESC list
- `class-session-roster.service.ts` / `attendance.service.ts` — grouped counts; roster-derived `studentId` on upsert
- Interfaces/constants/errors for staff DTOs and access
- `README.md` — Class Operations API section
- `test/enrollment.db.e2e-spec.ts` — FK-safe class-ops cleanup (if applied)

---

## 5. Final staff route inventory

1. `POST /api/v1/classes/:classId/sessions`
2. `GET /api/v1/classes/:classId/sessions`
3. `GET /api/v1/class-sessions/:sessionId`
4. `PATCH /api/v1/class-sessions/:sessionId`
5. `POST /api/v1/class-sessions/:sessionId/cancel`
6. `POST /api/v1/class-sessions/:sessionId/complete`
7. `POST /api/v1/class-sessions/:sessionId/roster/refresh`
8. `GET /api/v1/class-sessions/:sessionId/attendance`
9. `PUT /api/v1/class-sessions/:sessionId/attendance`

---

## 6. Controller ownership

`ClassSessionsController` + `ClassSessionAttendanceController` inside `class-operations`.  
No Class/FamilyPortal/Enrollment controller extension.

---

## 7. Session create flow

- Auth + `class-sessions.manage` + staff scope on class
- Class must be `ACTIVE`
- Derive `parishId` / `academicYearId` from class
- Transaction: create `SCHEDULED` session + freeze ACTIVE enrollment roster (batch enrollments + batch student names)
- Empty roster allowed (session still created)

---

## 8. Initial roster freeze

Snapshot of ACTIVE enrollments only; display name from student `fullName`; unique `(sessionId, enrollmentId)`.

---

## 9. Catechist scope

Requires `CATECHIST` role **and** ACTIVE class assignment. Role alone is insufficient.

---

## 10. ParishAdmin scope

Requires `PARISH_ADMIN` role **and** ACTIVE parish membership matching session/class parish.

---

## 11. SuperAdmin scope

Global via `ParishScopeService.isSuperAdmin`.

---

## 12. Wrong-actor denial

Parent/Student fail staff access (no catechist assignment / parish-admin role path). Covered in DB e2e as 403 on manage and attendance GET.

---

## 13. Session list

Paginated (`page` default 1, `limit` default 20, max 50). Filters: `from`, `to`, `status`. Sort: `startsAt DESC`, `id DESC`. Includes bounded `rosterCount` / `markedCount` / `unmarkedCount` via grouped queries (no per-session loops).

---

## 14. Session detail

Staff-scoped get with counts. No learner PII.

---

## 15. Session update

`SCHEDULED` only: `title`, `startsAt`, `endsAt`. Time edit = reschedule without `RESCHEDULED` status.

---

## 16. Cancel flow

`SCHEDULED → CANCELLED` + `cancelledAt`. Locks writes/refresh/edits; keeps marks; excluded from future summaries (#004).

---

## 17. Complete flow

`SCHEDULED → COMPLETED` + `completedAt`. Locks attendance/roster/metadata. Unmarked learners allowed.

---

## 18. Roster refresh

Only `SCHEDULED` + zero attendance rows. Transactional recheck then replace snapshot from current ACTIVE enrollments.

---

## 19. Attendance GET

Staff-only merge of roster + marks. Sort: `displayName` then `enrollmentId`. Status/note/markedAt nullable for UNMARKED.

---

## 20. Bulk attendance PUT

Transactional upsert; duplicate enrollmentId → 400; non-roster → 422; omitted → UNMARKED; `studentId`/`markedBy`/`markedAt` server-derived.

---

## 21. Idempotency

Identical PUT retries safe via unique `(sessionId, enrollmentId)` upsert.

---

## 22. Transaction boundaries

Own-table transactions for create+roster, roster refresh, bulk attendance. Foreign reads via public APIs.

---

## 23. Concurrency lifecycle recheck

Refresh and attendance upsert re-read session status (and mark count for refresh) inside the transaction.

---

## 24. Attendance note policy

Optional, max 500; never logged; no pastoral semantics.

---

## 25. DTO boundaries

Module-owned request/response DTOs; no entity leakage.

---

## 26. HTTP error contract

| Domain | HTTP |
|--------|------|
| Access denied | 403 |
| Not found | 404 |
| Lifecycle / finalize / roster immutable | 409 |
| Not in roster | 422 |
| Invalid input / duplicates / inactive class / bad times | 400 |
| Unauthenticated | 401 |

---

## 27. OpenAPI

All nine endpoints: bearer auth, summaries, permissions/scope notes, params/query, response DTOs, 400/401/403/404/409/422 as applicable.

---

## 28. Pagination / sorting

List max 50; stable id tie-breaker. Attendance roster unpaginated (class-size assumption); documented in README.

---

## 29. Performance / N+1

Create/refresh: class + scope + paged enrollment batch + student batch + own writes.  
List counts: two grouped queries.  
Attendance GET: session + roster + attendance + in-memory merge.

---

## 30. Data minimization

Responses expose enrollmentId, studentId, displayName, status, note, markedAt only — no email/phone/DOB/guardian.

---

## 31. README

Class Operations API section added: ownership, lifecycle, statuses, roster, nine routes, scope, bulk PUT, deferred Parent/Student/#005.

---

## 32. Module boundaries

Still exports `ClassOperationsService` only; approved imports; no FamilyPortal/LearningProgress; no forwardRef.

---

## 33. Unit tests

HTTP mapping, staff access matrix, existing lifecycle/roster/summary utilities.

---

## 34. Integration tests

`class-operations-staff.integration-spec.ts`: create+roster, bulk upsert, refresh lock, complete lock. Foundation suite retained.

---

## 35. DB e2e

`class-operations-staff.db.e2e-spec.ts`: auth 401, catechist lifecycle, cancel lock, unassigned 403, parish admin own/cross-parish, superadmin, parent/student denials, PII/order checks.

---

## 36. Full regression

`quality:full` **PASS** (unit 133/672, integration, e2e:db including staff suite).

---

## 37. Self-contained quality:full

**PASS**

---

## 38. npm audit

**PASS** — 0 moderate+ vulnerabilities

---

## 39. Docker

`catechism-api:class-operations-staff` **PASS** (via `C:\acutis-build` junction)

---

## 40. Commands

```text
npm run format && npm run format:check && npm run lint
npm run typecheck && npm test && npm run test:e2e && npm run build
npm audit --audit-level=moderate
npm run quality:full
docker build --target production -t catechism-api:class-operations-staff .
```

---

## 41. Validation matrix

| Gate | Result |
|------|--------|
| format/lint/typecheck | PASS |
| unit | PASS |
| integration | PASS |
| e2e:db | PASS |
| quality:full | PASS |
| npm audit | PASS |
| Docker | PASS |

---

## 42. Risks / deferred

- Parent/Student attendance history + summary (#004)
- Demo seed / Postman / phase completion (#005)
- Recurring schedules, notifications, revision history, session reopen, DELETE
- Optimistic version / clientRequestId

---

## 43. BLOCKER / HIGH / MEDIUM / LOW

| Severity | Count |
|----------|-------|
| BLOCKER | **0** |
| HIGH | **0** |
| MEDIUM | **0** |
| LOW | **1** — Docker Unicode path needs junction on this Windows host |

---

## 44. #004 readiness

All #004 gates met: nine staff routes, scope/denial, lifecycle, refresh, bulk transactional/idempotent, N+1, OpenAPI/README, integration, e2e:db, quality:full, Docker.

**#004 READINESS: YES**

Recommend:

**ATTENDANCE + CLASS OPERATIONS #004/5 — PARENT / STUDENT ATTENDANCE READS + SUMMARY + SECURITY / PERFORMANCE HARDENING**

Do **not** auto-implement.

---

## 45. Commit recommendation

```text
git commit -m "feat(class-operations): add session roster and attendance APIs"
```

Do not print `git add`. Do not execute commit/push from this agent.

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| STAFF SESSION API READY | **YES** |
| SESSION CREATE + ROSTER FREEZE READY | **YES** |
| SESSION LIST/DETAIL READY | **YES** |
| SESSION UPDATE READY | **YES** |
| SESSION CANCEL READY | **YES** |
| SESSION COMPLETE READY | **YES** |
| ROSTER REFRESH READY | **YES** |
| STAFF ATTENDANCE READ READY | **YES** |
| BULK ATTENDANCE WRITE READY | **YES** |
| CATECHIST SCOPE SAFE | **YES** |
| PARISH ADMIN SCOPE SAFE | **YES** |
| SUPER ADMIN SCOPE READY | **YES** |
| PARENT/STUDENT STAFF-ENDPOINT DENIAL SAFE | **YES** |
| TRANSACTIONAL SAFETY READY | **YES** |
| CONCURRENCY LIFECYCLE GUARD READY | **YES** |
| N+1/PERFORMANCE READY | **YES** |
| DATA MINIMIZATION READY | **YES** |
| OPENAPI READY | **YES** |
| README READY | **YES** |
| MODULE BOUNDARY READY | **YES** |
| FULL INTEGRATION | **PASS** |
| DB E2E | **PASS** |
| SELF-CONTAINED QUALITY:FULL | **PASS** |
| NPM AUDIT | **PASS** |
| DOCKER | **PASS** |

Unresolved BLOCKER: **0**  
Unresolved HIGH: **0**  
Unresolved MEDIUM: **0**

**#004 READINESS: YES**
