# CMS Module — Content CRUD + Publishing Lifecycle + Public / Scoped Reads (#003/7)

**Execution Mode:** Fast Implementation Mode (`.cursor/rules/04-fast-implementation-mode.mdc`)  
**Timestamp:** September 5, 2026  
**Module:** `src/modules/cms/`  
**Phase:** CMS + ANNOUNCEMENT + EVENTS + NOTIFICATIONS #003/7  

---

## 1. Objective

Implement complete CMS MVP functionality covering:
1. CMS admin create & update operations with lifecycle-aware immutability rules.
2. Complete lifecycle state engine (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`).
3. Immediate publication and scheduled publication mechanisms.
4. Archiving behavior without exposing a hard-delete endpoint.
5. Anonymous public reads for `GLOBAL` published content.
6. Authenticated scoped reads for `GLOBAL` + user-eligible `PARISH` content.
7. Deterministic slug routing and conflict prevention.
8. Filters, pagination, and sorting for content listings.
9. Editorial featured content handling.
10. Directly authored locale storage and filtering without runtime `LocalizationModule` coupling.
11. Public DTO data minimization (excluding body from list views, omitting audit fields).
12. Resolving the admin read contract gap by introducing dedicated admin list and detail routes.
13. Comprehensive unit, integration, and DB E2E test suites (written, execution deferred).
14. Complete OpenAPI documentation and README updates.

---

## 2. Fast Implementation Mode

In strict accordance with `.cursor/rules/04-fast-implementation-mode.mdc`:
- **Implementation Status:** COMPLETE. All requested production controllers, services, guards, decorators, DTOs, mappers, lifecycle utilities, CLI runners, and test files have been written.
- **Validation Status:** DEFERRED. No automated test suites (`jest`, `npm test`), linters, builds, typechecks, database migrations, seed scripts, Docker commands, or scheduled runners were executed.
- **Readiness Gate:** Verified via comprehensive static code inspection. Architecture, security, privacy, modular boundaries, and data minimization gates are strictly enforced.

---

## 3. State Inherited

Inherited from #002/7 Persistence Foundation:
- `cms_entries` table established with composite uniqueness on `(scope_key, slug)`.
- Enums: `CmsEntryType` (`PAGE`, `ARTICLE`, `NEWS`), `CmsScopeType` (`GLOBAL`, `PARISH`), `CmsEntryStatus` (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`).
- RBAC permissions registered in `src/database/seeds/auth-rbac.seed.constants.ts`: `cms.read`, `cms.manage`.
- `CmsModule` shell importing `ParishModule` and `AccessControlModule`, exporting `CmsService` only.

---

## 4. Files Created

1. `src/modules/cms/dto/cms-entry.dto.ts` — Admin create/update, public list/detail query & response, admin list/detail DTOs with validation pipes.
2. `src/modules/cms/mappers/cms-http.mapper.ts` — DTO mappers ensuring public data minimization and full admin serialization.
3. `src/modules/cms/utils/cms-http.util.ts` — HTTP error rethrow mapping domain errors to standard NestJS exceptions.
4. `src/modules/cms/utils/cms-lifecycle.util.ts` — Lifecycle transition validator, date schedule checker, and field editability assertion helper.
5. `src/modules/cms/guards/optional-jwt-auth.guard.ts` — Guard that permits anonymous requests while validating Bearer tokens if supplied.
6. `src/modules/cms/decorators/optional-current-user.decorator.ts` — Parameter decorator returning `AuthenticatedUser | null`.
7. `src/modules/cms/controllers/cms-entries.controller.ts` — Public reads (`GET /cms/entries`, `GET /cms/entries/:slug`) and administrative lifecycle mutations (`POST`, `PATCH`, `publish`, `archive`).
8. `src/modules/cms/controllers/cms-admin-entries.controller.ts` — Administrative reads (`GET /admin/cms/entries`, `GET /admin/cms/entries/:id`).
9. `scripts/process-scheduled-cms-publications.ts` — Standalone CLI script for processing scheduled publications.
10. `scripts/process-scheduled-cms-publications.module.ts` — Nest application context module for scheduled CLI runner.
11. `src/modules/cms/utils/cms-lifecycle.util.spec.ts` — Unit tests for lifecycle transitions, schedule validations, and editable field rules.
12. `src/modules/cms/access/cms-access.service.spec.ts` — Unit tests for role/scope enforcement.
13. `src/modules/cms/mappers/cms-http.mapper.spec.ts` — Unit tests verifying public data minimization.
14. `src/modules/cms/services/cms-entry.service.spec.ts` — Unit tests for persistence CRUD, publishing, archiving, and scheduled processing.
15. `src/modules/cms/controllers/cms-entries.controller.spec.ts` — Unit tests for public controller endpoints.
16. `src/modules/cms/controllers/cms-admin-entries.controller.spec.ts` — Unit tests for admin controller endpoints.
17. `test/integration/cms.integration-spec.ts` — Integration test suite covering 16 persistence and lifecycle scenarios.
18. `test/e2e/cms-db.e2e-spec.ts` — End-to-end database test suite verifying role scopes, public reads, and validations.

