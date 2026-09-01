# PARISH #004 — Academic Structure Services + API + RBAC

> Status: **COMPLETE**
> Scope: AcademicYearService, CatechismLevelService, controllers, DTOs, RBAC, tests
> Next prompt: **PARISH #005** — Domain seed data (when prompted)

---

## 1. Objective

Implement Academic Year and Catechism Level application layer and HTTP APIs per #001/#002/#003 design:

- `AcademicYearService` with PLANNED → ACTIVE → CLOSED lifecycle
- `CatechismLevelService` with code normalization and ACTIVE/INACTIVE status
- Controllers with JWT + permission guards
- Permissions `academic-years.read/manage`, `catechism-levels.read/manage`
- Unit, integration, and DB e2e tests
- Extend local Auth/RBAC seed catalog

No domain seed data (deferred to #005).

---

## 2. State Inherited From #003

| Item | State |
|------|-------|
| Tables | `academic_years`, `catechism_levels` (schema complete) |
| ParishModule | Exports `ParishService` with `assertParishActive` |
| AcademicStructureModule | Entities only; no services/controllers |
| Auth/RBAC | Complete; global scope |

---

## 3. Rules Read/Applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`
- Module exports: `AcademicYearService`, `CatechismLevelService` only
- Cross-module dependency: `ParishService` public API only
- Scalar `parishId`; no TypeORM relations across modules
- Auth at controller/module wiring layer only
- No parish scope enforcement yet (global RBAC)

---

## 4. AcademicStructureModule Architecture

```
AcademicStructureModule
├── TypeOrmModule.forFeature([AcademicYearEntity, CatechismLevelEntity])  (private)
├── ParishModule          (ParishService only)
├── AuthModule            (guard DI only)
├── AccessControlModule   (guard DI only)
├── AcademicYearService   (exported)
├── CatechismLevelService (exported)
├── AcademicYearController
└── CatechismLevelController
```

Business services depend on `ParishService` only — no Auth/AccessControl imports.

---

## 5. Public Exports

| Export | Type |
|--------|------|
| `AcademicYearService` | **Yes** |
| `CatechismLevelService` | **Yes** |
| `TypeOrmModule` | No |
| Entities / repositories | No |

---

## 6. AcademicYearService API

| Method | Description |
|--------|-------------|
| `createAcademicYear(parishId, input)` | Create with PLANNED status; requires active parish |
| `getAcademicYearById(id)` | Get by UUID; throws if missing/invalid |
| `listAcademicYearsByParish(parishId, input)` | Paginated list scoped to parish |
| `updateAcademicYear(id, input)` | Update name/dates; CLOSED records immutable |
| `updateAcademicYearStatus(id, status)` | PLANNED→ACTIVE or ACTIVE→CLOSED only |

**Lifecycle rules:**

- Default status on create: `PLANNED`
- Allowed transitions: `PLANNED → ACTIVE`, `ACTIVE → CLOSED`
- At most one `ACTIVE` academic year per parish (transaction + pessimistic lock)
- `CLOSED` records cannot be modified

---

## 7. CatechismLevelService API

| Method | Description |
|--------|-------------|
| `createCatechismLevel(parishId, input)` | Create with ACTIVE status; requires active parish |
| `getCatechismLevelById(id)` | Get by UUID; throws if missing/invalid |
| `listCatechismLevelsByParish(parishId, input)` | Paginated list scoped to parish |
| `updateCatechismLevel(id, input)` | Update code/name/sortOrder; requires active parish |
| `updateCatechismLevelStatus(id, status)` | ACTIVE requires active parish; INACTIVE allowed when parish inactive |

**Validation:**

- Code: lowercase kebab-case, unique per parish
- Sort order: non-negative integer
- Name: trimmed, max 128 chars

---

## 8. HTTP Routes

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/parishes/:parishId/academic-years` | `academic-years.manage` |
| `GET` | `/api/v1/parishes/:parishId/academic-years` | `academic-years.read` |
| `GET` | `/api/v1/academic-years/:id` | `academic-years.read` |
| `PATCH` | `/api/v1/academic-years/:id` | `academic-years.manage` |
| `PATCH` | `/api/v1/academic-years/:id/status` | `academic-years.manage` |
| `POST` | `/api/v1/parishes/:parishId/catechism-levels` | `catechism-levels.manage` |
| `GET` | `/api/v1/parishes/:parishId/catechism-levels` | `catechism-levels.read` |
| `GET` | `/api/v1/catechism-levels/:id` | `catechism-levels.read` |
| `PATCH` | `/api/v1/catechism-levels/:id` | `catechism-levels.manage` |
| `PATCH` | `/api/v1/catechism-levels/:id/status` | `catechism-levels.manage` |

List query parameters: `page`, `limit`, `sortBy`, `sort`, optional `status`, optional `search`.

---

## 9. RBAC Seed Updates

Added permissions:

- `academic-years.read`, `academic-years.manage`
- `catechism-levels.read`, `catechism-levels.manage`

Role matrix:

| Role | Academic years | Catechism levels |
|------|----------------|------------------|
| SUPER_ADMIN | read + manage | read + manage |
| PARISH_ADMIN | read + manage | read + manage |
| CATECHIST | read | read |
| PARENT | read | read |

Re-run on dev DB after pulling: `npm run seed:auth-rbac`

---

## 10. Files Created

| Area | Files |
|------|-------|
| Services | `academic-year.service.ts`, `catechism-level.service.ts` |
| Controllers | `academic-year.controller.ts`, `catechism-level.controller.ts` |
| DTOs | create/update/status/list request/response DTOs (10 files) |
| Utils | date, name, code, sort-order, search, unique-constraint, http error mapping |
| Mappers | entity snapshots + response mappers |
| Interfaces | academic-year.interface.ts, catechism-level.interface.ts |
| Tests | unit specs, integration spec, db e2e spec |

---

## 11. Files Modified

| File | Change |
|------|--------|
| `academic-structure.module.ts` | Services, controllers, Parish/Auth/AccessControl imports, exports |
| `module-boundaries.spec.ts` | Assert two-service export |
| `auth-rbac.seed.constants.ts` | New permissions + role matrix |
| `README.md` | Academic structure API table |

---

## 12. Validation Summary

| Command | Result |
|---------|--------|
| `npm run typecheck` | PASS |
| `npm run format` | PASS |
| `npm test` | PASS (175 tests) |
| `npm run build` | PASS |
| `npm run test:integration` (academic-structure) | PASS |
| `npm run test:e2e:db` (academic-structure) | PASS |

Note: integration/e2e require `DB_NAME=catechism_api_test` if shell exports `DB_NAME=catechism_api`.

---

## 13. Suggested Commit

```
feat(parish): add academic structure APIs
```

---

## 14. Manual Verification (optional)

1. `npm run migration:run` (if not applied)
2. `npm run seed:auth-rbac` on `catechism_api`
3. Login as `admin@local.catechism.test` / `LocalDev!Sample2026`
4. Create parish → create academic year → activate → create catechism level
5. Swagger: `/api/docs`

---

## 15. Known Notes / Follow-ups

- TypeORM `date` columns may serialize ISO strings through JS `Date` in local timezone; raw SQL integration tests confirm DB DATE integrity. Monitor API responses if FE reports off-by-one dates.
- Full `quality:full` was not run in one shot due to shell `DB_NAME` override; individual gates above all passed.
- Domain seed (#005) not started.

---

## 16. Definition of Done

- [x] AcademicYearService + CatechismLevelService implemented
- [x] HTTP controllers with DTO validation and Swagger
- [x] RBAC permissions seeded in constants
- [x] Module boundary exports verified
- [x] Unit + integration + e2e tests
- [x] README updated
- [x] Local handoff report written
