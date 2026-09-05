# CMS + ANNOUNCEMENT + EVENTS + NOTIFICATIONS #001A — CORRECTIVE CONTRACT AUDIT REPORT
## Event Lifecycle / API Consistency & Notification Idempotency Contract

**Date:** 2026-09-05  
**Mode:** AUDIT / DESIGN ONLY — Fast Implementation Mode  
**Parent Report:** `docs/CMS_ANNOUNCEMENT_EVENTS_NOTIFICATIONS_001_DOMAIN_AUDIT_AND_DESIGN_REPORT.md`  
**Purpose:** Reconcile Event lifecycle routes, define end-to-end notification replay and deduplication contracts, resolve MSSQL nullable unique index traps, and re-certify #002 readiness.

---

## 1. Objective
Perform a precise corrective design audit addressing two contract inconsistencies identified in report `#001`:
1. **Event Lifecycle / API Inconsistency:** Complete the missing Event lifecycle action endpoints (`publish`, `complete`, `archive`) and formalize the event state transition matrix.
2. **Notification Idempotency Gap:** Eliminate the replay vulnerability in `notifications` header creation and fan-out by defining stable application event identities and deterministic operation keys.
3. **MSSQL Nullable Unique Traps:** Replace compound nullable unique constraints on CMS slugs and Event registrations with non-null derived key strategies.
4. **Target Model Reconciliation:** Harmonize Event administrative scope with granular audience targeting.

---

## 2. Fast Implementation Mode
Following `.cursor/rules/04-fast-implementation-mode.mdc`:
- **Audit & Design Only:** No production business code, entities, migrations, or controllers created.
- **Validation Deferred:** Zero commands executed (`npm test`, Jest, lint, build, Docker, DB prepare/migrations, seeds).
- **Static Gate:** Architecture, security, and schema designs are audited through static analysis to guarantee an unblocked foundation for prompt `#002`.

---

## 3. Issues Inherited from #001
| Issue | Severity in #001 | Description | Root Cause |
| ----- | ---------------- | ----------- | ---------- |
| **Missing Event Lifecycle Endpoints** | HIGH | The Event lifecycle specified `DRAFT` \(\to\) `PUBLISHED` \(\to\) `CANCELLED` \| `COMPLETED` \(\to\) `ARCHIVED`, but the API inventory lacked `publish`, `complete`, and `archive` endpoints. | Incomplete route inventory in section 60 of `#001`. |
| **Notification Header Replay Gap** | HIGH | Idempotency was claimed via `(source_type, source_id, recipient_user_id)`, but the schema only had `INDEX(source_type, source_id)` on `notifications` and `UNIQUE(notification_id, recipient_user_id)` on recipients. Replaying an event creates a second notification header, bypassing recipient deduplication. | Missing unique operation key on the notification header entity. |
| **MSSQL Slug Nullable Trap** | MEDIUM | CMS unique index `(scope_type, parish_id, slug)` treats `NULL` as a single distinct value in MSSQL. Multiple `GLOBAL` entries (`parish_id = null`) with different slugs would conflict. | SQL Server standard unique index behavior on nullable columns. |
| **Event Registration Nullable Trap** | MEDIUM | Registration unique index `(event_id, user_id, student_id)` allows only one self-registration (`student_id = null`) across all users in standard MSSQL. | SQL Server standard unique index behavior on nullable columns. |

---

## 4. Event Lifecycle Inconsistency
In `#001`, section 22 defined:
$$\text{DRAFT} \to \text{PUBLISHED} \to (\text{CANCELLED} \lor \text{COMPLETED}) \to \text{ARCHIVED}$$
Additionally, direct transition $\text{DRAFT} \to \text{ARCHIVED}$ was permitted.

However, section 60 only listed:
- `POST /admin/events` (Create Draft)
- `PATCH /admin/events/:id` (Update)
- `POST /admin/events/:id/cancel` (Cancel)
- `POST /admin/events/:id/checkin` (Check-in)

The missing lifecycle endpoints (`publish`, `complete`, `archive`) and the lack of a staff list endpoint (`GET /admin/events`) left the contract incomplete.

---