---

## 5. Files Modified

1. `src/modules/cms/errors/cms.errors.ts` — Added `CmsEntryNotEditableError`, `InvalidCmsLifecycleTransitionError`, `InvalidCmsScheduleError`, `InvalidCmsSlugError`, `CmsScopeAccessDeniedError`.
2. `src/modules/cms/utils/cms-key.util.ts` — Added slug regex validation (`CMS_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/`, max length 160) and `assertValidCmsSlug`.
3. `src/modules/cms/interfaces/cms.interfaces.ts` — Added query filters, paginated result, and scheduled publish result interfaces.
4. `src/modules/cms/access/cms-access.service.ts` — Added `assertCanManageEntry`, `listVisibleParishIds`, and `assertCanReadParishCms`.
5. `src/modules/cms/services/cms-entry.service.ts` — Implemented query builders for public and admin reads, lifecycle checks, and batch scheduled publication.
6. `src/modules/cms/cms.service.ts` — Public facade forwarding all orchestration calls to `CmsEntryService`.
7. `src/modules/cms/cms.module.ts` — Registered `AuthModule`, new controllers (`CmsEntriesController`, `CmsAdminEntriesController`), and `OptionalJwtAuthGuard`.
8. `package.json` — Registered `"cms:publish-scheduled"` script.
9. `README.md` — Added `CMS API (Editorial Content & Publishing — #003/7)` section detailing scopes, lifecycle, routes, and boundaries.

---

## 6. CMS Lifecycle

The CMS state machine enforces four explicit states:

```
  [ DRAFT ] ───────────┬───────────> [ PUBLISHED ] ─────────> [ ARCHIVED ] (Terminal)
      │                │                   ▲                      ▲
      │                │ (publish action)  │                      │
      ▼                │                   │                      │
 [ SCHEDULED ] ────────┴───────────────────┘                      │
      │   ▲                                                       │
      │   │ (unschedule / reschedule)                             │
      └───┴───────────────────────────────────────────────────────┘
```

- `DRAFT`: Default initial state. Can transition to `PUBLISHED` (via publish action), `SCHEDULED` (when future `scheduledFor` date is provided), or `ARCHIVED`.
- `SCHEDULED`: Waiting for scheduled timestamp. Transitions to `PUBLISHED` when `scheduledFor <= now` via scheduled publication processor or manual early publish action. Can revert to `DRAFT` if user unschedules (`scheduledFor: null`). Can transition to `ARCHIVED`.
- `PUBLISHED`: Content is publicly visible. Immutable URL semantics (slug, scope, type cannot be altered). Transitions to `ARCHIVED` via archive action. Reverting to `DRAFT` or `SCHEDULED` is strictly forbidden (409 Conflict).
- `ARCHIVED`: Terminal state. Content is hidden from public feeds and is read-only. Further mutations or republishing attempts throw 409 Conflict.

