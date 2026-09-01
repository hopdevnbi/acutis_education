# CLASS #002 — Schema + Entities + Migrations

> Status: **COMPLETE**
> Phase: **#002/7**
> Scope: StudentModule, ClassModule, EnrollmentModule skeletons + ParishMembershipEntity + migration + tests
> Next prompt: **CLASS #003** — Class Service + API + RBAC Foundations (when prompted)

---

## 1. Objective

Implement persistence foundation for Class + Student + Guardian + Catechist Assignment + Enrollment per CLASS #001 design:

- Three new module skeletons + ParishModule extension (`parish_memberships`)
- TypeORM entities with application UUID v4
- Status/relationship enums
- One cohesive migration with FKs, indexes, filtered unique indexes, CHECK constraints
- Entity metadata, UUID, module boundary, and DB integration tests

No business services, controllers, DTOs, RBAC seeds, scoped guards, or domain seeds.

---

## 2. State Inherited From #001

| Decision | Value |
|----------|-------|
| Module split | `StudentModule`, `ClassModule`, `EnrollmentModule` |
| Parish extension | `parish_memberships` in ParishModule |
| Student | Optional `userId`; `fullName`; no parish_id |
| Guardian | `student_guardians` — filtered unique ACTIVE pair |
| Catechist | `class_catechist_assignments` — no profile table |
| Enrollment | Denormalized `parishId`, `academicYearId`; one ACTIVE per student/year/parish |
| Cross-module ORM | Scalar IDs only; no `@ManyToOne` across boundaries |

---

## 3. Rules Applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*.mdc`
- Application UUID v4 (no DB defaults)
- English naming; snake_case tables
- `nvarchar` for display names; `varchar` for codes/status
- No Auth/RBAC schema changes
- Minimal child PII (`full_name` only on students)

---

## 4. Files Created

| File | Purpose |
|------|---------|
| `src/modules/student/student.module.ts` | Student module skeleton |
| `src/modules/student/entities/student.entity.ts` | Student entity |
| `src/modules/student/entities/student-guardian.entity.ts` | Guardian link entity |
| `src/modules/student/enums/*.enum.ts` | StudentStatus, GuardianRelationshipType, GuardianLinkStatus |
| `src/modules/class/class.module.ts` | Class module skeleton |
| `src/modules/class/entities/class.entity.ts` | Class entity |
| `src/modules/class/entities/class-catechist-assignment.entity.ts` | Catechist assignment entity |
| `src/modules/class/enums/*.enum.ts` | ClassStatus, CatechistAssignmentRole, CatechistAssignmentStatus |
| `src/modules/enrollment/enrollment.module.ts` | Enrollment module skeleton |
| `src/modules/enrollment/entities/enrollment.entity.ts` | Enrollment entity |
| `src/modules/enrollment/enums/enrollment-status.enum.ts` | EnrollmentStatus |
| `src/modules/parish/entities/parish-membership.entity.ts` | Parish membership entity |
| `src/modules/parish/enums/parish-membership-status.enum.ts` | ParishMembershipStatus |
| `src/database/migrations/1788063000000-create-class-people-enrollment-schema.ts` | Schema migration |
| `src/database/class-people-enrollment.entities.spec.ts` | Entity metadata tests |
| `src/database/class-people-enrollment-uuid-generation.spec.ts` | UUID generation tests |
| `test/integration/class-people-enrollment.integration-spec.ts` | DB constraint/integration tests |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `src/app.module.ts` | Register StudentModule, ClassModule, EnrollmentModule |
| `src/modules/parish/parish.module.ts` | Register ParishMembershipEntity (exports unchanged: ParishService only) |
| `src/modules/module-boundaries.spec.ts` | Assert new modules export nothing; ParishModule still ParishService only |
| `test/integration/database.integration-spec.ts` | Include new tables + UUID no-default check (13 tables) |

---

## 6. Module Skeletons

```typescript
// StudentModule — no providers/controllers/exports
TypeOrmModule.forFeature([StudentEntity, StudentGuardianEntity])

// ClassModule
TypeOrmModule.forFeature([ClassEntity, ClassCatechistAssignmentEntity])

// EnrollmentModule
TypeOrmModule.forFeature([EnrollmentEntity])

// ParishModule — extended persistence only
TypeOrmModule.forFeature([ParishEntity, ParishMembershipEntity])
exports: [ParishService] // unchanged
```

---

## 7–12. Entity Summaries

### ParishMembershipEntity (`parish_memberships`)

`id`, `parishId`, `userId`, `status` (ACTIVE/ENDED), `joinedAt`, `endedAt?`, timestamps

### StudentEntity (`students`)

`id`, `userId?`, `fullName`, `status` (ACTIVE/INACTIVE), timestamps

### StudentGuardianEntity (`student_guardians`)

`id`, `studentId`, `guardianUserId`, `relationshipType`, `isPrimary`, `status`, `startsAt`, `endsAt?`, timestamps