## 5. Corrected Event Lifecycle
We adopt **Option A (Explicit Lifecycle Endpoints)**, aligning with the CMS and Announcement design patterns:

| From Status | To Status | Endpoint | Emits Application Event? | Replay Behavior |
| ----------- | --------- | -------- | ------------------------ | --------------- |
| `DRAFT` | `PUBLISHED` | `POST /admin/events/:id/publish` | `EventPublishedEvent` | 409 Conflict if already `PUBLISHED`. |
| `PUBLISHED` | `CANCELLED` | `POST /admin/events/:id/cancel` | `EventCancelledEvent` | 409 Conflict if already `CANCELLED`. |
| `PUBLISHED` | `COMPLETED` | `POST /admin/events/:id/complete` | **NO** (Silent completion) | 409 Conflict if already `COMPLETED`. |
| `DRAFT` | `ARCHIVED` | `POST /admin/events/:id/archive` | **NO** (Silent archive) | 409 Conflict if already `ARCHIVED`. |
| `CANCELLED` | `ARCHIVED` | `POST /admin/events/:id/archive` | **NO** (Silent archive) | 409 Conflict if already `ARCHIVED`. |
| `COMPLETED` | `ARCHIVED` | `POST /admin/events/:id/archive` | **NO** (Silent archive) | 409 Conflict if already `ARCHIVED`. |

**Forbidden Transitions (return 409 Conflict):**
- `PUBLISHED` \(\to\) `DRAFT`
- `CANCELLED` \(\to\) `PUBLISHED`
- `COMPLETED` \(\to\) `PUBLISHED`
- `ARCHIVED` \(\to\) any state (terminal archive)

---

## 6. Corrected Event API Inventory (13 Routes)
1. `GET /api/v1/events` — List active/upcoming published events visible to the authenticated actor (Learner, Parent, Catechist, Staff).
2. `GET /api/v1/events/:id` — Get single event detail and registration status for the authenticated actor.
3. `POST /api/v1/events/:id/registrations` — Register self or linked child for an event.
4. `POST /api/v1/events/:id/registrations/cancel` — Cancel active event registration.
5. `GET /api/v1/me/event-registrations` — List active and historical event registrations for current user and linked children.
6. `GET /api/v1/admin/events` — Staff list events (scoped by parish/class/global, filterable by status `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED`, `ARCHIVED`).
7. `POST /api/v1/admin/events` — Create event draft.
8. `PATCH /api/v1/admin/events/:id` — Update event details (allowed in `DRAFT`; allowed in `PUBLISHED` for non-structural fields; triggers `EventUpdatedEvent` if schedule/venue modified).
9. `POST /api/v1/admin/events/:id/publish` — Publish draft event (transitions `DRAFT` \(\to\) `PUBLISHED`; emits `EventPublishedEvent`).
10. `POST /api/v1/admin/events/:id/cancel` — Cancel published event (transitions `PUBLISHED` \(\to\) `CANCELLED`; requires reason; emits `EventCancelledEvent`).
11. `POST /api/v1/admin/events/:id/complete` — Mark event completed (transitions `PUBLISHED` \(\to\) `COMPLETED`; closes registrations; no notification).
12. `POST /api/v1/admin/events/:id/archive` — Archive event (transitions `DRAFT`/`CANCELLED`/`COMPLETED` \(\to\) `ARCHIVED`; soft removal from active views; no notification).
13. `POST /api/v1/admin/events/:id/checkin` — Check in registered attendee (`status = 'ATTENDED'`, sets `checked_in_at = NOW`).

---

## 7. Event Application-Event Emission Matrix
| Action | Status Transition | Application Event | Payload Details | Notification Generated? |
| ------ | ----------------- | ----------------- | --------------- | ----------------------- |
| Create | `NONE` \(\to\) `DRAFT` | *None* | — | No |
| Publish | `DRAFT` \(\to\) `PUBLISHED` | `EventPublishedEvent` | Event title, start date, venue, targets | **YES** (to targeted audience) |
| Significant Edit | `PUBLISHED` \(\to\) `PUBLISHED` | `EventUpdatedEvent` | Event title, changes summary, updated version | **YES** (to registered attendees + targets) |
| Minor Edit | `PUBLISHED` \(\to\) `PUBLISHED` | *None* | Description typos, metadata tweaks | No |
| Cancel | `PUBLISHED` \(\to\) `CANCELLED` | `EventCancelledEvent` | Event title, cancellation reason | **YES** (to registered attendees + targets) |
| Complete | `PUBLISHED` \(\to\) `COMPLETED` | *None* | Operational milestone | No |
| Archive | Any \(\to\) `ARCHIVED` | *None* | Storage lifecycle | No |

