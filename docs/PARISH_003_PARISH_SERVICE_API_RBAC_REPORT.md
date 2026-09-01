# PARISH #003 — Parish Service + API + RBAC Integration

> Status: **COMPLETE**
> Scope: ParishService, ParishController, DTOs, RBAC permissions, tests
> Next prompt: **PARISH #004** — Academic Year + Catechism Level Services + APIs (when prompted)

---

## 1. Objective

Implement Parish application layer and HTTP API per #001/#002 design:

- `ParishService` with safe snapshots and `assertParishActive`
- Code/name validation and normalization
- CRUD-style operations (no DELETE)
- `ParishController` with JWT + permission guards
- Permissions `parishes.read`, `parishes.manage`
- Unit, integration, and DB e2e tests
- Extend local Auth/RBAC seed catalog

No Academic Year or Catechism Level services.

---

## 2. State Inherited From #002

| Item | State |
|------|-------|
| Tables | `parishes` (schema complete) |
| ParishModule | Entity registered; no exports yet |
| AcademicStructureModule | Schema only; unchanged |
| Auth/RBAC | Complete; global scope |

---

## 3. Rules Read/Applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`
- Module exports: `ParishService` only
- Auth dependency at controller/module wiring layer only
- No entity/repository exports
- No parish scope enforcement yet (global RBAC)
- No `parish_id` on users

---

## 4. FE/BE Separation Rule Status

**Added** to `PROJECT_RULES.md` §6 and `AGENTS.md`:

- Frontend is separate ReactJS repository
- HTTP API integration only
- Independent Docker/CI/CD per side
- No cross-import of source/entities/services

**FE/BE rule present: YES**

---

## 5. Files Created

| File | Purpose |
|------|---------|
| `src/modules/parish/services/parish.service.ts` | Business logic |
| `src/modules/parish/services/parish.service.spec.ts` | Unit tests |
| `src/modules/parish/controllers/parish.controller.ts` | HTTP API |
| `src/modules/parish/errors/parish.errors.ts` | Domain errors |
| `src/modules/parish/interfaces/*.ts` | Input/snapshot contracts |
| `src/modules/parish/mappers/parish.mapper.ts` | Entity → snapshot |
| `src/modules/parish/mappers/parish-response.mapper.ts` | Snapshot → DTO |
| `src/modules/parish/dto/*.ts` | Request/response DTOs |
| `src/modules/parish/utils/parish-code.util.ts` | Code normalization |
| `src/modules/parish/utils/parish-name.util.ts` | Name validation |
| `src/modules/parish/utils/parish-search.util.ts` | LIKE escape |
| `src/modules/parish/utils/parish-http.util.ts` | Error → HTTP mapping |
| `src/modules/parish/utils/parish-code.util.spec.ts` | Code util tests |
| `src/modules/parish/constants/parish-permissions.constants.ts` | Permission codes |
| `src/modules/parish/constants/parish-list.constants.ts` | Pagination/sort whitelist |
| `test/integration/parish.integration-spec.ts` | Service integration tests |
| `test/parish.db.e2e-spec.ts` | HTTP + RBAC e2e tests |

---

## 6. Files Modified

| File | Change |
|------|--------|
| `src/modules/parish/parish.module.ts` | Service, controller, Auth/AccessControl imports, export ParishService |
| `src/modules/module-boundaries.spec.ts` | Assert ParishService-only export |
| `src/database/seeds/auth-rbac.seed.constants.ts` | Add parish permissions + role matrix |
| `PROJECT_RULES.md` | FE/BE rule + pagination convention |
| `AGENTS.md` | FE/BE separation note |
| `README.md` | Parish API + seed rerun note |

---

## 7. ParishModule Architecture

```
ParishModule
├── TypeOrmModule.forFeature([ParishEntity])  (private)
├── AuthModule          (guard DI only)
├── AccessControlModule (guard DI only)
├── ParishService       (exported)
└── ParishController
```

Business service has no Auth/AccessControl imports.

---

## 8. Public Exports

| Export | Type |
|--------|------|
| `ParishService` | **Yes** |
| `TypeOrmModule` | No |
| `ParishEntity` | No |
| Repository | No |

---

## 9. ParishService API

| Method | Description |
|--------|-------------|
| `createParish(input)` | Create with ACTIVE status |
| `getParishById(id)` | Get by UUID; throws if missing/invalid |
| `findParishSnapshotById(id)` | Nullable lookup |
| `listParishes(input)` | Paginated list with filters |
| `updateParish(id, input)` | Update code and/or name |
| `updateParishStatus(id, status)` | ACTIVE ↔ INACTIVE |
| `assertParishActive(id)` | For #004 cross-module validation |

