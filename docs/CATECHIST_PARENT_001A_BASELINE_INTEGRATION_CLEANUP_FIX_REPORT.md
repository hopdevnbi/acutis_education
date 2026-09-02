# CATECHIST + PARENT #001A — Baseline Integration Cleanup Fix

**Phase:** Corrective hygiene before Family Portal #002  
**Date:** 2026-09-02  
**Prompt:** `CATECHIST_PARENT_001A_BASELINE_INTEGRATION_CLEANUP_FIX.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| BASELINE INTEGRATION CLEANUP FIXED | **YES** |
| PRODUCTION SCHEMA CHANGE REQUIRED | **NO** |
| AFFECTED INTEGRATION SPECS | **PASS** |
| FULL INTEGRATION | **PASS** (42 suites / 236 tests) |
| DB E2E | **PASS** (124 tests) |
| PRISTINE QUALITY:FULL | **PASS** |
| NPM AUDIT | **PASS** (0 moderate+) |
| DOCKER | **PASS** (`catechism-api:family-portal-baseline-fixed`) |
| Unresolved BLOCKER | **0** |
| Unresolved HIGH | **0** |
| **CATECHIST + PARENT #002 READINESS** | **YES** |

---

## 1. Objective

Restore pristine `quality:full` baseline by fixing integration/e2e seed cleanup FK order after Exam Engine tables were added. No Family Portal implementation.

---

## 2. Why #001A was required

#001 audit identified `quality:full` FAIL: integration specs deleted `classes` / `enrollments` while `exam_assignments` and related rows still referenced them (`FK_exam_assignments_class_id_classes_id`). #002 was blocked until baseline pass.

---

## 3. Original failing command

```bash
npm run test:db:prepare -- --reset
npm run quality:full
```

Failed at `test:integration` (then cascading e2e teardown issues).

---

## 4. Original FK failure

```
The DELETE statement conflicted with the REFERENCE constraint
"FK_exam_assignments_class_id_classes_id"
```

Also discovered after partial fix:

```
FK_students_user_id_users_id
```

when `auth-rbac` specs deleted seed users while demo students (from class-enrollment seed) still linked via `user_id`.

---

## 5. Affected specs

| Spec | Issue |
|------|-------|
| `parish-academic-seed.integration-spec.ts` | No exam cleanup before class delete |
| `class-enrollment-seed.integration-spec.ts` | Same |
| `curriculum-demo-seed.integration-spec.ts` | Same |
| `auth-rbac-seed.integration-spec.ts` | Students not deleted before users |
| `auth-rbac-dev.db.e2e-spec.ts` | Same teardown FK |
| `exam-demo-seed.integration-spec.ts` | Duplicated SQL (refactored to helper) |
| `learning-progress.db.e2e-spec.ts` | Stale `exam: null` assertion (post Exam #007 LP hook) |

---

## 6. Actual FK dependency chain (Exam Engine)

Delete order (child → parent):

1. `exam_attempt_answers`
2. `exam_attempt_questions`
3. `exam_attempts` (FK → `enrollments`, `exam_assignments`)
4. `exam_assignments` (FK → `classes`, `exam_versions`)
5. `exam_version_questions`
6. `exam_versions`
7. `UPDATE exams SET current_published_version_id = NULL`
8. `exams`

Then safe to delete enrollments/classes/students/users per existing cleanup.

---

## 7. Cleanup strategy

1. Added **`deleteExamEngineRowsForParishCode`** helper — FK-safe exam deletion scoped by demo parish code (optional `examCode` for exam-demo spec).
2. Added **`cleanupAuthRbacSeedDomainDependencies`** — exam cleanup + practice/lesson_progress/enrollments/guardians/students for seed-domain users before user delete.
3. Wired helpers into affected integration specs and auth-rbac e2e teardown.
4. Updated learning-progress e2e type/assertion for composed `exam` summary (Exam #007 behavior).

---

## 8. Shared helper decision

**YES** — two narrowly scoped utilities under `test/integration/helpers/`:

- `delete-exam-engine-rows-for-parish-code.util.ts`
- `cleanup-auth-rbac-seed-domain-dependencies.util.ts`

Avoids copy-paste across 5+ specs and reduces future FK drift when new demo seeds run in parallel suites.

---

## 9. Files created

| Path |
|------|
| `test/integration/helpers/delete-exam-engine-rows-for-parish-code.util.ts` |
| `test/integration/helpers/cleanup-auth-rbac-seed-domain-dependencies.util.ts` |
| `docs/CATECHIST_PARENT_001A_BASELINE_INTEGRATION_CLEANUP_FIX_REPORT.md` |

---

## 10. Files modified

| Path |
|------|
| `test/integration/parish-academic-seed.integration-spec.ts` |
| `test/integration/class-enrollment-seed.integration-spec.ts` |
| `test/integration/curriculum-demo-seed.integration-spec.ts` |
| `test/integration/exam-demo-seed.integration-spec.ts` |
| `test/integration/auth-rbac-seed.integration-spec.ts` |
| `test/auth-rbac-dev.db.e2e-spec.ts` |
| `test/learning-progress.db.e2e-spec.ts` |

---

## 11. Production schema changed?

**NO**

---

## 12. Production behavior changed?

**NO** — test-only cleanup and one e2e assertion aligned with existing Exam #007 Learning Progress composition.

---

## 13–18. Validation

| Gate | Result |
|------|--------|
| Targeted integration (4 seed specs) | PASS |
| Full `npm run test:integration` | PASS |
| `npm run test:e2e:db` | PASS |
| Pristine `npm run quality:full` | PASS |
| `npm audit --audit-level=moderate` | PASS |
| Docker production build | PASS |

---

## 19. Git status

Tracked test files modified; helpers added; docs reports local (gitignored except if user commits test files only).

---

## 20. Risks

| Risk | Mitigation |
|------|------------|
| New exam tables in future migrations | Extend shared helper delete order |
| Other specs with inline parish cleanup | Reuse helper when touching those specs |

---

## 21. BLOCKER / HIGH / MEDIUM / LOW

| ID | Severity | Finding | Status |
|----|----------|---------|--------|
| F-001 | BLOCKER | Exam FK on integration cleanup | **FIXED** |
| F-002 | HIGH | Students FK on auth-rbac user delete | **FIXED** |
| F-003 | LOW | Stale LP e2e exam null assertion | **FIXED** |

**Unresolved BLOCKER: 0**  
**Unresolved HIGH: 0**

---

## 22. #002 readiness

**YES** — all gates pass. Recommended next prompt:

> CATECHIST + PARENT #002/5 — Family Portal module foundation + Catechist context / classes / roster

Scope per #001 design: `family-portal` module, zero tables, Catechist GET APIs, optional Exam/Class batch public methods.

---

## 23. Commit recommendation

Do not execute unless user requests. Suggested message:

```
git commit -m "test: fix exam-aware integration cleanup"
```

---

**END OF REPORT**