### ClassEntity (`classes`)

`id`, `parishId`, `academicYearId`, `catechismLevelId`, `code`, `name`, `status`, timestamps

### ClassCatechistAssignmentEntity (`class_catechist_assignments`)

`id`, `classId`, `catechistUserId`, `assignmentRole` (LEAD), `status`, `assignedAt`, `endedAt?`, timestamps

### EnrollmentEntity (`enrollments`)

`id`, `studentId`, `classId`, `parishId`, `academicYearId`, `status`, `enrolledAt`, `leftAt?`, timestamps

---

## 13. Enum Definitions

| Module | Enum | Values |
|--------|------|--------|
| StudentModule | `StudentStatus` | ACTIVE, INACTIVE |
| StudentModule | `GuardianRelationshipType` | PARENT, GUARDIAN, OTHER |
| StudentModule | `GuardianLinkStatus` | ACTIVE, ENDED |
| ClassModule | `ClassStatus` | PLANNED, ACTIVE, COMPLETED, CANCELLED |
| ClassModule | `CatechistAssignmentRole` | LEAD |
| ClassModule | `CatechistAssignmentStatus` | ACTIVE, ENDED |
| EnrollmentModule | `EnrollmentStatus` | ACTIVE, COMPLETED, WITHDRAWN, TRANSFERRED |
| ParishModule | `ParishMembershipStatus` | ACTIVE, ENDED |

---

## 14. UUID Strategy

- `@PrimaryColumn({ type: 'uniqueidentifier' })` with `id: string = generateUuidV4()`
- Migration creates `id` columns without DB default
- Integration test confirms no default on all 6 new table PK columns

---

## 15. Migration

**File:** `1788063000000-create-class-people-enrollment-schema.ts`  
**Class:** `CreateClassPeopleEnrollmentSchema1788063000000`

**Up order:** parish_memberships → students → student_guardians → classes → class_catechist_assignments → enrollments  
**Down order:** reverse

---

## 16. FK Strategy

All FKs `ON DELETE NO ACTION`:

- `parish_memberships` → parishes, users
- `students.user_id` → users (nullable)
- `student_guardians` → students, users
- `classes` → parishes, academic_years, catechism_levels
- `class_catechist_assignments` → classes, users
- `enrollments` → students, classes, parishes, academic_years

Cross-parish year/level consistency enforced in #003 services, not DB triggers.

---

## 17. Cross-Module ORM Audit — PASS

- Zero `@ManyToOne` / `@OneToMany` / `@JoinColumn` on all 6 new entities
- No UserEntity/ParishEntity imports in Student/Class/Enrollment modules
- Metadata spec confirms 0 relations per entity

---

## 18. Filtered Unique Indexes

| Index | Rule |
|-------|------|
| `UQ_students_user_id` | One student per linked user (`user_id IS NOT NULL`) |
| `UQ_student_guardians_student_id_guardian_user_id_active` | One ACTIVE link per student+guardian pair |
| `UQ_student_guardians_student_id_primary_active` | One ACTIVE primary guardian per student |
| `UQ_classes_parish_id_academic_year_id_code` | Class code unique per parish+year |
| `UQ_class_catechist_assignments_class_id_user_id_active` | One ACTIVE assignment per class+catechist |
| `UQ_enrollments_student_id_academic_year_id_parish_id_active` | One ACTIVE enrollment per student+year+parish |
| `UQ_parish_memberships_parish_id_user_id_active` | One ACTIVE membership per parish+user |

---

## 19. Historical Re-Link / Re-Assignment Design — PASS

**Correction applied from #001 audit:** permanent unique on `(student_id, guardian_user_id)` rejected.

Filtered unique on **ACTIVE status only** allows:

- ENDED guardian row + new ACTIVE row for same pair
- ENDED catechist assignment + new ACTIVE assignment
- ENDED parish membership + new ACTIVE membership
- Terminal enrollment + new ACTIVE enrollment (transfer)

Verified in integration tests.

---

## 20. Timestamp CHECK Constraints

| Table | Constraint | Rule |
|-------|------------|------|
| `student_guardians` | `CK_student_guardians_status_ends_at` | ACTIVE ↔ ends_at NULL; ENDED ↔ NOT NULL |
| `class_catechist_assignments` | `CK_class_catechist_assignments_status_ended_at` | Same pattern |
| `enrollments` | `CK_enrollments_status_left_at` | ACTIVE ↔ left_at NULL; terminal ↔ NOT NULL |
| `parish_memberships` | `CK_parish_memberships_status_ended_at` | Same pattern |

Verified in integration tests (reject ACTIVE with end timestamp set).

---

## 21. Index Strategy

Standard indexes per #001 plan — see migration file. No redundant overlap with filtered uniques beyond list/query indexes.

---

## 22. Module Export Audit — PASS

| Module | Exports |
|--------|---------|
| StudentModule | nothing |
| ClassModule | nothing |
| EnrollmentModule | nothing |
| ParishModule | ParishService only |

