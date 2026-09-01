# CLASS #001 — Domain Audit + Bounded Context Design

> Status: **COMPLETE** (design/audit only — no implementation)
> Phase: **#001/7**
> Scope: Class, Student, Catechist, Parent/Guardian, Enrollment — module split, schema plan, scoped authorization direction, API planning
> Next prompt: **CLASS #002** — Schema + Entities + Migrations (when prompted)

---

## 1. Objective

Perform a deep domain audit and bounded-context design for the Class + Student + Catechist + Parent + Enrollment phase:

- Resolve identity vs profile vs RBAC role questions (especially for minors)
- Design history-aware enrollment, guardian links, and catechist assignments
- Choose module split, data ownership, dependency graph, and public contracts
- Plan parish-scoped authorization without modifying Auth/RBAC schema in #001
- Plan conceptual APIs and FE-safe DTO direction

**No schema, entities, migrations, services, controllers, seeds, or APIs were implemented.**

---

## 2. State Inherited From Previous Phases

| Area | State |
|------|-------|
| Backend Foundation | **COMPLETE** (Prompts #001–#007) |
| Bitbucket CI | **COMPLETE** (CI #001–#004) |
| Auth / User / RBAC | **COMPLETE** (AUTH #001–#009) |
| Parish / Academic Year / Catechism Level | **COMPLETE** (PARISH #001–#005) |
| Modules | `UsersModule`, `AuthModule`, `AccessControlModule`, `ParishModule`, `AcademicStructureModule` |
| RBAC scope | Global roles/permissions only; `classes.read` / `classes.manage` seeded as placeholders |
| Users table | No `parish_id`; no domain profile fields |
| Parish demo seed | `demo-parish`, active year `2026-2027 (Demo)`, levels `demo-level-1..3` |
| Academic year invariant | One ACTIVE per parish (filtered unique index + service lock) |
| Date contract | Academic year dates as `YYYY-MM-DD` strings in API |
| Git HEAD | `166c59f fix(parish): finalize academic structure phase` |
| Working tree | Clean at audit start |

---

## 3. Rules Applied

Read and applied:

- `PROJECT_RULES.md` — §7 modular architecture, §22–§23 security/privacy (minors), §31 Definition of Done
- `AGENTS.md`
- `.cursor/rules/*.mdc` (00 mandatory, 01 security/privacy, 02 engineering baseline, 03 modular architecture)
- `docs/AUTH_009_FINAL_AUTH_RBAC_AUDIT_REPORT.md`
- `docs/PARISH_001_DOMAIN_AUDIT_AND_MODULE_DESIGN_REPORT.md`
- `docs/PARISH_005_FINAL_INTEGRATION_HARDENING_REPORT.md`

Key constraints applied:

1. Modular monolith; scalar IDs across module boundaries; no cross-module entity/repository imports
2. SQL FKs allowed in migrations; application ownership remains isolated
3. UUID v4 PKs (application-generated, same as auth/parish)
4. English naming; `nvarchar` for human-readable text
5. No `parish_id` on `users`
6. No Auth/RBAC schema changes in #001
7. Deactivation/end timestamps over hard delete for referenced domain rows
8. Role ≠ identity; scope ≠ permission capability

**No new rules or `.mdc` files required.**

---

## 4. Domain Definitions

### Class

An operational **cohort/group** within one parish, one academic year, and one catechism level. Example: "Lớp Khai Tâm A — 2026–2027". A class is the anchor for roster (enrollments), catechist assignments, and future attendance/exam context.

### Student

A **domain participant** (child/learner) who may exist without a login account. Stable identity across academic years; parish participation is derived through enrollment, not a permanent parish FK on the student row.

### Parent / Guardian

An **authenticated User** linked to one or more students via explicit guardian relationships. "Parent" is not a duplicated identity table; it is a relationship + RBAC role for capability hints only.

### Catechist

An **authenticated User** assigned to one or more classes via explicit assignment rows. "Catechist" is not a standalone profile table; scope derives from assignments.

### Enrollment

A **first-class historical record** of a student's membership in a class for a period with a lifecycle status. Not a mutable join table. Preserves audit trail for transfers, completion, and future attendance/exam references.

---

## 5. User Identity vs Domain Profile Decision

| Option | Verdict |
|--------|---------|
| A. Separate identities per role | Rejected — duplicates people who are parent + catechist |
| B. Profile tables linked to User | **Partially selected** — only where domain data exists beyond auth |
| C. Pure RBAC roles | Rejected — roles do not imply relationships or scope |
| D. Common User + domain relationships | **Selected as foundation** |

### Final decision

```
User (UsersModule)           = authentication identity only
Student (StudentModule)      = domain profile; optional userId link
StudentGuardian (StudentModule) = userId ↔ studentId relationship
ClassCatechistAssignment (ClassModule) = userId ↔ classId assignment
Enrollment (EnrollmentModule) = studentId ↔ classId historical membership
```

RBAC roles (`PARISH_ADMIN`, `CATECHIST`, `PARENT`, `STUDENT`) express **capability hints** only. Resource access always requires explicit scope evidence (membership, assignment, or guardian link).

**No `ParentProfile` or `CatechistProfile` tables in this phase.**

---

## 6. Student Identity Model

| Decision | Choice |
|----------|--------|
| Student requires User account | **No** — optional `user_id` nullable FK |
| Student can exist independently | **Yes** |
| Student is always User | **Rejected** |
| Student belongs to one parish permanently | **Rejected** — parish via enrollment/class |
| Student code | **Deferred** — no code column in MVP schema |

### Rationale

Young children often do not authenticate directly. A student record must carry display identity (`fullName`) independent of `UserEntity`. Optional `userId` supports older students or future self-service without forcing all minors into `UsersModule`.

When `userId` is set, link is 1:1 (one user account per student profile at most). Validation via `UserAccountService` public API only — no `UserEntity` import in StudentModule.

---

## 7. Parent / Guardian Model

| Decision | Choice |
|----------|--------|
| Separate `parents` table | **Rejected** — no parent-specific profile data needed now |
| Guardian as User + relationship | **Selected** |
| `parent_id` on student row | **Rejected** — breaks multi-guardian and history |
| Relationship history | **Required** — `starts_at`, optional `ends_at`, status |

### Table: `student_guardians`

Links `guardian_user_id` → `student_id` with:

- `relationship_type`: `PARENT` | `GUARDIAN` | `OTHER`
- `is_primary`: boolean (at most one primary per student — application enforced)
- `status`: `ACTIVE` | `ENDED`
- `starts_at`, `ends_at` (nullable end = ongoing)

Supports: multiple guardians per student, one guardian for multiple children, blended families, historical deactivation without delete.

**Permanent security invariant:** Role `PARENT` alone never grants access to student data. APIs must verify an **ACTIVE** `student_guardians` row for `(guardianUserId, studentId)`.

---

## 8. Catechist Model

| Decision | Choice |
|----------|--------|
| Separate `catechists` table | **Rejected** |
| `catechist_id` column on `classes` | **Rejected** — no multi-catechist or history |
| Assignment table | **Selected** — `class_catechist_assignments` |

### Table: `class_catechist_assignments`

- `class_id`, `catechist_user_id`
- `assignment_role`: `LEAD` (only value enforced initially; column reserved for future `ASSISTANT`)
- `status`: `ACTIVE` | `ENDED`
- `assigned_at`, `ended_at`

Supports: multi-class catechists, historical reassignment, future assistant catechists without schema break.

**Permanent security invariant:** Role `CATECHIST` alone never grants class access. APIs must verify an **ACTIVE** assignment for `(catechistUserId, classId)`.

---

## 9. Class Model

A class belongs to exactly one `(parishId, academicYearId, catechismLevelId)` triple. Represents one operational group for that year/level.

### Required fields (schema #002)

| Field | Purpose |
|-------|---------|
| `id` | UUID PK |
| `parish_id` | Organizational scope |
| `academic_year_id` | Time scope |
| `catechism_level_id` | Curriculum scope |
| `code` | Stable machine identifier within parish+year |
| `name` | Display name |
| `status` | Lifecycle |
| `created_at`, `updated_at` | Audit |

### Deferred fields

| Field | Reason |
|-------|--------|
| `capacity` | Useful later; not foundational |
| `start_date`, `end_date` | Academic year defines window; schedule phase may add |
| `description` | Admin UI nice-to-have |

### Cross-module validation (service layer #003)

On create/update, ClassModule calls:

- `ParishService.assertParishActive(parishId)`
- `AcademicYearService` — year belongs to parish, appropriate status for class operations
- `CatechismLevelService` — level belongs to parish, active

All three IDs stored as scalar columns; SQL FKs in migration.

---

## 10. Enrollment as First-Class Domain

Enrollment is **not** a simple `(student_id, class_id)` join.

Each row represents: *"Student X was/is a member of Class Y with status Z from enrolled_at until left_at (if ended)."*

### Required fields

| Field | Purpose |
|-------|---------|
| `id` | UUID PK — stable reference for attendance/exams |
| `student_id` | Who |
| `class_id` | Which class |
| `parish_id` | Denormalized scope key (from class) |
| `academic_year_id` | Denormalized scope key (from class) |
| `status` | Lifecycle |
| `enrolled_at` | Membership start event |
| `left_at` | Nullable — set when status becomes terminal |
| `created_at`, `updated_at` | Audit |

### Denormalization rationale

`parish_id` and `academic_year_id` on enrollment enable:

1. Filtered unique index: one ACTIVE enrollment per `(student_id, academic_year_id, parish_id)` without join
2. Efficient parish-scoped enrollment lists
3. Historical integrity if class metadata is ever corrected (enrollment retains year/parish context)

Values are **copied from class snapshot at enrollment creation** and treated as immutable after creation.

---

## 11. Historical Enrollment Rules

| Rule | Enforcement |
|------|-------------|
| Never overwrite historical enrollment to change class | Application — create new row or transfer operation |
| Transfer within year | Close old (TRANSFERRED) + create new ACTIVE |
| New academic year | New enrollment row; do not mutate prior year rows |
| Terminal statuses set `left_at` | Application on status transition |
| Attendance/exams reference enrollment | Prefer `enrollmentId` where membership context matters |
| Class/year/level immutability after COMPLETED/CANCELLED class | Application — block structural edits |

Student identity remains stable; enrollment rows are the historical timeline.

---

## 12. Transfer Semantics

**Decision: explicit domain command — not generic PATCH alone**

```
transferEnrollment(enrollmentId, targetClassId, reason?)
```

Transaction (EnrollmentModule-owned):

1. Load source enrollment; verify ACTIVE
2. Load target class via ClassModule public API; verify same `parishId` and `academicYearId`
3. Verify target class status allows enrollment (ACTIVE or PLANNED per policy)
4. Verify no existing ACTIVE enrollment for student in same `(parishId, academicYearId)`
5. Set source → `TRANSFERRED`, `left_at = now`
6. Create new enrollment → `ACTIVE`, copy denormalized scope keys from target class

Callers must not manually PATCH two rows without this operation — reduces inconsistent history.

Optional HTTP: `POST /api/v1/enrollments/:id/transfer` with `{ targetClassId, reason? }`.

---

## 13. Promotion / New Academic Year Semantics

Moving a student to the next academic year or catechism level:

- **Always** create a **new enrollment** in a class under the new academic year
- **Never** update a prior year's enrollment to point at a new class/year
- Prior enrollments remain `COMPLETED` or `TRANSFERRED`/`WITHDRAWN` as historically accurate

Bulk promotion (future): orchestration service iterates students and creates enrollments — out of scope for #001–#005.

---

## 14. Module Split Decision

### Selected: **StudentModule + ClassModule + EnrollmentModule**

| Option | Verdict |
|--------|---------|
| A: ClassModule owns enrollments | Rejected — enrollment has distinct lifecycle and future extraction boundary |
| B: Three modules (Student, Class, Enrollment) | **Selected** |
| C: Generic PeopleModule | Rejected — vague; poor cohesion |

### Justification

1. **Enrollment** has its own historical lifecycle, invariants, and transfer transactions — deserves dedicated ownership
2. **Student + guardians** form a natural "people" bounded context separate from class operations
3. **Class + catechist assignments** co-locate operational group management
4. Matches future microservice split: Student Service, Class Service, Enrollment Service
5. Avoids ClassModule ↔ EnrollmentModule cycle (Enrollment → Class only)

### Parish membership extension

`parish_memberships` table owned by **ParishModule** (not a fourth business module). It is organizational scope evidence for `PARISH_ADMIN`, consistent with parish as tenant boundary.

---

## 15. Data Ownership Matrix

| Concept / Table | Owner Module | Allowed Writer | Public Readers (contracts) | Future Service |
|-----------------|--------------|----------------|------------------------------|----------------|
| `users` | UsersModule | UsersModule | Auth, StudentModule (validate userId) | User Service |
| `parishes` | ParishModule | ParishModule | All scoped modules | Parish Service |
| `parish_memberships` | ParishModule | ParishModule | Scope services, Enrollment (read) | Parish Service |
| `academic_years`, `catechism_levels` | AcademicStructureModule | AcademicStructureModule | ClassModule, EnrollmentModule | Academic Structure Service |
| `students` | StudentModule | StudentModule | EnrollmentModule | Student Service |
| `student_guardians` | StudentModule | StudentModule | Scope services | Student Service |
| `classes` | ClassModule | ClassModule | EnrollmentModule | Class Service |
| `class_catechist_assignments` | ClassModule | ClassModule | Scope services | Class Service |
| `enrollments` | EnrollmentModule | EnrollmentModule | Future Attendance/Exam | Enrollment Service |

---

## 16. Dependency Graph

```
UsersModule                    (no domain dependency)
AccessControlModule            (no domain dependency)
AuthModule                     → UsersModule

ParishModule                   (standalone; gains parish_memberships in #002)
AcademicStructureModule        → ParishModule

StudentModule                  → UsersModule (optional userId validation only)

ClassModule                    → ParishModule
                               → AcademicStructureModule

EnrollmentModule               → StudentModule
                               → ClassModule

Controllers (all)              → AuthModule (JwtAuthGuard)
                               → AccessControlModule (PermissionGuard)
                               → future scope services

AppModule                      → all modules above
```

- **Acyclic** — no `forwardRef()`
- EnrollmentModule does **not** import ParishModule or AcademicStructureModule directly; scope keys come from ClassModule snapshots
- StudentModule does **not** import EnrollmentModule

---

## 17. Public Contract Plan

All cross-module contracts are **narrow snapshots** — never entities.

### StudentSnapshot

```typescript
interface StudentSnapshot {
  readonly id: string;
  readonly userId: string | null;
  readonly fullName: string;
  readonly status: StudentStatus; // ACTIVE | INACTIVE
}
```

### GuardianLinkSnapshot

```typescript
interface GuardianLinkSnapshot {
  readonly id: string;
  readonly studentId: string;
  readonly guardianUserId: string;
  readonly relationshipType: GuardianRelationshipType;
  readonly isPrimary: boolean;
  readonly status: GuardianLinkStatus;
  readonly startsAt: Date;
  readonly endsAt: Date | null;
}
```

### ClassSnapshot

```typescript
interface ClassSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly catechismLevelId: string;
  readonly code: string;
  readonly name: string;
  readonly status: ClassStatus;
}
```

### ClassCatechistAssignmentSnapshot

```typescript
interface ClassCatechistAssignmentSnapshot {
  readonly id: string;
  readonly classId: string;
  readonly catechistUserId: string;
  readonly assignmentRole: CatechistAssignmentRole;
  readonly status: CatechistAssignmentStatus;
  readonly assignedAt: Date;
  readonly endedAt: Date | null;
}
```

### EnrollmentSnapshot

```typescript
interface EnrollmentSnapshot {
  readonly id: string;
  readonly studentId: string;
  readonly classId: string;
  readonly parishId: string;
  readonly academicYearId: string;
  readonly status: EnrollmentStatus;
  readonly enrolledAt: Date;
  readonly leftAt: Date | null;
}
```

### ParishMembershipSnapshot

```typescript
interface ParishMembershipSnapshot {
  readonly id: string;
  readonly parishId: string;
  readonly userId: string;
  readonly status: ParishMembershipStatus;
  readonly joinedAt: Date;
  readonly endedAt: Date | null;
}
```

### Planned validation methods

| Method | Owner |
|--------|-------|
| `getStudentById(id)` | StudentModule |
| `assertStudentActive(studentId)` | StudentModule |
| `assertGuardianLinked(guardianUserId, studentId)` | StudentModule |
| `getClassById(id)` / `getClassSnapshotForEnrollment(classId)` | ClassModule |
| `assertClassBelongsToParish(classId, parishId)` | ClassModule |
| `assertCatechistAssigned(catechistUserId, classId)` | ClassModule |
| `getEnrollmentById(id)` | EnrollmentModule |
| `assertParishMember(userId, parishId)` | ParishModule |

---

## 18. Class Schema Plan

### Table: `classes`

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `id` | `uniqueidentifier` | PK | UUID v4, app-generated |
| `parish_id` | `uniqueidentifier` | FK → `parishes.id` | RESTRICT delete |
| `academic_year_id` | `uniqueidentifier` | FK → `academic_years.id` | RESTRICT delete |
| `catechism_level_id` | `uniqueidentifier` | FK → `catechism_levels.id` | RESTRICT delete |
| `code` | `varchar(32)` | Yes | Normalized lowercase; unique per parish+year |
| `name` | `nvarchar(128)` | Yes | Display |
| `status` | `varchar(32)` | Yes | See §23 |
| `created_at` | `datetime2` | Yes | UTC |
| `updated_at` | `datetime2` | Yes | UTC |

---

## 19. Student Schema Plan

### Table: `students`

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `id` | `uniqueidentifier` | PK | UUID v4 |
| `user_id` | `uniqueidentifier` | Nullable, FK → `users.id` | Optional login link |
| `full_name` | `nvarchar(128)` | Yes | Display/roster identity |
| `date_of_birth` | `date` | **Deferred** | Privacy-minimal MVP; add when product confirms |
| `status` | `varchar(32)` | Yes | ACTIVE \| INACTIVE (record lifecycle) |
| `created_at` | `datetime2` | Yes | UTC |
| `updated_at` | `datetime2` | Yes | UTC |

### Deferred / avoid in foundation

| Field | Reason |
|-------|--------|
| `gender` | Not required for roster MVP |
| `preferred_name` | Use `full_name` initially |
| `notes` | Risk of sensitive/pastoral data |
| Baptism/sacramental fields | Faith Journey domain later |
| Contact fields on student | Guardians hold contact via User accounts |

Unique: filtered unique index on `user_id` WHERE `user_id IS NOT NULL` (one student profile per user).

---

## 20. Guardian Relationship Schema Plan

### Table: `student_guardians`

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `id` | `uniqueidentifier` | PK | UUID v4 |
| `student_id` | `uniqueidentifier` | FK → `students.id` | RESTRICT |
| `guardian_user_id` | `uniqueidentifier` | FK → `users.id` | RESTRICT |
| `relationship_type` | `varchar(32)` | Yes | PARENT \| GUARDIAN \| OTHER |
| `is_primary` | `bit` | Yes | Default 0 |
| `status` | `varchar(32)` | Yes | ACTIVE \| ENDED |
| `starts_at` | `datetime2` | Yes | UTC |
| `ends_at` | `datetime2` | Nullable | Set when ENDED |
| `created_at` | `datetime2` | Yes | UTC |
| `updated_at` | `datetime2` | Yes | UTC |

Unique: `(student_id, guardian_user_id)` — one link row per pair; re-link after ENDED creates new row or reactivates via service policy (prefer new row for audit).

---

## 21. Catechist Assignment Schema Plan

### Table: `class_catechist_assignments`

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `id` | `uniqueidentifier` | PK | UUID v4 |
| `class_id` | `uniqueidentifier` | FK → `classes.id` | RESTRICT |
| `catechist_user_id` | `uniqueidentifier` | FK → `users.id` | RESTRICT |
| `assignment_role` | `varchar(32)` | Yes | LEAD (ASSISTANT later) |
| `status` | `varchar(32)` | Yes | ACTIVE \| ENDED |
| `assigned_at` | `datetime2` | Yes | UTC |
| `ended_at` | `datetime2` | Nullable | |
| `created_at` | `datetime2` | Yes | UTC |
| `updated_at` | `datetime2` | Yes | UTC |

Filtered unique: one ACTIVE assignment per `(class_id, catechist_user_id)`.

---

## 22. Enrollment Schema Plan

### Table: `enrollments`

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `id` | `uniqueidentifier` | PK | UUID v4 |
| `student_id` | `uniqueidentifier` | FK → `students.id` | RESTRICT |
| `class_id` | `uniqueidentifier` | FK → `classes.id` | RESTRICT |
| `parish_id` | `uniqueidentifier` | FK → `parishes.id` | Denormalized from class |
| `academic_year_id` | `uniqueidentifier` | FK → `academic_years.id` | Denormalized from class |
| `status` | `varchar(32)` | Yes | See §23 |
| `enrolled_at` | `datetime2` | Yes | UTC |
| `left_at` | `datetime2` | Nullable | Set on terminal transition |
| `created_at` | `datetime2` | Yes | UTC |
| `updated_at` | `datetime2` | Yes | UTC |

---

## 23. Status Enums / Lifecycles

### ClassStatus

| Status | Meaning | Transitions |
|--------|---------|-------------|
| `PLANNED` | Created, not yet operating | → ACTIVE, CANCELLED |
| `ACTIVE` | Accepts enrollments, operational | → COMPLETED, CANCELLED |
| `COMPLETED` | Year/operations finished | Terminal |
| `CANCELLED` | Aborted before/during operation | Terminal |

Prefer explicit lifecycle over generic ACTIVE/INACTIVE for year-bound records.

### StudentStatus

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Profile usable |
| `INACTIVE` | Soft-deactivated; historical enrollments preserved |

Operational membership authority: **Enrollment**, not StudentStatus alone.

### GuardianLinkStatus / CatechistAssignmentStatus

`ACTIVE` | `ENDED` — end via `ends_at`/`ended_at`, not hard delete.

### EnrollmentStatus (minimal set)

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Current membership |
| `COMPLETED` | Finished normally (year end, promotion) |
| `WITHDRAWN` | Left without transfer |
| `TRANSFERRED` | Moved to another class (successor row created) |

**Deferred:** `PENDING`, `CANCELLED` — add only if registration workflow requires.

### ParishMembershipStatus

`ACTIVE` | `ENDED` — for PARISH_ADMIN parish scope.

---

## 24. Uniqueness Constraints

| Constraint | Table | Rule |
|------------|-------|------|
| `UQ_classes_parish_id_academic_year_id_code` | `classes` | Code unique per parish+year |
| `UQ_students_user_id` (filtered) | `students` | One student profile per user when linked |
| `UQ_student_guardians_student_id_guardian_user_id` | `student_guardians` | One relationship row per pair |
| `UQ_class_catechist_assignments_class_id_user_id_active` (filtered) | `class_catechist_assignments` | One ACTIVE assignment per catechist per class |
| `UQ_enrollments_student_id_academic_year_id_parish_id_active` (filtered) | `enrollments` | One ACTIVE enrollment per student per year per parish |

---

## 25. Index Strategy

| Index | Purpose |
|-------|---------|
| `IX_classes_parish_id_academic_year_id` | Parish class lists filtered by year |
| `IX_classes_parish_id_status` | Active class queries |
| `IX_enrollments_class_id_status` | Class roster |
| `IX_enrollments_student_id` | Student enrollment history |
| `IX_enrollments_parish_id_academic_year_id` | Parish/year reports |
| `IX_student_guardians_guardian_user_id_status` | Parent scope lookups |
| `IX_student_guardians_student_id_status` | Guardian list per student |
| `IX_class_catechist_assignments_catechist_user_id_status` | Catechist scope lookups |
| `IX_parish_memberships_user_id_status` | Admin scope lookups |
| `IX_parish_memberships_parish_id_status` | Parish member lists |

---

## 26. Cross-Module FK Strategy

### SQL (migration — allowed)

```
classes.parish_id              → parishes.id
classes.academic_year_id       → academic_years.id
classes.catechism_level_id     → catechism_levels.id
students.user_id               → users.id (nullable)
student_guardians.student_id   → students.id
student_guardians.guardian_user_id → users.id
class_catechist_assignments    → classes.id, users.id
enrollments                    → students.id, classes.id, parishes.id, academic_years.id
parish_memberships             → parishes.id, users.id
```

All `ON DELETE RESTRICT` / NO ACTION — align with no hard-delete policy.

### Application layer

- Scalar UUID columns in entities
- No `@ManyToOne` to entities outside owning module
- Cross-module validation via exported services before write

### Microservice extraction (future)

- FKs become scalar IDs; sync validation on writes via HTTP/RPC
- No distributed transactions; Enrollment Service owns enrollment writes after validating Student + Class via their APIs

---

## 27. Cross-Module ORM Rules

Same as Auth/Parish phases:

1. Entities private to owning module
2. Repositories not exported
3. `TypeOrmModule.forFeature` only in owning module
4. Module boundary spec extended in #002/#003 for new exports
5. Metadata integration tests for new entities in `src/database/`

---

## 28. Multi-Parish User Implications

| User type | Multi-parish support |
|-----------|---------------------|
| SUPER_ADMIN | Global — no parish filter |
| PARISH_ADMIN | Multiple parishes via multiple `parish_memberships` rows |
| CATECHIST | Multiple parishes via assignments across parishes' classes |
| PARENT | Multiple parishes if children enroll in different parishes |
| STUDENT (linked user) | Scoped to own student profile + enrollments |

No `parish_id` on `users`. Scope is always derived from domain evidence tables.

---

## 29. Parish Membership Decision

**Decision: Introduce `parish_memberships` now (ParishModule ownership)**

| Scope source | Mechanism |
|--------------|-----------|
| PARISH_ADMIN | **Explicit** `parish_memberships` (ACTIVE) |
| CATECHIST | **Derived** from `class_catechist_assignments` |
| PARENT | **Derived** from `student_guardians` |
| STUDENT | **Derived** from `students.user_id` + enrollments |

### Table: `parish_memberships`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uniqueidentifier` | PK |
| `parish_id` | `uniqueidentifier` | FK |
| `user_id` | `uniqueidentifier` | FK |
| `status` | `varchar(32)` | ACTIVE \| ENDED |
| `joined_at` | `datetime2` | UTC |
| `ended_at` | `datetime2` | Nullable |
| `created_at`, `updated_at` | `datetime2` | UTC |

Filtered unique: one ACTIVE membership per `(parish_id, user_id)`.

**Rationale:** PARISH_ADMIN scope cannot be inferred reliably from class or guardian data. Explicit membership avoids over-permissioning global PARISH_ADMIN role.

Auth/RBAC schema (`user_roles`) remains unchanged — scope is orthogonal.

---

## 30. Scoped Authorization Strategy

**Decision: Option C + D hybrid — global permissions + domain scope services**

1. Keep `@RequirePermissions('classes.manage')` etc. for capability
2. Add domain scope assertions in services/controllers:

```typescript
// Conceptual pattern (#006 implementation)
@RequirePermissions('classes.manage')
async updateClass(userId, classId, dto) {
  await this.parishScopeService.assertCanManageParishResource(userId, class.parishId);
  // PARISH_ADMIN: requires parish_memberships
  // SUPER_ADMIN: bypass
}
```

### Scope service candidates (implement #006, not #001)

| Service | Owner | Responsibility |
|---------|-------|----------------|
| `ParishScopeService` | ParishModule (or shared infra if truly cross-cutting — prefer ParishModule) | Parish membership checks |
| `ClassScopeService` | ClassModule | Catechist assignment checks |
| `StudentAccessService` | StudentModule | Guardian link checks |

Avoid monolithic `AuthorizationGodService`. Each domain module owns its scope evidence queries internally; expose narrow `assert*` methods.

**Do not modify `user_roles` or permission tables in this phase.**

---

## 31. Parent Visibility Security Invariant

> **Invariant P-1:** A user with role `PARENT` may only read student data when an ACTIVE `student_guardians` row exists linking `(guardian_user_id = user.sub, student_id)`.

> **Invariant P-2:** Parent list endpoints must never return students based on role alone or parish alone.

> **Invariant P-3:** Parent access to class/enrollment data is limited to classes where their linked children have enrollments (directly or via enrollment history policy defined in #006).

---

## 32. Catechist Visibility Security Invariant

> **Invariant C-1:** A user with role `CATECHIST` may only access class resources when an ACTIVE `class_catechist_assignments` row exists for `(catechist_user_id, class_id)`.

> **Invariant C-2:** Catechist roster access is limited to students with enrollments in assigned classes (ACTIVE enrollments for current operations; historical per product rule in #006).

> **Invariant C-3:** Catechist must not gain `students.read` globally — relationship-scoped reads only.

---

## 33. Permission Namespace Plan

| Permission | Purpose | Seed in |
|------------|---------|---------|
| `classes.read` | List/read classes | Already placeholder in auth seed; wire in #003 |
| `classes.manage` | CRUD + status classes | #003 |
| `students.read` | Admin roster read | #004 |
| `students.manage` | Create/update students | #004 |
| `student-guardians.read` | List guardian links | #004 |
| `student-guardians.manage` | Link/unlink guardians | #004 |
| `class-catechists.read` | List assignments | #005 |
| `class-catechists.manage` | Assign/end catechists | #005 |
| `enrollments.read` | List enrollment history | #005 |
| `enrollments.manage` | Enroll, transfer, status | #005 |

Self/parent/catechist scoped reads may use dedicated endpoints without broad `students.read` (e.g. `GET /api/v1/me/children` — plan in #006).

**Do not seed new permissions in #001.**

---

## 34. API Plan — Class

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| POST | `/api/v1/parishes/:parishId/classes` | `classes.manage` + parish scope | Create |
| GET | `/api/v1/parishes/:parishId/classes` | `classes.read` + parish scope | Paginated; filters: `academicYearId`, `catechismLevelId`, `status`, `search` |
| GET | `/api/v1/classes/:id` | `classes.read` + resource scope | Detail |
| PATCH | `/api/v1/classes/:id` | `classes.manage` + resource scope | Update name/code (if allowed) |
| PATCH | `/api/v1/classes/:id/status` | `classes.manage` + resource scope | Lifecycle transitions |

Follow existing pagination: `page`, `limit`, `sort`, `sortBy`.

---

## 35. API Plan — Student

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| POST | `/api/v1/students` | `students.manage` | Create profile; optional `userId` |
| GET | `/api/v1/students/:id` | `students.read` or guardian/self scope | |
| PATCH | `/api/v1/students/:id` | `students.manage` or scoped | |
| GET | `/api/v1/parishes/:parishId/students` | `students.read` + parish scope | **Students with ACTIVE enrollment in parish** (not `students.parish_id`) |

Parish student list semantics: join enrollments → classes filtered by `parishId`, distinct students. Document clearly for FE.

---

## 36. API Plan — Guardians

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| POST | `/api/v1/students/:studentId/guardians` | `student-guardians.manage` | Link guardian user |
| GET | `/api/v1/students/:studentId/guardians` | `student-guardians.read` or parent self | |
| PATCH | `/api/v1/student-guardians/:id/status` | `student-guardians.manage` | End relationship (ENDED + `ends_at`) |

No destructive DELETE for production paths.

---

## 37. API Plan — Catechist Assignments

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| POST | `/api/v1/classes/:classId/catechists` | `class-catechists.manage` | Assign user |
| GET | `/api/v1/classes/:classId/catechists` | `class-catechists.read` | Include ACTIVE; optional history flag |
| PATCH | `/api/v1/class-catechist-assignments/:id/status` | `class-catechists.manage` | End assignment |

---

## 38. API Plan — Enrollment

| Method | Path | Permission | Notes |
|--------|------|------------|-------|
| POST | `/api/v1/classes/:classId/enrollments` | `enrollments.manage` | Enroll student |
| GET | `/api/v1/classes/:classId/enrollments` | `enrollments.read` | Class roster |
| GET | `/api/v1/students/:studentId/enrollments` | `enrollments.read` or scoped | History |
| PATCH | `/api/v1/enrollments/:id/status` | `enrollments.manage` | COMPLETED, WITHDRAWN |
| POST | `/api/v1/enrollments/:id/transfer` | `enrollments.manage` | Explicit transfer command |

---

## 39. Attendance Integration Recommendation

Future Attendance module should reference:

- `enrollmentId` (primary — historical membership context)
- `classId`, `studentId` (denormalized convenience, validated against enrollment)

Prefer `enrollmentId` when attendance must reflect "was this student enrolled on date X".

AttendanceModule → EnrollmentModule public API for validation; no direct enrollment table access.

---

## 40. Exam Integration Recommendation

Future Exam module references:

- `enrollmentId` for results tied to a specific year/class membership
- `classId` for exam definition scoped to class
- `studentId` for result ownership

Store exam snapshots at assignment time if class/name metadata needed on historical reports — defer to Exam phase, not enrollment foundation.

---

## 41. Learning Progress Integration Recommendation

Learning progress spans years — bind to `studentId` as stable identity.

Optional `enrollmentId` or `academicYearId` when progress is year-specific.

Do not bind student identity entirely to enrollment; student outlives any single enrollment.

---

## 42. PII / Minor Privacy Review

### Required now

| Data | Justification |
|------|---------------|
| `full_name` | Roster identity without login |
| UUID identifiers | No sequential public child IDs |

### Deferred

| Data | Reason |
|------|--------|
| `date_of_birth` | Confirm product need; age validation can wait |
| Address, phone on student | Guardians use User accounts |
| Photos | Media phase with strict upload controls |

### Never in foundation

- Medical information, pastoral/confessional notes
- Sacramental history (Faith Journey domain)
- Government ID numbers

### Logging

- Never log guardian relationship disputes, full student names in bulk debug, or linkage tokens
- Never log passwords, tokens, or unnecessary PII in enrollment flows

### Guardian privacy

- Guardian links expose only necessary fields to authorized callers
- Parent cannot see other parents' links unless admin

---

## 43. Deletion / History Policy

| Entity | Policy |
|--------|--------|
| Students | `INACTIVE` status; no routine DELETE API |
| Classes | Terminal status; no delete if enrollments exist |
| Enrollments | Status transitions only; never delete referenced rows |
| Guardian links | ENDED status + `ends_at` |
| Catechist assignments | ENDED status + `ended_at` |
| Parish memberships | ENDED status |

Erroneous demo/test data cleanup: dev-only scripts or SUPER_ADMIN tooling — not public DELETE endpoints.

---

## 44. Seed Strategy (planned #007)

No seed in #001. Planned dev seed (`npm run seed:class-enrollment` or extend parish-academic):

- Synthetic students (fake names, no real child data)
- Link `parent@local.catechism.test` as guardian
- Assign `catechist@local.catechism.test` to demo class
- Enrollments: ACTIVE + one TRANSFERRED history example
- Idempotent; public services only; dev/staging guard

Requires auth-rbac + parish-academic seeds first.

---

## 45. FE Contract Planning

DTOs (not entities) for independent React repo:

| DTO | Key fields |
|-----|------------|
| `ClassResponseDto` | id, parishId, academicYearId, catechismLevelId, code, name, status, timestamps |
| `StudentResponseDto` | id, userId?, fullName, status, timestamps — no internal notes |
| `GuardianLinkResponseDto` | id, studentId, guardianUserId, relationshipType, isPrimary, status, startsAt, endsAt? |
| `CatechistAssignmentResponseDto` | id, classId, catechistUserId, assignmentRole, status, assignedAt, endedAt? |
| `EnrollmentResponseDto` | id, studentId, classId, parishId, academicYearId, status, enrolledAt, leftAt? |

List responses: `{ data, meta: { page, limit, total, totalPages } }` — consistent with parish/academic APIs.

Nested aggregates (class with roster): avoid for list endpoints; FE fetches enrollments separately or via dedicated expanded endpoint in #006 if needed.

---

## 46. Future Microservice Extraction Map

| Service | Tables | Upstream dependencies |
|---------|--------|----------------------|
| Student Service | `students`, `student_guardians` | User Service (validate userId) |
| Class Service | `classes`, `class_catechist_assignments` | Parish, Academic Structure |
| Enrollment Service | `enrollments` | Student, Class |
| Parish Service | `parishes`, `parish_memberships` | — |
| Academic Structure Service | `academic_years`, `catechism_levels` | Parish |

Extract Enrollment Service before Attendance/Exam for clearest boundary.

Events (future): `EnrollmentCreated`, `EnrollmentTransferred`, `StudentGuardianLinked` — not in this phase.

---

## 47. Risks / Open Questions

| ID | Severity | Topic | Mitigation |
|----|----------|-------|------------|
| R-001 | MEDIUM | Parish student list requires enrollment join — query complexity | Index strategy §25; document API semantics clearly |
| R-002 | MEDIUM | Denormalized enrollment keys could drift if class moved | **Policy:** class parish/year immutable after creation; no class transfer between parishes |
| R-003 | LOW | `date_of_birth` deferred — age-based level rules | Add when product confirms; use catechism level assignment manually until then |
| R-004 | LOW | ASSISTANT catechist role unused initially | Column reserved; single LEAD value in #002–#005 |
| R-005 | INFO | Scoped auth adds controller complexity | Centralize in scope services in #006; unit test matrix |
| R-006 | INFO | `classes.read` already in seed without scope | Harden in #006 before production multi-parish |
| R-007 | LOW | Student code for import | Defer; design import idempotency keys in import phase |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

---

## 48. Files Created

| File | Purpose |
|------|---------|
| `docs/CLASS_001_DOMAIN_AUDIT_AND_BOUNDARY_DESIGN_REPORT.md` | This report |

---

## 49. Files Modified

None. Design-only prompt — no tracked source changes.

---

## 50. Commands Executed

```powershell
git status --short
git log -3 --oneline
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

---

## 51. Validation Results

| Gate | Result |
|------|--------|
| `npm run format:check` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm test` | **PASS** (42 suites, 175 tests) |
| `npm run test:e2e` | **PASS** (2 suites, 5 tests) |
| `npm run build` | **PASS** |

No DB/Docker required — no code changes.

---

## 52. Out-of-Scope Confirmation

The following were **not** implemented (per prompt):

- Schema, entities, migrations, enums in code
- Module skeletons, services, controllers, DTOs
- RBAC permission seed changes
- Domain seed, Postman collections
- Scoped authorization implementation
- FE changes
- Git commit/push

---

## 53. CLASS #002 Readiness

**READY** — no unresolved BLOCKER/HIGH.

### CLASS #002 scope (when prompted)

Implement **only**:

- `StudentModule`, `ClassModule`, `EnrollmentModule` skeletons
- `parish_memberships` extension in ParishModule
- Entities + enums matching this schema plan
- One migration (or ordered migrations) with FKs, indexes, filtered unique constraints
- Metadata/boundary integration tests
- Extend `module-boundaries.spec.ts` export expectations (stub exports OK)

**No** business services, controllers, or HTTP APIs in #002.

---

## 54. Prompt Count Status

| Item | Value |
|------|-------|
| This prompt | **#001/7 COMPLETE** |
| Remaining in phase | **~6 prompts** (#002–#007) |

---

## 55. Commit Recommendation

No commit required — only gitignored report created; no tracked file changes.

If rules were updated (they were not), suggested message would be:

```
docs: add class enrollment domain audit report
```

Not applicable to tracked files in this run.

---

## Summary Decision Table

| Question | Decision |
|----------|----------|
| Module split | **StudentModule + ClassModule + EnrollmentModule** (+ `parish_memberships` in ParishModule) |
| Student identity | Domain profile; **optional** `userId` |
| Parent identity | User + **student_guardians** (no Parent table) |
| Catechist identity | User + **class_catechist_assignments** (no Catechist table) |
| Enrollment | **First-class** historical rows with denormalized parish/year keys |
| One ACTIVE enrollment per year | **Yes** — filtered unique index |
| Transfer | **Explicit** `transferEnrollment` command |
| Parish membership | **Yes** for PARISH_ADMIN scope |
| Scoped RBAC | Global permissions + **domain scope services** (#006) |
| Enrollment history design ready | **YES** |
| Scoped authorization direction defined | **YES** |