---

## 7. Create Contract

- **Endpoint:** `POST /api/v1/cms/entries`
- **Guards:** `JwtAuthGuard`, `PermissionGuard`
- **Permission:** `cms.manage`
- **Input:**
  - `type`: `PAGE` | `ARTICLE` | `NEWS` (required)
  - `scopeType`: `GLOBAL` | `PARISH` (required)
  - `parishId`: UUID string (required if `PARISH`, forbidden if `GLOBAL`)
  - `slug`: kebab string matching `^[a-z0-9]+(?:-[a-z0-9]+)*$` (max 160 chars)
  - `title`: string (1..200 chars)
  - `summary`: string (optional, max 1000 chars)
  - `body`: string (1..65536 chars)
  - `locale`: string (optional, default `vi-VN`)
  - `coverMediaAssetId`: UUID string (optional)
  - `isFeatured`: boolean (optional, default false)
  - `scheduledFor`: future ISO8601 date string (optional)
  - `expiresAt`: ISO8601 date string after scheduled/publication date (optional)
- **Derived Fields:** `scopeKey` (`'GLOBAL'` or `'PARISH:<uuid>'`), `createdByUserId`, `updatedByUserId`, `status` (`SCHEDULED` if future `scheduledFor` supplied, otherwise `DRAFT`). Never creates `PUBLISHED` directly.

---

## 8. Update Contract

- **Endpoint:** `PATCH /api/v1/cms/entries/:id`
- **Guards:** `JwtAuthGuard`, `PermissionGuard`
- **Permission:** `cms.manage`
- **State-Specific Editability Rules:**
  - `DRAFT`: Full field editability.
  - `SCHEDULED`: Full editorial fields editable. Reverts to `DRAFT` if `scheduledFor: null` is sent. Slug/scope editable only because publication has never occurred.
  - `PUBLISHED`: `slug`, `type`, `scopeType`, and `parishId` are **strictly immutable**. Attempts to alter them throw `CmsEntryNotEditableError` (409 Conflict). Editable fields: `title`, `summary`, `body`, `locale`, `coverMediaAssetId`, `isFeatured`, `expiresAt`.
  - `ARCHIVED`: Strictly read-only. Any modification throws `CmsEntryNotEditableError` (409 Conflict).

---

## 9. Slug Strategy

