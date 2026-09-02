# Backend Phase Handoff — Readiness for Catechist + Parent Supporting APIs

**Purpose:** Export report for GPT (or human architect) to evaluate backend state and design the next module phase.  
**Date:** 2026-09-02  
**Repository:** `catechism-api` (NestJS, TypeScript strict, MSSQL, modular monolith)  
**Git HEAD:** `0b7a529` — `feat(exam): add demo seed postman and phase completion audit`  
**Working tree:** clean

---

## 1. Executive verdict

| Question | Answer |
|----------|--------|
| Is Exam Engine phase complete? | **YES** (#002–#008 committed) |
| Are prerequisite domain modules stable? | **YES** (Class/Enrollment, Practice, Learning Progress, Exam, Localization) |
| Is backend ready to start **Catechist + Parent supporting APIs**? | **YES — with scoped MVP** |
| Recommended prompt count | **4–5 prompts** (audit-first, orchestration-focused) |
| Blockers before starting? | **None architectural**; defer Attendance/Schedule/Prayer/Notifications to later modules |

**Readiness grade: A (ready to plan and implement orchestration layer)**

The next module should **not** re-implement domain logic already owned by Class, Enrollment, Practice, Learning Progress, or Exam. It should add **scoped orchestration / read-model APIs** that reduce FE/mobile round-trips while respecting module boundaries.

---

## 2. Completed backend phases (Prompt base 01–12)

| # | Phase | Status | Final report (local `docs/`) |
|---|--------|--------|------------------------------|
| 01 | NestJS bootstrap + foundation | Complete | `PROMPT_007_FINAL_BACKEND_FOUNDATION_AUDIT_REPORT.md` |
| 02 | CI/CD Bitbucket | Complete | `CI_004_FINAL_BITBUCKET_CI_AUDIT_AND_HARDENING_REPORT.md` |
| 03 | Auth + RBAC | Complete | `AUTH_*` reports |
| 04 | Parish + Academic Year + Catechism Level | Complete | `PARISH_005_*` |
| 05 | Class + Student + Catechist + Parent + Enrollment | Complete | `CLASS_007A_*` |
| 06 | Curriculum + Topic + Lesson + Learning Content | Complete | `CURRICULUM_006_*` |
| 07 | File/Media storage | Complete | `MEDIA_004_*` |
| 08 | Question Bank | Complete | `QUESTION_BANK_008_*` |
| 09 | Practice Engine | Complete | `PRACTICE_006_*` |
| 10 | Learning Progress | Complete | `LEARNING_PROGRESS_004_*` |
| 11 | Localization | Complete | `LOCALIZATION_006_*` |
| 12 | Exam Engine | Complete | `EXAM_008_*` |

**No Prompt base folder #13 exists yet.** Next module prompts must be authored.

---

## 3. Product intent for next module (from master plan)

Source: `Docs kế hoạch/total_plan_multilingual_ai_translation_updated.txt`

### 3.1 Original line item

> **Catechist + Parent supporting APIs** — Khoảng 4–5 prompt.

### 3.2 Expanded scope (Milestone 7 — Parish Operations & Family Engagement)

The master plan later expands this into 8–12 BE prompts including:

- Catechist Class Management (assigned classes, roster, enrollment status, quick attendance, learning + exam results by class)
- Parent Child Progress (lesson completion, practice, exam results, attendance, learning indicators)
- Schedule + Parish Activities
- Catechism Materials by Class
- Prayer Memorization Tracking
- Parent/Catechist Notifications

**Recommendation for the 4–5 prompt module:** implement **orchestration for items already backed by domain APIs** in prompts #001–#004; **explicitly defer** Attendance, Schedule, Prayer, Notifications to their own future modules (or stub contracts only in audit).

---

## 4. What already exists (do NOT duplicate)

### 4.1 Identity, relationships, scope

| Capability | Module | Key APIs / services |
|------------|--------|---------------------|
| Guardian ↔ Student links | `StudentModule` | `POST/GET /students/:id/guardians`, `StudentGuardianService`, `StudentAccessService` |
| Catechist ↔ Class assignments | `ClassModule` | `POST/GET /classes/:id/catechists`, `ClassCatechistAssignmentService`, `ClassScopeService` |
| Enrollment scope | `EnrollmentModule` | `EnrollmentAccessService`, `EnrollmentGuardianScopeService`, enrollment CRUD |
| Learner self context | `EnrollmentModule` | `GET /me/learner-context` (STUDENT role, `learner.self.read`) |
| Student self-scope guard | `StudentModule` | `LearnerSelfScopeService` |

### 4.2 Domain reads already scoped for Parent / Catechist

| Domain | Parent (linked child) | Catechist (assigned class) | Notes |
|--------|----------------------|----------------------------|-------|
| Curriculum delivery | via enrollment | via class/enrollment | `curriculum-delivery` module |
| Practice sessions + progress | create/read/submit + enrollment progress | read enrollment + **class** progress | Parent **denied** class progress |
| Learning progress | PATCH + enrollment aggregate | read enrollment + **class** aggregate | Parent **denied** class aggregate |
| Exam | **attempt DENIED**; result read per policy | attempt summaries + staff result read | Parent never class-wide |
| Localization | read-only where granted | read-only | admin mutations separate |

### 4.3 RBAC seed permissions (local demo)

**CATECHIST:** `classes.read/manage`, `students.read`, `enrollments.read`, `curricula.read`, `lesson-content.read`, `questions.read`, `practice.read`, `learning-progress.read`, `localization.read`, `exam.read`, `exam.result.read`, …

**PARENT:** `students.read`, `enrollments.read`, `curricula.read`, `lesson-content.read`, `practice.read/manage`, `learning-progress.read/manage`, `exam.result.read`, … (no `exam.attempt`, no `learner.self.read`)

**STUDENT:** `learner.self.read`, `exam.attempt`, `exam.result.read`, `learning-progress.read`, …

Sample users after seeds: `catechist@`, `parent@`, `student-alpha@` @ `local.catechism.test`

### 4.4 Public module exports (orchestration must use these)

| Module | Exported public API |
|--------|---------------------|
| `ClassModule` | `ClassService`, `ClassCatechistAssignmentService`, `ClassScopeService` |
| `EnrollmentModule` | `EnrollmentService`, `EnrollmentAccessService`, `EnrollmentGuardianScopeService`, `EnrollmentQueryService` |
| `StudentModule` | `StudentService`, `StudentGuardianService`, `StudentAccessService`, `LearnerSelfScopeService` |
| `PracticeModule` | `PracticeService` |
| `LearningProgressModule` | `LearningProgressService` |
| `ExamModule` | `ExamService` (includes `getEnrollmentExamSummary`) |
| `CurriculumModule` | `CurriculumService`, `TopicService`, `LessonService` |
| `LocalizationModule` | `LocalizationService`, `LocaleResolutionService` |

**Rule:** New orchestration module must NOT import repositories/entities/internal DTOs from other modules.

---

## 5. Gaps the new module should fill

### 5.1 High value (in scope for 4–5 prompts)

| Gap | Why needed | Suggested API shape |
|-----|------------|---------------------|
| **Catechist “my assigned classes” dashboard** | FE today must chain class-catechist + class + enrollment queries | `GET /me/catechist/classes` or `/me/catechist/class-summaries` |
| **Catechist class roster snapshot** | Roster + enrollment status + progress/exam summaries in one response | `GET /me/catechist/classes/:classId/roster` |
| **Parent “my children” dashboard** | Parent has guardian links but no unified child list API | `GET /me/parent/children` |
| **Parent child learning snapshot** | FE must call LP + Practice + Exam separately per enrollment | `GET /me/parent/children/:studentId/progress` or per `enrollmentId` |
| **Consistent actor context** | Mirror `GET /me/learner-context` for parent/catechist | `GET /me/parent/context`, `GET /me/catechist/context` |

### 5.2 Medium value (optional in #004 or defer)

| Gap | Dependency |
|-----|------------|
| Class-level exam assignment overview for catechist | `ExamService` public methods may need narrow read-model extension |
| Recent activity feed (practice sessions, exam attempts) | compose from Practice + Exam public APIs |
| Locale-aware labels in orchestration responses | `LocalizationService` / locale resolution |

### 5.3 Out of scope for this 4–5 prompt module (future modules)

| Capability | Status in backend |
|------------|-------------------|
| Attendance + quick roll call | **Not implemented** |
| Schedule / Calendar / Parish events | **Not implemented** |
| Catechism materials by class (dedicated) | Partial via curriculum + media; no class-materials module |
| Prayer memorization tracking | **Not implemented** |
| Notifications (push/email/in-app) | **Not implemented** |

Do **not** block the orchestration module on these; document integration hooks only.

---

## 6. Architecture constraints (non-negotiable)

From `PROJECT_RULES.md` + `.cursor/rules/`:

1. Modular monolith — business modules under `src/modules/<feature>/`
2. Cross-module access via **exported public API only**; no entity/repository imports across boundaries
3. No cyclic imports / avoid `forwardRef()` as default fix
4. Parent access via **persisted guardian ↔ student** relationship, never PARENT role alone
5. Catechist access via **active class assignment**, never CATECHIST role alone
6. Parent **cannot** take formal exams (attempt endpoints 403 by design)
7. Parent **denied** class-wide progress aggregates (enrollment-level only)
8. Minors platform — least privilege, server-side authorization, no PII leakage
9. API prefix `/api/v1`; English naming; strict TypeScript
10. Local report per task in gitignored `docs/`; no commit unless prompt requests

### Suggested module name

`family-engagement` or `portal-orchestration` or `catechist-parent` — **GPT should pick one bounded context name in #001 audit** that reflects orchestration, not domain ownership.

Suggested ownership:

- **Owns:** no core business tables (or minimal read-model cache tables only if justified — prefer stateless orchestration)
- **Depends on:** Class, Enrollment, Student, Practice, LearningProgress, Exam (public exports only)
- **Exports:** one facade service, e.g. `FamilyEngagementService` or `CatechistParentOrchestrationService`

---

## 7. Recommended 4–5 prompt breakdown (for GPT to refine)

| Prompt | Title | Deliverables |
|--------|-------|--------------|
| **#001** | Domain audit + orchestration design | Gap analysis, API contract, module boundary map, RBAC additions, defer list, FE/mobile contract notes |
| **#002** | Catechist context + assigned class APIs | `GET /me/catechist/context`, class summaries, scoped roster read-models; tests |
| **#003** | Parent context + child progress APIs | `GET /me/parent/context`, linked children, enrollment progress snapshot (LP+Practice+Exam compose); tests |
| **#004** | Hardening + RBAC + module boundaries | Scope denial tests (foreign child, unassigned class), performance guards, README, OpenAPI |
| **#005** | Final audit + demo seed + Postman | Idempotent demo seed, Postman collection, phase completion gate |

Alternative: merge #004+#005 if scope stays thin (stateless orchestration only).

---

## 8. Demo seed chain (for integration / Postman)

Run in order after migrations:

```powershell
npm run seed:auth-rbac
npm run seed:parish-academic
npm run seed:class-enrollment
npm run seed:curriculum-demo
npm run seed:question-bank-demo
npm run seed:learning-progress-demo   # optional but useful
npm run seed:localization-demo        # optional
npm run seed:exam-demo
```

Existing Postman collections (`docs/postman/`):

- Auth-RBAC, Parish-Academic, Curriculum, Media, Question-Bank, Practice, Learning-Progress, Localization, Exam

**Missing:** unified Parent/Catechist orchestration collection (target of new module #005).

---

## 9. Quality gates (last known state — Exam #008)

| Gate | Result |
|------|--------|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm test` (unit, incl. exam + module-boundaries) | PASS |
| `npm run build` | PASS |
| `npm run quality:full` | PASS on prior phases (Learning Progress #004); re-run recommended before #001 audit |
| Docker MSSQL + integration | Available via `wsl docker compose`; `test:integration` includes `exam-demo-seed` |

---

## 10. Key policy matrix (carry into new module)

| Actor | Class roster (all students) | Enrollment progress | Class aggregate progress | Exam attempt | Exam result (child) | Exam class summaries |
|-------|----------------------------|---------------------|--------------------------|--------------|---------------------|----------------------|
| Linked STUDENT | No | Own enrollment | No | Yes | Own | No |
| PARENT | No | Linked child | **403** | **403** | Yes (policy) | **403** |
| Assigned CATECHIST | Assigned class | Assigned scope | Assigned class | **403** | Staff read | Yes |
| PARISH_ADMIN | Parish | Yes | Yes | No | Yes | Yes |

---

## 11. Instructions for GPT evaluator

When reviewing this handoff, please produce:

1. **Go / No-Go** for starting Catechist + Parent supporting APIs
2. **Module name + boundary confirmation** (tables owned, exports, inbound/outbound deps)
3. **Refined 4–5 prompt specs** (objective, scope in/out, acceptance criteria, tests)
4. **API contract draft** (routes, DTOs, error cases, idempotency)
5. **RBAC delta** (new permissions vs reuse existing read permissions + scope guards)
6. **Explicit defer list** with hooks for Attendance, Schedule, Prayer, Notifications
7. **Risk register** (N+1 orchestration, PII in aggregates, parent class-wide leakage)

### Questions GPT should answer

- Should orchestration live in a new module or extend `EnrollmentModule` (`MeController`)?
- Is a dedicated permission (e.g. `family-engagement.read`) needed or are existing permissions sufficient with scope services?
- Which public methods must be added to `ExamService` / `PracticeService` vs composing existing HTTP-level logic in a new service?
- Should `GET /me/parent/children` include inactive guardianships/enrollments?

---

## 12. Suggested verdict for GPT (pre-filled baseline)

| Item | Baseline recommendation |
|------|-------------------------|
| Go / No-Go | **GO** |
| Start with | **#001 audit prompt** (mandatory per project rules) |
| Module type | **Orchestration / read-model facade** (minimal or zero new tables) |
| Do not start yet | Attendance, Schedule, Prayer, Notifications full modules |
| First user-facing value | Catechist assigned-class dashboard + Parent linked-child progress snapshot |

---

## 13. Related local reports (for deep dive)

| Topic | Report path |
|-------|-------------|
| Class/Enrollment architecture | `docs/CLASS_007A_FINAL_ARCHITECTURE_AND_CONTRACT_AUDIT_REPORT.md` |
| Parent/Catechist scope (LP) | `docs/LEARNING_PROGRESS_004_FINAL_AUDIT_AND_CONTRACT_READINESS_REPORT.md` |
| Parent proxy (Practice) | `docs/PRACTICE_006_FINAL_AUDIT_DEMO_POSTMAN_PHASE_COMPLETION_REPORT.md` |
| Exam parent policy | `docs/EXAM_001_DOMAIN_AUDIT_AND_FORMAL_ASSESSMENT_DESIGN_REPORT.md` |
| Exam completion | `docs/EXAM_008_FINAL_AUDIT_DEMO_POSTMAN_PHASE_COMPLETION_REPORT.md` |
| Master roadmap | `Docs kế hoạch/total_plan_multilingual_ai_translation_updated.txt` |

---

**END OF HANDOFF REPORT**
