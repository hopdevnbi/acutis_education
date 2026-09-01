# CURRICULUM #003 — Curriculum + Topic Services + API + RBAC

> Status: **COMPLETE**
> Phase: **#003/6**
> Scope: CurriculumService, TopicService, HTTP controllers, RBAC seed, parish scope, tests
> Next prompt: **CURRICULUM #004** — Lesson + Learning Content + publish/clone/assignment (when prompted)

---

## 1. Objective

Implement application layer and HTTP API for curriculum root management and draft-version topic editing per CURRICULUM #001/#002 design:

- `CurriculumService` — create/get/list/update/status, draft version create/list/get, label update
- `TopicService` — create/list/get/update/reorder/delete (empty topics only)
- `CurriculumController`, `TopicController` under `/api/v1`
- RBAC permissions `curricula.read`, `curricula.manage`, `curricula.publish` in seed catalog
- Parish scope via `ParishScopeService` (manage/read-as-admin)
- Unit, integration, and DB e2e tests

No LessonService, LearningContentService, publish/clone commands, assignment API, learner delivery, or translation subsystem.

---

## 2. State Inherited From #002

| Item | State |
|------|-------|
| Schema | 6 curriculum tables + `lesson_contents` (migration #7) |
| CurriculumModule | Entities registered; skeleton only |
| LearningContentModule | Entity only; no services |
| Multilingual | `source_locale` on curriculum root; `content_hash` nullable |
| RBAC | No curriculum permissions in seed before #003 |

---

## 3. Rules Applied

- `PROJECT_RULES.md` §7 modular architecture, §22–§23 security/privacy
- `AGENTS.md`, `.cursor/rules/*.mdc`
- Module exports: `CurriculumService` only (TopicService internal to module)
- Cross-module access via public services (`ParishService`, `CatechismLevelService`, `ParishScopeService`)
- Auth dependency at controller/module wiring layer only
- Validated DTOs for all external input; snapshots at module boundary
- English source/API; no cross-module ORM relations

---

## 4. Files Created

| File | Purpose |
|------|---------|
| `src/modules/curriculum/services/curriculum.service.ts` | Curriculum + version business logic |
| `src/modules/curriculum/services/curriculum.service.spec.ts` | Unit tests |
| `src/modules/curriculum/services/topic.service.ts` | Topic CRUD/reorder/delete |
| `src/modules/curriculum/services/topic.service.spec.ts` | Unit tests |
| `src/modules/curriculum/controllers/curriculum.controller.ts` | Curriculum HTTP API |
| `src/modules/curriculum/controllers/topic.controller.ts` | Topic HTTP API |
| `src/modules/curriculum/errors/curriculum.errors.ts` | Curriculum domain errors |
| `src/modules/curriculum/errors/topic.errors.ts` | Topic domain errors |
| `src/modules/curriculum/interfaces/curriculum.interface.ts` | Input/snapshot contracts |
| `src/modules/curriculum/interfaces/topic.interface.ts` | Topic contracts |
| `src/modules/curriculum/mappers/curriculum.mapper.ts` | Entity → snapshot |
| `src/modules/curriculum/mappers/curriculum-response.mapper.ts` | Snapshot → DTO |
| `src/modules/curriculum/dto/*.ts` | 15 request/response/list DTOs |
| `src/modules/curriculum/utils/curriculum-code.util.ts` | Code normalization |
| `src/modules/curriculum/utils/curriculum-code.util.spec.ts` | Code util tests |
| `src/modules/curriculum/utils/curriculum-name.util.ts` | Name/description validation |
| `src/modules/curriculum/utils/curriculum-search.util.ts` | LIKE escape |
| `src/modules/curriculum/utils/curriculum-source-locale.util.ts` | BCP 47-like locale parsing |
| `src/modules/curriculum/utils/curriculum-source-locale.util.spec.ts` | Locale util tests |
| `src/modules/curriculum/utils/curriculum-http.util.ts` | Error → HTTP mapping |
| `src/modules/curriculum/utils/topic-code.util.ts` | Topic code normalization |
| `src/modules/curriculum/utils/topic-title.util.ts` | Title/description validation |
| `src/modules/curriculum/constants/curriculum-permissions.constants.ts` | Permission codes |
| `src/modules/curriculum/constants/curriculum-list.constants.ts` | Pagination/sort whitelist |
| `test/integration/curriculum.integration-spec.ts` | Service integration tests |
| `test/curriculum.db.e2e-spec.ts` | HTTP + RBAC e2e tests |

---

## 5. Files Modified

| File | Change |
|------|--------|
| `src/modules/curriculum/curriculum.module.ts` | Services, controllers, module imports, export CurriculumService |
| `src/database/seeds/auth-rbac.seed.constants.ts` | Add 3 curriculum permissions + role matrix |
| `src/modules/module-boundaries.spec.ts` | Assert CurriculumService-only export |
| `test/integration/curriculum.integration-spec.ts` | UUID normalize fix for MSSQL case |

---

## 6. CurriculumModule Architecture

```
CurriculumModule
├── TypeOrmModule.forFeature([CurriculumEntity, CurriculumVersionEntity, TopicEntity,
│                             LessonEntity, CurriculumAssignmentEntity])  (private)
├── ParishModule              → ParishService
├── AcademicStructureModule   → CatechismLevelService
├── AuthModule                (guard DI only)
├── AccessControlModule       (guard DI only)
├── CurriculumService         (exported)
├── TopicService              (internal)
├── CurriculumController
└── TopicController
```

`CurriculumService` and `TopicService` have no Auth/AccessControl imports.

---

## 7. Public Exports

| Export | Type |
|--------|------|
| `CurriculumService` | **Yes** |
| `TopicService` | No (internal) |
| `TypeOrmModule` | No |
| Entities | No |

Future modules (#004 publish/assignment, #005 learner delivery) consume `CurriculumService` public methods for parish/version resolution.

---

## 8. CurriculumService API (public methods)

| Method | Purpose |
|--------|---------|
| `createCurriculum(parishId, input)` | Create ACTIVE curriculum with sourceLocale |
| `getCurriculumById(curriculumId)` | Read snapshot |
| `listCurriculaByParish(parishId, input)` | Paginated list with filters |
| `updateCurriculum(curriculumId, input)` | Update metadata (sourceLocale guarded) |
| `updateCurriculumStatus(curriculumId, status)` | ACTIVE/INACTIVE toggle |
| `createDraftVersion(curriculumId, input)` | Create next DRAFT version (transaction + lock) |
| `listVersionsByCurriculum(curriculumId, input)` | List versions (optional status filter) |
| `getVersionById(versionId)` | Read version snapshot |
| `updateDraftVersionLabel(versionId, input)` | Update DRAFT label only |
| `getCurriculumParishId(curriculumId)` | Scope helper for controllers |
| `getVersionCurriculumParishId(versionId)` | Scope helper for controllers |

---

## 9. TopicService API (internal methods)

| Method | Purpose |
|--------|---------|
| `createTopic(versionId, input)` | Create topic in DRAFT version |
| `listTopicsByVersion(versionId)` | Ordered topic list |
| `getTopicById(topicId)` | Read snapshot |
| `updateTopic(topicId, input)` | Update code/title/description (DRAFT only) |
| `reorderTopics(versionId, input)` | Full reorder via topicIds array |
| `deleteTopic(topicId)` | Delete empty topic; compact sortOrder |
| `getTopicParishId(topicId)` | Scope helper for controllers |

TopicService uses `LessonEntity` repository count only to enforce delete-when-empty rule (same module, not cross-module).

---

## 10. Curriculum Lifecycle Rules

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Default on create; required for draft version creation |
| `INACTIVE` | Blocks new draft versions |

**Create preconditions:**

- Parish ACTIVE
- Catechism level belongs to parish; status ACTIVE
- Unique `(parishId, catechismLevelId, code)`
- Valid `sourceLocale` (BCP 47-like)

**sourceLocale mutability:**

- Allowed only when curriculum has no PUBLISHED version history
- Throws `CurriculumSourceLocaleImmutableError` otherwise

**Status update:** no transition matrix enforced in #003 (simple assignment); publish flow deferred to #004.

---

## 11. Version Lifecycle Rules

| Status | Meaning |
|--------|---------|
| `DRAFT` | Editable; one per curriculum (DB filtered unique index) |
| `PUBLISHED` | Immutable content; set by #004 publish |
| `ARCHIVED` | Historical; set by #004 |

**createDraftVersion:**

- Pessimistic write lock on curriculum row
- Rejects if DRAFT already exists (`CurriculumDraftAlreadyExistsError`)
- Auto-increments `versionNumber`
- Records `createdByUserId`

**updateDraftVersionLabel:** DRAFT only; published/archived rejected.

---

## 12. Topic Rules

| Rule | Behavior |
|------|----------|
| Draft-only mutations | create/update/reorder/delete require DRAFT version + ACTIVE curriculum |
| sortOrder | Auto-assigned (max+1) or explicit on create; reorder via dedicated endpoint |
| PATCH topic | No sortOrder field — use reorder endpoint |
| Delete | Only when zero lessons; reindexes remaining topics 0..n-1 |
| Code uniqueness | Per version when code not null |

---

## 13. sourceLocale Validation

Utility: `parseSourceLocale()` in `curriculum-source-locale.util.ts`

- BCP 47-like pattern: `vi-VN`, `en`, `fr-FR`, optional subtags
- Normalizes language lower, region upper (2-letter)
- Max length 32
- Validated on create and update (when mutable)

---

## 14. HTTP API — Curriculum

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/parishes/:parishId/curricula` | `curricula.manage` |
| `GET` | `/api/v1/parishes/:parishId/curricula` | `curricula.read` |
| `GET` | `/api/v1/curricula/:id` | `curricula.read` |
| `PATCH` | `/api/v1/curricula/:id` | `curricula.manage` |
| `PATCH` | `/api/v1/curricula/:id/status` | `curricula.manage` |
| `POST` | `/api/v1/curricula/:id/versions` | `curricula.manage` |
| `GET` | `/api/v1/curricula/:id/versions` | `curricula.read` |
| `GET` | `/api/v1/curriculum-versions/:id` | `curricula.read` |
| `PATCH` | `/api/v1/curriculum-versions/:id` | `curricula.manage` |

List query filters: `catechismLevelId`, `status`, `sourceLocale`, `search`, pagination, sort (`code`, `name`, `status`, `sourceLocale`, `createdAt`).

Version list filter: `status`.

---

## 15. HTTP API — Topics

| Method | Route | Permission |
|--------|-------|------------|
| `POST` | `/api/v1/curriculum-versions/:versionId/topics` | `curricula.manage` |
| `GET` | `/api/v1/curriculum-versions/:versionId/topics` | `curricula.read` |
| `PATCH` | `/api/v1/curriculum-versions/:versionId/topics/reorder` | `curricula.manage` |
| `GET` | `/api/v1/topics/:id` | `curricula.read` |
| `PATCH` | `/api/v1/topics/:id` | `curricula.manage` |
| `DELETE` | `/api/v1/topics/:id` | `curricula.manage` |

---

## 16. RBAC Seed Changes

Added to `AUTH_RBAC_SEED_PERMISSIONS`:

| Permission | Description |
|------------|-------------|
| `curricula.read` | Read curriculum records |
| `curricula.manage` | Manage curriculum records |
| `curricula.publish` | Publish curriculum versions (#004) |

**Role matrix:**

| Role | Permissions |
|------|-------------|
| `SUPER_ADMIN` | read, manage, publish |
| `PARISH_ADMIN` | read, manage, publish |
| `CATECHIST` | read only |
| `PARENT` | none (learner delivery deferred #005) |

`curricula.publish` seeded but **not wired to controllers** in #003 — reserved for #004 publish endpoint.

`auth-rbac-seed.integration-spec.ts` uses dynamic `AUTH_RBAC_SEED_PERMISSIONS.length` — no hardcoded count update required.

---

## 17. Parish Scope

Controllers call `ParishScopeService` after loading parishId from service:

| Operation | Scope check |
|-----------|-------------|
| Create/list by parish | `assertCanManageParish` / `assertCanReadParishAsAdmin` |
| Get/update by curriculum/version/topic id | Resolve parishId via service, then scope check |

CATECHIST with `curricula.read` must have parish membership for read-as-admin paths.

---

## 18. Cross-Module Dependencies

| Direction | Via | Notes |
|-----------|-----|-------|
| CurriculumModule → ParishModule | `ParishService.assertParishActive` | No entity import |
| CurriculumModule → AcademicStructureModule | `CatechismLevelService.assertCatechismLevelBelongsToParish` | Existing public method |
| CurriculumModule → ParishModule | `ParishScopeService` | Controller layer only |
| Future #004 → CurriculumModule | `CurriculumService` export | IDs + snapshots only |

No imports from LearningContentModule, ClassModule, or EnrollmentModule.

---

## 19. Error Mapping

Domain errors mapped via `rethrowCurriculumServiceError()` / topic errors included:

| Error | HTTP |
|-------|------|
| Not found | 404 |
| Duplicate code | 409 |
| Draft already exists | 409 |
| Version not draft | 409 |
| Topic not empty | 409 |
| Source locale immutable | 409 |
| Invalid reorder | 400 |
| Invalid locale/id | 400 |

---

## 20. DTO Validation Highlights

- Curriculum code: normalized lowercase kebab pattern
- Topic code: optional; normalized when present
- Reorder: non-empty UUID v4 array; must match exact topic set
- Empty PATCH body rejected at controller (400)
- Pagination/sort whitelisted via constants

---

## 21. Bug Fixes During Validation

**MSSQL UUID case mismatch** — integration test compared raw topic id from DB (uppercase) against service snapshot (lowercase). Fixed with `normalizeUuid()` in `curriculum.integration-spec.ts`.

**ESLint unbound-method** — `topic.service.spec.ts` used direct reference to `entityManager.delete`. Fixed with explicit `deleteMock` variable.

---

## 22. Unit Tests

| Suite | Coverage |
|-------|----------|
| `curriculum.service.spec.ts` | Create, update, sourceLocale immutability, draft version, duplicate draft, list filters |
| `topic.service.spec.ts` | Create, reorder, delete empty/non-empty, draft guard, duplicate code |
| `curriculum-code.util.spec.ts` | Code normalization |
| `curriculum-source-locale.util.spec.ts` | Locale parsing/normalization |

**Result:** 271 unit tests PASS (58 suites).

---

## 23. Integration Tests

`test/integration/curriculum.integration-spec.ts` — 7 tests:

- Create curriculum with sourceLocale
- Duplicate curriculum code rejection
- Create draft version
- Duplicate draft rejection
- Create/list/reorder/delete topics in draft
- sourceLocale immutability after publish marker simulation
- Inactive catechism level rejection

**Result:** PASS (7/7) after UUID normalize fix.

---

## 24. DB E2E Tests

`test/curriculum.db.e2e-spec.ts` — 7 tests:

- 401 unauthenticated
- 403 without permission
- Full manage flow (create curriculum → draft → topics)
- Read-only user blocked from mutations
- Cross-parish scope denial
- Duplicate curriculum code 409
- Invalid sourceLocale 400

**Result:** PASS (7/7).

---

## 25. Module Boundary Test

`module-boundaries.spec.ts` — `CurriculumModule` exports `CurriculumService` only.

**Result:** PASS.

---

## 26. Security / Privacy Audit

- No child PII in curriculum/topic fields
- Server-side RBAC + parish scope on every route
- No lesson/content body exposure (lessons not implemented)
- Author IDs stored as scalar user FKs; not returned in list DTOs beyond version metadata
- No logging of tokens or sensitive content
- Topic delete blocked when lessons exist (prevents orphan cascade issues before #004)

---

## 27. Multilingual Readiness (#003 delta)

| Check | Status |
|-------|--------|
| `sourceLocale` validated at service layer | ✅ |
| Locale filter on list API | ✅ |
| Immutable after publish history | ✅ |
| No translation tables/API | ✅ (deferred) |
| Content hash population | Deferred #004 |

---

## 28. LearningContentModule Status

Unchanged from #002 — entity registered, no service/controller. TopicService counts lessons via same-module `LessonEntity` repo only.

---

## 29. Commands Executed

```powershell
npm run format
npm run lint
npm run typecheck
npm test
npm run quality
npx jest --config ./test/jest-integration.json test/integration/curriculum.integration-spec.ts
npx jest --config ./test/jest-integration.json --runInBand
npx jest --config ./test/jest-db-e2e.json test/curriculum.db.e2e-spec.ts
npm run build
npm run quality:full
```

---

## 30. Validation Results (Explicit PASS/FAIL)

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** (271) |
| build | **PASS** |
| curriculum.integration-spec | **PASS** (7/7) |
| integration (`--runInBand`) | **PASS** (118) |
| curriculum.db.e2e-spec | **PASS** (7/7) |
| quality (non-full) | **PASS** |
| quality:full (parallel) | **FLAKE** (pre-existing shared MSSQL / seed race) |
| Docker `catechism-api:curriculum-api` | **SKIP** (docker CLI unavailable on Windows host; use WSL per #002) |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

---

## 31. quality:full Flake Note

Parallel integration suites share `catechism_api_test` and can race on RBAC seed inserts, parish fixtures, or deadlock on academic year locks. Pre-existing CLASS phase debt; curriculum-specific suites pass in isolation and in sequential `--runInBand` runs.

---

## 32. Local Dev

```bash
npm run migration:run          # migration #7 if not applied
npm run seed:auth-rbac         # ensures curricula.* permissions
npm run start:dev
```

Swagger: `/api/docs` — tags `curricula`, `curriculum-topics`.

---

## 33. Out-of-Scope Confirmation

Not implemented (per prompt):

- `LessonService`, `LearningContentService`
- Publish, archive, clone version commands
- `curricula.publish` controller wiring
- Curriculum assignment API
- Learner/catechist scoped content delivery
- Translation/localization subsystem
- Curriculum domain seed
- FE/Mobile changes
- Git commit/push

---

## 34. CURRICULUM #004 Readiness

**READY** — no unresolved BLOCKER/HIGH.

#004 scope: Lesson CRUD, JSON content blocks, content hash, publish/clone/archive flows, assignment binding, wire `curricula.publish`.

---

## 35. Prompt Count Status

| Item | Value |
|------|-------|
| This prompt | **#003/6 COMPLETE** |
| Remaining | **3 prompts** (#004–#006) |

---

## 36. Commit Recommendation

Do **not** run git commands. Suggested message:

```
git commit -m "feat(curriculum): add curriculum topic APIs"
```

---

## Summary

| Question | Answer |
|----------|--------|
| Curriculum + Topic services/API | **PASS** |
| RBAC seed (3 permissions) | **PASS** |
| Parish scope | **PASS** |
| Module boundary (CurriculumService export) | **PASS** |
| Tests (unit + integration + e2e) | **PASS** |
| quality:full (parallel) | **FLAKE** (pre-existing) |
| BLOCKER / HIGH | **0 / 0** |
| #004 ready | **YES** |
