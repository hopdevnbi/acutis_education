# PARISH #002 — Schema + Entities + Migrations

> Status: **COMPLETE**
> Scope: ParishModule + AcademicStructureModule skeletons, entities, enums, migration, tests
> Next prompt: **PARISH #003** — Parish Service + API + RBAC Integration (when prompted)

---

## 1. Objective

Implement persistence foundation for Parish + Academic Year + Catechism Level per PARISH #001 design:

- Module skeletons (no services/controllers)
- TypeORM entities with application UUID v4
- Status enums
- One cohesive migration with FKs, indexes, CHECK constraint
- Entity metadata, module boundary, and DB integration tests

No business logic, HTTP, RBAC permissions, or seeds.

---

## 2. State Inherited From #001

| Decision | Value |
|----------|-------|
| Module split | `ParishModule` + `AcademicStructureModule` |
| Parish fields | `id`, `code`, `name`, `status` |
| Academic year | Parish-owned; `PLANNED \| ACTIVE \| CLOSED` |
| Catechism level | Parish-owned; `sort_order`; unique `(parish_id, code)` |
| Cross-module ORM | Scalar `parishId` only; no `@ManyToOne` |
| Users | No `parish_id` on users |

---

## 3. Rules Applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`
- Application UUID v4 (no DB defaults)
- English naming; snake_case tables
- `nvarchar` for display names; `varchar` for codes/status
- `date` type for academic year boundaries
- No Auth/RBAC schema changes

---

## 4. Files Created

| File | Purpose |
|------|---------|
| `src/modules/parish/parish.module.ts` | Module skeleton |
| `src/modules/parish/entities/parish.entity.ts` | Parish entity |
| `src/modules/parish/enums/parish-status.enum.ts` | ACTIVE / INACTIVE |
| `src/modules/academic-structure/academic-structure.module.ts` | Module skeleton |
| `src/modules/academic-structure/entities/academic-year.entity.ts` | Academic year entity |
| `src/modules/academic-structure/entities/catechism-level.entity.ts` | Catechism level entity |
| `src/modules/academic-structure/enums/academic-year-status.enum.ts` | PLANNED / ACTIVE / CLOSED |
| `src/modules/academic-structure/enums/catechism-level-status.enum.ts` | ACTIVE / INACTIVE |
| `src/database/migrations/1788062800000-create-parish-academic-structure-schema.ts` | Schema migration |
| `src/database/parish-academic-structure.entities.spec.ts` | Entity metadata tests |
| `src/database/parish-academic-structure-uuid-generation.spec.ts` | UUID generation tests |
| `test/integration/parish-academic-structure.integration-spec.ts` | DB constraint/integration tests |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `src/app.module.ts` | Register `ParishModule`, `AcademicStructureModule` |
| `src/modules/module-boundaries.spec.ts` | Assert both modules export nothing |
| `test/integration/database.integration-spec.ts` | Include parish tables + UUID no-default check |

---

## 6. ParishModule Skeleton

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([ParishEntity])],
})
export class ParishModule {}
```

- No providers, controllers, or exports
- Persistence private to module

---

## 7. AcademicStructureModule Skeleton

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([AcademicYearEntity, CatechismLevelEntity])],
})
export class AcademicStructureModule {}
```

- No cross-module imports
- No providers, controllers, or exports

---

## 8. ParishEntity

| Column | TypeORM | SQL |
|--------|---------|-----|
| `id` | `uniqueidentifier` PK | app UUID v4 |
| `code` | `varchar(32)` | unique globally |
| `name` | `nvarchar(128)` | |
| `status` | `varchar(32)` | ParishStatus enum |
| `createdAt` | `datetime2` | |
| `updatedAt` | `datetime2` | |

---

## 9. AcademicYearEntity

| Column | TypeORM | SQL |
|--------|---------|-----|
| `id` | `uniqueidentifier` PK | app UUID v4 |
| `parishId` | `uniqueidentifier` | scalar FK (no ORM relation) |
| `name` | `nvarchar(128)` | |
| `startDate` | `date` | stored as string in entity |
| `endDate` | `date` | stored as string in entity |
| `status` | `varchar(32)` | AcademicYearStatus enum |
| `createdAt` / `updatedAt` | `datetime2` | |

Composite indexes at entity level: `(parishId)`, `(parishId, status)`, unique `(parishId, name)`.

---

## 10. CatechismLevelEntity

| Column | TypeORM | SQL |
|--------|---------|-----|
| `id` | `uniqueidentifier` PK | app UUID v4 |
| `parishId` | `uniqueidentifier` | scalar FK |
| `code` | `varchar(32)` | unique per parish |
| `name` | `nvarchar(128)` | |
| `sortOrder` | `int` default 0 | |
| `status` | `varchar(32)` | CatechismLevelStatus enum |
| `createdAt` / `updatedAt` | `datetime2` | |

---

## 11. Enum Definitions

| Module | Enum | Values |
|--------|------|--------|
| ParishModule | `ParishStatus` | ACTIVE, INACTIVE |
| AcademicStructureModule | `AcademicYearStatus` | PLANNED, ACTIVE, CLOSED |
| AcademicStructureModule | `CatechismLevelStatus` | ACTIVE, INACTIVE |

