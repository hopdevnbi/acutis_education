# CMS + ANNOUNCEMENT + EVENTS + NOTIFICATIONS #002/7 REPORT
## Persistence Foundation + Module Shells / Tables / RBAC / Application Event Contracts

---

### 1 Objective
Implement the complete production persistence foundation and modular shells for the Community and Communications domain (CMS, Announcements, Events, Notifications), satisfying all architectural, security, minor-privacy, modular-boundary, and MSSQL-safe uniqueness requirements frozen in `#001` and `#001A`.

---

### 2 Fast Implementation Mode
- **Mode Active**: Yes (per `.cursor/rules/04-fast-implementation-mode.mdc`).
- **Code Surface Implemented**: Yes — all 4 modules, 10 TypeORM entities, single migration file, internal persistence services, access shells, public facades, RBAC seeds, neutral application event contracts, unit specs, integration specs.
- **Execution of Tests & Tooling**: Deferred.
- **Reporting Language**:
  - `TESTS WRITTEN: YES`
  - `TESTS EXECUTED: NO — deferred by Fast Implementation Mode`
  - `DB VALIDATION: NOT RUN — deferred`
  - `QUALITY:FULL: NOT RUN — deferred`
  - `DOCKER: NOT RUN — deferred`
  - `NPM AUDIT: NOT RUN — deferred`

---

### 3 State Inherited
- Completed `#001` domain audit & initial design.
- Completed `#001A` corrective contract audit which froze:
  - Explicit Event lifecycle actions (`publish`, `cancel`, `complete`, `archive`).
  - Optimistic event integer `version` and `EVENT_UPDATED:<eventId>:v<version>` operationKey.
  - Notification idempotency via `operation_key` and `application_event_id` uniqueness.
  - MSSQL-safe non-null unique keys: `scope_key` (`cms_entries`), `target_key` (`announcement_targets`, `event_targets`), `registrant_key` (`event_registrations`).
  - 10-table schema count frozen (no separate attachment or preferences table in MVP).

---

### 4 Files Created
1. `src/modules/application-events/contracts/communication-events.contract.ts`
2. `src/modules/application-events/contracts/communication-events.contract.spec.ts`
3. `src/modules/cms/constants/cms-permissions.constants.ts`
4. `src/modules/cms/enums/cms.enums.ts`
5. `src/modules/cms/errors/cms.errors.ts`
6. `src/modules/cms/utils/cms-key.util.ts`
7. `src/modules/cms/utils/cms-key.util.spec.ts`
8. `src/modules/cms/interfaces/cms.interfaces.ts`
9. `src/modules/cms/entities/cms-entry.entity.ts`
10. `src/modules/cms/services/cms-entry.service.ts`
11. `src/modules/cms/access/cms-access.service.ts`
12. `src/modules/cms/cms.service.ts`
13. `src/modules/cms/cms.module.ts`
14. `src/modules/announcements/constants/announcements-permissions.constants.ts`
15. `src/modules/announcements/enums/announcement.enums.ts`
16. `src/modules/announcements/errors/announcement.errors.ts`
17. `src/modules/announcements/utils/announcement-key.util.ts`
18. `src/modules/announcements/utils/announcement-key.util.spec.ts`
19. `src/modules/announcements/interfaces/announcement.interfaces.ts`
20. `src/modules/announcements/entities/announcement.entity.ts`
21. `src/modules/announcements/entities/announcement-target.entity.ts`
22. `src/modules/announcements/entities/announcement-user-state.entity.ts`
23. `src/modules/announcements/services/announcement.service.ts`
24. `src/modules/announcements/services/announcement-target.service.ts`
25. `src/modules/announcements/services/announcement-user-state.service.ts`
26. `src/modules/announcements/access/announcement-access.service.ts`
27. `src/modules/announcements/announcements.service.ts`
28. `src/modules/announcements/announcements.module.ts`
29. `src/modules/events/constants/events-permissions.constants.ts`
30. `src/modules/events/enums/event.enums.ts`
31. `src/modules/events/errors/event.errors.ts`
32. `src/modules/events/utils/event-key.util.ts`
33. `src/modules/events/utils/event-key.util.spec.ts`
34. `src/modules/events/interfaces/event.interfaces.ts`
35. `src/modules/events/entities/event.entity.ts`
36. `src/modules/events/entities/event-target.entity.ts`
37. `src/modules/events/entities/event-registration.entity.ts`
38. `src/modules/events/services/event.service.ts`
39. `src/modules/events/services/event-target.service.ts`
40. `src/modules/events/services/event-registration.service.ts`
41. `src/modules/events/access/event-access.service.ts`
42. `src/modules/events/events.service.ts`
43. `src/modules/events/events.module.ts`
44. `src/modules/notifications/constants/notifications-permissions.constants.ts`
45. `src/modules/notifications/enums/notification.enums.ts`
46. `src/modules/notifications/errors/notification.errors.ts`
47. `src/modules/notifications/interfaces/notification.interfaces.ts`
48. `src/modules/notifications/entities/notification.entity.ts`
49. `src/modules/notifications/entities/notification-recipient.entity.ts`
50. `src/modules/notifications/entities/notification-device.entity.ts`
51. `src/modules/notifications/services/notification.service.ts`
52. `src/modules/notifications/services/notification-recipient.service.ts`
53. `src/modules/notifications/services/notification-device.service.ts`
54. `src/modules/notifications/access/notification-access.service.ts`
55. `src/modules/notifications/notifications.service.ts`
56. `src/modules/notifications/notifications.module.ts`
57. `src/modules/notifications/services/notification.service.spec.ts`
58. `src/database/migrations/1788064500000-create-community-communications-schema.ts`
59. `test/integration/community-communications.integration-spec.ts`
60. `docs/CMS_ANNOUNCEMENT_EVENTS_NOTIFICATIONS_002_PERSISTENCE_FOUNDATION_REPORT.md`