No TypeOrmModule or entity exports.

---

## 23–31. Integration Test Coverage — PASS

| Area | Tests |
|------|-------|
| Metadata | Table names, columns, no relations, nullable userId |
| UUID | v4 generation + explicit ID preservation |
| Students | Multiple null userId; duplicate userId rejected; invalid FK; Vietnamese fullName |
| Guardians | ACTIVE duplicate rejected; ENDED+ACTIVE allowed; multi-guardian; primary unique; CHECK |
| Classes | Code uniqueness per parish+year; cross year/parish allowed; invalid FK |
| Catechists | ACTIVE duplicate rejected; history+reassign; multi-class |
| Enrollments | One ACTIVE per year; transfer pattern; multi-year; CHECK |
| Parish memberships | ACTIVE duplicate rejected; history; multi-parish user |

---

## 32. Unicode Validation — PASS

Vietnamese student name `cls002-Nguyễn Văn An` round-trips in `nvarchar(128)`.

---

## 33. Privacy / Minor Data Audit — PASS

Students table stores only: `full_name`, optional `user_id`, `status`. No DOB, gender, contact, sacramental, or pastoral fields.

---

## 34. Existing Auth/Parish Regression — PASS

All prior unit tests, DB-free e2e, auth/parish/academic DB e2e pass after clean `test:db:prepare --reset`.

---

## 35–37. Migration Results

| Action | Result |
|--------|--------|
| Fresh DB reset + migrations (test) | **PASS** |
| Migration re-run (dev `catechism_api`) | **PASS** — migration #6 applied |
| `migration:show` | All 6 migrations `[X]` |

---

## 38. Docker Validation — PASS

```bash
wsl bash -c "cd '/mnt/c/Users/admin/Desktop/DỰ ÁN GIÁO LÝ VIÊN/Acutis Education' && docker build --target production -t catechism-api:class-schema ."
```

---

## 39. Module Boundary Matrix

| Module | Owns Tables | Public Export |
|--------|-------------|---------------|
| StudentModule | students, student_guardians | (none yet) |
| ClassModule | classes, class_catechist_assignments | (none yet) |
| EnrollmentModule | enrollments | (none yet) |
| ParishModule | parishes, parish_memberships | ParishService |

---

## 40. Commands Executed

```powershell
npm run format
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
$env:DB_NAME='catechism_api_test'
npm run test:db:prepare -- --reset
npm run quality:full
npm run migration:show
npm run migration:run  # dev DB (already applied)
wsl docker build ...
```

---

## 41. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** (44 suites, 197 tests) |
| DB-free e2e | **PASS** |
| build | **PASS** |
| quality | **PASS** |
| fresh DB reset | **PASS** |
| migrations | **PASS** |
| integration | **PASS** (11 suites incl. class-people-enrollment) |
| DB e2e | **PASS** |
| quality:full (one clean run) | **PASS** |
| Docker | **PASS** |
| required tables | **PASS** |
| UUID no DB defaults | **PASS** |
| FKs | **PASS** |
| filtered unique indexes | **PASS** |
| history after ENDED allowed | **PASS** |
| one ACTIVE enrollment invariant | **PASS** |
| guardian primary invariant | **PASS** |
| timestamp CHECK constraints | **PASS** |
| Vietnamese full_name | **PASS** |
| no cross-module ORM relation | **PASS** |
| no persistence exports (new modules) | **PASS** |
| prior phase regression | **PASS** |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

**Note:** Parallel integration runs may occasionally deadlock on `parish-academic-seed` when combined with parish-touching tests (MSSQL). Clean `test:db:prepare --reset` before `quality:full` recommended.

---

## 42. Known Issues / Deferred

| Item | Status |
|------|--------|
| Cross-parish class/year/level semantic validation | Deferred to #003 ClassService |
| Business services/APIs | Deferred #003–#005 |
| Scoped authorization | Deferred #006 |
| Domain seed | Deferred #007 |
| ASSISTANT catechist role | Enum value deferred; column supports future add |
| Student code / DOB | Deferred per #001 |

---

## 43. Out-of-Scope Confirmation

Not implemented: services, controllers, DTOs, new RBAC permissions, scope services, domain seed, FE changes, git commit.

---

## 44. CLASS #003 Readiness — READY

Recommend **CLASS #003 — Class Service + API + RBAC Foundations**:

- ClassService (create/list/get/update/status)
- Parish/Academic/Level validation via public APIs
- `classes.read` / `classes.manage` RBAC wiring
- ClassSnapshot + HTTP routes
- Tests

No Student/Guardian/Enrollment behavior in #003.

---

## 45. Prompt Count Status

| Item | Value |
|------|-------|
| This prompt | **#002/7 COMPLETE** |
| Remaining | **~5 prompts** (#003–#007) |

---

## 46. Commit Recommendation

```
feat(class): add student class enrollment schema
```

(Cursor did not execute git commands per project policy.)