---

## 12. UUID Strategy

- `@PrimaryColumn({ type: 'uniqueidentifier' })` with `id: string = generateUuidV4()`
- Migration creates `id` columns **without** DB default
- No `NEWID()` / `NEWSEQUENTIALID()` / `PrimaryGeneratedColumn`
- Integration test confirms no default on `parishes`, `academic_years`, `catechism_levels` PK columns

---

## 13. Timestamp Strategy

- `@CreateDateColumn({ type: 'datetime2' })` / `@UpdateDateColumn({ type: 'datetime2' })`
- Migration defaults: `GETUTCDATE()` for `created_at` / `updated_at`
- Consistent with auth foundation entities

---

## 14. Migration Added

**File:** `1788062800000-create-parish-academic-structure-schema.ts`  
**Class:** `CreateParishAcademicStructureSchema1788062800000`

**Up order:** parishes → academic_years → catechism_levels  
**Down order:** catechism_levels → academic_years → parishes

---

## 15. Parish Table Definition

```sql
parishes (
  id uniqueidentifier PK,
  code varchar(32) NOT NULL,
  name nvarchar(128) NOT NULL,
  status varchar(32) NOT NULL,
  created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at datetime2 NOT NULL DEFAULT GETUTCDATE()
)
```

---

## 16. Academic Year Table Definition

```sql
academic_years (
  id uniqueidentifier PK,
  parish_id uniqueidentifier NOT NULL,
  name nvarchar(128) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status varchar(32) NOT NULL,
  created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at datetime2 NOT NULL DEFAULT GETUTCDATE()
)
```

---

## 17. Catechism Level Table Definition

```sql
catechism_levels (
  id uniqueidentifier PK,
  parish_id uniqueidentifier NOT NULL,
  code varchar(32) NOT NULL,
  name nvarchar(128) NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  status varchar(32) NOT NULL,
  created_at datetime2 NOT NULL DEFAULT GETUTCDATE(),
  updated_at datetime2 NOT NULL DEFAULT GETUTCDATE()
)
```

---

## 18. FK Strategy

| FK | On Delete |
|----|-----------|
| `FK_academic_years_parish_id_parishes_id` | NO ACTION |
| `FK_catechism_levels_parish_id_parishes_id` | NO ACTION |

Application entities use scalar `parishId`; SQL FK enforced in migration only.

---

## 19. Constraint Names

| Name | Type |
|------|------|
| `UQ_parishes_code` | Unique |
| `UQ_academic_years_parish_id_name` | Unique composite |
| `UQ_catechism_levels_parish_id_code` | Unique composite |
| `FK_academic_years_parish_id_parishes_id` | Foreign key |
| `FK_catechism_levels_parish_id_parishes_id` | Foreign key |
| `CK_academic_years_start_date_before_end_date` | CHECK |

---

## 20. Indexes

| Table | Index |
|-------|-------|
| `parishes` | `UQ_parishes_code`, `IX_parishes_status` |
| `academic_years` | `IX_academic_years_parish_id`, `IX_academic_years_parish_id_status`, `UQ_academic_years_parish_id_name` |
| `catechism_levels` | `IX_catechism_levels_parish_id`, `IX_catechism_levels_parish_id_sort_order`, `UQ_catechism_levels_parish_id_code` |

---

## 21. CHECK Constraint

```sql
CK_academic_years_start_date_before_end_date
CHECK (start_date < end_date)
```

Enforced at DB level; integration tests confirm rejection of invalid/equal date ranges.

---

## 22. Cross-Module ORM Audit

| Check | Result |
|-------|--------|
| AcademicYearEntity imports ParishEntity | **NO** |
| CatechismLevelEntity imports ParishEntity | **NO** |
| ORM relation metadata on academic entities | **0 relations** |
| `@ManyToOne` / `@JoinColumn` | **None** |

---

## 23. Module Export Audit

| Module | Exports |
|--------|---------|
| ParishModule | **None** (length 0) |
| AcademicStructureModule | **None** (length 0) |
| TypeOrmModule exported | **No** |

Verified in `module-boundaries.spec.ts`.

---

## 24. Metadata Tests

`parish-academic-structure.entities.spec.ts`:

- Table name mapping
- Column presence and types (`date`, `int`)
- Zero ORM relations on academic entities
- Zero `PrimaryGeneratedColumn` / DB generation metadata

`parish-academic-structure-uuid-generation.spec.ts`:

- RFC UUID v4 on entity instantiation
- Explicit ID preservation

---

## 25. Integration Tests

`parish-academic-structure.integration-spec.ts` (11 tests):

- Tables, FKs, CHECK constraint existence
- UUID PK no DB defaults
- Vietnamese nvarchar persistence
- DATE round-trip via `CONVERT(..., 23)` (timezone-safe)
- Duplicate parish code rejected
- Duplicate year name same parish rejected; allowed across parishes
- Invalid date range rejected by CHECK
- Duplicate level code same parish rejected; allowed across parishes
- Invalid `parish_id` FK rejected