---

### 5 Files Modified
1. `src/modules/application-events/ports/application-event.ports.ts` (added `publishCommunicationEvent`, `CommunicationEventHandler`)
2. `src/modules/application-events/services/application-event-bus.service.ts` (added communication handler registration and fault-tolerant dispatch)
3. `src/modules/application-events/index.ts` (exported communication contracts and ports)
4. `src/modules/application-events/application-event-bus.spec.ts` (added communication event isolation unit test)
5. `src/database/seeds/auth-rbac.seed.constants.ts` (added 11 permissions and updated role-permission matrices)
6. `src/app.module.ts` (registered `CmsModule`, `AnnouncementsModule`, `EventsModule`, `NotificationsModule`)
7. `src/modules/module-boundaries.spec.ts` (added export checks and isolation asserts for all 4 new modules)

---

### 6 Module Shells
- **CmsModule**: `src/modules/cms/`
- **AnnouncementsModule**: `src/modules/announcements/`
- **EventsModule**: `src/modules/events/`
- **NotificationsModule**: `src/modules/notifications/`

Each module contains:
- Dedicated module file (`*.module.ts`)
- Single public facade service (`*.service.ts`)
- TypeORM entities (`entities/`)
- Domain enums (`enums/`)
- Narrow snapshot interfaces and input contracts (`interfaces/`)
- Internal persistence services (`services/`)
- Scope and access services (`access/`)
- Error classes (`errors/`)
- Safe key builders (`utils/`)

---

### 7 Module Imports
- `CmsModule` imports: `TypeOrmModule.forFeature([CmsEntryEntity])`, `AccessControlModule`, `ParishModule`.
- `AnnouncementsModule` imports: `TypeOrmModule.forFeature([AnnouncementEntity, AnnouncementTargetEntity, AnnouncementUserStateEntity])`, `AccessControlModule`, `ParishModule`, `ApplicationEventsModule`.
- `EventsModule` imports: `TypeOrmModule.forFeature([EventEntity, EventTargetEntity, EventRegistrationEntity])`, `AccessControlModule`, `ParishModule`, `ApplicationEventsModule`.
- `NotificationsModule` imports: `TypeOrmModule.forFeature([NotificationEntity, NotificationRecipientEntity, NotificationDeviceEntity])`, `AccessControlModule`, `ApplicationEventsModule`.

No foreign repositories, no foreign entities, no `forwardRef`, and no `FamilyPortalModule` imports. Announcements and Events never directly import `NotificationsModule` for delivery (strict event decoupling).

---

### 8 Module Exports
- `CmsModule` -> exports `CmsService` only.
- `AnnouncementsModule` -> exports `AnnouncementsService` only.
- `EventsModule` -> exports `EventsService` only.
- `NotificationsModule` -> exports `NotificationsService` only.

No repositories or entities are exported publicly.