---

## 8. Notification Idempotency Gap
### The Vulnerability in #001
In `#001`:
- `notifications`: indexed by `(source_type, source_id)`.
- `notification_recipients`: unique on `(notification_id, recipient_user_id)`.

When an application event (e.g., `AnnouncementPublishedEvent`) was dispatched:
1. If the listener re-ran due to a retry, message bus redelivery, or transient network interruption, it inserted a **new** row into `notifications`.
2. The new row received a brand new `id` (e.g., UUID-2 instead of UUID-1).
3. The fan-out step inserted rows into `notification_recipients` referencing UUID-2.
4. Because the unique constraint was `(notification_id, recipient_user_id)`, `(UUID-2, User-A)` was completely valid alongside `(UUID-1, User-A)`.
5. **Result:** Every recipient received duplicate inbox notifications!

Furthermore, legitimate repeated updates (e.g., Event schedule changed at 10:00 AM, and venue changed at 2:00 PM) could not be distinguished from accidental retries if using a static `(source_type, source_id)` key.

---

## 9. Final Application Event Identity Model
To solve replay and distinct update identity without an extra receipt table, every communication application event must carry two explicit identifiers:
1. `applicationEventId`: A globally unique UUID v4 generated per dispatch attempt for tracing.
2. `operationKey`: A deterministic business identity string that remains strictly identical across retries of the same logical operation, but varies across legitimate subsequent updates.

### Deterministic Operation Key Grammar
- **Announcement Publication:** `ANNOUNCEMENT_PUBLISHED:<announcementId>`
- **Event Publication:** `EVENT_PUBLISHED:<eventId>`
- **Event Cancellation:** `EVENT_CANCELLED:<eventId>`
- **Event Update:** `EVENT_UPDATED:<eventId>:v<version>` (where `version` is an optimistic integer incremented on the `events` table upon every published modification).

---

## 10. Corrected Communication Event Contracts
Stored under `src/modules/application-events/contracts/`:

```typescript
export interface CommunicationTargetDescriptor {
  readonly targetType: 'GLOBAL' | 'PARISH' | 'CLASS' | 'ROLE';
  readonly parishId?: string | null;
  readonly classId?: string | null;
  readonly roleCode?: string | null;
}

export interface AnnouncementPublishedEvent {
  readonly applicationEventId: string;
  readonly operationKey: string; // e.g. "ANNOUNCEMENT_PUBLISHED:550e8400-e29b-41d4-a716-446655440000"
  readonly eventType: 'ANNOUNCEMENT_PUBLISHED';
  readonly announcementId: string;
  readonly title: string;
  readonly snippet: string;
  readonly priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  readonly targets: readonly CommunicationTargetDescriptor[];
  readonly publishedAt: Date;
}

export interface EventPublishedEvent {
  readonly applicationEventId: string;
  readonly operationKey: string; // e.g. "EVENT_PUBLISHED:6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  readonly eventType: 'EVENT_PUBLISHED';
  readonly eventId: string;
  readonly title: string;
  readonly snippet: string;
  readonly startsAt: Date;
  readonly venueName: string | null;
  readonly targets: readonly CommunicationTargetDescriptor[];
  readonly publishedAt: Date;
}

export interface EventUpdatedEvent {
  readonly applicationEventId: string;
  readonly operationKey: string; // e.g. "EVENT_UPDATED:6ba7b810-9dad-11d1-80b4-00c04fd430c8:v2"
  readonly eventType: 'EVENT_UPDATED';
  readonly eventId: string;
  readonly version: number;
  readonly title: string;
  readonly changeSummary: string;
  readonly startsAt: Date;
  readonly venueName: string | null;
  readonly targets: readonly CommunicationTargetDescriptor[];
  readonly updatedAt: Date;
}

export interface EventCancelledEvent {
  readonly applicationEventId: string;
  readonly operationKey: string; // e.g. "EVENT_CANCELLED:6ba7b810-9dad-11d1-80b4-00c04fd430c8"
  readonly eventType: 'EVENT_CANCELLED';
  readonly eventId: string;
  readonly title: string;
  readonly cancellationReason: string;
  readonly targets: readonly CommunicationTargetDescriptor[];
  readonly cancelledAt: Date;
}
```

