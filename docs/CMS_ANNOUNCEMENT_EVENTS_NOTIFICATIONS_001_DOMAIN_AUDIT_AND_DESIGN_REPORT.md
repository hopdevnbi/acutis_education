# CMS + ANNOUNCEMENT + EVENTS + NOTIFICATIONS #001/7 — DOMAIN AUDIT AND DESIGN REPORT

**Date:** 2026-09-05  
**Mode:** AUDIT / DESIGN ONLY — Fast Implementation Mode  
**Prior Phase:** GAMIFICATION + FAITH JOURNEY IMPLEMENTATION PHASE COMPLETE (validation deferred)  
**Next Phase:** CMS + ANNOUNCEMENT + EVENTS + NOTIFICATIONS (prompts #001–#007)

---

## 1. Objective
Establish the bounded contexts, ownership boundaries, entity schemas, publishing and delivery workflows, RBAC and actor scoping, minor safety controls, API contracts, cross-module dependency graph, and exact 7-prompt implementation plan for:
1. **CMS** (Editorial & Informational Content)
2. **Announcements** (Targeted Operational & Community Broadcasts)
3. **Events** (Scheduled Gatherings, Registration & Check-in)
4. **Notifications** (User Inbox, Delivery State & Device Tokens)

All designs follow **Fast Implementation Mode** (`.cursor/rules/04-fast-implementation-mode.mdc`). No runtime validation or production business code is executed in this design prompt.

---

## 2. Roadmap Position
| Phase | Domain Capabilities | Status |
| ----- | ------------------- | ------ |
| Core Monolith Baseline | Auth, RBAC, Parish, Academic Structure, Student, Class, Enrollment | Complete |
| Pedagogical Engines | Curriculum, Question Bank, Learning Content, Practice, Exam | Complete |
| Operations & Engagement | Class Operations (Attendance), Gamification & Faith Journey | Complete (Validation Deferred) |
| **Community & Communications** | **CMS + Announcements + Events + Notifications** | **#001/7 Domain Audit & Design** |
| Cross-Cutting Stabilization | FE Integration / Stabilization / Validation Phase | Scheduled after Community phase |

Estimated capability size: **7 prompts** (strictly adheres to the 6–8 prompt guideline).

---

## 3. Existing Related Modules
| Existing Module | Public Facade | Owned Data | Relevant Interaction |
| --------------- | ------------- | ---------- | -------------------- |
| `parish` | `ParishService`, `ParishScopeService` | Parishes, memberships | Parish boundary scoping for CMS, announcements, events |
| `class` | `ClassService`, `ClassCatechistAssignmentService` | Classes, catechist assignments | Class audience targeting, catechist scope verification |
| `enrollment` | `EnrollmentService`, `EnrollmentQueryService` | Enrollments | Verifying student class enrollments and guardian scope |
| `student` | `StudentService`, `StudentGuardianService` | Students, guardian links | Verifying parent-guardian relationships for minor registrations |
| `users` | `UserAccountService` | User accounts, roles | Recipient ID resolution for notification delivery |
| `media` | `MediaAssetService` | Media assets (S3/local) | Cover images and attachments via scalar `mediaAssetId` |
| `localization` | `LocalizationService` | Translation registry/jobs | Direct content authoring; translation decoupled in MVP |
| `class-operations` | `ClassOperationsService` | Class sessions, roster attendance | **Strict separation:** Event check-ins do NOT touch class attendance |
| `application-events`| `ApplicationEventBus` | In-process event publisher | Decoupling announcement/event publishing from notification delivery |

---

## 4. Existing ApplicationEvents Infrastructure
- Located in `src/modules/application-events/`.
- Currently provides an in-process, asynchronous `ApplicationEventBus` implementing `ApplicationEventPublisher`.
- Decouples event producers from consumers with isolated try-catch execution (producer transactions never fail if event handlers encounter errors).
- **Design Extension (#002):** Extend `ApplicationEventsModule` to support generic community communication contracts (`AnnouncementPublishedEvent`, `EventPublishedEvent`, `EventCancelledEvent`) alongside existing reward events.

---

## 5. Existing Scheduling / Background Infrastructure
- Codebase inspection reveals **no continuous daemon, cron scheduler, or Redis/Bull queue** installed in `package.json`.
- Current project pattern for background jobs: deterministic CLI scripts run on demand or via cron tasks (e.g., `scripts/localization-process-jobs.ts` using `NestFactory.createApplicationContext`).
- **Scheduling Strategy:**
  - Entities store `scheduledFor`, `startsAt`, `endsAt`, `publishedAt`, and `expiresAt` timestamps.
  - Read queries perform dynamic temporal filtering without relying on background job execution.
  - Explicit batch transition endpoints / runner scripts (`scripts/process-scheduled-publications.ts`) are provided for scheduled publishing.
  - **No GET-time database mutations.**

---

## 6. Bounded-Context Options

### OPTION A — Four Distinct Modules (`cms`, `announcements`, `events`, `notifications`)
- `cms`: Pure public/editorial content (articles, static pages, news).
- `announcements`: Targeted operational and parish broadcasts with audience scoping and lazy user read-states.
- `events`: Scheduled gatherings, calendar events, optional capacity-managed registrations, and check-ins.
- `notifications`: User inbox records, delivery state (`DELIVERED`, `READ`), unread badge count, and mobile/web device push token registry.
- **Evaluation:** High cohesion, low coupling, zero circular dependencies, clean microservice extraction boundaries, and natural mapping to the 7-prompt roadmap.

### OPTION B — Three Modules (`cms`, `communications`, `events`)
- Combines Announcements and Notifications into `communications`.
- **Evaluation:** Conflates durable bulletin broadcasts with personal user inbox delivery. When future modules (e.g., Exam reminders, Attendance alerts) trigger notifications, routing through `communications` blurs domain responsibilities.

### OPTION C — Two Modules (`content-communications`, `events`)
- Merges CMS, Announcements, and Notifications into a single broad content module.
- **Evaluation:** High risk of god-module antipattern; couples anonymous public CMS caching with authenticated per-user inbox state.

### OPTION D — One Monolithic Module (`communications`)
- Aggregates CMS, Announcements, Events, and Notifications into one mega-module.
- **Evaluation:** Violates single-responsibility principle and project modular architecture rules.

---

## 7. Final Module Strategy
**Option A: Four Distinct Monolithic Modules.** Each module maintains strict ownership over its controllers, services, entities, DTOs, and test suites.

---

## 8. Final Module Names
1. `src/modules/cms/` (`CmsModule`)
2. `src/modules/announcements/` (`AnnouncementsModule`)
3. `src/modules/events/` (`EventsModule`)
4. `src/modules/notifications/` (`NotificationsModule`)

---

## 9. CMS Ownership
- **Owns:**
  - Static parish and portal informational pages (e.g., "About Parish", "Catechism Rules", "Contact Us", "Terms").
  - General editorial articles, pastor reflections, and platform news items.
  - Featured / pinned editorial highlights and cover media references.
  - Editorial publication states (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`).
- **Does NOT Own:**
  - Curriculum lessons, units, or topics (owned by `curriculum`).
  - Learning documents or catechism question banks (owned by `learning-content` & `question-bank`).
  - Class cancellation alerts or time-sensitive operational notices (owned by `announcements`).
  - Scheduled liturgical gatherings or parish retreats (owned by `events`).

---

## 10. CMS Content Model
- Stored in a single table `cms_entries` with a `type` discriminator:
  - `PAGE`: Evergreen static page accessed via unique slug.
  - `ARTICLE`: Time-stamped blog post, pastoral letter, or parish feature.
  - `NEWS`: Short informational update for public display.
- Content body: Sanitized Markdown or structured HTML text stored in `nvarchar(MAX)` (max 64KB).
- Human-readable slugs:
  - `GLOBAL` entries: unique `slug`.
  - `PARISH` entries: unique `(parish_id, slug)`.
- Scalar media reference: `cover_media_asset_id` (UUID nullable).

---

## 11. CMS Lifecycle
- **States:** `DRAFT` \(\to\) `SCHEDULED` \(\to\) `PUBLISHED` \(\to\) `ARCHIVED`.
- **Transitions:**
  - `DRAFT` \(\to\) `PUBLISHED`: Immediate publication (sets `published_at = NOW`).
  - `DRAFT` \(\to\) `SCHEDULED`: Sets `scheduled_for > NOW`.
  - `SCHEDULED` \(\to\) `PUBLISHED`: Transition executed via scheduler script or manual admin publish action once `scheduled_for <= NOW`.
  - `PUBLISHED` \(\to\) `ARCHIVED`: Soft removal from public feeds.
  - `DRAFT` \(\to\) `ARCHIVED`: Direct archival without publication.
- **Immutability:** Once published, `slug` and `scope_type` are immutable to protect links. Title, summary, body, and featured flags remain editable.

---

## 12. CMS Access / RBAC
- Permissions:
  - `cms.read`: Read published CMS content.
  - `cms.manage`: Create, update, publish, archive, or delete draft CMS entries.
- Scope rules:
  - `SUPER_ADMIN`: Manage `GLOBAL` and all `PARISH` entries.
  - `PARISH_ADMIN`: Manage `PARISH` entries for own parish only. Denied `GLOBAL`.
  - `CATECHIST`, `PARENT`, `STUDENT`: Read-only access to published content.

---

## 13. CMS Public / Private Read Strategy
- **Public Anonymous:** `GET /api/v1/cms/entries` and `GET /api/v1/cms/entries/:slug` allow unauthenticated access for `GLOBAL` entries with `status = 'PUBLISHED'`.
- **Parish-Scoped:** Authenticated users provide authorization headers; endpoints return both `GLOBAL` and user's active `PARISH` entries.

---

## 14. CMS Localization
- **MVP Strategy:** Content is authored directly in the designated parish language with a `locale` field (e.g., `'vi-VN'` default).
- No GET-time translation or hard coupling to `LocalizationModule` in MVP. Multi-language revision records deferred to future enhancement.

---

## 15. Announcement Ownership
- **Owns:**
  - Time-sensitive operational alerts and pastoral broadcasts.
  - Audience targeting rules (GLOBAL, PARISH, CLASS, ROLE).
  - Priority levels (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
  - Active display windows (`starts_at`, `ends_at`) and pinned flags (`is_pinned`).
  - Lazy user read, first seen, and dismissal receipts.
- **Does NOT Own:**
  - Long-form static website pages (owned by `cms`).
  - Personal notification inbox items and push delivery (owned by `notifications`).

---

## 16. Announcement Targeting
- Stored in `announcement_targets` joined to `announcements`.
- **Target Types:**
  1. `GLOBAL`: All platform users.
  2. `PARISH`: All members (catechists, parents, learners) of a specific parish.
  3. `CLASS`: Catechists assigned to the class, students enrolled in the class, and verified parents of those students.
  4. `ROLE`: Specific roles within a parish (e.g., all `CATECHIST`s in Parish X).
- Targeting uses scalar cross-module IDs (`parish_id`, `class_id`, `role_code`).

---

## 17. Announcement Lifecycle
- **States:** `DRAFT` \(\to\) `PUBLISHED` \(\to\) `ARCHIVED`.
- Publishing an announcement:
  1. Sets `status = 'PUBLISHED'`, `published_at = NOW`.
  2. Emits an asynchronous, post-commit `AnnouncementPublishedEvent`.
  3. Triggers the `NotificationsModule` to generate inbox notifications for targeted recipients.

---

## 18. Announcement User-State Model
- Stored in `announcement_user_states`:
  - `announcement_id` (UUID), `user_id` (UUID), `first_seen_at` (Date), `read_at` (Date nullable), `dismissed_at` (Date nullable).
  - Unique composite index: `(announcement_id, user_id)`.
- **Lazy Recording (No Fan-out Explosion):**
  - Publication does NOT insert millions of unread rows.
  - Rows are inserted/updated lazily when the user fetches, views, or dismisses an announcement.

---

## 19. Announcement vs Notification
| Aspect | Announcement | Notification |
| ------ | ------------ | ------------ |
| **Concept** | Durable communication bulletin | Ephemeral delivery message pointing to an action |
| **Storage** | Full markdown body, targets, author, window | Short title, summary snippet, `actionUrl`, `sourceId` |
| **Audience** | Broadcast criteria (Parish, Class, Role) | Concrete materialized per-user inbox records |
| **UI Surface** | Bulletin Board / Newsfeed screen | Bell icon / Notification Center drawer / Push banner |

---

## 20. Announcement Localization
- Primary authoring with an explicit `locale` tag (default `'vi-VN'`).
- Translations are handled by authoring target-specific announcements per locale if needed in MVP. No automated translation job dependencies.

---

## 21. Event Ownership
- **Owns:**
  - Calendar events, retreats, parish festivals, youth vigils, parent meetings.
  - Event metadata: venue, address, start/end dates, timezone, capacity.
  - Registration requirements, deadlines, and attendee records.
  - Event check-in / attendance records.
- **Does NOT Own:**
  - Weekly catechism academic classes (owned by `class-operations`).
  - Class session attendance marks (owned by `class-operations`).

---

## 22. Event Lifecycle
- **States:** `DRAFT` \(\to\) `PUBLISHED` \(\to\) `CANCELLED` | `COMPLETED` \(\to\) `ARCHIVED`.
- Cancelling an event updates `status = 'CANCELLED'` and emits `EventCancelledEvent` to alert registered attendees via `notifications`.

---

## 23. Event Time Model
- All database timestamps (`starts_at`, `ends_at`, `registration_deadline`) are stored strictly in **UTC**.
- An explicit `timezone` column (e.g., `'Asia/Ho_Chi_Minh'`) is stored to enable deterministic calendar exports (.ics) and local display formatting.

---

## 24. Event Visibility / Targeting
- Scopes:
  - `GLOBAL`: Open to all parishioners across the diocese.
  - `PARISH`: Restricted to members of the owning parish.
  - `CLASS`: Restricted to catechists, students, and parents of a specific class.
- Optional explicit audience targeting via `event_targets` table.

---

## 25. Event Registration
- Configurable per event: `is_registration_required` (boolean).
- Records stored in `event_registrations`:
  - `status`: `REGISTERED` | `CANCELLED` | `ATTENDED` | `NO_SHOW`.
  - Handles self-registration (`user_id = authUser.userId`) and parent registration for a child (`student_id = childId`).
  - Unique index: `(event_id, user_id, student_id)` prevents double registration.

---

## 26. Event Capacity / Waitlist
- `capacity`: Integer nullable (`null` = unlimited).
- Concurrency control: Registration checks active count (`status = 'REGISTERED'`) against `capacity` inside a database transaction.
- **Waitlist in MVP: NO (deferred).** Avoids non-deterministic queue management in MVP.

---

## 27. Event Attendance vs Class Attendance Boundary
- Event check-in updates `checked_in_at` and sets `status = 'ATTENDED'` on `event_registrations`.
- **Zero cross-table pollution:** Event attendance never touches `class_session_attendance` or `class_sessions`.

---

## 28. Event Notification Integration
- Event publishing, significant schedule updates, or cancellations emit neutral application events:
  - `EVENT_PUBLISHED`
  - `EVENT_UPDATED`
  - `EVENT_CANCELLED`
- `NotificationsModule` consumes these events and populates recipient inboxes.

---

## 29. Event Localization
- Direct locale tag on event entity (`locale: string`). Multi-language event cloning supported via administrative copy.

---

## 30. Notification Ownership
- **Owns:**
  - Notification header records (`notifications`) with snapshot title, snippet, and deep-link `actionUrl`.
  - Recipient inbox delivery rows (`notification_recipients`) with `is_read`, `read_at`, `is_dismissed`.
  - Push device token registrations (`notification_devices`).
- **Does NOT Own:**
  - Upstream announcement or event bodies.
  - Student or user personal profiles.

---

## 31. Notification Persistence
- Split into two core tables:
  1. `notifications`: Message payload and source reference.
  2. `notification_recipients`: Materialized per-user inbox state.

---

## 32. Notification Recipient Model
- When an event or announcement is published, target user IDs are resolved into concrete recipient rows in `notification_recipients`.
- Allows instant \(O(1)\) unread count queries:
  `SELECT COUNT(*) FROM notification_recipients WHERE recipient_user_id = :userId AND is_read = false`.

---

## 33. Notification Fan-out Strategy
- Asynchronous target expansion executed by `NotificationOrchestrator`.
- Inserts recipient rows in bounded batches of 500 records to prevent long-running transaction locks.
- For typical parish/class sizes (20–1,000 members), fan-out completes in sub-second in-memory batch inserts.

---

## 34. Notification Inbox / Read Model
- Unified user inbox routes:
  - `GET /api/v1/me/notifications`: Paginated user notifications ordered `created_at DESC`.
  - `GET /api/v1/me/notifications/unread-count`: Returns `{ unreadCount: number }`.
  - `POST /api/v1/me/notifications/:id/read`: Marks individual notification as read.
  - `POST /api/v1/me/notifications/read-all`: Bulk marks all unread notifications as read.
- Authorization: Scoped strictly to `authenticatedUser.userId`. No user can read or modify another user's inbox.

---

## 35. Notification Targeting
- Target resolution delegates strictly to public domain facades:
  - Parish members: `ParishScopeService.listActiveMembers()`.
  - Class rosters: `ClassService.listClassMembers()`, `EnrollmentQueryService`.
  - Parent guardians: `StudentGuardianService.listActiveGuardians()`.
- **Zero direct access to foreign repositories.**

---

## 36. Notification Devices Decision
- **NOTIFICATION DEVICES IN MVP: YES.**
- Table `notification_devices` and endpoints (`POST /api/v1/me/notification-devices`, `DELETE /api/v1/me/notification-devices/:id`) are implemented in MVP.
- Allows mobile apps (React Native / Expo / Flutter) to register push tokens during login.

---

## 37. Notification Preferences Decision
- **NOTIFICATION PREFERENCES IN MVP: NO (deferred).**
- Avoids dead configuration tables before multiple external provider channels (SMS/Email/Push) are live.

---

## 38. Push / Email / SMS Scope
- **IN-APP NOTIFICATIONS IN MVP: YES.** (Full inbox, read/unread states, unread counts).
- **PUSH DELIVERY IN MVP: NO.** (Device token registration implemented; outbound provider delivery simulated/logged).
- **EMAIL / SMS IN MVP: NO.** (Deferred to future communication provider milestone).

---

## 39. Generic Manual Notification Decision
- **GENERIC MANUAL NOTIFICATION CREATE IN MVP: NO.**
- Prevents untracked spam. Notifications must originate from auditable system events (Announcements, Events, Academic alerts).

---

## 40. CMS / Announcement / Event Media Strategy
- Media assets referenced via scalar UUID `cover_media_asset_id` pointing to `media_assets.id`.
- Multi-attachments for announcements supported via `announcement_attachments` join table.
- No cross-module TypeORM entity relationships.

---

## 41. Security & Minors
- Follows `.cursor/rules/01-security-privacy-minors.mdc`.
- No public directory of children.
- No sensitive notes, attendance penalties, or pastoral confidences in announcement or notification bodies.
- Push and notification payloads contain safe generic summaries; deep-links re-verify server-side permissions upon access.

---

## 42. Parent Child-Specific Safety
- Parents only receive child-specific notifications if an active, persisted relationship exists in `student_guardians`.
- Parent event registration on behalf of a child enforces server-derived guardian verification.

---

## 43. Catechist / Class Scope
- Catechists can only create announcements and events for classes to which they are actively assigned (`ClassCatechistAssignmentService`).
- Attempting to target unassigned classes or parish-wide scope returns `403 Forbidden`.

---

## 44. ParishAdmin Scope
- ParishAdmins can manage CMS, announcements, and events within their own parish.
- Attempting to publish or read cross-parish content returns `403 Forbidden`.

---

## 45. SuperAdmin Scope
- Global administrative oversight across all parishes, global CMS pages, and system-wide announcements.

---

## 46. Actor Read Models
- **Learner:** Receives published announcements and events targeted to global, own parish, and enrolled classes; personal inbox at `/me/notifications`.
- **Parent:** Receives announcements and events targeted to parents, parish, and linked children's classes; can register children for events.
- **Staff / Catechist:** Manages assigned class announcements/events; views attendee rosters; receives operational notifications.

---

## 47. Exact Permission Set
A compact, cohesive set of 11 permissions:
1. `cms.read`: Read published CMS entries.
2. `cms.manage`: Create, edit, schedule, archive CMS entries.
3. `announcements.read`: View visible announcements.
4. `announcements.manage`: Create, edit, archive announcements.
5. `announcements.publish`: Publish announcements (triggers notification fan-out).
6. `events.read`: View visible events.
7. `events.manage`: Create, edit, cancel, archive events.
8. `events.register`: Register self or linked child for an event.
9. `events.checkin`: Check in attendees at an event.
10. `notifications.read`: Access personal notification inbox.
11. `notifications.devices`: Register/remove personal push devices.

---

## 48. Role Matrix
| Role | CMS | Announcements | Events | Notifications |
| ---- | --- | ------------- | ------ | ------------- |
| `SUPER_ADMIN` | `cms.read`, `cms.manage` (Global + All Parishes) | `announcements.read`, `announcements.manage`, `announcements.publish` (Global + All) | `events.read`, `events.manage`, `events.checkin` | `notifications.read`, `notifications.devices` |
| `PARISH_ADMIN` | `cms.read`, `cms.manage` (Own Parish) | `announcements.read`, `announcements.manage`, `announcements.publish` (Own Parish) | `events.read`, `events.manage`, `events.checkin` (Own Parish) | `notifications.read`, `notifications.devices` |
| `CATECHIST` | `cms.read` | `announcements.read`, `announcements.manage`, `announcements.publish` (Assigned Class) | `events.read`, `events.manage`, `events.checkin` (Assigned Class) | `notifications.read`, `notifications.devices` |
| `PARENT` | `cms.read` | `announcements.read` (Scoped) | `events.read`, `events.register` (Child/Self) | `notifications.read`, `notifications.devices` |
| `STUDENT` | `cms.read` | `announcements.read` (Scoped) | `events.read`, `events.register` (Self) | `notifications.read`, `notifications.devices` |

---

## 49. Exact Table Set (10 Tables)
1. `cms_entries`
2. `announcements`
3. `announcement_targets`
4. `announcement_user_states`
5. `events`
6. `event_targets`
7. `event_registrations`
8. `notifications`
9. `notification_recipients`
10. `notification_devices`

---

## 50. Table Ownership
- `CmsModule` owns: `cms_entries`.
- `AnnouncementsModule` owns: `announcements`, `announcement_targets`, `announcement_user_states`.
- `EventsModule` owns: `events`, `event_targets`, `event_registrations`.
- `NotificationsModule` owns: `notifications`, `notification_recipients`, `notification_devices`.

---

## 51. Index / Unique Strategy
- `cms_entries`: Unique `(scope_type, parish_id, slug)`; Index `(status, scope_type, published_at)`.
- `announcements`: Index `(status, starts_at, ends_at)`, `(parish_id, status)`.
- `announcement_targets`: Index `(announcement_id)`, `(target_type, parish_id, class_id)`.
- `announcement_user_states`: Unique `(announcement_id, user_id)`; Index `(user_id, read_at)`.
- `events`: Unique `(code)`; Index `(status, starts_at, ends_at)`, `(parish_id, status)`.
- `event_targets`: Index `(event_id)`.
- `event_registrations`: Unique `(event_id, user_id, student_id)`; Index `(event_id, status)`, `(user_id, status)`.
- `notifications`: Index `(source_type, source_id)`.
- `notification_recipients`: Unique `(notification_id, recipient_user_id)`; Index `(recipient_user_id, is_read, created_at DESC)`.
- `notification_devices`: Unique `(user_id, token)`; Index `(user_id, is_active)`.

---

## 52. Retention / Delete Policy
- **CMS:** Drafts may be hard deleted; published entries are soft-archived (`status = 'ARCHIVED'`).
- **Announcements:** Published history is retained permanently for auditability.
- **Events:** Retained permanently; cancellations mark `status = 'CANCELLED'`.
- **Registrations:** Retained permanently for attendance history.
- **Notifications:** Retained; future maintenance job may archive notifications older than 90 days.

---

## 53. Application Event Contracts
Defined under `src/modules/application-events/contracts/`:
- `AnnouncementPublishedEvent`: `{ announcementId, title, summary, targets, publishedAt }`
- `EventPublishedEvent`: `{ eventId, title, startsAt, venueName, targets, publishedAt }`
- `EventUpdatedEvent`: `{ eventId, title, changes, startsAt, targets }`
- `EventCancelledEvent`: `{ eventId, title, reason, targets }`

---

## 54. Cross-Module Dependency Graph
```
        [Parish / Class / Enrollment / Student / Users]
                         ▲
                         │ (Public APIs only)
         ┌───────────────┼───────────────┐
         │               │               │
    [CMS Module]  [Announcements]  [Events Module]
                         │               │
                         ▼               ▼
           [ApplicationEventsModule: Event Contracts]
                         │
                         ▼
               [NotificationsModule]
                         │
                         ▼
                 (In-App Inbox /
             Notification Devices)
```
- Completely unidirectional. Zero circular dependencies. No `forwardRef`.

---

## 55. Scheduling Strategy
- Publication queries evaluate temporal bounds at read-time: `status = 'PUBLISHED' AND starts_at <= NOW AND (ends_at IS NULL OR ends_at > NOW)`.
- Scheduled jobs (`process-scheduled-publications.ts`) handle state transitions from `SCHEDULED` to `PUBLISHED` without GET-time mutations.

---

## 56. Idempotency Strategy
- Announcement publish operation emits event with unique `announcementId`.
- `NotificationOrchestrator` uses unique `(source_type, source_id, recipient_user_id)` to prevent duplicate inbox rows if an event is re-processed.
- Event registration uses composite unique constraint `(event_id, user_id, student_id)`.

---

## 57. Error Contracts
- `400 Bad Request`: Validation failure (invalid date range, invalid slug format, missing target IDs).
- `401 Unauthorized`: Missing or invalid JWT.
- `403 Forbidden`: Scope violation (Catechist targeting unassigned class, ParishAdmin cross-parish mutation, Parent accessing unlinked student).
- `404 Not Found`: Resource does not exist (CMS entry, announcement, event, notification).
- `409 Conflict`: Duplicate registration, slug conflict, capacity reached, invalid lifecycle transition.

---

## 58. Exact CMS API Inventory (6 Routes)
1. `GET /api/v1/cms/entries` — List published CMS entries (public/scoped)
2. `GET /api/v1/cms/entries/:slug` — Get published CMS entry by slug (public/scoped)
3. `POST /api/v1/cms/entries` — Create CMS entry (Draft/Scheduled)
4. `PATCH /api/v1/cms/entries/:id` — Update CMS entry
5. `POST /api/v1/cms/entries/:id/publish` — Publish CMS entry
6. `POST /api/v1/cms/entries/:id/archive` — Archive CMS entry

---

## 59. Exact Announcement API Inventory (8 Routes)
1. `GET /api/v1/announcements` — List active visible announcements for authenticated actor
2. `GET /api/v1/announcements/:id` — Get announcement details (marks lazy first seen)
3. `POST /api/v1/announcements/:id/dismiss` — Dismiss announcement for current user
4. `GET /api/v1/admin/announcements` — Staff list announcements (scoped)
5. `POST /api/v1/admin/announcements` — Create announcement (Draft)
6. `PATCH /api/v1/admin/announcements/:id` — Update announcement
7. `POST /api/v1/admin/announcements/:id/publish` — Publish announcement (triggers notifications)
8. `POST /api/v1/admin/announcements/:id/archive` — Archive announcement

---

## 60. Exact Event API Inventory (9 Routes)
1. `GET /api/v1/events` — List upcoming visible events for authenticated actor
2. `GET /api/v1/events/:id` — Get event details
3. `POST /api/v1/events/:id/registrations` — Register self or linked child for event
4. `POST /api/v1/events/:id/registrations/cancel` — Cancel registration
5. `GET /api/v1/me/event-registrations` — List current user / child event registrations
6. `POST /api/v1/admin/events` — Create event (Draft)
7. `PATCH /api/v1/admin/events/:id` — Update event
8. `POST /api/v1/admin/events/:id/cancel` — Cancel event (triggers notifications)
9. `POST /api/v1/admin/events/:id/checkin` — Check in attendee

---

## 61. Exact Notification API Inventory (6 Routes)
1. `GET /api/v1/me/notifications` — List user notifications (paginated)
2. `GET /api/v1/me/notifications/unread-count` — Get unread notification count
3. `POST /api/v1/me/notifications/:id/read` — Mark notification as read
4. `POST /api/v1/me/notifications/read-all` — Mark all notifications as read
5. `POST /api/v1/me/notification-devices` — Register push device token
6. `DELETE /api/v1/me/notification-devices/:id` — Deregister push device token

**Total Exact API Route Count = 29 Routes across 4 Modules.**

---

## 62. FE Contract
- Standardized camelCase JSON with explicit TypeScript interfaces.
- Pagination metadata: `{ items, total, page, limit, totalPages }`.
- Error envelope matches `GlobalExceptionFilter`: `{ statusCode, message, error, timestamp, path }`.

---

## 63. Mobile Contract
- Lightweight responses; full HTML/Markdown body only requested on detail routes (`GET .../:id`).
- Unread badge endpoint `/me/notifications/unread-count` designed for high-frequency polling / tab badge updates.
- Token registration endpoint supports platform identification (`IOS`, `ANDROID`, `WEB`).

---

## 64. Performance / N+1 Prevention
- Target resolution uses bulk queries (`IN (:...ids)`).
- Notification fan-out executes batch inserts in 500-record chunks.
- Notification inbox queries hit composite index `(recipient_user_id, is_read, created_at DESC)`.
- No nested per-row database calls in controllers or mappers.

---

## 65. Test Strategy
Under Fast Implementation Mode, tests are written during implementation prompts and deferred from execution:
- **Unit Specs:** Service lifecycles, target resolution, capacity calculations, parent-guardian verification, notification deduplication.
- **Integration Specs:** Database constraints, transaction isolation, application event listener triggering, batch fan-out.
- **DB E2E Specs:** Full HTTP request cycles, RBAC guards, scope denial matrices, unread counts.

---

## 66. Demo Seed Strategy
To be implemented in prompt #007 (`scripts/seed-community-demo.ts`):
- Composes prerequisite seeds (`auth-rbac`, `parish-academic`, `class-enrollment`).
- Seeds 2 CMS entries (1 global, 1 parish).
- Seeds 2 Announcements (1 parish-wide, 1 class-targeted).
- Seeds 2 Events (1 upcoming with registration, 1 completed).
- Seeds 4 Notifications with unread/read states.

---

## 67. Postman Strategy
To be implemented in prompt #007:
- Collection file: `docs/postman/Acutis-Education-Community-Communications.postman_collection.json`.
- Folders for Auth, CMS, Announcements, Events, Notifications, and Negative/Security flows.

---

## 68. Risks & Deferred Capabilities
- **Deferred:**
  - Automated external Push (FCM/APNs) and Email/SMS gateways (foundation laid via device tokens).
  - Event waitlist queue mechanics.
  - User notification category preference toggles.
  - Machine translation pipeline integration.

---

## 69. Defect Counts
- BLOCKER: 0
- HIGH: 0
- MEDIUM: 0
- LOW: 0

---

## 70. Exact Prompt Count
**FINAL RECOMMENDED PROMPT COUNT: 7 Prompts**

---

## 71. Implementation Prompt Plan
1. **#001/7 — Domain Audit & Architecture & Contract Design** (This prompt).
2. **#002/7 — Persistence Foundation & Module Shells & Event Contracts**:
   Create 4 module shells (`cms`, `announcements`, `events`, `notifications`), 10 entities, migrations, RBAC permissions, and neutral event contracts.
3. **#003/7 — CMS Module**:
   Implement `cms` content CRUD, slug routing, publishing lifecycle, and public/scoped reads.
4. **#004/7 — Announcements Module**:
   Implement `announcements` targeting, broadcast workflows, lazy user-state tracking, and feeds.
5. **#005/7 — Events Module**:
   Implement `events` calendar, capacity-safe registrations, parent-child verification, and check-in.
6. **#006/7 — Notifications Module**:
   Implement `notifications` recipient fan-out, `/me/notifications` inbox, unread counts, and push device registration.
7. **#007/7 — Fast-Mode Finalization**:
   Demo seed script, Postman collection, README updates, OpenAPI static review, and static final audit.

---

## 72. #002 Readiness
All architectural, domain, table, and contract prerequisites are fully specified. The project is **READY** to proceed to #002.

---

## 73. Commit Recommendation
Audit and design only. No production files modified. If tracked changes exist, use:
```powershell
git commit -m "docs(community): add domain audit and design report for cms announcements events notifications"
```

---

## REQUIRED VERDICTS

GO / NO-GO FOR IMPLEMENTATION: GO

FINAL MODULE STRATEGY: 4 modules
FINAL MODULE NAMES: cms, announcements, events, notifications

CMS MODEL READY: YES
ANNOUNCEMENT MODEL READY: YES
EVENT MODEL READY: YES
NOTIFICATION MODEL READY: YES

ANNOUNCEMENT TARGETING READY: YES
EVENT REGISTRATION IN MVP: YES
EVENT WAITLIST IN MVP: NO

IN-APP NOTIFICATIONS IN MVP: YES
PUSH DELIVERY IN MVP: NO
EMAIL/SMS IN MVP: NO
NOTIFICATION DEVICES IN MVP: YES
NOTIFICATION PREFERENCES IN MVP: NO
GENERIC MANUAL NOTIFICATION CREATE IN MVP: NO

CMS LOCALIZATION STRATEGY READY: YES
ANNOUNCEMENT LOCALIZATION STRATEGY READY: YES
EVENT LOCALIZATION STRATEGY READY: YES
NOTIFICATION LOCALIZATION STRATEGY READY: YES

SCHEDULER STRATEGY READY: YES
IDEMPOTENCY STRATEGY READY: YES
SECURITY/MINORS MODEL READY: YES
MODULE BOUNDARY READY BY DESIGN: YES

NEW TABLES REQUIRED: 10
NEW RBAC PERMISSIONS REQUIRED: YES

FINAL RECOMMENDED PROMPT COUNT: 7

Unresolved BLOCKER count: 0
Unresolved HIGH count: 0

#002 READINESS: YES