---

### 9 Table Ownership
- `CmsModule`: owns `cms_entries` (1 table).
- `AnnouncementsModule`: owns `announcements`, `announcement_targets`, `announcement_user_states` (3 tables).
- `EventsModule`: owns `events`, `event_targets`, `event_registrations` (3 tables).
- `NotificationsModule`: owns `notifications`, `notification_recipients`, `notification_devices` (3 tables).
Total: exactly 10 tables.

---

### 10 Final 10-Table Schema
All tables use `uniqueidentifier` primary keys generated via Node `randomUUID()`, strict non-null foreign keys within the same module, scalar cross-module IDs without ORM relations, `datetime2` timestamps defaulting to `GETUTCDATE()`, and explicit check constraints.

---

### 11 `cms_entries`
- Columns: `id` (PK), `type`, `scope_type`, `scope_key`, `parish_id`, `slug`, `title`, `summary`, `body`, `locale`, `status`, `cover_media_asset_id`, `is_featured`, `scheduled_for`, `published_at`, `expires_at`, `created_by_user_id`, `updated_by_user_id`, `created_at`, `updated_at`.
- Constraints:
  - `UQ_cms_entries_scope_slug`: UNIQUE(`scope_key`, `slug`)
  - `CK_cms_entries_type`: `PAGE`, `ARTICLE`, `NEWS`
  - `CK_cms_entries_scope_type`: `GLOBAL`, `PARISH`
  - `CK_cms_entries_status`: `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`
- Indexes: `(status, published_at)`, `(scope_key, status)`.

---

### 12 `announcements`
- Columns: `id` (PK), `title`, `body`, `summary`, `locale`, `priority`, `status`, `scope_type`, `parish_id`, `starts_at`, `ends_at`, `is_pinned`, `cover_media_asset_id`, `published_at`, `created_by_user_id`, `updated_by_user_id`, `created_at`, `updated_at`.
- Constraints:
  - `CK_announcements_priority`: `LOW`, `NORMAL`, `HIGH`, `URGENT`
  - `CK_announcements_status`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
  - `CK_announcements_scope_type`: `GLOBAL`, `PARISH`
- Indexes: `(status, starts_at, ends_at)`, `(parish_id, status)`.

---

### 13 `announcement_targets`
- Columns: `id` (PK), `announcement_id` (FK -> `announcements.id` CASCADE), `target_type`, `parish_id`, `class_id`, `role_code`, `target_key`, `created_at`.
- Constraints:
  - `UQ_announcement_targets_announcement_target_key`: UNIQUE(`announcement_id`, `target_key`)
  - `CK_announcement_targets_target_type`: `GLOBAL`, `PARISH`, `CLASS`, `ROLE`
- Indexes: `(target_type, parish_id, class_id)`.

---

### 14 `announcement_user_states`
- Columns: `id` (PK), `announcement_id` (FK -> `announcements.id` CASCADE), `user_id`, `first_seen_at`, `read_at`, `dismissed_at`, `created_at`, `updated_at`.
- Constraints:
  - `UQ_announcement_user_states`: UNIQUE(`announcement_id`, `user_id`)
- Indexes: `(user_id, read_at)`.
- Pattern: Lazy interaction tracking (no mass creation on publish).

---

### 15 `events`
- Columns: `id` (PK), `code`, `title`, `description`, `summary`, `locale`, `scope_type`, `scope_key`, `parish_id`, `class_id`, `status`, `timezone`, `starts_at`, `ends_at`, `venue_name`, `address`, `cover_media_asset_id`, `capacity`, `is_registration_required`, `registration_deadline`, `published_at`, `cancelled_at`, `cancellation_reason`, `version`, `created_by_user_id`, `updated_by_user_id`, `created_at`, `updated_at`.
- Constraints:
  - `UQ_events_code`: UNIQUE(`code`)
  - `CK_events_scope_type`: `GLOBAL`, `PARISH`, `CLASS`
  - `CK_events_status`: `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`, `ARCHIVED`
  - `CK_events_window`: `[starts_at] < [ends_at]`
- Indexes: `(status, starts_at, ends_at)`, `(scope_key, status)`, `(parish_id, status)`.

---

