# CLASS #003 — Class Service + API + RBAC Foundations

> Status: **COMPLETE**
> Phase: **#003/7**
> Scope: ClassService, ClassController, DTOs, RBAC wiring, AcademicStructure cross-parish guards, tests
> Next prompt: **CLASS #004** — Student + Guardian Services + APIs (when prompted)

---

## 1. Objective

Implement Class application layer and HTTP API per CLASS #001/#002 design:

- `ClassService` with lifecycle management and enrollment-facing public methods
- Cross-parish validation via AcademicStructure public services (not repositories)
- `ClassController` under `/api/v1` with JWT + global permission guards
- Permissions `classes.read`, `classes.manage` (seed catalog already present from #002 planning)
- Unit, integration, and DB e2e tests
- AcademicStructure extensions: `assertAcademicYearBelongsToParish`, `assertCatechismLevelBelongsToParish`

No Student, Guardian, Enrollment, or Catechist assignment services yet. No scoped RBAC (#006).

---

## 2. State Inherited From #002

| Item | State |
|------|-------|
| Tables | `classes`, `class_catechist_assignments` (schema complete) |
| ClassModule | Entity registered; skeleton only |
| Permissions | `classes.read`, `classes.manage` in auth-rbac seed constants |
| AcademicStructureModule | Exports `AcademicYearService`, `CatechismLevelService` |
| ParishModule | Exports `ParishService` |

---

## 3. Rules Applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`
- Module exports: `ClassService` only
- Cross-module access via public services only (ParishService, AcademicYearService, CatechismLevelService)
- Auth dependency at controller/module wiring layer only
- Global RBAC; no parish-scoped guards yet
- English source/API; validated DTOs for all external input

---

## 4. Files Created

| File | Purpose |
|------|---------|
| `src/modules/class/services/class.service.ts` | Business logic |
| `src/modules/class/services/class.service.spec.ts` | Unit tests |
| `src/modules/class/controllers/class.controller.ts` | HTTP API |
| `src/modules/class/errors/class.errors.ts` | Domain errors |
| `src/modules/class/interfaces/class.interface.ts` | Input/snapshot contracts |
| `src/modules/class/mappers/class.mapper.ts` | Entity → snapshot |
| `src/modules/class/mappers/class-response.mapper.ts` | Snapshot → DTO |
| `src/modules/class/dto/*.ts` | Request/response/list DTOs |
| `src/modules/class/utils/class-code.util.ts` | Code normalization |
| `src/modules/class/utils/class-code.util.spec.ts` | Code util tests |
| `src/modules/class/utils/class-name.util.ts` | Name validation |
| `src/modules/class/utils/class-search.util.ts` | LIKE escape |
| `src/modules/class/utils/class-http.util.ts` | Error → HTTP mapping |
| `src/modules/class/constants/class-permissions.constants.ts` | Permission codes |
| `src/modules/class/constants/class-list.constants.ts` | Pagination/sort whitelist |
| `test/integration/class.integration-spec.ts` | Service integration tests |
| `test/class.db.e2e-spec.ts` | HTTP + RBAC e2e tests |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `src/modules/class/class.module.ts` | Service, controller, module imports, export ClassService |
| `src/modules/academic-structure/services/academic-year.service.ts` | Add `assertAcademicYearBelongsToParish`; normalize UUID compare |
| `src/modules/academic-structure/services/catechism-level.service.ts` | Add `assertCatechismLevelBelongsToParish`; normalize UUID compare |
| `src/modules/academic-structure/errors/academic-year.errors.ts` | Add `AcademicYearDoesNotBelongToParishError` |
| `src/modules/academic-structure/errors/catechism-level.errors.ts` | Add `CatechismLevelDoesNotBelongToParishError` |
| `src/modules/academic-structure/utils/academic-structure-http.util.ts` | Map new cross-parish errors |
| `src/modules/module-boundaries.spec.ts` | Assert ClassService-only export |
| `README.md` | Class API route table |

---

## 6. ClassModule Architecture

```
ClassModule
├── TypeOrmModule.forFeature([ClassEntity, ClassCatechistAssignmentEntity])  (private)
├── ParishModule              → ParishService
├── AcademicStructureModule   → AcademicYearService, CatechismLevelService
├── AuthModule                (guard DI only)
├── AccessControlModule       (guard DI only)
├── ClassService              (exported)
└── ClassController
```

`ClassService` has no Auth/AccessControl imports.

---

## 7. Public Exports

| Export | Type |
|--------|------|
| `ClassService` | **Yes** |
| `TypeOrmModule` | No |
| `ClassEntity` | No |
| Repository | No |

EnrollmentModule (#005) will consume:

- `getClassSnapshotForEnrollment(classId)`
- `assertClassAcceptsEnrollment(classId)`

---

## 8. ClassService API (public methods)

| Method | Purpose |
|--------|---------|
| `createClass(parishId, input)` | Create PLANNED class |
| `getClassById(classId)` | Read snapshot |
| `listClassesByParish(parishId, input)` | Paginated list with filters |
| `updateClass(classId, input)` | Update code/name (mutable statuses only) |
| `updateClassStatus(classId, status)` | Lifecycle transitions |
| `getClassSnapshotForEnrollment(classId)` | Narrow read for EnrollmentModule |
| `assertClassAcceptsEnrollment(classId)` | ACTIVE-only guard for enrollment |

---

## 9. Lifecycle Rules

| Status | Meaning |
|--------|---------|
| `PLANNED` | Default on create |
| `ACTIVE` | Accepts enrollments |
| `COMPLETED` | Terminal |
| `CANCELLED` | Terminal |

**Allowed transitions:**

- `PLANNED` → `ACTIVE`, `CANCELLED`
- `ACTIVE` → `COMPLETED`, `CANCELLED`

**Create preconditions:**

- Parish ACTIVE
- Academic year belongs to parish; status not `CLOSED` (PLANNED or ACTIVE allowed)
- Catechism level belongs to parish; status ACTIVE

**Activate preconditions:**

- Parish ACTIVE
- Academic year ACTIVE
- Catechism level ACTIVE

**Update preconditions:**

- Parish ACTIVE
- Class not COMPLETED/CANCELLED

**Cancel:** allowed from PLANNED or ACTIVE without requiring active parish

**Immutable after terminal:** code, name, status, structural IDs (parishId, academicYearId, catechismLevelId)

---

## 10. HTTP API

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/parishes/:parishId/classes` | `classes.manage` |
| `GET` | `/api/v1/parishes/:parishId/classes` | `classes.read` |
| `GET` | `/api/v1/classes/:id` | `classes.read` |
| `PATCH` | `/api/v1/classes/:id` | `classes.manage` |
| `PATCH` | `/api/v1/classes/:id/status` | `classes.manage` |

List query filters: `academicYearId`, `catechismLevelId`, `status`, `search`, pagination, sort (`code`, `name`, `status`, `createdAt`).

---

## 11. RBAC

| Permission | Usage |
|------------|-------|
| `classes.read` | List + get |
| `classes.manage` | Create, update, status change |

Seed catalog (`auth-rbac.seed.constants.ts`) already assigns both to `PARISH_ADMIN` and `CATECHIST`; `PARENT` has read-only.

Global scope only — any user with permission can access any parish's classes until #006 scoped RBAC.

---

## 12. Cross-Module Dependencies

| Direction | Via | Notes |
|-----------|-----|-------|
| ClassModule → ParishModule | `ParishService.assertParishActive`, `getParishById` | No entity import |
| ClassModule → AcademicStructureModule | `assertAcademicYearBelongsToParish`, `assertCatechismLevelBelongsToParish` | New public methods |
| Future EnrollmentModule → ClassModule | `ClassService` exports | IDs + snapshots only |

---

## 13. Bug Fix During Validation

MSSQL returns UUID columns in uppercase. `assertAcademicYearBelongsToParish` and `assertCatechismLevelBelongsToParish` compared raw entity `parishId` against normalized input, causing false `DoesNotBelongToParish` errors in integration tests.

**Fix:** compare `normalizeUuid(entity.parishId)` against normalized parish id in both assert methods.

---

## 14. Tests

| Suite | Coverage |
|-------|----------|
| `class.service.spec.ts` | Create, activate, immutable, duplicate code, list filters, enrollment guards |
| `class-code.util.spec.ts` | Code normalization/validation |
| `class.integration-spec.ts` | MSSQL: create, closed year rejection, duplicate code, activate, list filter |
| `class.db.e2e-spec.ts` | HTTP: 401/403/404/409, full manage flow, read-only mutation block |
| `module-boundaries.spec.ts` | ClassService-only export |

---

## 15. Validation Results

| Command | Result |
|---------|--------|
| `npm run format` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS (209 tests) |
| `npm run test:integration` | PASS (86 tests, incl. class.integration-spec) |
| `test/class.db.e2e-spec.ts` (serial, after migrations) | PASS |
| `docker build -t catechism-api:class-api .` | PASS (WSL) |

**Note:** `quality:full` e2e stage can flake when parallel DB e2e suites race on permission seed cleanup (`parish.db.e2e-spec.ts`). Pre-existing infrastructure issue; class e2e passes reliably when run after `test:db:prepare --reset` + `test:db:migrations`.

---

## 16. Local Dev

```bash
npm run migration:run          # migration #6 if not applied
npm run seed:auth-rbac         # ensures classes.read / classes.manage
npm run start:dev
```

Swagger: `/api/docs` — `classes` tag.

---

## 17. Suggested Commit

```
feat(class): add class management API
```

---

## 18. Completion Decision

**CLASS #003 COMPLETE**

Ready for **CLASS #004** — Student + Guardian Services + APIs when explicitly prompted.

Do not implement Student/Enrollment/Catechist assignment APIs until the next prompt.