---

## 10. ParishSnapshot

```typescript
interface ParishSnapshot {
  id, code, name, status, createdAt, updatedAt
}
```

No password, no internal fields, no entity exposure.

---

## 11. Code Normalization/Validation

- Trim + lowercase
- Pattern: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Length: 1–32
- No spaces, no Vietnamese diacritics in code
- Explicit input only (no auto-generate from name)

---

## 12. Name Validation

- Trim whitespace
- Required, max 128 chars
- Vietnamese diacritics supported (`nvarchar`)

---

## 13. Create Flow

1. `parseParishCode` → normalize/validate
2. `parseParishName` → trim/validate
3. Create entity with `status = ACTIVE`
4. Save; map duplicate → `ParishCodeAlreadyExistsError`
5. Return `ParishSnapshot`

---

## 14. Duplicate Handling

MSSQL unique violation (2627/2601) → `ParishCodeAlreadyExistsError` → HTTP 409 via controller.

---

## 15. Get Flow

- Validate UUID v4 → `InvalidParishIdError` (400) if malformed
- Missing row → `ParishNotFoundError` (404)

---

## 16. List/Pagination/Filter Strategy

Query params (standardized in `PROJECT_RULES.md` §10):

| Param | Default | Notes |
|-------|---------|-------|
| `page` | 1 | 1-based |
| `limit` | 20 | max 100 |
| `sortBy` | `name` | whitelist: code, name, status, createdAt |
| `sort` | ASC | ASC or DESC |
| `status` | — | optional ACTIVE/INACTIVE |
| `search` | — | parameterized LIKE on name/code |

Response envelope: `{ items, page, limit, total, totalPages }`

---

## 17. Update Flow

- PATCH `/parishes/:id` — code and/or name (at least one required)
- Code re-normalized; duplicate mapped to 409

---

## 18. Status Lifecycle

- PATCH `/parishes/:id/status` — explicit `{ status: ACTIVE | INACTIVE }`
- Reactivation allowed
- No DELETE endpoint
- Default on create: ACTIVE

---

## 19. assertParishActive

- Missing → `ParishNotFoundError`
- INACTIVE → `ParishInactiveError`
- ACTIVE → returns `ParishSnapshot`

