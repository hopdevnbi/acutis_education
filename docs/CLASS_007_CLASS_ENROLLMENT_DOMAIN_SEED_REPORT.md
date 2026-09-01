# CLASS #007 — Class/Enrollment Domain Seed

> Status: **COMPLETE**
> Phase: **#007/7**
> Scope: Dev-only idempotent seed for parish memberships, demo classes, students, guardians, catechist assignments, enrollments
> Next prompt: **CLASS phase complete** — no further CLASS prompts in #001 plan

---

## 1. Objective

Wire local demo data so CLASS #006 scoped RBAC can be exercised with sample users from `seed:auth-rbac`:

- `admin@local.catechism.test` → active `parish_memberships` on demo parish
- Demo classes `demo-class-a`, `demo-class-b` (active)
- Demo students Alpha (active in class A), Beta (transfer history B → A)
- `parent@local.catechism.test` → guardian links to both students
- `catechist@local.catechism.test` → lead assignments on both classes

Uses **public module services only** (no repository bypass). Idempotent. Dev-only guard via `assertSafeSeedEnvironment`.

---

## 2. State Inherited From #006

| Item | State |
|------|-------|
| Scope services | ParishScopeService, ClassScopeService, StudentAccessService wired |
| Sample users | Exist after `seed:auth-rbac` but lacked membership/guardian/catechist links |
| Demo parish/year/levels | Created by `seed:parish-academic` |
| `parish_memberships` | Entity + migration; no write service until #007 |

---

## 3. Architecture

```
Prerequisites (manual, in order):
  npm run seed:auth-rbac
  npm run seed:parish-academic
  npm run seed:class-enrollment

ClassEnrollmentSeedService
├── ParishMembershipService.ensureActiveMembership (new public API)
├── ClassService (create/activate demo classes)
├── StudentService + StudentGuardianService
├── ClassCatechistAssignmentService
└── EnrollmentService (enroll + transfer history)
```

---

## 4. Files Created / Modified

| Area | Files |
|------|-------|
| Parish membership API | `parish-membership.service.ts`, interface, mapper, errors |
| Seed constants | `class-enrollment.seed.constants.ts` |
| Seed orchestration | `class-enrollment.seed.service.ts`, `class-enrollment-seed.module.ts` |
| CLI | `scripts/seed-class-enrollment.ts`, `package.json` script |
| Integration test | `test/integration/class-enrollment-seed.integration-spec.ts` |
| Module wiring | `parish.module.ts` (ParishMembershipService export), `module-boundaries.spec.ts` |
| Docs | `README.md` seed section |

---

## 5. Seed Data Summary

| Resource | Value |
|----------|-------|
| Parish | `demo-parish` (from parish-academic seed) |
| Classes | `demo-class-a`, `demo-class-b` |
| Students | `Demo Student Alpha`, `Demo Student Beta` |
| Admin membership | `admin@local.catechism.test` on demo parish |
| Guardian | `parent@local.catechism.test` → both students |
| Catechist | `catechist@local.catechism.test` → both classes (LEAD) |
| Enrollments | Alpha ACTIVE in class A; Beta TRANSFERRED from B, ACTIVE in A |

---

## 6. Idempotency

Second run detects existing records via domain errors / scope checks and increments `*Existing` counters instead of failing:

- `ParishScopeService.hasActiveParishMembership` before membership create
- `ClassCodeAlreadyExistsError`, `GuardianLinkAlreadyActiveError`, `GuardianPrimaryAlreadyAssignedError`, `CatechistAssignmentAlreadyActiveError`, `StudentAlreadyEnrolledInParishYearError`
- Transfer history: checks for TRANSFERRED + ACTIVE-in-target before re-transfer

---

## 7. Module Boundaries

| Module | New export |
|--------|------------|
| ParishModule | `ParishMembershipService` (3 exports total) |

Seed module imports: Users, Parish, AcademicStructure, Class, Student, Enrollment (all via public exports).

---

## 8. Validation Results

| Command | Result |
|---------|--------|
| `npm run format` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS (52 suites, 229 tests) |
| `test/integration/class-enrollment-seed.integration-spec.ts` | PASS (3 tests) |

---

## 9. Suggested Commit

```
feat(seed): add class enrollment domain demo seed
```

---

## 10. Completion Decision

**CLASS #007 COMPLETE**

**CLASS phase (#001–#007) COMPLETE** — schema, services, APIs, scoped RBAC, and local demo seed are in place.