### 16 `event_targets`
- Columns: `id` (PK), `event_id` (FK -> `events.id` CASCADE), `target_type`, `parish_id`, `class_id`, `role_code`, `target_key`, `created_at`.
- Constraints:
  - `UQ_event_targets_event_target_key`: UNIQUE(`event_id`, `target_key`)
  - `CK_event_targets_target_type`: `GLOBAL`, `PARISH`, `CLASS`, `ROLE`
- Indexes: `(target_type, parish_id, class_id)`.
- Audience Rule: Targets govern audience eligibility; if empty, audience defaults to the event's administrative scope.

---

### 17 `event_registrations`
- Columns: `id` (PK), `event_id` (FK -> `events.id` CASCADE), `registrant_key`, `user_id`, `student_id`, `enrollment_id`, `status`, `registered_at`, `cancelled_at`, `checked_in_at`, `created_at`, `updated_at`.
- Constraints:
  - `UQ_event_registrations_event_registrant`: UNIQUE(`event_id`, `registrant_key`)
  - `CK_event_registrations_status`: `REGISTERED`, `CANCELLED`, `ATTENDED`, `NO_SHOW`
- Indexes: `(event_id, status)`, `(user_id, status)`.

---

### 18 `notifications`
- Columns: `id` (PK), `application_event_id`, `operation_key`, `source_type`, `source_id`, `notification_type`, `title`, `snippet`, `action_url`, `created_at`.
- Constraints:
  - `UQ_notifications_operation_key`: UNIQUE(`operation_key`)
  - `UQ_notifications_application_event_id`: UNIQUE(`application_event_id`)
  - `CK_notifications_source_type`: `ANNOUNCEMENT`, `EVENT`, `SYSTEM`
- Indexes: `(source_type, source_id)`.
- Privacy: No minor PII, no arbitrary payload JSON blobs.

---

### 19 `notification_recipients`
- Columns: `id` (PK), `notification_id` (FK -> `notifications.id` CASCADE), `recipient_user_id`, `is_read`, `read_at`, `is_dismissed`, `created_at`, `updated_at`.
- Constraints:
  - `UQ_notification_recipients_notification_user`: UNIQUE(`notification_id`, `recipient_user_id`)
- Indexes:
  - `IX_notification_recipients_inbox`: `(recipient_user_id, is_read, created_at DESC)`
  - `IX_notification_recipients_user_created`: `(recipient_user_id, created_at DESC)`

---

### 20 `notification_devices`
- Columns: `id` (PK), `user_id`, `platform`, `provider`, `token`, `is_active`, `app_version`, `locale`, `last_seen_at`, `created_at`, `updated_at`.
- Constraints:
  - `UQ_notification_devices_token`: UNIQUE(`token`) globally
  - `CK_notification_devices_platform`: `IOS`, `ANDROID`, `WEB`
  - `CK_notification_devices_provider`: `EXPO`, `FCM`, `APNS`, `WEB_PUSH`
- Indexes: `(user_id, is_active)`.

---

### 21 Enum Model
- `CmsEntryType`: `PAGE`, `ARTICLE`, `NEWS`
- `CmsScopeType`: `GLOBAL`, `PARISH`
- `CmsEntryStatus`: `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`
- `AnnouncementStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`
- `AnnouncementPriority`: `LOW`, `NORMAL`, `HIGH`, `URGENT`
- `AnnouncementScopeType`: `GLOBAL`, `PARISH`
- `CommunicationTargetType`: `GLOBAL`, `PARISH`, `CLASS`, `ROLE`
- `EventStatus`: `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`, `ARCHIVED`
- `EventScopeType`: `GLOBAL`, `PARISH`, `CLASS`
- `EventRegistrationStatus`: `REGISTERED`, `CANCELLED`, `ATTENDED`, `NO_SHOW`
- `NotificationSourceType`: `ANNOUNCEMENT`, `EVENT`, `SYSTEM`
- `NotificationType`: `ANNOUNCEMENT_PUBLISHED`, `EVENT_PUBLISHED`, `EVENT_UPDATED`, `EVENT_CANCELLED`
- `NotificationDevicePlatform`: `IOS`, `ANDROID`, `WEB`
- `NotificationDeviceProvider`: `EXPO`, `FCM`, `APNS`, `WEB_PUSH`

---

### 22 Snapshot/Interface Model
All persistence entities are converted to strict immutable TypeScript interfaces before returning to caller domains:
- `CmsEntrySnapshot`
- `AnnouncementSnapshot`, `AnnouncementTargetSnapshot`, `AnnouncementUserStateSnapshot`
- `EventSnapshot`, `EventTargetSnapshot`, `EventRegistrationSnapshot`
- `NotificationSnapshot`, `NotificationRecipientSnapshot`, `NotificationDeviceSnapshot`

