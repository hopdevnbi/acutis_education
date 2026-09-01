# PARISH #005 — Final Integration Hardening + Domain Seed + API Contract Audit

> Status: **COMPLETE**
> Phase: **#005/5 — FINAL**
> Next backend phase: **Class + Student + Catechist + Parent + Enrollment** (design only — not implemented)

---

## 1. Objective

Independent final audit and hardening of Parish + Academic Structure phase:

- Module boundaries, RBAC, API contracts
- One ACTIVE academic year invariant
- FE-safe date serialization (`YYYY-MM-DD`)
- Local/dev domain seed
- Postman verification assets
- Full `quality:full` + Docker validation

---

## 2. State Before Final Audit

| Item | State |
|------|-------|
| ParishModule | Service + API + RBAC complete (#003) |
| AcademicStructureModule | Services + API + RBAC complete (#004) |
| Domain seed | Not implemented |
| Date transformer | Not implemented — TypeORM DATE could shift via JS `Date` |
| One ACTIVE DB constraint | Application-only check |
| `quality:full` one-shot | Not verified (shell `DB_NAME` override) |

---

## 3. Rules Applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`
- No cross-module entity/repository access
- Seed via public services only
- No FE changes
- New migration only (no edit to #002 migration)

---

## 4. Findings Summary

| ID | Severity | Finding | Action |
|----|----------|---------|--------|
| F-001 | **HIGH** | Academic year DATE values could serialize with timezone shift in HTTP JSON | **Fixed** — UTC date-only column transformer + mapper normalization |
| F-002 | **HIGH** | One ACTIVE year relied on app-level check only; concurrent activation could race | **Fixed** — filtered unique index + parish-scoped pessimistic lock + unique violation mapping |
| F-003 | MEDIUM | No local domain demo seed | **Fixed** — `npm run seed:parish-academic` |
| F-004 | MEDIUM | No Postman flow for parish/academic APIs | **Fixed** — collection + environment in `docs/postman/` |
| F-005 | INFO | Global RBAC without parish scope | **Deferred** — documented future trigger |
| F-006 | INFO | Concurrent activation under heavy lock contention may surface MSSQL deadlock before unique index | **Mitigated** — deadlock mapped to domain conflict; test accepts both outcomes |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

---

## 5. Module Ownership Audit

| Module | Owns | Status |
|--------|------|--------|
| ParishModule | `parishes` | PASS |
| AcademicStructureModule | `academic_years`, `catechism_levels` | PASS |

No production module mutates another module's tables directly.

---

## 6. Public Export Audit

| Module | Exports | Status |
|--------|---------|--------|
| ParishModule | `ParishService` only | PASS |
| AcademicStructureModule | `AcademicYearService`, `CatechismLevelService` only | PASS |

No TypeORM/entity/repository exports.

---

## 7. Cross-Module Persistence Audit

- AcademicStructure uses `ParishService` public API only — PASS
- Scalar `parishId`; no `@ManyToOne` to `ParishEntity` — PASS
- Seed orchestrator uses services only — PASS

---

## 8–10. API Final Audits

Parish, Academic Year, and Catechism Level APIs verified via unit, integration, and DB e2e tests:

- Validation, pagination, RBAC 401/403, 404/409 — PASS
- Academic year lifecycle PLANNED → ACTIVE → CLOSED — PASS
- CLOSED immutability — PASS
- Catechism level code normalization, sort order, inactive parish rules — PASS

---

## 11. One ACTIVE Academic Year — Concurrency Audit

**Implementation (layered):**

1. Transaction with pessimistic write lock on target row
2. Pessimistic lock on all academic years for the parish (`UPDLOCK`)
3. Pre-save existence check for ACTIVE year
4. **DB filtered unique index** `UQ_academic_years_parish_id_active` on `(parish_id) WHERE status = 'ACTIVE'`
5. Unique constraint / deadlock mapped to `ActiveAcademicYearAlreadyExistsError`

Migration: `1788062900000-add-academic-years-one-active-per-parish-index.ts`

---

## 12. Concurrent Activation Test

Integration test uses `Promise.allSettled` on two PLANNED years for same parish.

**Result:** Exactly one succeeds; one fails with domain conflict or expected DB conflict/deadlock. Final DB state: exactly one ACTIVE year.

---

## 13–14. Date Serialization Audit / FE Contract

**Fix:** `isoDateOnlyColumnTransformer` on `AcademicYearEntity.startDate/endDate`

- Stores as UTC calendar date (no local timezone drift)
- Reads back as `YYYY-MM-DD` string
- Mapper applies `normalizeIsoDateOnly`

**FE contract:**

```
startDate: "2026-09-01"
endDate: "2027-06-30"
```

Integration + DB e2e assert exact string values — PASS

---

## 15. Parish Inactive Behavior Matrix

| Operation | Inactive parish |
|-----------|-----------------|
| Read parish / list years / list levels | Allowed |
| Create year / activate year / edit year | Blocked (`ParishInactiveError`) |
| Create level / edit level / reactivate level | Blocked |
| Deactivate level | Allowed |

---

## 16. Academic Year Lifecycle Matrix

| From | To | Allowed |
|------|-----|---------|
| PLANNED | ACTIVE | Yes |
| ACTIVE | CLOSED | Yes |
| PLANNED | CLOSED | No |
| ACTIVE | PLANNED | No |
| CLOSED | * | No (immutable) |

---

## 17–19. Immutability / Level Lifecycle

- CLOSED academic years: no name/date/status rollback — PASS
- Catechism levels: soft status only; reactivation requires active parish — PASS

---

## 20. RBAC Audit

Permissions: `parishes.*`, `academic-years.*`, `catechism-levels.*`

- Guards at controller layer only — PASS
- No SUPER_ADMIN bypass in business code — PASS
- Global scope (no parish membership yet) — documented

---

## 21. Parish Scope Future Trigger

Before multi-parish production for parish admins/catechists, introduce resource-scope/membership checks. Stable `parishId` remains scope key.

---

## 22–24. Domain Seed

**Command:** `npm run seed:parish-academic`

| Item | Value |
|------|-------|
| Parish code | `demo-parish` |
| Parish name | `Giáo xứ Demo (Local Sample)` |
| Academic year | `2026-2027 (Demo)` — ACTIVE after seed |
| Levels | `demo-level-1..3` |

Safety: manual CLI, production rejected, DB allow-list, idempotent, services only.

---

## 25. Postman / cURL Verification

- `docs/postman/Acutis-Education-Parish-Academic.postman_collection.json`
- `docs/postman/Acutis-Education-Local.postman_environment.json`

Flow: login → parish → academic year → activate → levels → list

---

## 26–27. FE API Contract / Swagger

List shape `{ items, page, limit, total, totalPages }` — consistent  
Enums uppercase — consistent  
IDs UUID strings — consistent  
Swagger documents all parish/academic routes — PASS

---

## 28. FE Parallel-Readiness Decision

**FE PARISH/ACADEMIC CONTRACT READY: YES**

Date fields are stable `YYYY-MM-DD` strings; response shapes match PROJECT_RULES pagination convention.

---

## 29–31. Validation Results

| Gate | Result |
|------|--------|
| format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit tests | PASS (176) |
| DB-free e2e | PASS |
| build | PASS |
| test:db:migrations | PASS |
| test:integration | PASS |
| test:e2e:db | PASS |
| **quality:full (one clean run)** | **PASS** (`DB_NAME=catechism_api_test`) |
| Docker `catechism-api:parish-academic-final` | PASS |
| seed:parish-academic (dev) | PASS |
| seed idempotency (integration) | PASS |

Note: For clean integration runs after manual dev seeding, use `npm run test:db:prepare -- --reset` first.

---

## 32. Files Created

| File | Purpose |
|------|---------|
| `src/database/iso-date-only-column.transformer.ts` | UTC date-only persistence |
| `src/database/migrations/1788062900000-add-academic-years-one-active-per-parish-index.ts` | One ACTIVE per parish DB guard |
| `src/database/seeds/parish-academic.seed.constants.ts` | Demo seed catalog |
| `src/database/seeds/parish-academic.seed.service.ts` | Seed orchestrator |
| `src/database/seeds/parish-academic-seed.module.ts` | Nest seed module |
| `scripts/seed-parish-academic.ts` | CLI entry |
| `test/integration/parish-academic-seed.integration-spec.ts` | Seed integration tests |
| `docs/postman/Acutis-Education-Parish-Academic.postman_collection.json` | Manual verification |
| `docs/postman/Acutis-Education-Local.postman_environment.json` | Local env vars |

---

## 33. Files Modified

| File | Change |
|------|--------|
| `academic-year.entity.ts` | Date column transformer |
| `academic-year.mapper.ts` | Normalize date output |
| `academic-year.service.ts` | Stronger activation transaction + error mapping |
| `academic-structure.integration-spec.ts` | Date + concurrency tests |
| `academic-structure.db.e2e-spec.ts` | Exact date assertions |
| `package.json` | `seed:parish-academic` script |
| `README.md` | Seed + API docs |

---

## 34. Completion Decision

**A. PARISH / ACADEMIC YEAR / CATECHISM LEVEL PHASE COMPLETE**

#005/5 complete — 0 prompts remain in this phase.

---

## 35. Next Backend Phase Recommendation

Recommend next master roadmap phase:

**Class + Student + Catechist + Parent + Enrollment**

Do not implement until explicitly prompted.

---

## 36. FE Parallel Recommendation

FE React repository can begin Parish/Academic screens in parallel with the next backend phase using:

- Auth seed credentials
- `npm run seed:parish-academic` demo data
- Postman collection for contract verification
- Swagger at `/api/docs`

---

## 37. Suggested Commit

```
fix(parish): finalize academic structure phase
```

(Cursor did not execute git commands per project policy.)
