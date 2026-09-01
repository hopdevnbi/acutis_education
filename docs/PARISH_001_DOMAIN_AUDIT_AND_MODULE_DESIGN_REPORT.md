# PARISH #001 — Domain Audit + Modular Boundary Design

> Status: **COMPLETE** (design/audit only — no implementation)
> Scope: Parish, Academic Year, Catechism Level — module split, schema plan, API/RBAC direction
> Next prompt: **PARISH #002** — Schema + Entities + Migrations (when prompted)

---

## 1. Objective

Perform a targeted domain audit and modular boundary design for the first post-auth organizational domain:

- **Parish** — organizational identity and lifecycle
- **Academic Year** — parish-scoped time period for catechism operations
- **Catechism Level** — parish-scoped curriculum level definitions

Determine exact module split, data ownership, relationships, lifecycle rules, public contracts, RBAC implications, and future microservice extraction boundaries — **without** implementing entities, migrations, controllers, services, or APIs.

---

## 2. State Inherited From Auth/RBAC Phase

| Area | State |
|------|-------|
| Auth/User/RBAC phase | **COMPLETE** (AUTH #001–#009) |
| Modules | `UsersModule`, `AuthModule`, `AccessControlModule` |
| RBAC scope | Global roles/permissions only; no parish/tenant scope |
| Users table | No `parish_id`; multi-parish via future membership tables |
| Cross-module ORM | Scalar FK columns only; no `@ManyToOne` across module boundaries |
| AppModule | `AppModule.forRoot()` dynamic pattern; optional `DevRbacModule` |
| Migrations | 3 auth foundation migrations |
| Quality gates | `npm run quality` — PASS at audit start |
| Git status | Clean (no uncommitted changes) |

---

## 3. Rules / Architecture Constraints Applied

The following were read and applied:

- `PROJECT_RULES.md` — especially §7 (modular architecture), §22–§23 (security/privacy minors), §31 (Definition of Done)
- `AGENTS.md`
- `.cursor/rules/*.mdc` (00 mandatory, 01 security/privacy, 02 engineering baseline, 03 modular architecture)

Key constraints applied to this design:

1. Business modules under `src/modules/<feature>/`
2. Cross-module access via exported public API only — no entity/repository imports
3. SQL FKs allowed in migrations; application code uses scalar IDs
4. UUID v4 primary keys (application-generated, same pattern as auth)
5. English naming for tables, columns, APIs, code
6. `nvarchar` for human-readable text (Vietnamese diacritics supported)
7. No `parish_id` on `users`
8. No Auth/RBAC schema changes in this phase
9. Deactivation over hard delete for referenced domain objects

**No new rules or `.mdc` files were required.** Existing modular rules fully cover this phase.

---

## 4. Existing Project Structure Relevant to This Phase

| Path | Relevance |
|------|-----------|
| `src/modules/users/` | Pattern for entity, service, snapshot, errors, module exports |
| `src/modules/access-control/` | Permission guard pattern; `{resource}.{action}` codes |
| `src/modules/auth/` | JWT guard; controllers will compose `JwtAuthGuard` + `PermissionGuard` |
| `src/database/migrations/` | Migration-driven schema; timestamp naming convention |
| `src/database/uuid-v4.util.ts` | Application-side UUID v4 generation |
| `src/app.module.ts` | New modules register here in #002+ |
| `src/modules/module-boundaries.spec.ts` | Extend in future prompts for export audits |
| `test/` | DB e2e, integration, boundary specs |

**Compatibility notes:**

- `TypeOrmModule.forRoot({ autoLoadEntities: true })` — new entities auto-discovered when registered in module imports
- `AppModule.forRoot()` — Parish modules add as static imports; no change to demo flag logic
- Auth/RBAC modules remain untouched in #001

---

## 5. Domain Definitions

### Parish

A **Parish** is the primary organizational/tenant boundary in this Catholic catechism platform. It represents a single parish community that runs its own catechism program with its own academic calendar and curriculum level definitions.

Parish is **not** a generic "organization" abstraction. It is domain-specific language aligned with the platform purpose.

**Responsibilities:**

- Stable organizational identity (`id`, `code`, `name`)
- Operational status (active/inactive)
- Future anchor for parish-scoped authorization and membership

**Not in scope for Parish entity:**

- User accounts (UsersModule)
- Classes, students, enrollments (future ClassModule)
- Pastoral/confessional data
- Full contact/address CMS

### AcademicYear

An **Academic Year** is an explicit, parish-owned time period during which catechism classes operate (e.g. "2026–2027"). It is **not** inferred from the calendar year.

Each parish may define its own academic years with independent start/end dates and scheduling.

**Responsibilities:**

- Named time window with `start_date` and `end_date`
- Lifecycle status: PLANNED → ACTIVE → CLOSED
- Historical record preservation after closure

### CatechismLevel

A **Catechism Level** is a parish-configured curriculum stage (e.g. initiation, first communion, confirmation preparation). Levels are **stable definitions** owned by the parish, not duplicated each academic year.

Examples may include Vietnamese names (Khai Tâm, Rước Lễ, Thêm Sức) but the platform does **not** hard-code a global Catholic taxonomy. Each parish configures its own levels.

**Responsibilities:**

- Machine-readable `code` + human-readable `name`
- Display ordering via `sort_order`
- Status for deactivation without deletion

---

## 6. Module Split Decision

### Selected: **Option A — ParishModule + AcademicStructureModule**

| Option | Verdict |
|--------|---------|
| **A: ParishModule + AcademicStructureModule** | **SELECTED** |
| B: Three separate modules (Parish, AcademicYear, CatechismLevel) | Rejected — overly fragmented at current scale; AcademicYear and CatechismLevel share parish FK validation and future API patterns |
| C: Single ParishAcademicModule | Rejected — too broad; Parish identity is a distinct bounded context from academic configuration |

### Justification

1. **Parish** is the root organizational entity — minimal, stable, extractable alone
2. **Academic Year** and **Catechism Level** both depend on parish existence and share similar CRUD/list patterns under a parish scope
3. Two modules match the natural dependency graph without premature microservice split
4. Future extraction remains clean: Parish Service + Academic Structure Service
5. ClassModule later depends on both via public IDs/contracts

---

## 7. ParishModule Responsibilities

**Owns:**

- Table: `parishes`
- Entity: `ParishEntity`
- Parish lifecycle (create, read, list, update, deactivate)
- Parish code uniqueness
- Public read/validation contracts for other modules

**Does NOT own:**

- Academic years or catechism levels
- User accounts or membership
- RBAC role/permission definitions

**Future public exports (planned #003):**

- `ParishService` — create, update, list, findById, deactivate
- Narrow validation: `assertParishExistsAndActive(parishId)` for AcademicStructureModule

---

## 8. AcademicStructureModule Responsibilities

**Owns:**

- Tables: `academic_years`, `catechism_levels`
- Entities: `AcademicYearEntity`, `CatechismLevelEntity`
- Academic year lifecycle and date validation
- Catechism level ordering and code uniqueness per parish

**Does NOT own:**

- Parish identity/mutation (calls ParishModule public API for validation)
- Classes, enrollments, students

**Future public exports (planned #004):**

- `AcademicYearService`
- `CatechismLevelService`
- Snapshot interfaces for ClassModule consumption

**Inbound dependency:**

- `ParishModule` public API (optional semantic validation beyond SQL FK)

---

## 9. Data Ownership Matrix

| Table / Concept | Owner Module | Allowed Writers | Readers (via public API) | Future Service Owner |
|-----------------|--------------|-----------------|--------------------------|----------------------|
| `parishes` | ParishModule | ParishModule only | AcademicStructureModule, ClassModule (snapshots) | Parish Service |
| `academic_years` | AcademicStructureModule | AcademicStructureModule only | ClassModule (snapshots) | Academic Structure Service |
| `catechism_levels` | AcademicStructureModule | AcademicStructureModule only | ClassModule (snapshots) | Academic Structure Service |
| `users` | UsersModule | UsersModule only | Auth, future membership | User Service |
| `roles`, `permissions`, etc. | AccessControlModule | AccessControlModule only | All guarded endpoints | Access Control Service |

**Rule:** No module writes another module's tables. Cross-module reads use exported service methods returning snapshots, never entities.

---

## 10. Module Dependency Graph

```
UsersModule              (no parish dependency)
AccessControlModule      (no parish dependency)
AuthModule               → UsersModule

ParishModule             (no auth/parish dependency)

AcademicStructureModule  → ParishModule (ParishService validation — optional narrow calls)

ClassModule (future)     → ParishModule, AcademicStructureModule (public snapshots/validation only)
                         → AuthModule (JwtAuthGuard)
                         → AccessControlModule (PermissionGuard + future scope checks)

AppModule                → ParishModule, AcademicStructureModule (+ existing modules)
```

- **No cycles**
- **No `forwardRef()`**
- AcademicStructureModule does **not** import Auth or AccessControl at module level (controllers wire guards in #003/#004)

---

## 11. Public Contract Plan

All cross-module contracts are **narrow read models / snapshots** — never TypeORM entities.

### ParishSnapshot

```typescript
interface ParishSnapshot {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: ParishStatus; // ACTIVE | INACTIVE
}
```

### AcademicYearSnapshot

```typescript
interface AcademicYearSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly name: string;
  readonly startDate: string; // ISO date YYYY-MM-DD
  readonly endDate: string;
  readonly status: AcademicYearStatus; // PLANNED | ACTIVE | CLOSED
}
```

### CatechismLevelSnapshot

```typescript
interface CatechismLevelSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly code: string;
  readonly name: string;
  readonly sortOrder: number;
  readonly status: CatechismLevelStatus; // ACTIVE | INACTIVE
}
```

### Validation methods (planned)

| Method | Owner | Purpose |
|--------|-------|---------|
| `findParishSnapshotById(id)` | ParishModule | Read by ID |
| `assertParishActive(parishId)` | ParishModule | Throw if missing/inactive |
| `findAcademicYearSnapshotById(id)` | AcademicStructureModule | ClassModule validation |
| `findCatechismLevelSnapshotById(id)` | AcademicStructureModule | ClassModule validation |

---

## 12. Cross-Module Persistence Rules

Same principle as Auth/RBAC (AUTH #002B):

1. **Entities stay private** to owning module
2. **Scalar FK columns** in dependent entities — e.g. `AcademicYearEntity.parishId: string`
3. **No `@ManyToOne(() => ParishEntity)`** in AcademicStructureModule
4. **Migrations** may declare SQL FK constraints independently
5. **Repositories** are not exported from modules
6. **TypeOrmModule.forFeature** registers entities only within owning module

---

## 13. Cross-Module FK Strategy

### SQL (migration layer — allowed)

```
academic_years.parish_id  →  parishes.id
catechism_levels.parish_id  →  parishes.id
```

- `ON DELETE RESTRICT` (or NO ACTION) — prevent orphaning; align with no hard-delete policy
- Indexes on `parish_id` for list queries

### Application layer

- AcademicStructureModule stores `parishId` as `uniqueidentifier` string column
- On create/update, optionally call `ParishService.assertParishActive(parishId)` before persist
- SQL FK provides integrity fallback if application validation is bypassed

### Microservice extraction (future)

- FKs become scalar IDs only
- Academic Structure Service validates parish existence via Parish Service API (sync call or cached read)
- Eventual consistency acceptable for non-critical reads; sync validation required on writes

---

## 14. Parish Schema Plan

### Required now (#002)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uniqueidentifier` PK | UUID v4, app-generated |
| `code` | `varchar(32)` | Stable internal identifier; unique globally |
| `name` | `nvarchar(128)` | Display name; Vietnamese OK |
| `status` | `varchar(32)` | `ACTIVE` \| `INACTIVE` |
| `created_at` | `datetime2` UTC | |
| `updated_at` | `datetime2` UTC | |

### Deferred

| Field | Reason |
|-------|--------|
| `slug` | UUID routes acceptable initially; add when frontend routing needs it |
| `description` | Not required for MVP organizational structure |
| `address`, `phone`, `email` | Avoid CMS/contact dumping ground; add in dedicated phase if needed |

---

## 15. Parish Identity / Code / Slug Decision

| Decision | Choice |
|----------|--------|
| Primary key | UUID v4 (consistent with auth tables) |
| `code` | **Include now** — stable business identifier for admin/seed/integration |
| `slug` | **Defer** — no URL routing requirement yet |
| Code format | Lowercase alphanumeric + hyphens; max 32 chars; validated at service layer |
| Code uniqueness | Global unique index `UQ_parishes_code` |

**Rationale:** `code` supports human-readable references in logs, seeds, and admin UI without exposing sequential IDs. Slug adds complexity without current consumer.

---

## 16. Parish Status / Deactivation Decision

| Decision | Choice |
|----------|--------|
| Status enum | `ACTIVE`, `INACTIVE` |
| Hard delete | **Not supported** in routine operations |
| Deactivation | Set `status = INACTIVE`; preserve row for historical FK references |
| Reactivation | Allow `INACTIVE → ACTIVE` via PATCH |
| `is_active` boolean | Rejected — status enum is clearer for audit and future states |

Inactive parishes:

- Cannot create new academic years or catechism levels (application validation)
- Existing historical data remains readable
- Future: inactive parish blocks new class enrollment

---

## 17. Academic Year Schema Plan

### Required now (#002)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uniqueidentifier` PK | UUID v4 |
| `parish_id` | `uniqueidentifier` FK | → `parishes.id` |
| `name` | `nvarchar(128)` | e.g. "2026–2027" |
| `start_date` | `date` | Inclusive start |
| `end_date` | `date` | Inclusive end |
| `status` | `varchar(32)` | `PLANNED` \| `ACTIVE` \| `CLOSED` |
| `created_at` | `datetime2` UTC | |
| `updated_at` | `datetime2` UTC | |

### Deferred

| Field | Reason |
|-------|--------|
| `description` | Not required for MVP |
| `is_default` | Over-engineering; one ACTIVE year rule covers operations |

---

## 18. Academic Year Ownership Decision

**Decision: Parish-owned (`parish_id` FK required)**

| Alternative | Verdict |
|-------------|---------|
| Global academic years | Rejected — parishes have different calendars |
| Shared/reusable across parishes | Rejected — no cross-parish reuse requirement |
| Parish-owned | **Selected** |

Each parish manages its own academic year catalog independently.

---

## 19. Academic Year Date Invariants

| Invariant | Enforcement |
|-----------|-------------|
| `start_date < end_date` | Application validation on create/update; consider CHECK constraint in migration |
| Date type | `date` (not `datetime2`) — time-of-day irrelevant |
| Overlapping years | **Not enforced at DB level initially** — document as application guideline |
| Multiple ACTIVE per parish | **Discouraged** — application should warn/prevent; not DB-unique initially |

### Active year policy (application layer — #004)

- Recommend **at most one ACTIVE academic year per parish** at a time
- Enforce in service layer when transitioning to ACTIVE (check no other ACTIVE exists)
- PLANNED and CLOSED may coexist with one ACTIVE
- Overlapping date ranges: allowed for PLANNED/CLOSED historical records; block overlap for ACTIVE if enforced

**Rationale:** Real parishes may need overlapping planning windows; strict DB exclusion of overlaps is premature. One-ACTIVE rule is operationally important and enforceable in service.

---

## 20. Academic Year Uniqueness

**Decision: Composite unique `(parish_id, name)`**

| Alternative | Verdict |
|-------------|---------|
| `unique(parish_id, name)` | **Selected** — human-meaningful, admin-friendly |
| `unique(parish_id, start_date, end_date)` | Secondary — dates can be adjusted; name is primary admin identifier |
| Both | Redundant for MVP |

Index: `UQ_academic_years_parish_id_name`

If date-range uniqueness conflicts arise in production, add application validation without schema change first.

---

## 21. Catechism Level Schema Plan

### Required now (#002)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uniqueidentifier` PK | UUID v4 |
| `parish_id` | `uniqueidentifier` FK | → `parishes.id` |
| `code` | `varchar(32)` | Machine-readable; unique per parish |
| `name` | `nvarchar(128)` | Display name; Vietnamese OK |
| `sort_order` | `int` | Explicit ordering; not null, default 0 |
| `status` | `varchar(32)` | `ACTIVE` \| `INACTIVE` |
| `created_at` | `datetime2` UTC | |
| `updated_at` | `datetime2` UTC | |

### Deferred

| Field | Reason |
|-------|--------|
| `description` | Optional; add if admin UI needs it |
| `previous_level_id` | Progression graph deferred to Learning/Enrollment phase |

---

## 22. Catechism Level Ownership Decision

**Decision: Parish-owned configuration (not global catalog)**

| Alternative | Verdict |
|-------------|---------|
| Global reference catalog | Rejected — parishes customize curriculum |
| Parish-owned stable definitions | **Selected** |
| Academic-year-specific levels | Rejected — duplicates rows each year unnecessarily |
| Template + parish mapping | Rejected — premature abstraction |

Levels persist across academic years. Classes (future) bind `(parishId, academicYearId, catechismLevelId)`.

---

## 23. Catechism Level Ordering

**Decision: Include `sort_order` integer (required)**

- Explicit integer ordering — no implicit alphabetical sort
- Supports curriculum progression display in UI
- Uniqueness of sort order **not** enforced at DB level (gaps allowed; reorder via PATCH)
- Index: `(parish_id, sort_order)` for efficient ordered list queries

---

## 24. AcademicYear ↔ CatechismLevel Relationship Decision

**Decision: Model A — Independent under Parish (no direct FK between year and level)**

```
Parish
 ├── AcademicYear (many)
 └── CatechismLevel (many)

Future Class → (parishId, academicYearId, catechismLevelId)
```

| Alternative | Verdict |
|-------------|---------|
| A: Separate under parish | **Selected** |
| B: Level belongs to AcademicYear | Rejected — duplicates level definitions yearly |
| C: Global level + yearly mapping | Rejected — unnecessary complexity |

No join table in this phase. Future Class entity holds all three FKs.

---

## 25. Future ClassModule Integration

ClassModule (future phase) will reference:

- `parishId` — organizational scope
- `academicYearId` — operational time window
- `catechismLevelId` — curriculum stage

**Integration contract (planned):**

```typescript
// ClassModule calls — no repository/entity imports
await parishService.assertParishActive(parishId);
await academicYearService.assertAcademicYearBelongsToParish(academicYearId, parishId);
await catechismLevelService.assertLevelBelongsToParish(catechismLevelId, parishId);
```

ClassModule depends on:

- `ParishModule` exports
- `AcademicStructureModule` exports
- `AuthModule` (`JwtAuthGuard`)
- `AccessControlModule` (`PermissionGuard`)

Does **not** query `parishes`, `academic_years`, or `catechism_levels` tables directly.

---

## 26. Multi-Parish User Decision

**Explicit confirmation: DO NOT add `parish_id` to `users` table.**

| Reason | Detail |
|--------|--------|
| Multi-parish staff | A catechist may serve multiple parishes |
| Multi-parish families | Parents may have children in different parishes |
| Single FK on users | Would falsely imply 1:1 user-parish relationship |

Future `parish_memberships` or assignment tables (Class/Catechist phase) will model `(user_id, parish_id, role/context)`.

Current `UserEntity` remains unchanged.

---

## 27. Future Parish Membership Consideration

**Not implemented in this phase.**

Likely future tables (design placeholder only):

- `parish_memberships` — `(user_id, parish_id, status, joined_at)`
- Or scoped via class/catechist assignment tables

This phase establishes **organization structure only** — stable `parish.id` values that membership will reference.

Trigger for membership layer: when parish-scoped APIs require "user X can act on parish Y" beyond global RBAC.

---

## 28. RBAC / Parish Scope Future Integration

Current RBAC is **global**. Parish introduces the first real tenant boundary.

### Future model (document only — do not implement now)

| Role type | Scope |
|-----------|-------|
| `SUPER_ADMIN` | Global platform |
| `PARISH_ADMIN` | Scoped to parish membership |
| `CATECHIST` | Scoped via class assignment |

When parish-sensitive APIs ship:

- `PermissionGuard` alone is insufficient — need **resource scope check**
- Pattern: `@RequirePermissions('classes.manage')` + service-layer check that user has membership/assignment for target `parishId`

### Integration point preserved by this design

- Stable UUID `parish.id` used as scope key
- No premature RBAC schema changes
- API routes include `parishId` in path or body for future scope enforcement

---

## 29. Permission Namespace Plan

Follow existing `{resource}.{action}` convention (compatible with `permission-code.util.ts`).

| Permission | Purpose | Introduce in |
|------------|---------|--------------|
| `parishes.read` | List/view parishes | #003 or #005 |
| `parishes.manage` | Create/update/deactivate parishes | #003 or #005 |
| `academic-years.read` | List/view academic years | #004 or #005 |
| `academic-years.manage` | Create/update/close academic years | #004 or #005 |
| `catechism-levels.read` | List/view levels | #004 or #005 |
| `catechism-levels.manage` | Create/update/deactivate levels | #004 or #005 |

**Do not seed these in #001 or #002.** Seed in #005 or dedicated seed prompt after services exist.

All endpoints: `JwtAuthGuard` + `PermissionGuard` — no public endpoints.

---

## 30. Deletion / Historical Data Policy

| Entity | Policy |
|--------|--------|
| Parish | Deactivate (`INACTIVE`); no hard delete while dependent rows exist |
| Academic Year | Close (`CLOSED`); no hard delete while classes reference it |
| Catechism Level | Deactivate (`INACTIVE`); no hard delete while classes reference it |

- No `deleted_at` soft-delete column in MVP — status enum suffices
- Hard delete only if ever needed for GDPR/admin correction and **zero** dependents — defer tooling to future phase
- Historical records (closed years, inactive levels) remain queryable for reporting

---

## 31. Index / Constraint Plan

### `parishes`

| Name | Type | Columns |
|------|------|---------|
| `PK_parishes` | Primary key | `id` |
| `UQ_parishes_code` | Unique | `code` |
| `IX_parishes_status` | Index | `status` (optional, for admin filters) |

### `academic_years`

| Name | Type | Columns |
|------|------|---------|
| `PK_academic_years` | Primary key | `id` |
| `FK_academic_years_parish_id` | Foreign key | `parish_id` → `parishes.id` |
| `UQ_academic_years_parish_id_name` | Unique | `(parish_id, name)` |
| `IX_academic_years_parish_id` | Index | `parish_id` |
| `IX_academic_years_parish_id_status` | Index | `(parish_id, status)` |

Optional CHECK: `start_date < end_date`

### `catechism_levels`

| Name | Type | Columns |
|------|------|---------|
| `PK_catechism_levels` | Primary key | `id` |
| `FK_catechism_levels_parish_id` | Foreign key | `parish_id` → `parishes.id` |
| `UQ_catechism_levels_parish_id_code` | Unique | `(parish_id, code)` |
| `IX_catechism_levels_parish_id` | Index | `parish_id` |
| `IX_catechism_levels_parish_id_sort_order` | Index | `(parish_id, sort_order)` |

---

## 32. API Endpoint Plan (Conceptual Only)

All routes prefixed `/api/v1`. All require auth + permissions (wired in #003/#004).

### Parish

| Method | Route | Permission |
|--------|-------|------------|
| POST | `/parishes` | `parishes.manage` |
| GET | `/parishes` | `parishes.read` |
| GET | `/parishes/:id` | `parishes.read` |
| PATCH | `/parishes/:id` | `parishes.manage` |
| PATCH | `/parishes/:id/status` | `parishes.manage` |

No DELETE.

### Academic Year

| Method | Route | Permission |
|--------|-------|------------|
| POST | `/parishes/:parishId/academic-years` | `academic-years.manage` |
| GET | `/parishes/:parishId/academic-years` | `academic-years.read` |
| GET | `/academic-years/:id` | `academic-years.read` |
| PATCH | `/academic-years/:id` | `academic-years.manage` |

Nested create/list under parish; flat get/update by ID (parishId validated on write).

### Catechism Level

| Method | Route | Permission |
|--------|-------|------------|
| POST | `/parishes/:parishId/catechism-levels` | `catechism-levels.manage` |
| GET | `/parishes/:parishId/catechism-levels` | `catechism-levels.read` |
| GET | `/catechism-levels/:id` | `catechism-levels.read` |
| PATCH | `/catechism-levels/:id` | `catechism-levels.manage` |

List returns ordered by `sort_order`.

---

## 33. Seed Strategy

**Deferred** until services exist (#005 or later).

Planned approach (future):

- Manual CLI similar to `npm run seed:auth-rbac`
- Non-production only; allow-list DB names
- Sample parish + one academic year + 3–4 catechism levels
- No production-like real church data

**Do not seed in #001 or #002.**

---

## 34. Security / Privacy Review

| Topic | Assessment |
|-------|------------|
| Minors platform | Parish/level names are organizational — low PII risk |
| Parish as tenant boundary | Design supports future scope isolation |
| No child data in this phase | No student records |
| Public endpoints | None — all guarded |
| Input validation | DTOs required in #003/#004; codes ASCII-validated |
| Logging | Do not log sensitive parish contact info (none stored in MVP) |
| Authorization | Global RBAC now; parish scope checks documented for future |
| Hard-coded curriculum | Avoided — parish configures levels |

No security blockers identified for #002 schema implementation.

---

## 35. Future Microservice Extraction Map

```
┌─────────────────────┐     ┌──────────────────────────────┐
│   Parish Service    │     │  Academic Structure Service  │
│   - parishes        │     │  - academic_years            │
│                     │     │  - catechism_levels          │
└─────────┬───────────┘     └──────────────┬───────────────┘
          │                                │
          │   REST/gRPC: validate parish   │
          │◄───────────────────────────────┤
          │                                │
          └────────────┬───────────────────┘
                       │ scalar IDs
                       ▼
              ┌─────────────────┐
              │  Class Service   │  (future)
              │  - classes       │
              │  - enrollments   │
              └─────────────────┘
```

### Extraction steps (future)

1. Extract Parish Service with `parishes` table
2. Extract Academic Structure Service; replace FK with API validation on write
3. Class Service holds cached parish/year/level snapshots or calls read APIs
4. Eventual consistency for reads; sync validation on writes

Current modular monolith design requires **minimal domain rewrite** for this split.

---

## 36. Risks / Open Questions

| ID | Severity | Risk / Question | Mitigation |
|----|----------|-----------------|------------|
| R-001 | INFO | One ACTIVE year rule may conflict with parish workflows | Enforce in service; allow override flag later if needed |
| R-002 | INFO | Overlapping academic year dates | Document guideline; no DB constraint initially |
| R-003 | INFO | Global RBAC without parish scope | Document future membership layer; stable parish IDs |
| R-004 | LOW | `code` global uniqueness vs per-parish | Global for parishes (few); per-parish for catechism levels |
| R-005 | LOW | No slug for URL routing | UUID routes acceptable; add slug when frontend needs |
| R-006 | INFO | Permission seed timing | Seed in #005 with integration tests |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

---

## 37. Files Created

| File | Purpose |
|------|---------|
| `docs/PARISH_001_DOMAIN_AUDIT_AND_MODULE_DESIGN_REPORT.md` | This report (gitignored) |

---

## 38. Files Modified

None. Design/audit only — no tracked source changes.

---

## 39. Commands Executed

```bash
git status --short          # clean
npm run quality           # format:check, lint, typecheck, test, test:e2e, build
```

---

## 40. Validation Results

| Command | Result |
|---------|--------|
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 34 suites, 132 tests |
| `npm run test:e2e` | PASS — 2 suites, 5 tests |
| `npm run build` | PASS |

No DB/Docker validation required — no code changes.

---

## 41. Out-of-Scope Confirmation

The following were **NOT** created (per prompt #001):

- [x] No `ParishEntity`, `AcademicYearEntity`, `CatechismLevelEntity`
- [x] No migrations
- [x] No controllers, services, repositories, DTOs
- [x] No permission rows or seed data
- [x] No Auth/RBAC schema changes
- [x] No `parish_id` on users
- [x] No API implementation

---

## 42. PARISH #002 Readiness

**Design ready for #002: YES**

### Recommended next prompt

**PARISH/ACADEMIC STRUCTURE #002 — Schema + Entities + Migrations**

#002 should implement ONLY:

1. `ParishModule` skeleton (module file, entity, enum — no service/controller)
2. `AcademicStructureModule` skeleton (module file, entities, enums — no service/controller)
3. One migration: `parishes`, `academic_years`, `catechism_levels` with indexes/constraints/FKs
4. Register modules in `AppModule` and `DatabaseModule` entity list if needed
5. Metadata/boundary integration tests (entity registration, no cross-module entity imports)
6. Migration runs clean on test DB

No controllers, services, DTOs, permissions, or seeds in #002.

---

## 43. Prompt Count / Phase Status

| Prompt | Status |
|--------|--------|
| #001/5 Domain audit + design | **COMPLETE** |
| #002 Schema + entities + migrations | Pending |
| #003 Parish services | Pending |
| #004 Academic Year + Catechism Level services | Pending |
| #005 Integration tests + hardening | Pending |

Approximately **4 prompts remain** in the Parish/Academic Structure phase.

---

## 44. Commit Message Recommendation

No code/config changes; no commit message required.

---

## Module Boundary Audit (PROJECT_RULES §7.6)

### ParishModule

| Item | Detail |
|------|--------|
| **Owned data** | `parishes` |
| **Public exports** | `ParishService` (planned #003) |
| **Inbound dependencies** | AppModule; future ClassModule, AcademicStructureModule |
| **Outbound dependencies** | None |
| **Extraction boundary** | Parish Service — standalone organizational identity |

### AcademicStructureModule

| Item | Detail |
|------|--------|
| **Owned data** | `academic_years`, `catechism_levels` |
| **Public exports** | `AcademicYearService`, `CatechismLevelService` (planned #004) |
| **Inbound dependencies** | AppModule; future ClassModule |
| **Outbound dependencies** | ParishModule (`ParishService` validation) |
| **Extraction boundary** | Academic Structure Service — parish-scoped academic config |