---

## 11. Notification Header Uniqueness
The `notifications` table design is corrected to include the deterministic `operation_key`:

| Column | Type | Nullable | Description / Constraint |
| ------ | ---- | -------- | ------------------------ |
| `id` | `uniqueidentifier` | NO | Primary Key (UUID v4) |
| `operation_key` | `varchar(128)` | NO | **UNIQUE (`UQ_notifications_operation_key`)** |
| `application_event_id` | `uniqueidentifier` | NO | **UNIQUE (`UQ_notifications_application_event_id`)** |
| `source_type` | `varchar(32)` | NO | `'ANNOUNCEMENT'`, `'EVENT'`, `'SYSTEM'` |
| `source_id` | `uniqueidentifier` | NO | ID of source announcement or event |
| `notification_type` | `varchar(64)` | NO | e.g. `'ANNOUNCEMENT_PUBLISHED'`, `'EVENT_UPDATED'` |
| `title` | `nvarchar(200)` | NO | Safe display title snapshot |
| `snippet` | `nvarchar(500)` | NO | Safe preview text snapshot (no PII) |
| `action_url` | `nvarchar(500)` | NO | Client deep-link path (e.g. `/events/123`) |
| `created_at` | `datetime2` | NO | Timestamp of notification creation |

**Index Strategy:**
- `UQ_notifications_operation_key`: `UNIQUE (operation_key)`
- `UQ_notifications_application_event_id`: `UNIQUE (application_event_id)`
- `IX_notifications_source`: `INDEX (source_type, source_id)`

---

## 12. Recipient Uniqueness
The `notification_recipients` table remains:

| Column | Type | Nullable | Description / Constraint |
| ------ | ---- | -------- | ------------------------ |
| `id` | `uniqueidentifier` | NO | Primary Key (UUID v4) |
| `notification_id` | `uniqueidentifier` | NO | FK to `notifications.id` (ON DELETE CASCADE) |
| `recipient_user_id` | `uniqueidentifier` | NO | Recipient `users.id` |
| `is_read` | `bit` | NO | Default 0 (false) |
| `read_at` | `datetime2` | YES | Timestamp when marked read |
| `is_dismissed` | `bit` | NO | Default 0 (false) |
| `created_at` | `datetime2` | NO | Timestamp of delivery |

**Index Strategy:**
- `UQ_notification_recipients_notification_user`: `UNIQUE (notification_id, recipient_user_id)`
- `IX_notification_recipients_inbox`: `INDEX (recipient_user_id, is_read, created_at DESC)`

---

## 13. Announcement Publish Retry Semantics
1. Client calls `POST /api/v1/admin/announcements/:id/publish`.
2. Controller verifies authorization and checks announcement status:
   - If `status === 'PUBLISHED'`: Returns `409 Conflict` (`AnnouncementAlreadyPublishedError`).
   - If `status === 'ARCHIVED'`: Returns `409 Conflict` (`InvalidAnnouncementTransitionError`).
   - If `status === 'DRAFT'`:
     - Sets `status = 'PUBLISHED'`, `published_at = NOW()`.
     - Emits `AnnouncementPublishedEvent` with `operationKey = "ANNOUNCEMENT_PUBLISHED:" + id`.
3. If network fails and client retries:
   - Subsequent call sees `status === 'PUBLISHED'` and returns 409 without re-emitting.
   - If the event was already placed on the in-process bus, `NotificationOrchestrator` attempts insertion with `operation_key = "ANNOUNCEMENT_PUBLISHED:" + id`.
   - The unique constraint `UQ_notifications_operation_key` guarantees that a duplicate header cannot be inserted. The orchestrator catches the duplicate key exception and logs a silent idempotent completion.