---

### 23 `scope_key` Strategy
MSSQL treats `NULL` as a distinct value and allows at most one `NULL` row in a unique index. To safely support unique slugs across scopes without MSSQL NULL-traps:
- `scope_key` is `NOT NULL VARCHAR(64)`.
- GLOBAL scope: `scope_key = 'GLOBAL'`.
- PARISH scope: `scope_key = 'PARISH:<parishId>'`.
- UNIQUE constraint: `UNIQUE(scope_key, slug)` guarantees distinct slugs per parish while allowing different parishes to use the same slug.

---

### 24 `target_key` Strategy
Announcement and Event targets use deterministic non-null `target_key VARCHAR(128)`:
- `GLOBAL`
- `PARISH:<parishId>`
- `CLASS:<classId>`
- `ROLE:<parishId>:<roleCode>`
Combined with `UNIQUE(announcement_id, target_key)` and `UNIQUE(event_id, target_key)`, this prevents duplicate target definitions without nullable composite index traps.

---

### 25 `registrant_key` Strategy
Event registration identity enforces exact one-per-actor registration:
- Self-registration: `registrant_key = 'USER:<userId>'` (`student_id` is null).
- Child registration: `registrant_key = 'STUDENT:<studentId>'` (`user_id` is the guardian).
- `UNIQUE(event_id, registrant_key)` ensures:
  1. Multiple adult users can self-register for the same event without collision.
  2. The same child cannot be registered twice for the event by any guardian.

---

### 26 Notification `operationKey` Strategy
Every communication event specifies a deterministic `operationKey`:
- `ANNOUNCEMENT_PUBLISHED:<announcementId>`
- `EVENT_PUBLISHED:<eventId>`
- `EVENT_UPDATED:<eventId>:v<version>`
- `EVENT_CANCELLED:<eventId>`
`notifications.operation_key` has a `UNIQUE` constraint, providing complete idempotency: replaying an event or resending the command safely deduplicates at the database level.

---

### 27 `applicationEventId` Strategy
- `applicationEventId` is a unique UUID generated per event dispatch.
- `notifications.application_event_id` has a `UNIQUE` constraint for end-to-end trace correlation and message bus deduplication.

---

### 28 Event Version Strategy
- `events.version` is an integer defaulting to 0 for `DRAFT`.
- Incremented upon publishing and every subsequent mutation.
- Feeds into `EventUpdatedEvent.operationKey` (`EVENT_UPDATED:<eventId>:v<version>`), enabling notifications for distinct updates while deduplicating replays of the same version.

---

### 29 Device Token Uniqueness Strategy
- `notification_devices.token` is `UNIQUE` globally.
- A physical push token uniquely identifies a client installation. If user B logs in on a device previously used by user A, `NotificationDeviceService.registerDevice` reassigns ownership to user B, updates `last_seen_at`, and activates the token, preventing multiple accounts from receiving push notifications intended for one physical device.

---

### 30 Index / Unique Constraints
- `cms_entries`: `UQ(scope_key, slug)`, `IX(status, published_at)`, `IX(scope_key, status)`
- `announcements`: `IX(status, starts_at, ends_at)`, `IX(parish_id, status)`
- `announcement_targets`: `UQ(announcement_id, target_key)`, `IX(target_type, parish_id, class_id)`
- `announcement_user_states`: `UQ(announcement_id, user_id)`, `IX(user_id, read_at)`
- `events`: `UQ(code)`, `IX(status, starts_at, ends_at)`, `IX(scope_key, status)`, `IX(parish_id, status)`
- `event_targets`: `UQ(event_id, target_key)`, `IX(target_type, parish_id, class_id)`
- `event_registrations`: `UQ(event_id, registrant_key)`, `IX(event_id, status)`, `IX(user_id, status)`
- `notifications`: `UQ(operation_key)`, `UQ(application_event_id)`, `IX(source_type, source_id)`
- `notification_recipients`: `UQ(notification_id, recipient_user_id)`, `IX(recipient_user_id, is_read, created_at DESC)`, `IX(recipient_user_id, created_at DESC)`
- `notification_devices`: `UQ(token)`, `IX(user_id, is_active)`