- Slug format is strictly validated via regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$` with a max length of 160 characters.
- Deterministic normalization: trims whitespace and lowercases string.
- No silent collision suffixing: If an entry already exists with the same `(scope_key, slug)`, the service rejects it immediately with `CmsSlugConflictError` (409 Conflict).
- Uniqueness is scoped: Two entries can share the exact same slug if they reside in different parish scopes (e.g. `PARISH:aaa` vs `PARISH:bbb`), or one in `GLOBAL` and one in `PARISH:aaa`.

---

## 10. Scope Enforcement

- `GLOBAL`: SuperAdmin only. `parishId` must be null. `scope_key = 'GLOBAL'`. If a ParishAdmin attempts to create or manage a `GLOBAL` entry, the server rejects it with `CmsScopeAccessDeniedError` (403 Forbidden).
- `PARISH`: `parishId` is required. SuperAdmin can manage any parish. ParishAdmin is strictly restricted to parishes where they hold active membership (`parishScopeService.hasActiveParishMembership`). Attempts to access or create for foreign parishes result in 403 Forbidden.

---

## 11. Media Validation & Reference Behavior

- Stored strictly as a scalar UUID: `cover_media_asset_id`.
- Validated via `isUUID('4')` in DTOs.
- No TypeORM relation or foreign entity import to `MediaAssetEntity` or `MediaAssetRepository`.
- Decoupled from `MediaModule` runtime, avoiding cross-module cyclic dependencies and keeping CMS extraction-ready.

---

## 12. Publish Behavior

- **Endpoint:** `POST /api/v1/cms/entries/:id/publish`
- **Allowed States:** `DRAFT` → `PUBLISHED`, `SCHEDULED` → `PUBLISHED` (authorized manual early publish).
- **Behavior:** Sets `status = PUBLISHED`, `publishedAt = UTC now`, `updatedByUserId = actor.userId`.
- Replaying publish on an already `PUBLISHED` entry throws 409 Conflict.
- No automatic application events or notification fan-out are emitted for generic CMS editorial publishing in MVP.

---

## 13. Archive Behavior

- **Endpoint:** `POST /api/v1/cms/entries/:id/archive`
- **Allowed States:** `DRAFT` → `ARCHIVED`, `SCHEDULED` → `ARCHIVED`, `PUBLISHED` → `ARCHIVED`.
- **Behavior:** Sets `status = ARCHIVED`, `updatedByUserId = actor.userId`.
- Once archived, the entry immediately drops out of public feeds and becomes immutable. Re-archiving an archived entry throws 409 Conflict.

---

## 14. Delete Policy

- **No Hard Delete Endpoint:** As confirmed in the contract audit, no `DELETE` endpoint is provided for CMS entries in MVP.
- Deletion is handled exclusively through soft lifecycle retirement (`ARCHIVED`), preserving historical audit trails, referential integrity, and creator metadata.

---

## 15. Scheduled Publishing

- Pure service method: `publishDueEntries(now = new Date()): Promise<CmsScheduledPublishResult>`.
- Batch query: Looks up up to 100 entries where `status = 'SCHEDULED'` and `scheduled_for <= now`.
- Atomic update: Transitions status to `PUBLISHED` and sets `published_at = scheduled_for ?? now`.
- Safe architecture: No GET-time mutations are performed on consumer feeds.

---

## 16. Scheduled Runner

- Created standalone CLI script: `scripts/process-scheduled-cms-publications.ts` backed by `scripts/process-scheduled-cms-publications.module.ts`.
- Registered npm script in `package.json`: `"cms:publish-scheduled": "ts-node --project tsconfig.json scripts/process-scheduled-cms-publications.ts"`.
- Execution deferred in Fast Implementation Mode.

---

## 17. Public Anonymous List

- **Endpoint:** `GET /api/v1/cms/entries` (using `OptionalJwtAuthGuard`).
- When no Authorization header is present:
  - Constrained strictly to `scope_key = 'GLOBAL'`.
  - Filters strictly for `status = 'PUBLISHED'`.
  - Enforces `published_at <= now` and `(expires_at IS NULL OR expires_at > now)`.
  - Parish-scoped content is never visible to anonymous callers.

---

## 18. Authenticated Parish Visibility

- When an authenticated user calls `GET /api/v1/cms/entries`:
  - `CmsAccessService.listVisibleParishIds(userId)` queries the user's active parish memberships.
  - Query condition expands to: `(scope_key = 'GLOBAL' OR scope_key IN (:parishScopeKeys))`.
  - SuperAdmin in consumer feed mode sees `GLOBAL` + their assigned active parish memberships (normal consumer experience).
  - ParishAdmin, Catechist, Parent, and Student see `GLOBAL` + their active parish memberships.
  - Zero cross-parish content leakage.

---

## 19. Public List Filters

Supported query parameters in `CmsPublicListQueryDto`:
- `page`: default 1, min 1.
- `limit`: default 20, min 1, max 50.
- `type`: optional filter by `PAGE`, `ARTICLE`, or `NEWS`.
- `locale`: optional string filter (exact match, e.g. `vi-VN`).
- `isFeatured`: optional boolean filter.
- `parishId`: optional UUID filter. If passed, the server validates whether the parish is in the caller's allowed parish set. If the caller is anonymous or not a member of that parish, an empty result is returned (preventing scope escalation).
- **Sort Order:** `is_featured DESC, published_at DESC, id DESC`.

---

## 20. Public Detail Slug Resolution

- **Endpoint:** `GET /api/v1/cms/entries/:slug` (supports optional `?parishId=<uuid>`).
- If `parishId` is omitted: Look up `scope_key = 'GLOBAL'` and `slug = :slug`.
- If `parishId` is provided:
  - If caller is anonymous: returns 404 (prevents leaking existence of parish content).
  - If authenticated: validates caller's active membership in `parishId`. If not a member: returns 404.
  - Look up `scope_key = 'PARISH:<parishId>'` and `slug = :slug`.
- Enforces `status = 'PUBLISHED'`, `published_at <= now`, and non-expired. If not found: returns 404.

---

## 21. Admin Read Contract Gap Analysis

- **Context:** The original contract in #001A froze CMS routes at 6 (`GET /cms/entries`, `GET /cms/entries/:slug`, `POST /cms/entries`, `PATCH /cms/entries/:id`, `publish`, `archive`).
- **Defect:** In operational reality, an administrative CMS interface cannot function without the ability to list drafts, scheduled entries, and archived content, or retrieve a specific draft entry by ID for editing. Relying on public feeds would expose unreleased drafts to consumers or pollute consumer DTO contracts with admin metadata.
- **Classification:** **HIGH Contract Usability Gap**.
- **Resolution:** Added dedicated administrative read routes under `/api/v1/admin/cms/entries`. This provides clean role-scoped draft management without polluting the public API.
- **Route Count Impact:** CMS route count increases from 6 to 8. Total community phase route count target increases from 33 to 35.

---

## 22. Final CMS Route Inventory

1. `GET /api/v1/cms/entries` — Public list published entries (anonymous: GLOBAL; authenticated: GLOBAL + eligible parish).
2. `GET /api/v1/cms/entries/:slug` — Public entry detail by slug (optional `?parishId=` query).
3. `POST /api/v1/cms/entries` — Create entry (DRAFT / SCHEDULED).
4. `PATCH /api/v1/cms/entries/:id` — Update entry (lifecycle-aware immutability).
5. `POST /api/v1/cms/entries/:id/publish` — Immediately publish entry.
6. `POST /api/v1/cms/entries/:id/archive` — Archive entry (terminal state).
7. `GET /api/v1/admin/cms/entries` — Admin list across all statuses and scopes (`cms.manage`).
8. `GET /api/v1/admin/cms/entries/:id` — Admin get entry by ID across all statuses (`cms.manage`).

---

## 23. Final CMS Route Count

**8 routes.**

---

## 24. Corrected Total Community Route Count Target

**35 routes** (CMS: 8, Announcements: 8, Events: 11, Notifications: 8).

---

## 25. Admin List

- **Endpoint:** `GET /api/v1/admin/cms/entries`
- **Guards:** `JwtAuthGuard`, `PermissionGuard`
- **Permission:** `cms.manage`
- **Scope Behavior:**
  - SuperAdmin: Can list all entries across all scopes, or filter by `scopeType` / `parishId`.
  - ParishAdmin: Restricted strictly to entries belonging to their active parish (`scope_key IN (:adminParishScopeKeys)`). Attempting to filter by `GLOBAL` or a foreign parish returns 403 Forbidden.
- **Filters:** `status`, `type`, `scopeType`, `parishId`, `locale`, `search` (partial match on title or slug), `page`, `limit` (max 50).
- **Sort Order:** `updated_at DESC, id DESC`.

---

## 26. Admin Detail

- **Endpoint:** `GET /api/v1/admin/cms/entries/:id`
- **Guards:** `JwtAuthGuard`, `PermissionGuard`
- **Permission:** `cms.manage`
- **Scope Behavior:**
  - SuperAdmin: Can retrieve any entry by ID.
  - ParishAdmin: Can only retrieve entries belonging to their active parish. Foreign parish or global entries return 403 Forbidden.
- **Output:** Returns complete `CmsEntryAdminResponseDto` including administrative status, schedules, and audit timestamps.

---

## 27. Public DTOs

- `CmsEntryListItemDto`: Contains `id`, `type`, `scopeType`, `parishId`, `slug`, `title`, `summary`, `locale`, `coverMediaAssetId`, `isFeatured`, `publishedAt`, `expiresAt`. **Body is omitted** to save bandwidth and prevent large content payloads in listings.
- `CmsEntryDetailDto`: Extends `CmsEntryListItemDto` to include `body`.
- `CmsPublicListResponseDto`: Contains `items: CmsEntryListItemDto[]`, `total`, `page`, `limit`.
- **Minimization Enforcement:** Audit fields (`createdByUserId`, `updatedByUserId`, `createdAt`, `updatedAt`), internal unique key (`scopeKey`), and schedule metadata (`scheduledFor`) are excluded from public DTOs.

---

## 28. Admin DTOs

- `CreateCmsEntryDto`: Strictly validates external input via `class-validator` pipes (slug regex, UUID checks, string boundaries, date parsing).
- `UpdateCmsEntryDto`: All fields optional; validates formats when present.
- `CmsEntryAdminResponseDto`: Returns complete entity snapshot including `status`, `scopeKey`, `scheduledFor`, `publishedAt`, `expiresAt`, `createdByUserId`, `updatedByUserId`, `createdAt`, `updatedAt`.
- `CmsEntryAdminListQueryDto`: Bounded query parameters with max limit of 50.
- `CmsEntryAdminListResponseDto`: Paginated wrapper for admin responses.

---

## 29. Error Contract

- `CmsEntryNotFoundError` → **404 Not Found**
- `CmsSlugConflictError` → **409 Conflict**
- `CmsEntryNotEditableError` → **409 Conflict**
- `InvalidCmsLifecycleTransitionError` / `InvalidCmsTransitionError` → **409 Conflict**
- `CmsScopeAccessDeniedError` / `CmsAccessDeniedError` → **403 Forbidden**
- `InvalidCmsScheduleError` → **400 Bad Request**
- `InvalidCmsSlugError` → **400 Bad Request**
- `InvalidCmsScopeError` → **400 Bad Request**
- Unauthenticated requests to protected endpoints → **401 Unauthorized**

---

## 30. Featured Semantics

- `isFeatured` is an editorial boolean flag.
- Multiple entries may have `isFeatured = true`. There is no global uniqueness restriction on featured entries.
- Public list sorts featured entries first (`is_featured DESC, published_at DESC, id DESC`), with optional filter `isFeatured=true`.

---

## 31. Expiration Semantics

- `expiresAt` represents an expiration timestamp.
- Content where `expiresAt <= now` is filtered out of public queries (`published_at <= now AND (expires_at IS NULL OR expires_at > now)`).
- **No GET-time mutation:** Rows in the database remain in `PUBLISHED` status historically. They are not altered or archived on read requests.
- Admin list views continue to display expired entries with their complete status and expiration dates.

---

## 32. Locale Semantics

- Content is authored directly with an explicit `locale` string (default `vi-VN`, max 32 characters).
- Public list supports filtering by exact normalized locale.
- Completely decoupled from `LocalizationModule` runtime, avoiding complex machine-translation pipelines for basic editorial CMS content.

---

## 33. Access Service

`CmsAccessService` encapsulates all authorization checks using public exported services:
- `isSuperAdmin(userId)`: Checks `AccessControlService` for super admin role code.
- `assertCanManageCmsScope(userId, target)`: Verifies permissions to manage `GLOBAL` (SuperAdmin only) or `PARISH` (SuperAdmin or member of parish).
- `assertCanManageEntry(userId, entry)`: Verifies permissions on an existing entry.
- `listVisibleParishIds(userId)`: Resolves active parish IDs via `ParishScopeService`.
- `assertCanReadParishCms(userId, parishId)`: Verifies caller's right to access parish-scoped content.

---

## 34. Service Architecture

- `CmsEntryService`: Internal persistence service owning database queries, transactions, lifecycle validations, and scheduled batch processing. Not exported from `CmsModule`.
- `CmsService`: Public facade service implementing the module's public contract.
- Module boundaries: `CmsModule` exports `CmsService` only. Foreign entities and repositories are never imported.

---

## 35. OpenAPI

Both controllers are annotated with Swagger decorators:
- Public endpoints grouped under tag `cms`.
- Admin endpoints grouped under tag `admin-cms` with Bearer auth requirement (`ApiBearerAuth('access-token')`).
- Detailed annotations for responses, request DTOs, parameters, and HTTP error codes (200, 201, 400, 401, 403, 404, 409).

---

## 36. README

Updated `README.md` with a comprehensive section `CMS API (Editorial Content & Publishing — #003/7)` detailing scopes, lifecycle, routes, public vs. authenticated reads, scheduled runner, and the justified route count update (6 → 8 routes).

---

## 37. Module Boundary

Static inspection confirms:
- `CmsModule` exports only `CmsService`.
- No `forwardRef()` is used.
- No direct TypeORM repository or entity imports from external modules.
- No dependency on `LocalizationModule`, `NotificationsModule`, `AnnouncementsModule`, or `EventsModule`.
- No new database tables introduced beyond the frozen schema.

---

## 38. Unit Tests Written

1. `src/modules/cms/utils/cms-lifecycle.util.spec.ts` — Tests state transition matrix, date schedules, and editability assertions.
2. `src/modules/cms/access/cms-access.service.spec.ts` — Tests SuperAdmin vs ParishAdmin scope rules, cross-parish denials, and anonymous parish blocks.
3. `src/modules/cms/mappers/cms-http.mapper.spec.ts` — Tests public list body omission, public detail audit omission, and admin full serialization.
4. `src/modules/cms/services/cms-entry.service.spec.ts` — Tests CRUD operations, slug collisions, unscheduling, publishing, archiving, and scheduled processing.
5. `src/modules/cms/controllers/cms-entries.controller.spec.ts` — Tests public list, slug resolution, and mutation endpoints.
6. `src/modules/cms/controllers/cms-admin-entries.controller.spec.ts` — Tests admin list and admin detail endpoints with scope parameters.

---

## 39. Integration Tests Written

`test/integration/cms.integration-spec.ts` defines 16 comprehensive integration specifications:
1. Create GLOBAL DRAFT with derived `scope_key = 'GLOBAL'`.
2. Create PARISH DRAFT with derived `scope_key = 'PARISH:<parishId>'`.
3. Duplicate slug in GLOBAL scope triggers unique constraint violation.
4. Identical slug can coexist across distinct parish scopes without conflict.
5. Setting future `scheduledFor` sets status to `SCHEDULED`.
6. Publish action sets status = `PUBLISHED` and `publishedAt = now`.
7. Archive action sets status = `ARCHIVED` terminal state.
8. Invalid lifecycle transition throws 409 conflict error.
9. Published entry rejects mutations to slug or scope fields.
10. Anonymous public list returns only published GLOBAL entries.
11. Authenticated public list returns eligible parish entries.
12. Expired entries are hidden without GET-time mutation.
13. Featured entries are sorted first in public list results.
14. Scheduled processor publishes due entries in bounded batches.
15. No DELETE endpoint exists, preserving historical integrity.
16. Admin list enforces scope boundary (SuperAdmin all vs ParishAdmin own parish).

---

## 40. DB E2E Tests Written

`test/e2e/cms-db.e2e-spec.ts` defines full end-to-end scenarios covering:
- Anonymous access to public list and slug resolution.
- SuperAdmin management across global and parish scopes.
- ParishAdmin management restricted strictly to own parish.
- Role-based denial of mutation routes for Catechists, Parents, and Students.
- Validation failures (malformed slug, duplicate slug, past schedule, missing entity, invalid lifecycle).
- Unauthenticated mutation rejections (401).

---

## 41. Tests Executed

**NO — deferred by Fast Implementation Mode.**

---

## 42. DB Validation

**NOT RUN — deferred.**

---

## 43. quality:full

**NOT RUN — deferred.**

---

## 44. Docker

**NOT RUN — deferred.**

---

## 45. npm audit

**NOT RUN — deferred.**

---

## 46. Scheduled Publisher Execution

**NO — deferred.**

---

## 47. Static Inspection

Thorough static review confirmed:
- Zero GET-time mutations.
- Anonymous callers cannot access parish-scoped entries.
- Parish filtering cannot be used by clients to widen their access beyond active memberships.
- Admin management scopes are server-validated via `CmsAccessService`.
- Slugs are strictly validated via regex and normalized to lowercase alphanumeric kebab strings.
- Published entry slugs, scopes, and types are immutable.
- No `DELETE` endpoint exists.
- Public DTOs omit bodies in list views and omit all audit and internal keys.
- Pagination is bounded (max limit 50).
- Timestamps are UTC ISO8601 strings.
- Module boundaries conform to `PROJECT_RULES.md` §7.

---

## 48. Risks & Deferred Items

- Scheduled publication CLI runner requires a system cron / scheduler (e.g. Kubernetes CronJob or Bitbucket Pipeline schedule) in production deployment; runner execution is deferred in Fast Mode.
- Live database verification of TypeORM query builders against MSSQL will take place during the stabilization phase.

---

## 49. Defect Classification

- **BLOCKER:** 0
- **HIGH:** 0 (Contract gap resolved via Part N admin route additions)
- **MEDIUM:** 0
- **LOW:** 0

---

## 50. #004 Readiness

**YES.** The CMS module implementation is complete, architecturally sound, and ready for integration.

---

## 51. Commit Recommendation

```bash
git commit -m "feat(cms): add content publishing and reads"
```

---

## REQUIRED VERDICTS

```
CMS CREATE READY: YES
CMS UPDATE READY: YES
CMS LIFECYCLE READY: YES
CMS SCHEDULED PUBLISHING READY: YES
CMS SCHEDULED RUNNER READY: YES

CMS GLOBAL SCOPE SAFE: YES
CMS PARISH SCOPE SAFE: YES
CMS SLUG ROUTING READY: YES
CMS PUBLIC ANONYMOUS READ READY: YES
CMS AUTHENTICATED PARISH READ READY: YES
CMS EXPIRATION FILTER READY: YES
CMS DATA MINIMIZATION READY: YES

CMS ADMIN LIST NEEDED: YES
CMS ADMIN DETAIL NEEDED: YES

FINAL CMS ROUTE COUNT: 8
FINAL COMMUNITY ROUTE COUNT TARGET: 35

NO CMS DELETE ENDPOINT IN MVP: YES
NO GET-TIME MUTATION: YES
NO LOCALIZATION RUNTIME COUPLING: YES
MODULE BOUNDARY READY BY INSPECTION: YES

UNIT TESTS WRITTEN: YES
INTEGRATION TESTS WRITTEN: YES
DB E2E TESTS WRITTEN: YES

TESTS EXECUTED: NO — deferred by Fast Implementation Mode
DB VALIDATION: NOT RUN — deferred
QUALITY:FULL: NOT RUN — deferred
DOCKER: NOT RUN — deferred
NPM AUDIT: NOT RUN — deferred
SCHEDULED PUBLISHER EXECUTED: NO — deferred

Unresolved BLOCKER count: 0
Unresolved HIGH count: 0
Unresolved MEDIUM count: 0

#004 READINESS: YES
```
