# CURRICULUM #002 — Schema + Entities + Migrations (Multilingual-Ready)

> Status: **COMPLETE**
> Phase: **#002/6**
> Scope: CurriculumModule + LearningContentModule skeletons, entities, enums, migration, tests
> Next prompt: **CURRICULUM #003** — Curriculum + Topic Services/API/RBAC (when prompted)

---

## 1. Objective

Implement persistence foundation for Curriculum + Topic + Lesson + Learning Content per CURRICULUM #001 design, with multilingual-ready source schema:

- `CurriculumModule` + `LearningContentModule` skeletons (no services/controllers)
- Six entities with application UUID v4
- Status enums
- One cohesive migration with FKs, indexes, filtered unique constraints, CHECK constraints
- Entity metadata, UUID, module boundary, and DB integration tests
- `source_locale` on curriculum root; nullable `content_hash` on lesson content

No business logic, HTTP, RBAC permissions, seeds, or translation subsystem.

---

## 2. State Inherited From #001

| Decision | Value |
|----------|-------|
| Module split | `CurriculumModule` + `LearningContentModule` |
| Curriculum root | `parishId` + `catechismLevelId` (no `academicYearId`) |
| Year binding | `curriculum_assignments` triple → published version |
| Versioning | DRAFT / PUBLISHED / ARCHIVED |
| Lesson identity | Version-scoped rows + `canonical_lesson_key` |
| Content | JSON in `content_json`; no HTML column |
| Class link | Resolve via assignment triple — no class FK |

---

## 3. Multilingual Roadmap Delta From #001

CURRICULUM #001 deferred locale fields. #002 adds:

| Field | Owner | Purpose |
|-------|-------|---------|
| `curriculums.source_locale` | Curriculum root | BCP 47 canonical language for entire lineage (e.g. `vi-VN`, `fr-FR`) |
| `lesson_contents.content_hash` | LearningContentModule | SHA-256 hex (nullable until #004 service populates) for translation stale detection |

**Not added:** translation tables, LocalizationModule, glossary, Google Cloud Translation — dedicated future phase.

**Placement decision:** `source_locale` on **curriculum root** (not version) — all versions of a curriculum share source language unless product later requires version-level override.

---

## 4. Rules Applied

- `PROJECT_RULES.md` §7 modular architecture, §22–§23 security/privacy
- `AGENTS.md`, `.cursor/rules/*.mdc`
- Scalar IDs only; no cross-module ORM relations
- UUID v4 application-generated; no DB defaults
- English status codes; `nvarchar` for human-readable text
- Migration-driven schema; no synchronize

---

## 5. CRLF / Format Debt Audit

Pre-existing CLASS #007A CRLF drift on 6 files was **normalized** via `npm run format` (formatting only, no logic changes):

| File | Change |
|------|--------|
| `src/modules/enrollment/class-domain-scope.module.ts` | LF normalization |
| `test/class-domain-scope.module.ts` | LF normalization |
| `test/class.db.e2e-spec.ts` | LF + Prettier wrap |
| `test/enrollment.db.e2e-spec.ts` | LF + Prettier wrap |
| `test/scoped-e2e-fixture.ts` | LF normalization |
| `test/student.db.e2e-spec.ts` | LF + Prettier wrap |

**Result:** `format:check` PASS, `lint` PASS.

---

## 6. Files Created

| File | Purpose |
|------|---------|
| `src/modules/curriculum/curriculum.module.ts` | Module skeleton |
| `src/modules/curriculum/enums/curriculum-status.enum.ts` | ACTIVE / INACTIVE |
| `src/modules/curriculum/enums/curriculum-version-status.enum.ts` | DRAFT / PUBLISHED / ARCHIVED |
| `src/modules/curriculum/entities/curriculum.entity.ts` | Root curriculum |
| `src/modules/curriculum/entities/curriculum-version.entity.ts` | Version snapshots |
| `src/modules/curriculum/entities/topic.entity.ts` | Topic rows |
| `src/modules/curriculum/entities/lesson.entity.ts` | Lesson rows + canonical key |
| `src/modules/curriculum/entities/curriculum-assignment.entity.ts` | Year delivery binding |
| `src/modules/learning-content/learning-content.module.ts` | Module skeleton |
| `src/modules/learning-content/entities/lesson-content.entity.ts` | JSON content body |
| `src/database/migrations/1788063100000-create-curriculum-learning-content-schema.ts` | Migration #7 |
| `src/database/curriculum-learning-content.entities.spec.ts` | Metadata tests |
| `src/database/curriculum-learning-content-uuid-generation.spec.ts` | UUID tests |
| `test/integration/curriculum-learning-content.integration-spec.ts` | DB constraint tests |

---

## 7. Files Modified

| File | Change |
|------|--------|
| `src/app.module.ts` | Register `CurriculumModule`, `LearningContentModule` |
| `src/modules/module-boundaries.spec.ts` | Assert zero exports from new modules |
| 6 CRLF files (see §5) | Format-only normalization |

---

## 8. CurriculumModule Skeleton

- `TypeOrmModule.forFeature` registers 5 entities
- No providers, controllers, or exports

---

## 9. LearningContentModule Skeleton

- `TypeOrmModule.forFeature([LessonContentEntity])`
- No providers, controllers, or exports
- No import of `CurriculumModule` at #002 (deferred to #003/#004 public contract)

---

## 10. CurriculumEntity

Table `curriculums`: `id`, `parishId`, `catechismLevelId`, `code`, `name`, `description`, `status`, `sourceLocale`, `currentPublishedVersionId`, timestamps.

Unique: `(parishId, catechismLevelId, code)`.

---

## 11. sourceLocale Ownership Decision

**Owner:** `CurriculumEntity.sourceLocale` (required `varchar(32)`).

- BCP 47 ASCII codes (e.g. `vi-VN`, `en-US`, `fr-FR`)
- No DB default — application sets explicitly on create (#003)
- Topic/lesson text inherits source locale from curriculum lineage
- No version-level locale duplication at #002

---

## 12. CurriculumVersionEntity

Table `curriculum_versions`: `curriculumId`, `versionNumber`, `status`, `label`, `publishedAt`, `publishedByUserId`, `createdByUserId`, timestamps.

---

## 13. TopicEntity

Table `topics`: `curriculumVersionId`, optional `code`, `title`, `description`, `sortOrder`, timestamps.

No locale column — inherits from curriculum root.

---

## 14. LessonEntity

Table `lessons`: `curriculumVersionId`, `topicId`, `canonicalLessonKey`, optional `code`, `title`, `summary`, `sortOrder`, `estimatedDurationMinutes`, timestamps.

---

## 15. canonicalLessonKey Strategy

- `uniqueidentifier NOT NULL`, application UUID v4 default on entity
- **Not** globally unique — same key intentionally appears across version clones
- Index `IX_lessons_canonical_lesson_key` for future progress lookups
- Clone service (#004) must preserve explicit key assignment

---

## 16. LessonContentEntity

Table `lesson_contents`: `lessonId`, `contentSchemaVersion`, `contentJson`, `contentHash`, timestamps.

One row per lesson (unique `lessonId`).

---

## 17. contentHash Strategy

- Column `content_hash varchar(64) NULL`
- Intended for SHA-256 hex from #004 content service
- Nullable at #002 — schema ready; population deferred to #004

---

## 18. CurriculumAssignmentEntity

Table `curriculum_assignments`: delivery triple + `curriculumVersionId`, `assignedByUserId`, `assignedAt`, timestamps.

No `class_id`. One row per `(parishId, academicYearId, catechismLevelId)`.

---

## 19. Enums

| Enum | Values |
|------|--------|
| `CurriculumStatus` | ACTIVE, INACTIVE |
| `CurriculumVersionStatus` | DRAFT, PUBLISHED, ARCHIVED |

Language-neutral English codes in DB.

---

## 20. UUID Strategy

All PKs and `canonicalLessonKey`: application `generateUuidV4()`, no `@GeneratedColumn`, no DB `NEWID()`/`NEWSEQUENTIALID()`.

Verified in metadata + integration tests.

---

## 21. Migration

**File:** `1788063100000-create-curriculum-learning-content-schema.ts`

**Order:**
1. `curriculums` (without circular FK)
2. `curriculum_versions`
3. FK `curriculums.current_published_version_id`
4. `topics`
5. `lessons`
6. `lesson_contents`
7. `curriculum_assignments`

---

## 22. FK Strategy

All `ON DELETE NO ACTION`. FKs to `parishes`, `catechism_levels`, `academic_years`, `users`, internal curriculum tables.

No FK to `classes`.

---

## 23. Cross-Module ORM Audit

**0** `@ManyToOne` / `@OneToMany` / `@JoinColumn` on new entities.

Scalar IDs only; no imports of `ParishEntity`, `UserEntity`, etc.

---

## 24. Filtered Unique Indexes

| Index | Rule |
|-------|------|
| `UQ_curriculum_versions_curriculum_id_draft` | One DRAFT per curriculum |
| `UQ_topics_curriculum_version_id_code` | Unique code per version when not null |
| `UQ_lessons_topic_id_code` | Unique code per topic when not null |

---

## 25. Assignment Uniqueness

`UQ_curriculum_assignments_parish_year_level` on `(parish_id, academic_year_id, catechism_level_id)`.

Assignment history table deferred — row update replaces current pointer (#004 policy).

---

## 26. CHECK Constraints

| Constraint | Rule |
|------------|------|
| `CK_curriculum_versions_version_number_positive` | `version_number > 0` |
| `CK_curriculum_versions_published_at_status` | DRAFT → `published_at` NULL; PUBLISHED/ARCHIVED → NOT NULL |
| `CK_topics_sort_order_nonnegative` | `sort_order >= 0` |
| `CK_lessons_sort_order_nonnegative` | `sort_order >= 0` |
| `CK_lessons_estimated_duration_minutes_range` | NULL or 1–1440 |
| `CK_lesson_contents_content_schema_version_positive` | `content_schema_version > 0` |
| `CK_lesson_contents_content_json_is_json` | `ISJSON(content_json) = 1` |

---

## 27. Index Strategy

Per design: parish+level, version status, topic/lesson sort, canonical key, assignment triple, lesson content lesson_id.

---

## 28. Module Export Audit

| Module | Exports |
|--------|---------|
| `CurriculumModule` | **none** |
| `LearningContentModule` | **none** |

No `TypeOrmModule` export.

---

## 29. Metadata Tests

`curriculum-learning-content.entities.spec.ts` — table names, columns, nullable flags, relation count 0, multilingual readiness.

---

## 30. UUID Tests

`curriculum-learning-content-uuid-generation.spec.ts` — v4 generation, explicit ID preservation, canonical key preservation.

---

## 31. Migration Integration Tests

`test/integration/curriculum-learning-content.integration-spec.ts` — 12 tests: tables, UUID defaults, source_locale, content_hash, uniqueness, DRAFT invariant, canonical key reuse, JSON/Unicode, assignment triple, CHECK violations.

**Result:** PASS (isolated and in `--runInBand` full integration run).

---

## 32–37. Constraint Test Coverage

| Area | Covered |
|------|---------|
| Curriculum code uniqueness | ✅ |
| sourceLocale persistence + Unicode | ✅ |
| Version DRAFT unique / multiple PUBLISHED | ✅ |
| canonicalLessonKey cross-version | ✅ |
| Content JSON + hash | ✅ |
| Assignment triple unique | ✅ |
| Sort order / duration CHECK | ✅ |

---

## 38. Unicode Validation

- Vietnamese: `Giáo lý Khai Tâm — École`, `Chủ đề Thánh Thể`, JSON `Giáo lý — été`
- French accents in level name: `Niveau Débutant`
- `nvarchar` columns verified via successful round-trip inserts

---

## 39. Multilingual Readiness Audit

| Check | Status |
|-------|--------|
| `source_locale` on curriculum root | ✅ |
| Locale independent from country enum | ✅ |
| No translation tables | ✅ |
| Stable IDs for future translation refs | ✅ |
| `content_hash` for stale detection | ✅ (nullable) |
| English status codes | ✅ |

---

## 40. Security / Privacy Audit

- No child PII fields added
- No HTML storage; JSON syntax only at DB layer
- Author IDs as scalar user FKs
- No cross-module repository exposure
- No pastoral/confessional columns

---

## 41. Existing Regression

Unit (250), DB-free e2e (5), build, Docker — PASS.

Prior class-domain tests unaffected by curriculum schema addition.

---

## 42. Fresh DB Migration Result

`npm run test:db:prepare -- --reset` + `npm run test:db:migrations` — migration #7 applies cleanly.

`npm run migration:show` — 7 migrations, all applied on dev DB.

---

## 43. quality:full Result

| Segment | Result | Notes |
|---------|--------|-------|
| format / lint / typecheck / unit / build | **PASS** | 54 suites, 251 tests |
| test:e2e (DB-free) | **PASS** | |
| test:integration (parallel default) | **FLAKE** | Shared MSSQL state / deadlock — pre-existing CLASS phase pattern |
| test:integration (`--runInBand`) | **PASS** | 17 suites, 111 tests |
| test:e2e:db (prepare + migrations + runInBand) | **PASS** | 11 suites, 44 tests |
| Full `quality:full` one-shot | **FLAKE** | Parallel integration race; not curriculum-specific |

---

## 44. Docker Validation

```
wsl docker build --target production -t catechism-api:curriculum-schema .
```

**PASS**

---

## 45. Module Boundary Matrix

```
CurriculumModule     → (no exports, no cross-module imports)
LearningContentModule → (no exports, no cross-module imports)
AppModule            → imports both after EnrollmentModule
```

Dependency direction preserved for #003: LearningContent → Curriculum via public API only.

---

## 46. Future Localization Compatibility

- Translation rows can reference stable `curriculum_id`, `curriculum_version_id`, `lesson_id`, `content_hash`
- `source_locale` enables locale-aware delivery without schema migration
- No premature translation/job/glossary tables

---

## 47. Future Microservice Extraction Review

| Service | Tables |
|---------|--------|
| Curriculum Service | curriculums, versions, topics, lessons, assignments |
| Content Service | lesson_contents |

FKs become scalar validation at service boundaries.

---

## 48. Commands Executed

```powershell
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm audit --audit-level=moderate
npm run test:db:prepare -- --reset
npm run test:db:migrations
npm run test:integration
npx jest --config ./test/jest-integration.json --runInBand
npm run test:e2e:db
npx jest --config ./test/jest-db-e2e.json --runInBand
npm run migration:show
wsl docker build --target production -t catechism-api:curriculum-schema .
```

---

## 49. Validation Results (Explicit PASS/FAIL)

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** (251) |
| DB-free e2e | **PASS** (5) |
| build | **PASS** |
| audit (moderate) | **PASS** (0 vulnerabilities) |
| fresh DB reset | **PASS** |
| migrations | **PASS** (#7) |
| integration (sequential) | **PASS** (111) |
| DB e2e (with migrations) | **PASS** (44) |
| quality:full (parallel) | **FLAKE** (pre-existing) |
| Docker | **PASS** |
| required tables | **PASS** |
| UUID no DB defaults | **PASS** |
| canonicalLessonKey behavior | **PASS** |
| sourceLocale present | **PASS** |
| contentHash present | **PASS** |
| FKs | **PASS** |
| one DRAFT invariant | **PASS** |
| one assignment per triple | **PASS** |
| one content per lesson | **PASS** |
| JSON ISJSON CHECK | **PASS** |
| Unicode Vietnamese + French | **PASS** |
| no cross-module ORM | **PASS** |
| no persistence exports | **PASS** |
| no translation subsystem | **PASS** |
| prior regression | **PASS** |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

---

## 50. Known Issues / Deferred

| Item | Target |
|------|--------|
| `content_hash` population | CURRICULUM #004 |
| BCP 47 validation service | CURRICULUM #003 |
| Lesson/version consistency (topic version match) | Service #003/#004 |
| Assignment history | Future |
| Translation tables | Localization phase |
| `quality:full` parallel flake | #006 final gate |
| RBAC permissions | #003 |

---

## 51. Out-of-Scope Confirmation

Not implemented (per prompt):

- CurriculumService, TopicService, LessonService, LearningContentService
- Controllers, HTTP routes, Swagger
- RBAC seed changes
- Publish/clone commands
- Scope services
- LocalizationModule / translation provider
- Domain seed, Postman
- FE/Mobile changes
- Git commit/push

---

## 52. CURRICULUM #003 Readiness

**READY** — no unresolved BLOCKER/HIGH.

#003 scope: `CurriculumService`, curriculum root CRUD, version create/list, Topic CRUD/reorder on DRAFT, parish/level validation, `curricula.read/manage/publish` permissions, snapshots, Swagger, tests.

---

## 53. Prompt Count Status

| Item | Value |
|------|-------|
| This prompt | **#002/6 COMPLETE** |
| Remaining | **4 prompts** (#003–#006) |

---

## 54. Commit Recommendation

Do **not** run git commands. Suggested message:

```
git commit -m "feat(curriculum): add versioned curriculum schema"
```

---

## Summary

| Question | Answer |
|----------|--------|
| Schema/migrations | **PASS** |
| Multilingual foundation | **PASS** (`source_locale` + `content_hash`) |
| Module boundary | **PASS** (zero exports) |
| quality:full (parallel) | **FLAKE** (pre-existing shared DB) |
| BLOCKER / HIGH | **0 / 0** |
| #003 ready | **YES** |
