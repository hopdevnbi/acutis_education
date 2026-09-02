# EXAM #002 — Student Learner Auth and Self-Scope Foundation Report

**Phase:** EXAM #002 / 8  
**Date:** 2026-09-02  
**Status:** COMPLETE  
**Prerequisite:** EXAM #001A (learner auth gate)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| STUDENT role + `learner.self.read` permission seeded | **PASS** |
| Demo student linked to learner account | **PASS** |
| `GET /api/v1/me/learner-context` | **PASS** |
| `LearnerSelfScopeService` (self-only, not guardian) | **PASS** |
| Parent denied for learner-context endpoint | **PASS** |
| Module boundary (no Student ↔ Enrollment cycle) | **PASS** |
| Unit + integration + db e2e coverage | **PASS** |
| EXAM schema gate (#003) unblocked | **YES** |

---

## 1. Objective

Establish the minimum learner identity foundation required before Exam schema work (#003): a STUDENT role, self-scoped learner context API, and a reusable self-scope guard that future `exam.attempt` flows will call. Parent/guardian access remains available for Practice and progress, but **not** for formal exam attempts (per EXAM #001).

## 2. RBAC additions

- New role: `STUDENT`
- New permission: `learner.self.read`
- Seed user: `student-alpha@local.catechism.test` with STUDENT role
- STUDENT permissions: `learner.self.read`, `curricula.read`, `lesson-content.read`, `learning-progress.read`

## 3. Class enrollment seed link

`ClassEnrollmentSeedService` now links **Demo Student Alpha** to the seeded student user account (`student-alpha@local.catechism.test`). Summary counters: `studentUserLinksCreated` / `studentUserLinksExisting`.

## 4. Learner context API

`GET /api/v1/me/learner-context` (EnrollmentModule / `MeController`):

- Auth: JWT + `learner.self.read`
- Returns linked student profiles and active enrollments for the authenticated user only
- Implemented via `LearnerContextService` using `StudentService.listStudentIdsByLinkedUserId` + `EnrollmentService.listEnrollmentsByStudent`

## 5. Learner self-scope service

`LearnerSelfScopeService` (StudentModule, exported):

- `isActingAsLinkedStudent(userId, studentId)` — true only when `student.userId === userId`
- `assertActingAsLinkedStudent(...)` — throws `LearnerSelfScopeDeniedError` otherwise
- Distinct from `StudentAccessService` / guardian read paths used by Practice

## 6. Module placement

`MeController` lives in **EnrollmentModule** (not StudentModule) to avoid `StudentModule ↔ EnrollmentModule` import cycle. Enrollment already imports Student; Student does not import Enrollment.

## 7. HTTP error mapping

`LearnerSelfScopeDeniedError` maps to HTTP 403 via `student-http.util.ts`.

## 8. Tests added

| Test | Scope |
|------|-------|
| `learner-self-scope.service.spec.ts` | Unit — linked / unlinked / wrong user |
| `class-enrollment-seed.integration-spec.ts` | Integration — alpha user link assertion |
| `me-learner-context.db.e2e-spec.ts` | DB e2e — endpoint + parent 403 + self-scope denial |
| `module-boundaries.spec.ts` | Export `LearnerSelfScopeService` from StudentModule |

## 9. Files touched (summary)

**New**

- `src/modules/student/constants/learner-permissions.constants.ts`
- `src/modules/student/services/learner-self-scope.service.ts`
- `src/modules/enrollment/interfaces/learner-context.interface.ts`
- `src/modules/enrollment/services/learner-context.service.ts`
- `src/modules/enrollment/dto/learner-context-response.dto.ts`
- `src/modules/enrollment/mappers/learner-context-response.mapper.ts`
- `src/modules/enrollment/controllers/me.controller.ts`
- `src/modules/student/services/learner-self-scope.service.spec.ts`
- `test/me-learner-context.db.e2e-spec.ts`

**Modified**

- `auth-rbac.seed.constants.ts` — STUDENT role, permission, seed user
- `class-enrollment.seed.constants.ts` — student alpha email constant
- `class-enrollment.seed.service.ts` — link demo student to user
- `student.module.ts` — register/export `LearnerSelfScopeService`
- `enrollment.module.ts` — `MeController`, `LearnerContextService`
- `student-access.errors.ts` — `LearnerSelfScopeDeniedError`
- `student-http.util.ts` — 403 mapping
- `module-boundaries.spec.ts`

## 10. Next step — EXAM #003

Proceed with Exam schema + entities + migrations + `ExamModule` shell (no attempt HTTP yet). Use `LearnerSelfScopeService` when implementing `exam.attempt` in a later prompt.

---

## Definition of Done checklist

- [x] STUDENT role and `learner.self.read` in RBAC seed
- [x] Demo student Alpha linked to student user in class-enrollment seed
- [x] Self-scoped learner context endpoint
- [x] Reusable self-scope service for future exam attempts
- [x] Tests at unit, integration, and db e2e layers
- [x] No module boundary violations
- [x] Prettier / ESLint / typecheck pass