Public method for AcademicStructureModule (#004).

---

## 20. Controller Endpoints

| Method | Route | Permission | Status |
|--------|-------|------------|--------|
| POST | `/api/v1/parishes` | parishes.manage | 201 |
| GET | `/api/v1/parishes` | parishes.read | 200 |
| GET | `/api/v1/parishes/:id` | parishes.read | 200 |
| PATCH | `/api/v1/parishes/:id` | parishes.manage | 200 |
| PATCH | `/api/v1/parishes/:id/status` | parishes.manage | 200 |

All routes: `@UseGuards(JwtAuthGuard, PermissionGuard)`

---

## 21. DTOs

- `CreateParishRequestDto`
- `UpdateParishRequestDto`
- `UpdateParishStatusRequestDto`
- `ParishListQueryDto`
- `ParishResponseDto`
- `ParishListResponseDto`

class-validator on all inputs; whitelisted sort fields.

---

## 22. HTTP/Error Mapping

| Domain Error | HTTP |
|--------------|------|
| InvalidParishCodeError | 400 |
| InvalidParishNameError | 400 |
| InvalidParishIdError | 400 |
| ParishNotFoundError | 404 |
| ParishCodeAlreadyExistsError | 409 |
| ParishInactiveError | 400 |

Via `rethrowParishServiceError()` in controller.

---

## 23. RBAC Permissions

| Permission | Usage |
|------------|-------|
| `parishes.read` | GET list/detail |
| `parishes.manage` | POST, PATCH, status |

No role-name checks. No SUPER_ADMIN bypass in code.

---

## 24. Local/Dev Permission Seed Update

Added to `auth-rbac.seed.constants.ts`:

| Role | parishes.read | parishes.manage |
|------|---------------|-----------------|
| SUPER_ADMIN | ✓ (all permissions) | ✓ |
| PARISH_ADMIN | ✓ | ✓ |
| CATECHIST | ✓ | — |
| PARENT | ✓ | — |

Re-run `npm run seed:auth-rbac` on dev DB to apply. Not auto-run.

---

## 25. Swagger

All parish endpoints documented with `@ApiTags('parishes')`, bearer auth, DTO schemas, pagination params, status enum values.

---

## 26. Repository Boundary

`ParishService` injects `Repository<ParishEntity>` privately. Not exported.

---

## 27. Module Dependency Audit

| Dependency | Direction | Purpose |
|------------|-----------|---------|
| AuthModule | ParishModule → Auth | JwtAuthGuard DI |
| AccessControlModule | ParishModule → AccessControl | PermissionGuard DI |
| UsersModule | — | No import |
| AcademicStructureModule | — | No import |

No cycles. Service layer has zero auth imports.

---

## 28. Unit Tests

- `parish-code.util.spec.ts` — normalization, invalid shapes
- `parish.service.spec.ts` — create, duplicate, get, update, status, assertActive, list

---

## 29. Integration Tests

`parish.integration-spec.ts` (6 tests):

- Create with normalized code + Vietnamese name
- Duplicate code error
- Update code/name
- Status transition + assertParishActive
- List with pagination/filter/search
- Not found

---

## 30. DB-Aware E2E

`parish.db.e2e-spec.ts` (6 tests):

- 401 unauthenticated
- 403 without parishes.read
- 403 read-only on POST
- 201/200 manage flow (create, get, update, status)
- 409 duplicate, 404 missing
- 400 invalid DTO

---

## 31. Existing Auth/RBAC Regression

All prior auth/RBAC tests pass within `quality:full` — **PASS**

---

## 32. Security Review

| Check | Result |
|-------|--------|
| All routes authenticated | PASS |
| Permission allow/deny | PASS |
| No entity leakage | PASS |
| No SQL error leakage | PASS |
| Sort field whitelist | PASS |
| No false parish scope claim | PASS (documented deferral) |
| No user parish coupling | PASS |
| No sensitive logging | PASS |

---

## 33. Docker Validation

```bash
wsl docker build --target production -t catechism-api:parish-api .
```

**PASS**

---

## 34. Microservice Extraction Review

ParishModule ready for extraction:

- Owns `parishes` table
- Public API: `ParishService` snapshots + assertions
- HTTP controller maps 1:1 to future REST/gRPC methods
- No consumer receives entity/repository

---

## 35. Commands Executed

```bash
npm run format
npm run quality:full
npm audit --audit-level=moderate
wsl docker build --target production -t catechism-api:parish-api .
```

---

## 36. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** — 38 suites, 157 tests |
| DB-free e2e | **PASS** — 2 suites, 5 tests |
| build | **PASS** |
| audit | **PASS** — 0 vulnerabilities |
| quality | **PASS** |
| migrations | **PASS** |
| integration | **PASS** — 8 suites, 47 tests |
| DB e2e | **PASS** — 7 suites, 27 tests |
| quality:full | **PASS** |
| Docker | **PASS** |
| create/list/get/update/status | **PASS** |
| duplicate 409 | **PASS** |
| auth 401 | **PASS** |
| permission 403 | **PASS** |
| no persistence export | **PASS** |
| safe snapshots | **PASS** |
| FE rule present | **YES** |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

---

## 37. Known Issues / Deferred

| Item | Status |
|------|--------|
| Parish-scoped RBAC | Deferred — global permissions only |
| Parish data seed | Deferred to #005 |
| Academic Year/Level APIs | #004 |
| Immutable parish code | Not enforced (editable by design) |

---

## 38. Out-of-Scope Confirmation

- [x] No AcademicYearService / CatechismLevelService
- [x] No parish domain seed data
- [x] No frontend changes
- [x] No Auth/RBAC schema changes
- [x] No DELETE endpoint

---

## 39. PARISH #004 Readiness

**Ready for #004: YES**

Recommend: **PARISH/ACADEMIC #004 — Academic Year + Catechism Level Services + APIs**

#004 scope:

- AcademicYearService + CatechismLevelService
- One ACTIVE year per parish rule
- Date validation, lifecycle transitions
- `ParishService.assertParishActive` integration
- Permissions: `academic-years.*`, `catechism-levels.*`
- Controllers, DTOs, tests

---

## 40. Prompt Count / Phase Status

| Prompt | Status |
|--------|--------|
| #001 Design | COMPLETE |
| #002 Schema | COMPLETE |
| #003 Parish API | **COMPLETE** |
| #004 Academic services | Pending |
| #005 Hardening | Pending |

Approximately **2 prompts remain**.

---

## 41. Commit Recommendation

```bash
git commit -m "feat(parish): add parish management API"
```
