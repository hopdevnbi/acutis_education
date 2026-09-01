# PRACTICE ENGINE #004A — Full Validation Gate Report

## 1 Objective

Close PRACTICE #004 by running the missing validation gates: pristine DB reset, migrations, integration, DB e2e, one clean `quality:full`, and Docker production build. Validation/corrective only — no #005 scope.

## 2 State inherited from #004

- Implementation committed: `1180fbc feat(practice): add answer grading and review flow`
- Answer POST, grading, retry, feedback reveal, auto-complete, review-wrong implemented
- Prior #004A attempt blocked (MSSQL/Docker unavailable)

## 3 Environment audit

| Item | Value |
|------|-------|
| OS | Windows 10 (win32 10.0.18362) |
| Node (Windows) | v22.23.1 |
| npm (Windows) | 11.16.0 |
| MSSQL Docker | `catechism-mssql` healthy on `localhost:14330` (WSL) |
| Repo path | `C:\Users\admin\Desktop\DỰ ÁN GIÁO LÝ VIÊN\Acutis Education` |
| Validation date | 2026-09-01 |

## 4 MSSQL availability

**PASS** — `npm run test:db:prepare -- --reset` succeeds; `catechism_api_test` created.

## 5 Docker availability

**PASS** — WSL Docker daemon running; production build succeeds.

## 6 Files changed (validation fixes)

### Service fixes

| File | Fix |
|------|-----|
| `src/modules/practice/services/practice-answer.service.ts` | Idempotent replay on COMPLETED session (check `existingReplay` before `assertSessionAcceptsAnswers`); UUID normalization on `attemptId`/`clientAnswerId` |
| `src/modules/practice/services/practice-session-query.service.ts` | Normalize `attemptId`/`clientAnswerId` in `latestAttempt` (MSSQL uppercase UUID) |

### Test isolation fixes

| File | Fix |
|------|-----|
| `test/integration/practice-answer-review.integration-spec.ts` | `questionTypes: [SingleChoice]` for deterministic grading |
| `test/practice.db.e2e-spec.ts` | `SINGLE_CHOICE_SESSION_REQUEST` constant |
| `test/integration/curriculum-demo-seed.integration-spec.ts` | Delete `question_curriculum_links` before curriculum teardown; full parish/question cleanup in prerequisite test; re-seed auth before class-enrollment-dependent tests |
| `test/integration/parish-academic-seed.integration-spec.ts` | `cleanupDemoParishState()` helper with full FK-safe teardown |
| `test/integration/question-bank-demo-seed.integration-spec.ts` | Delete `question_curriculum_links` by `authoring_curriculum_version_id` |
| `test/integration/auth-rbac-seed.integration-spec.ts` | Null `curriculum_assignments.assigned_by_user_id` before user delete |
| `test/integration/class-enrollment-seed.integration-spec.ts` | Curriculum + question cleanup before catechism_level/parish delete in prerequisite test |
| `test/auth-rbac-dev.db.e2e-spec.ts` | FK-safe `afterAll` cleanup (curriculum, questions, practice, parish_memberships) |

## 7 Validation fixes summary

1. **Practice answer idempotency bug** — replay with same `clientAnswerId` on COMPLETED session returned 409 instead of 200.
2. **UUID case mismatch** — MSSQL returns uppercase UUIDs; replay assertions failed on lowercase comparison.
3. **Test assumption bug** — integration/e2e assumed `options[0]` is correct; random MULTIPLE_CHOICE questions broke grading tests.
4. **Seed suite pollution** — shared `demo-parish` data left by practice/QB suites caused FK violations in curriculum/parish-academic/class-enrollment seed tests when run in full integration order.
5. **DB e2e cleanup** — `auth-rbac-dev.db.e2e-spec.ts` `afterAll` failed after practice e2e seeded curriculum/questions referencing auth users.

## 8 Unit result

**PASS** — 92 suites, 507 tests

## 9 DB-free e2e result

**PASS** — 2 suites, 5 tests

## 10 Pristine DB reset

**PASS** — `npm run test:db:prepare -- --reset`

## 11 Migration result

**PASS** — `npm run test:db:migrations` (no pending migrations after apply)

## 12 Integration result

**PASS** — 33 suites, 205 tests (including `practice-answer-review.integration-spec.ts` 3/3)

## 13 DB e2e result

**PASS** — 21 suites, 110 tests (including `practice.db.e2e-spec.ts`, `auth-rbac-dev.db.e2e-spec.ts`)

## 14 quality:full clean run

**PASS** — one end-to-end run exit 0 (~9.4 min)

## 15 Docker production build

**PASS**

```bash
wsl bash -lc "cd '/mnt/c/Users/admin/Desktop/DỰ ÁN GIÁO LÝ VIÊN/Acutis Education' && docker build --target production -t catechism-api:practice-answer-review ."
```

Image: `catechism-api:practice-answer-review`

## 16 #004 targeted scenario verification

| Scenario | Integration | DB e2e |
|----------|-------------|--------|
| Answer submission + retry | PASS | PASS |
| Feedback reveal gating | PASS | PASS |
| Auto-complete on correct | PASS | PASS |
| Review-wrong create/replay | PASS | PASS |
| Answer idempotent replay (200) | PASS | PASS |
| Linked Parent submit / scope | PASS | PASS |
| Catechist/Admin denied | PASS | PASS |

## 17 Existing regression

**PASS** — Practice #003 generation, Question Bank, module boundaries unchanged.

## 18 Security regression

No weakening. Linked-Parent scope, server-side grading, feedback reveal gating preserved.

## 19 Known/deferred

- #005 progress/statistics not started (by design)
- Seed test isolation fixes are defensive; full suite order remains sensitive — `quality:full` reset between integration and e2e mitigates

## 20 PRACTICE #004 acceptance decision

**PRACTICE ENGINE #004/6 ACCEPTED**

## 21 PRACTICE #005 readiness

**PRACTICE #005 READY: YES**

## 22 Commands (final run)

```text
node --version                          → v22.23.1
npm run test:db:prepare -- --reset      → PASS
npm run quality:full                    → PASS (exit 0)
docker build --target production        → PASS (catechism-api:practice-answer-review)
```

## 23 Git compliance

- No `git add`, `git commit`, or `git push` executed by agent
- Uncommitted validation fixes remain in working tree (see §6)

## 24 Commit recommendation

```text
git commit -m "fix(practice): stabilize answer review validation"
```

---

## Explicit PASS/FAIL matrix

| Check | Status |
|-------|--------|
| format | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS |
| DB-free e2e | PASS |
| build | PASS |
| npm audit | PASS |
| quality | PASS |
| MSSQL reachable | PASS |
| pristine DB reset | PASS |
| migrations | PASS |
| integration | PASS |
| DB e2e | PASS |
| quality:full ONE CLEAN RUN | PASS |
| Docker build | PASS |
| answer flow DB-backed | PASS |
| retry DB-backed | PASS |
| feedback DB-backed | PASS |
| auto-complete DB-backed | PASS |
| review-wrong DB-backed | PASS |
| answer idempotency DB-backed | PASS |
| archived grading/feedback regression | PASS |
| Practice #003 regression | PASS |
| Question Bank regression | PASS |
| no #005 scope added | PASS |
| Git rule compliance | PASS |

---

## Acceptance gate (final)

**PRACTICE ENGINE #004/6 ACCEPTED**

**PRACTICE #005 READY: YES**
