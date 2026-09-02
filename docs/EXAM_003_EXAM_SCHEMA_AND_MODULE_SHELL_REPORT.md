# EXAM #003 — Exam Schema and Module Shell Report

**Phase:** EXAM #003 / 8  
**Date:** 2026-09-02  
**Status:** COMPLETE  
**Prerequisite:** EXAM #002 (student learner self-scope foundation)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Seven exam-owned tables migrated | **PASS** |
| TypeORM entities (no cross-module relations) | **PASS** |
| `ExamModule` shell registered in `AppModule` | **PASS** |
| No HTTP controllers / business APIs | **PASS** |
| No `PracticeModule` import | **PASS** |
| No `LocalizationModule` import yet | **PASS** (deferred to #005) |
| Module graph acyclic | **PASS** |
| Unit entity + boundary tests | **PASS** |
| EXAM #004 authoring gate unblocked | **YES** |

---

## 1. Objective

Land persistence for the formal Exam bounded context per EXAM #001 §59: stable exam root, immutable versions, class assignments, learner attempts, pinned question snapshots, and current answers — without HTTP APIs, RBAC seeds, or attempt logic.

## 2. Tables created

| Table | Purpose |
|-------|---------|
| `exams` | Parish-scoped exam root (`code`, `status`, `current_published_version_id`) |
| `exam_versions` | Versioned config (duration, max attempts, shuffle flags, `review_policy_json`) |
| `exam_version_questions` | Ordered question config (`question_id`, optional `question_version_id` in draft) |
| `exam_assignments` | Class + published version + availability window |
| `exam_attempts` | Learner attempt lifecycle, denormalized audit, delivered header, result columns |
| `exam_attempt_questions` | Pinned question version, option order, localization snapshot fields |
| `exam_attempt_answers` | One current answer per attempt question (pre-submit mutable) |

Migration: `src/database/migrations/1788064000000-create-exam-schema.ts`

## 3. Key constraints

- `UQ_exams_parish_id_code`
- `UQ_exam_versions_exam_id_version_number`
- Filtered `UQ_exam_versions_exam_id_published` (one published version per exam)
- `UQ_exam_attempts_enrollment_id_exam_assignment_id_attempt_number`
- Filtered `UQ_exam_attempts_enrollment_id_exam_assignment_id_in_progress`
- Filtered idempotency index on `(enrollment_id, exam_assignment_id, client_request_id)`
- JSON `ISJSON` checks on `review_policy_json`, option/answer payloads
- `source_content_hash` format check on attempt questions (64-char lowercase hex)

## 4. Module shell

- `src/modules/exam/exam.module.ts` — registers all seven entities via `TypeOrmModule.forFeature`
- `ExamService` — empty injectable placeholder for future public API
- Exported publicly: `ExamService` only
- Registered in `AppModule` after `PracticeModule`

## 5. Boundary compliance

- Entities use scalar UUID columns only (no TypeORM relations to Question Bank, Localization, Enrollment, or Class)
- SQL FKs: exam-owned cascades + references to `parishes`, `users`, `classes`, `enrollments` where appropriate
- `ExamModule` does **not** import `PracticeModule`
- `forwardRef` not used

## 6. Tests added

| File | Coverage |
|------|----------|
| `src/database/exam.entities.spec.ts` | Table names, zero relations, column presence |
| `src/database/exam-uuid-generation.spec.ts` | RFC UUID v4 defaults, scalar FK assignment |
| `src/modules/module-boundaries.spec.ts` | `ExamService` export; no `PracticeModule` import |

## 7. Intentionally deferred (#004+)

- HTTP controllers (authoring, assignment, attempt)
- RBAC permissions (`exam.read`, `exam.manage`, etc.)
- `ExamAccessService`, grading, lazy expiry finalization
- `LocalizationModule` import (question pinning at attempt start in #005)
- Demo seed, Postman, Learning Progress composition

## 8. Next step — EXAM #004

Exam authoring + publish + class assignment APIs (`/api/v1/parishes/:parishId/exams/*`), wired to new schema and parish RBAC.

---

## Definition of Done checklist

- [x] Migration for all seven REQUIRED tables from EXAM #001 §59
- [x] Matching TypeORM entities and enums
- [x] `ExamModule` + `ExamService` shell in application bootstrap
- [x] Module boundary tests updated
- [x] Entity metadata + UUID generation tests
- [x] `format:check` / `lint` / `typecheck` / targeted `npm test` / `build` pass