---

## 14. Event Publish Retry Semantics
1. Client calls `POST /api/v1/admin/events/:id/publish`.
2. If `status !== 'DRAFT'`, returns `409 Conflict` (`InvalidEventTransitionError`).
3. In transaction:
   - Sets `status = 'PUBLISHED'`, `published_at = NOW()`.
   - Increments `version = 1`.
   - Emits `EventPublishedEvent` with `operationKey = "EVENT_PUBLISHED:" + id`.
4. Replay or re-dispatch is deduplicated at `notifications` by `operation_key`.

---

## 15. Event Update Operation Identity
1. A published event may undergo multiple legitimate updates over its lifecycle (e.g., date shift, venue change, time update).
2. The `events` table carries an optimistic integer column: `version: number` (default 0 upon draft creation, set to 1 upon initial publish).
3. Client calls `PATCH /api/v1/admin/events/:id`.
4. If `status === 'PUBLISHED'` and the patch alters significant fields (`startsAt`, `endsAt`, `venueName`, `address`, `capacity`):
   - In transaction, update fields and increment `version = version + 1`.
   - Emits `EventUpdatedEvent` with `version = event.version` and:
     $$\text{operationKey} = \text{"EVENT\_UPDATED:"} + id + \text{":v"} + version$$
5. Because `version` is monotonically incremented, update #1 gets `:v2`, and update #2 gets `:v3`. Both create distinct notification records for users.
6. A network retry of update #1 carries `:v2`, which hits `UQ_notifications_operation_key` and is safely deduplicated.

---

## 16. Event Cancellation Retry Semantics
1. Client calls `POST /api/v1/admin/events/:id/cancel` with `{ reason: string }`.
2. If `status === 'CANCELLED'`, returns `409 Conflict` (`EventAlreadyCancelledError`).
3. If `status !== 'PUBLISHED'`, returns `409 Conflict`.
4. In transaction:
   - Sets `status = 'CANCELLED'`, `cancelled_at = NOW()`, `cancellation_reason = reason`.
   - Increments `version = version + 1`.
   - Emits `EventCancelledEvent` with `operationKey = "EVENT_CANCELLED:" + id`.
5. Deduplication at `notifications` is guaranteed by `operation_key = "EVENT_CANCELLED:" + id`.

---

## 17. Notification Replay Behavior
```
                      [Application Event Dispatched]
                                     │
                                     ▼
                      [Notification Orchestrator]
                                     │
                   Check UQ_notifications_operation_key
                                     │
                 ┌───────────────────┴───────────────────┐
                 │                                       │
           Row Exists                              Row Not Found
                 │                                       │
                 ▼                                       ▼
       [Log Idempotent No-Op]                 [Insert notifications Header]
       (Skip Recipient Fan-out)                          │
                                                         ▼
                                               [Resolve Target Users]
                                                         │
                                                         ▼
                                            [Batch Insert Recipients (500/chunk)]
                                            (Protected by UQ_notification_id_user)
```

This guarantees:
1. Exact zero duplicate notification headers.
2. Exact zero duplicate recipient rows.
3. Completely safe asynchronous re-dispatch.

---

## 18. Final Notifications Schema Correction
The `notifications` entity in `#002` will be declared with:
```typescript
@Entity('notifications')
@Index('UQ_notifications_operation_key', ['operationKey'], { unique: true })
@Index('UQ_notifications_application_event_id', ['applicationEventId'], { unique: true })
@Index('IX_notifications_source', ['sourceType', 'sourceId'])
export class NotificationEntity {
  @PrimaryColumn({ type: 'uniqueidentifier' })
  id: string = generateUuidV4();

  @Column({ type: 'varchar', length: 128, name: 'operation_key' })
  operationKey!: string;

  @Column({ type: 'uniqueidentifier', name: 'application_event_id' })
  applicationEventId!: string;

  @Column({ type: 'varchar', length: 32, name: 'source_type' })
  sourceType!: string;

  @Column({ type: 'uniqueidentifier', name: 'source_id' })
  sourceId!: string;

  @Column({ type: 'varchar', length: 64, name: 'notification_type' })
  notificationType!: string;

  @Column({ type: 'nvarchar', length: 200 })
  title!: string;

  @Column({ type: 'nvarchar', length: 500 })
  snippet!: string;

  @Column({ type: 'nvarchar', length: 500, name: 'action_url' })
  actionUrl!: string;

  @CreateDateColumn({ type: 'datetime2', name: 'created_at' })
  createdAt!: Date;
}
```