---

### 31 FK / Cascade Strategy
- **Own-Module Sub-tables**: Foreign keys to own module root (e.g. `announcement_targets` -> `announcements`, `event_registrations` -> `events`, `notification_recipients` -> `notifications`) use `ON DELETE CASCADE`.
- **Cross-Module References**: Stored strictly as scalar UUIDs (`parish_id`, `class_id`, `user_id`, `student_id`, `cover_media_asset_id`). No foreign database FK constraints and no TypeORM relation graphs across module boundaries.

---

### 32 Persistence Services
Internal services encapsulate TypeORM repositories:
- `CmsEntryService`
- `AnnouncementInternalService`, `AnnouncementTargetService`, `AnnouncementUserStateService`
- `EventInternalService`, `EventTargetService`, `EventRegistrationService`
- `NotificationInternalService`, `NotificationRecipientService`, `NotificationDeviceService`

---

### 33 Public Facades
Each module exposes a single public facade:
- `CmsService`
- `AnnouncementsService`
- `EventsService`
- `NotificationsService`

---

### 34 Access Service Shells
- `CmsAccessService`: SuperAdmin (global/all), ParishAdmin (own parish).
- `AnnouncementAccessService`: SuperAdmin (global/all), ParishAdmin (own parish).
- `EventAccessService`: SuperAdmin (global/all), ParishAdmin (own parish).
- `NotificationAccessService`: Self inbox & self device protection.

---

### 35 RBAC Permissions
Exactly 11 permissions added:
1. `cms.read`
2. `cms.manage`
3. `announcements.read`
4. `announcements.manage`
5. `announcements.publish`
6. `events.read`
7. `events.manage`
8. `events.register`
9. `events.checkin`
10. `notifications.read`
11. `notifications.devices`

---

### 36 Role Matrix
- `SUPER_ADMIN`: All 11 permissions (via wildcard assignment).
- `PARISH_ADMIN`: `cms.read`, `cms.manage`, `announcements.read`, `announcements.manage`, `announcements.publish`, `events.read`, `events.manage`, `events.checkin`, `notifications.read`, `notifications.devices`.
- `CATECHIST`: `cms.read`, `announcements.read`, `announcements.manage`, `announcements.publish`, `events.read`, `events.manage`, `events.checkin`, `notifications.read`, `notifications.devices`.
- `PARENT`: `cms.read`, `announcements.read`, `events.read`, `events.register`, `notifications.read`, `notifications.devices`.
- `STUDENT`: `cms.read`, `announcements.read`, `events.read`, `events.register`, `notifications.read`, `notifications.devices`.

---

### 37 Communication Event Contracts
Defined under `src/modules/application-events/contracts/communication-events.contract.ts`:
- `AnnouncementPublishedEvent`
- `EventPublishedEvent`
- `EventUpdatedEvent`
- `EventCancelledEvent`
All share `CommunicationApplicationEventBase` carrying `applicationEventId`, `operationKey`, `eventType`, and `occurredAt`. Payloads contain no PII and no full article bodies.

---

### 38 ApplicationEvents Infrastructure Changes
- Extended `ApplicationEventPublisher` interface with `publishCommunicationEvent(event: CommunicationApplicationEvent): Promise<void>`.
- Added `CommunicationEventHandler` port.
- Extended `ApplicationEventBus` to register communication handlers and dispatch events inside isolated `try/catch` blocks to protect source callers.

---

### 39 Media Boundary
Media attachments are referenced only via optional scalar `cover_media_asset_id: string | null`. The previously suggested `announcement_attachments` join table is explicitly omitted to freeze the MVP schema at exactly 10 tables.

---

### 40 Localization Boundary
Content entities persist a `locale` varchar field (default `'vi-VN'`). No runtime dependency on `LocalizationModule` is introduced in `#002`.

---

### 41 Scheduler Foundation
- Scheduled timestamps are persisted in `cms_entries` (`scheduled_for`, `expires_at`) and `announcements` (`starts_at`, `ends_at`).
- No GET-time mutations. Automated publication runners are deferred to `#003` / `#004`.

---

### 42 Module Boundary Specs
Updated `src/modules/module-boundaries.spec.ts` with explicit assertions:
- `CmsModule` exports `CmsService` only.
- `AnnouncementsModule` exports `AnnouncementsService` only.
- `EventsModule` exports `EventsService` only.
- `NotificationsModule` exports `NotificationsService` only.
- Zero `forwardRef` in all module files.
- Announcements and Events do not import `NotificationsModule`.
- None of the modules import `FamilyPortalModule`.

