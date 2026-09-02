# EXAM ENGINE #001A — Critical Architecture and Learner Auth Correction Report

**Phase:** EXAM #001A (corrective audit)  
**Date:** 2026-09-02  
**Status:** COMPLETE  
**Prompt:** `EXAM_ENGINE_001A_CRITICAL_ARCHITECTURE_AND_LEARNER_AUTH_CORRECTION.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| CURRENT STUDENT ACTOR READY | **NO** |
| FORMAL EXAM LEARNER ACTOR MODEL READY | **NO** (design YES; implementation pending #002) |
| PARENT EXAM ATTEMPT POLICY | **DENIED** (reconfirmed) |
| STUDENT AUTH PREREQUISITE REQUIRED BEFORE EXAM ATTEMPTS | **YES** |
| EXAM↔LOCALIZATION CYCLE RESOLVED | **YES** (design) |
| EXAM METADATA LOCALIZATION MODEL READY | **YES** (MVP source-only + publish-time sync later) |
| FINAL MODULE GRAPH ACYCLIC | **YES** |
| forwardRef REQUIRED | **NO** |
| EXAM SCHEMA IMPLEMENTATION READY | **NO** until #002 student foundation lands |
| FINAL RECOMMENDED MAIN PROMPT COUNT | **8** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **1** (no production learner actor — resolved by #002) |

---

## 1. Objective

Re-audit EXAM #001 before schema work: (A) who can take a formal exam with Parent denied, and (B) whether Exam↔Localization creates a Nest module cycle.

## 2. Why #001 needed correction

#001 assumed `exam.attempt` for a student linked user, but production RBAC has **no STUDENT role**, demo students have **no linked user accounts**, and no self-scoped learner HTTP contract exists. Localization adapter in Exam direction risked **ExamModule ↔ LocalizationModule** cycle.

## 3. Current STUDENT role inventory

`AUTH_RBAC_SEED_ROLES` contains: `SUPER_ADMIN`, `PARISH_ADMIN`, `CATECHIST`, `PARENT` only. **No `STUDENT` role.**

## 4. Current Student↔User linkage

`students.user_id` nullable UUID exists (`StudentEntity.userId`). `StudentService.listStudentIdsByLinkedUserId()` and `resolveOptionalUserId()` support linking. Demo seeds create students **without** `userId`.

## 5. Current learner authentication capability

`AuthService.login` authenticates any active `users` row regardless of role. **No role blocks login.** A linked student user *could* authenticate once provisioned.

## 6. Current self-enrollment resolution capability

`EnrollmentService.listEnrollmentsByStudent` exists but requires caller to supply `studentId`. **No** `GET /me/enrollments` or resolver from `userId` → enrollments. `StudentAccessService.canReadStudentByStudentEvidence` recognizes self when `student.userId === userId`.

## 7. Actor viability with Parent denied

With Parent denied for exam attempts, **no current actor** can legally start/submit a formal exam:

| Actor | Can attempt? |
|-------|----------------|
| Parent | Denied by policy |
| Catechist | No `exam.attempt`; staff non-impersonation |
| Parish Admin | Same |
| Student linked user | **Not provisioned** in seeds/RBAC |

Practice works via `practice.manage` on Parent — not applicable to Exam.

## 8. Severity

**HIGH** for Exam attempt APIs (not BLOCKER for schema design). Formal Exam phase cannot ship attempt endpoints without learner actor foundation.

## 9. Resolution options

| Option | Verdict |
|--------|---------|
| A — STUDENT role/auth before attempts | **RECOMMENDED** |
| B — Parent proxy | **REJECTED** (integrity) |
| C — Split phase: #002 student, #003 schema | **RECOMMENDED sequencing** |
| D — Schema now, block attempts | Acceptable but delays usable phase; prefer C |

**Final choice: Option C** — EXAM #002 = Student learner self-scope foundation; EXAM #003 = persistence/schema.

## 10. Final learner actor architecture

1. Add `STUDENT` RBAC role + `learner.self.read` permission.
2. Provision linked user accounts for demo students.
3. `LearnerSelfScopeService.assertActingAsLinkedStudent(userId, studentId)` — **self only**, excludes guardian.
4. `GET /api/v1/me/learner-context` — linked students + active enrollments (server-resolved; client never supplies arbitrary `studentId` for self routes).
5. Future `exam.attempt` permission granted to `STUDENT` only; `ExamAccessService` uses `LearnerSelfScopeService`.

## 11. Student role prerequisite decision

**YES** — required before Exam attempt APIs.

## 12. Student provisioning/login design

Parish admin links `userId` on student record (existing API). Seed creates `student-alpha@local.catechism.test` with `STUDENT` role and links Demo Student Alpha. Login uses standard auth — no special login code.

## 13. Student self-scope design

Export `LearnerSelfScopeService` from `StudentModule`. Exam imports Student public API only.

## 14. Parent policy reconfirmation

**PARENT EXAM ATTEMPT POLICY: DENIED**

Prerequisite for usable attempts: STUDENT linked user + `exam.attempt` (future) + self-scope enforcement.

## 15. Current Exam/Localization proposed cycle

#001 proposed `ExamModule → LocalizationModule` and `LocalizationModule → ExamModule` via `ExamVersionTranslationAdapter` → **cycle**.

## 16. Why public service alone does not prevent module cycle

NestJS resolves module imports at bootstrap. Mutual imports cause cycle even if only public services are used.

## 17. Localization architecture options

| Option | Verdict |
|--------|---------|
| A — Exam imports Localization; metadata source-only MVP | **MVP** |
| B — External snapshot sync API (Exam pushes payload) | **Future** |
| C — ExamDelivery orchestration | Deferred complexity |
| D — Plugin registration | Deferred |
| E — Defer metadata translation | **Combined with A** |

## 18. Final Exam metadata localization architecture

**MVP:** Exam title/description/instructions delivered in **source locale only**. Question localization via existing `QuestionBankVersion` adapter. `ExamModule → LocalizationModule` for question pinning only. **No** `LocalizationModule → ExamModule` import.

**Future:** Exam publish calls `LocalizationService` registration with **push snapshot** payload (Exam → Localization only).

## 19. EXAM_VERSION resource strategy

**DEFERRED** until push-snapshot API exists. Do not add adapter requiring Localization to import Exam.

## 20. Admin translation sync strategy

Post-MVP: parish admin sync after explicit Exam publish hook pushes source snapshot to localization registry.

## 21. Question localization direction

`Exam → Localization → QuestionBank` — acyclic (Localization already imports QuestionBank).

## 22. Exact revision replay direction

`LocalizationService.resolveLocalizedResourceWithRevision` — Localization does not know Exam.

## 23. Final module dependency graph

```
Exam → Localization → QuestionBank
Exam → QuestionBank, Enrollment, Class, Student
LearningProgress → Exam (future public API)
Localization ↛ Exam
Practice ↛ Exam
```

## 24. Cycle/forwardRef verdict

**Acyclic. forwardRef: NO.**

## 25. Learning Progress direction

`LearningProgress → ExamService` public summary only. Exam does not import LearningProgress.

## 26. Revised prompt sequencing

| # | Scope |
|---|--------|
| 001 | Domain audit ✓ |
| 001A | Corrective audit ✓ |
| **002** | **Student learner auth / self-scope** |
| 003 | Exam schema + module shell |
| 004 | Authoring/publish/assignment |
| 005 | Attempt generation + localized delivery |
| 006 | Answers/time/submit/grading |
| 007 | Results/review/Learning Progress |
| 008 | Final audit + demo + Postman |

## 27. Final prompt count

**8** main implementation prompts (001A corrective, not counted).

## 28. Schema readiness

**NO** until #002 completes. Learner actor strategy is designed; implementation required.

## 29. BLOCKER/HIGH/MEDIUM/LOW

| Severity | Count | Notes |
|----------|-------|-------|
| BLOCKER | 0 | |
| HIGH | 1 | Missing learner actor — #002 |
| MEDIUM | 0 | |
| LOW | 1 | Metadata translation deferred |

## 30. Files created

- `docs/EXAM_001A_CRITICAL_ARCHITECTURE_AND_LEARNER_AUTH_CORRECTION_REPORT.md`

## 31. Files modified

None (audit-only).

## 32–33. Commands / Validation

Audit-only validation: `format:check`, `lint`, `typecheck`, `npm test`, `test:e2e`, `build` — PASS on unchanged tree.

## 34. EXAM next-step readiness

**EXAM #002 — STUDENT LEARNER AUTH / SELF-SCOPE FOUNDATION** — proceed.

## 35. Commit recommendation

None (audit-only).