---

## 19. CMS Slug Uniqueness MSSQL Strategy
### The MSSQL Null Trap
In MSSQL, a standard `UNIQUE (scope_type, parish_id, slug)` index allows only **one** row with `parish_id = NULL`. As soon as a second `GLOBAL` CMS entry is inserted, MSSQL throws a duplicate key violation.

### Solution: Non-null `scope_key`
Following the proven pattern from `mission_definitions` in Gamification (`scope_key`), we add a non-null persisted column `scope_key` to `cms_entries`:
- If `scope_type === 'GLOBAL'`: `scope_key = 'GLOBAL'`
- If `scope_type === 'PARISH'`: `scope_key = 'PARISH:' + parishId`

**Constraint:**
`@Index('UQ_cms_entries_scope_slug', ['scopeKey', 'slug'], { unique: true })`

**Benefits:**
- Guaranteed non-null in all cases.
- Fully portable and compatible across MSSQL, PostgreSQL, SQLite, and MySQL.
- Enforces unique slugs within Global and unique slugs within each Parish independently.

---

## 20. Event Registration Uniqueness MSSQL Strategy
### The MSSQL Null Trap
In `#001`, `event_registrations` proposed: `UNIQUE (event_id, user_id, student_id)`.
When a user self-registers, `student_id` is `NULL`. In MSSQL, only one row with `student_id = NULL` could ever exist per event across all users!

### Solution: Non-null `registrant_key`
We add a non-null persisted column `registrant_key` to `event_registrations`:
- For self-registration: `registrant_key = 'USER:' + userId`
- For parent registering a child: `registrant_key = 'STUDENT:' + studentId`

**Constraint:**
`@Index('UQ_event_registrations_event_registrant', ['eventId', 'registrantKey'], { unique: true })`

**Benefits:**
- Prevents a user from registering twice for the same event.
- Prevents a student from being registered twice by two different parents or guardians.
- Strictly non-null, completely eliminating MSSQL nullable unique index bugs.

---

## 21. Event Targeting Model Reconciliation
To eliminate conflicts between the Event's administrative scope and audience targeting:
1. **Administrative Scope (`events.scope_type`, `events.parish_id`, `events.class_id`):**
   - Canonical for **ownership and management**.
   - `GLOBAL`: SuperAdmin only.
   - `PARISH`: ParishAdmin of that parish.
   - `CLASS`: Catechist assigned to that class or ParishAdmin of the owning parish.
2. **Audience Targeting (`event_targets` table):**
   - Canonical for **visibility and registration eligibility**.
   - If `event_targets` has 0 rows for an event:
     - The event audience automatically defaults to the event's administrative scope (e.g. all members of Parish X).
   - If `event_targets` has 1+ rows:
     - The audience is explicitly defined by those rows (e.g., restricted to specific classes, or restricted to `ROLE:CATECHIST`).
   - Clean, unambiguous, and eliminates redundant or conflicting rules.

---

## 22. Final Table Count
The final table count is confirmed at exactly **10 tables** (no extra receipt table needed due to `operation_key` on `notifications`):
1. `cms_entries` (CmsModule)
2. `announcements` (AnnouncementsModule)
3. `announcement_targets` (AnnouncementsModule)
4. `announcement_user_states` (AnnouncementsModule)
5. `events` (EventsModule)
6. `event_targets` (EventsModule)
7. `event_registrations` (EventsModule)
8. `notifications` (NotificationsModule)
9. `notification_recipients` (NotificationsModule)
10. `notification_devices` (NotificationsModule)

**FINAL TABLE COUNT = 10**

---