`database.integration-spec.ts` extended for parish tables in business table list.

---

## 26. Constraint Behavior Tests

All constraint behavior verified via raw SQL INSERT (no service layer):

| Scenario | Result |
|----------|--------|
| Duplicate parish code | Rejected |
| Duplicate year name (same parish) | Rejected |
| Same year name (different parishes) | Allowed |
| start_date >= end_date | Rejected (CHECK) |
| Duplicate level code (same parish) | Rejected |
| Same level code (different parishes) | Allowed |
| Invalid parish_id FK | Rejected |

---

## 27. Unicode Validation

Test inserts parish name `Giáo xứ Thánh Gia` and verifies round-trip from `nvarchar` column — **PASS**.

---

## 28. Date Round-Trip Validation

Academic year dates `2026-09-01` / `2027-06-30` inserted and read back using SQL `CONVERT(varchar(10), ..., 23)` to avoid JS timezone shift — **PASS**.

---

## 29. Existing Auth/RBAC Regression

All auth/RBAC unit, integration, and DB e2e tests continue passing within `quality:full` — **PASS**.

No changes to Auth/RBAC modules, users schema, or demo flag logic.

---

## 30. Migration Fresh DB Result

`npm run test:db:prepare -- --reset` + migrations on `catechism_api_test` — **PASS**

Migration chain: 4 migrations applied (3 auth + 1 parish/academic).

---

## 31. Migration Re-run Result

`npm run test:db:migrations` — **PASS** (idempotent on prepared test DB)

---

## 32. Docker Validation

```bash
wsl docker build --target production -t catechism-api:parish-schema .
```

**PASS** — production image builds with new modules/entities.

---

## 33. Module Boundary Matrix

| Module | Owns | Exports | Outbound Deps |
|--------|------|---------|---------------|
| ParishModule | `parishes` | None (#002) | None |
| AcademicStructureModule | `academic_years`, `catechism_levels` | None (#002) | None (FK via migration only) |

---

## 34. Future Microservice Extraction Review

Design unchanged from #001:

- Parish Service ← `parishes`
- Academic Structure Service ← `academic_years`, `catechism_levels`
- Scalar `parishId` at application boundary ready for FK → API validation swap

---

## 35. Commands Executed

```bash
npm run format
npm run quality
npm run quality:full
npm audit --audit-level=moderate
npm run migration:show
wsl docker build --target production -t catechism-api:parish-schema .
```

---

## 36. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** — 36 suites, 144 tests |
| DB-free e2e | **PASS** — 2 suites, 5 tests |
| build | **PASS** |
| audit (moderate+) | **PASS** — 0 vulnerabilities |
| quality | **PASS** |
| fresh DB reset | **PASS** |
| migrations | **PASS** |
| integration | **PASS** — 7 suites, 41 tests |
| DB e2e | **PASS** — 6 suites, 21 tests |
| quality:full | **PASS** |
| Docker | **PASS** |
| required tables | **PASS** |
| UUID no DB defaults | **PASS** |
| FKs | **PASS** |
| unique constraints | **PASS** |
| date CHECK | **PASS** |
| Vietnamese nvarchar | **PASS** |
| no cross-module ORM relation | **PASS** |
| no persistence exports | **PASS** |
| Auth/RBAC regression | **PASS** |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

---

## 37. Known Issues / Deferred Items

| Item | Status |
|------|--------|
| ParishService / validation | Deferred to #003 |
| AcademicYearService / CatechismLevelService | Deferred to #004 |
| One ACTIVE year per parish | Service rule in #004 |
| RBAC permissions | #003/#005 |
| Parish seed | After services exist |
| Dev DB migration | User runs manually: `npm run migration:run` |

---

## 38. Out-of-Scope Confirmation

- [x] No ParishService, AcademicYearService, CatechismLevelService
- [x] No controllers, DTOs, HTTP endpoints
- [x] No RBAC permission rows or guards
- [x] No seed data
- [x] No `parish_id` on users
- [x] No Auth/RBAC schema changes

---

## 39. PARISH #003 Readiness

**Ready for #003: YES**

Recommend: **PARISH/ACADEMIC #003 — Parish Service + API + RBAC Integration**

#003 scope:

- `ParishService` (create, list, get, update, deactivate)
- Code normalization/validation
- `ParishSnapshot` interface
- `ParishController` with `JwtAuthGuard` + `PermissionGuard`
- Permissions: `parishes.read`, `parishes.manage`
- Service + e2e tests
- No AcademicYear/CatechismLevel service behavior yet

---

## 40. Prompt Count / Phase Status

| Prompt | Status |
|--------|--------|
| #001 Domain audit + design | COMPLETE |
| #002 Schema + entities + migrations | **COMPLETE** |
| #003 Parish services + API | Pending |
| #004 Academic Year + Level services | Pending |
| #005 Integration + hardening | Pending |

Approximately **3 prompts remain**.

---

## 41. Commit Recommendation

```bash
git commit -m "feat(parish): add academic structure schema"
```