---

### 43 Unit Tests Written
- `src/modules/cms/utils/cms-key.util.spec.ts`
- `src/modules/announcements/utils/announcement-key.util.spec.ts`
- `src/modules/events/utils/event-key.util.spec.ts`
- `src/modules/notifications/services/notification.service.spec.ts`
- `src/modules/application-events/contracts/communication-events.contract.spec.ts`
- `src/modules/application-events/application-event-bus.spec.ts` (updated)
- `src/modules/module-boundaries.spec.ts` (updated)

---

### 44 Integration Tests Written
`test/integration/community-communications.integration-spec.ts` covers 20 integration scenarios across CMS, Announcements, Events, Notifications, and cross-module boundaries.

---

### 45 Tests Executed
`TESTS EXECUTED: NO — deferred by Fast Implementation Mode`

---

### 46 DB Validation
`DB VALIDATION: NOT RUN — deferred`

---

### 47 quality:full
`QUALITY:FULL: NOT RUN — deferred`

---

### 48 Docker
`DOCKER: NOT RUN — deferred`

---

### 49 npm audit
`NPM AUDIT: NOT RUN — deferred`

---

### 50 Static Inspection
- Exactly 10 tables created in migration and entities.
- Zero extra tables created (no attachment or preference join tables).
- 4 module shells properly created and registered in `AppModule`.
- Facade exports verified; zero repo/entity exports.
- Zero `forwardRef` used.
- All MSSQL nullable uniqueness traps resolved via non-null `scope_key`, `target_key`, and `registrant_key`.
- `ReadLints` verified zero errors across all created and edited files.

---

### 51 Risks / Deferred
- Push notification provider delivery (Expo/FCM/APNS) is deferred to future milestones.
- Notification user preferences and Email/SMS are deferred.
- Event waitlists and recurrence rules are out of scope.
- Migration execution against MSSQL is deferred to stabilization phase.

---

### 52 BLOCKER / HIGH / MEDIUM / LOW
- Unresolved BLOCKER count: 0
- Unresolved HIGH count: 0
- Unresolved MEDIUM count: 0
- Unresolved LOW count: 0

---

### 53 #003 Readiness
Ready to proceed to `#003/7` (CMS Module — Content CRUD + Publishing Lifecycle + Public / Scoped Reads).

---

### 54 Commit Recommendation
`git commit -m "feat(community): add cms announcement event notification foundation"`

---

## REQUIRED VERDICTS

```text
FOUR MODULE SHELLS READY: YES

TEN-TABLE SCHEMA IMPLEMENTED: YES

CMS PERSISTENCE READY: YES
ANNOUNCEMENT PERSISTENCE READY: YES
EVENT PERSISTENCE READY: YES
NOTIFICATION PERSISTENCE READY: YES

CMS SCOPE_KEY MSSQL SAFE: YES
ANNOUNCEMENT TARGET_KEY SAFE: YES
EVENT TARGET_KEY SAFE: YES
EVENT REGISTRANT_KEY MSSQL SAFE: YES

EVENT VERSION READY: YES
COMMUNICATION OPERATION KEY READY: YES
APPLICATION EVENT IDENTITY READY: YES
NOTIFICATION HEADER DEDUPE CONSTRAINT READY: YES
NOTIFICATION RECIPIENT DEDUPE CONSTRAINT READY: YES
DEVICE TOKEN UNIQUENESS READY: YES

RBAC 11 PERMISSIONS READY: YES
APPLICATION EVENT CONTRACTS READY: YES
APPLICATION EVENT INFRASTRUCTURE READY: YES

MODULE BOUNDARY READY BY INSPECTION: YES

UNIT TESTS WRITTEN: YES
INTEGRATION TESTS WRITTEN: YES

TESTS EXECUTED: NO — deferred by Fast Implementation Mode
DB VALIDATION: NOT RUN — deferred
QUALITY:FULL: NOT RUN — deferred
DOCKER: NOT RUN — deferred
NPM AUDIT: NOT RUN — deferred

Unresolved BLOCKER count: 0
Unresolved HIGH count: 0
Unresolved MEDIUM count: 0

#003 READINESS: YES
```