## 23. Corrected Route Counts per Module
- **CMS Module:** 6 routes
- **Announcements Module:** 8 routes
- **Events Module:** 13 routes (added `GET /admin/events`, `publish`, `complete`, `archive`)
- **Notifications Module:** 6 routes

---

## 24. Corrected Total Route Count
$$\text{Total Routes} = 6 + 8 + 13 + 6 = \mathbf{33}$$

### Complete Route Inventory
#### CMS Module (6 Routes)
1. `GET /api/v1/cms/entries` — List published CMS entries (public/scoped)
2. `GET /api/v1/cms/entries/:slug` — Get published CMS entry by slug (public/scoped)
3. `POST /api/v1/cms/entries` — Create CMS entry draft
4. `PATCH /api/v1/cms/entries/:id` — Update CMS entry
5. `POST /api/v1/cms/entries/:id/publish` — Publish CMS entry
6. `POST /api/v1/cms/entries/:id/archive` — Archive CMS entry

#### Announcements Module (8 Routes)
7. `GET /api/v1/announcements` — List active visible announcements for authenticated actor
8. `GET /api/v1/announcements/:id` — Get announcement details (records lazy first seen)
9. `POST /api/v1/announcements/:id/dismiss` — Dismiss announcement for current user
10. `GET /api/v1/admin/announcements` — Staff list announcements (scoped)
11. `POST /api/v1/admin/announcements` — Create announcement draft
12. `PATCH /api/v1/admin/announcements/:id` — Update announcement
13. `POST /api/v1/admin/announcements/:id/publish` — Publish announcement (triggers notifications)
14. `POST /api/v1/admin/announcements/:id/archive` — Archive announcement

#### Events Module (13 Routes)
15. `GET /api/v1/events` — List published upcoming visible events
16. `GET /api/v1/events/:id` — Get event details and registration status
17. `POST /api/v1/events/:id/registrations` — Register self or linked child
18. `POST /api/v1/events/:id/registrations/cancel` — Cancel registration
19. `GET /api/v1/me/event-registrations` — List my registrations
20. `GET /api/v1/admin/events` — Staff list events (scoped)
21. `POST /api/v1/admin/events` — Create event draft
22. `PATCH /api/v1/admin/events/:id` — Update event
23. `POST /api/v1/admin/events/:id/publish` — Publish event (triggers notifications)
24. `POST /api/v1/admin/events/:id/cancel` — Cancel event (triggers notifications)
25. `POST /api/v1/admin/events/:id/complete` — Mark event completed
26. `POST /api/v1/admin/events/:id/archive` — Archive event
27. `POST /api/v1/admin/events/:id/checkin` — Check in attendee

#### Notifications Module (6 Routes)
28. `GET /api/v1/me/notifications` — List user notifications (paginated)
29. `GET /api/v1/me/notifications/unread-count` — Get unread notification count
30. `POST /api/v1/me/notifications/:id/read` — Mark notification as read
31. `POST /api/v1/me/notifications/read-all` — Mark all notifications as read
32. `POST /api/v1/me/notification-devices` — Register push device token
33. `DELETE /api/v1/me/notification-devices/:id` — Deregister push device token

**FINAL TOTAL ROUTE COUNT = 33**

---

## 25. Updated Idempotency Strategy
1. **Application Event Level:** Events carry `applicationEventId` (UUID) and `operationKey` (deterministic string).
2. **Notification Storage Level:** `notifications.operation_key` has a strict DB unique constraint (`UQ_notifications_operation_key`).
3. **Recipient Level:** `notification_recipients` has a strict DB unique constraint (`UQ_notification_recipients_notification_user`).
4. **Registration Level:** `event_registrations.registrant_key` has a strict DB unique constraint (`UQ_event_registrations_event_registrant`).
5. **CMS Slug Level:** `cms_entries.scope_key + slug` has a strict DB unique constraint (`UQ_cms_entries_scope_slug`).

---

## 26. Updated Index / Unique Strategy
1. `cms_entries`:
   - `UQ_cms_entries_scope_slug`: `UNIQUE (scope_key, slug)`
   - `IX_cms_entries_status_published`: `INDEX (status, published_at)`
2. `announcements`:
   - `IX_announcements_status_window`: `INDEX (status, starts_at, ends_at)`
   - `IX_announcements_parish_status`: `INDEX (parish_id, status)`
3. `announcement_targets`:
   - `IX_announcement_targets_announcement`: `INDEX (announcement_id)`
   - `IX_announcement_targets_lookup`: `INDEX (target_type, parish_id, class_id)`
4. `announcement_user_states`:
   - `UQ_announcement_user_states`: `UNIQUE (announcement_id, user_id)`
   - `IX_announcement_user_states_user`: `INDEX (user_id, read_at)`
5. `events`:
   - `UQ_events_code`: `UNIQUE (code)`
   - `IX_events_status_window`: `INDEX (status, starts_at, ends_at)`
   - `IX_events_parish_status`: `INDEX (parish_id, status)`
6. `event_targets`:
   - `IX_event_targets_event`: `INDEX (event_id)`
7. `event_registrations`:
   - `UQ_event_registrations_event_registrant`: `UNIQUE (event_id, registrant_key)`
   - `IX_event_registrations_event_status`: `INDEX (event_id, status)`
   - `IX_event_registrations_user`: `INDEX (user_id, status)`
8. `notifications`:
   - `UQ_notifications_operation_key`: `UNIQUE (operation_key)`
   - `UQ_notifications_application_event_id`: `UNIQUE (application_event_id)`
   - `IX_notifications_source`: `INDEX (source_type, source_id)`
9. `notification_recipients`:
   - `UQ_notification_recipients_notification_user`: `UNIQUE (notification_id, recipient_user_id)`
   - `IX_notification_recipients_inbox`: `INDEX (recipient_user_id, is_read, created_at DESC)`
10. `notification_devices`:
    - `UQ_notification_devices_token`: `UNIQUE (user_id, token)`
    - `IX_notification_devices_active`: `INDEX (user_id, is_active)`

---

## 27. Risks / Deferred
- External push notification gateway connections (FCM / APNs) remain deferred.
- Event waitlists remain deferred to keep concurrency model simple.
- Localization automation pipeline remains decoupled in MVP.

---

## 28. Defect Classifications
- **BLOCKER:** 0
- **HIGH:** 0 (Both inherited #001 HIGH issues resolved)
- **MEDIUM:** 0 (MSSQL nullable unique traps resolved)
- **LOW:** 0

---

## 29. #002 Readiness
All contracts, lifecycle operations, idempotency keys, and schema constraints are rigorously defined and reconciled.
**READY TO PROCEED TO PROMPT #002: YES.**

---

## 30. Commit Recommendation
Audit and corrective design report only. No production files modified. If tracked changes exist, use:
```powershell
git commit -m "docs(community): add corrective design audit for event lifecycle and notification idempotency"
```

---

## REQUIRED VERDICTS

EVENT LIFECYCLE/API CONTRACT CONSISTENT: YES

EVENT PUBLISH CONTRACT READY: YES
EVENT COMPLETE CONTRACT READY: YES
EVENT ARCHIVE CONTRACT READY: YES

COMMUNICATION APPLICATION EVENT IDENTITY READY: YES

ANNOUNCEMENT PUBLISH RETRY IDEMPOTENT: YES
EVENT PUBLISH RETRY IDEMPOTENT: YES
EVENT UPDATE MULTI-OPERATION SAFE: YES
EVENT CANCEL RETRY IDEMPOTENT: YES

NOTIFICATION HEADER REPLAY DEDUPE READY: YES
NOTIFICATION RECIPIENT DEDUPE READY: YES

CMS SLUG UNIQUENESS MSSQL SAFE: YES
EVENT REGISTRATION UNIQUENESS MSSQL SAFE: YES

EVENT TARGET MODEL CONSISTENT: YES

FINAL TABLE COUNT: 10

FINAL CMS ROUTE COUNT: 6
FINAL ANNOUNCEMENT ROUTE COUNT: 8
FINAL EVENT ROUTE COUNT: 13
FINAL NOTIFICATION ROUTE COUNT: 6
FINAL TOTAL ROUTE COUNT: 33

Unresolved BLOCKER count: 0
Unresolved HIGH count: 0
Unresolved MEDIUM count: 0

#002 READINESS: YES
