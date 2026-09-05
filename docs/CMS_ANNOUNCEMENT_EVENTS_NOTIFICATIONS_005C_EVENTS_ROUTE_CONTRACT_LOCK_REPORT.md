# CMS + ANNOUNCEMENT + EVENTS + NOTIFICATIONS #005C REPORT
## Corrective Route Contract Lock: Events Authoritative HTTP Inventory Reconciliation
**Date:** September 5, 2026  
**Status:** AUDITED & RECONCILED (Source In-Sync, Documentation Corrected)  
**Mode:** Fast Implementation Mode (`.cursor/rules/04-fast-implementation-mode.mdc`)

---

### 1 Objective
Perform an authoritative inspection and reconciliation of the Events HTTP route inventory following an apparent contradiction between the implementation report in #005 and the narrative route inventory presented in section 15 of #005B. Verify actual controller decorators and paths in source, confirm presence of critical routes (`POST .../registrations/cancel`, `POST .../admin/events/:id/checkin`, `GET .../admin/events/:id/registrations`), determine whether source drift occurred or whether the issue was documentation-only, and definitively lock the 14-route Events contract and 36-route Community total ahead of #006 Notifications.

---

### 2 Fast Implementation Mode
In compliance with `.cursor/rules/04-fast-implementation-mode.mdc`:
- **Audit and inspection first:** Inspected concrete controller decorators in source code without speculation.
- **Validation deferred:** No runtime commands (`npm test`, Jest, typecheck, build, DB queries, migrations, seeds, Docker, or Postman) were executed.
- **Scope preserved:** No business logic modifications were introduced, and #005B concurrency, snapshot atomicity, and privacy hardening were strictly preserved.

---

### 3 Inherited Authoritative Route Contract
The authoritative Events route contract frozen in #005 established exactly 14 routes (13 base routes + 1 attendee roster lookup route to enable check-in without data leakage):
1. `GET /api/v1/events` (list visible published events for caller)
2. `GET /api/v1/events/:id` (event detail & caller active registration)
3. `POST /api/v1/events/:id/registrations` (register self or linked child)
4. `POST /api/v1/events/:id/registrations/cancel` (cancel self or child registration)
5. `GET /api/v1/me/event-registrations` (list caller & linked child registrations)
6. `GET /api/v1/admin/events` (admin event list scoped by actor authority)
7. `POST /api/v1/admin/events` (create event draft with targets)
8. `PATCH /api/v1/admin/events/:id` (update event; versioned if published)
9. `POST /api/v1/admin/events/:id/publish` (publish event & emit `EventPublishedEvent`)
10. `POST /api/v1/admin/events/:id/cancel` (cancel event & emit `EventCancelledEvent`)
11. `POST /api/v1/admin/events/:id/complete` (complete event)
12. `POST /api/v1/admin/events/:id/archive` (archive event terminal state)
13. `POST /api/v1/admin/events/:id/checkin` (check in attendee by `registrationId`)
14. `GET /api/v1/admin/events/:id/registrations` (attendee roster for check-in lookup)

---

### 4 #005B Route Discrepancy
Section 15 of `docs/CMS_ANNOUNCEMENT_EVENTS_NOTIFICATIONS_005B_ATOMIC_REGISTERED_RECIPIENT_SNAPSHOT_REPORT.md` stated "No route changes made", but erroneously listed an inventory from an earlier pre-implementation draft:
- Erroneously listed `POST /api/v1/events` (admin create) instead of `POST /api/v1/admin/events`
- Erroneously listed `GET /api/v1/events/admin` instead of `GET /api/v1/admin/events`
- Erroneously listed `GET /api/v1/events/:id/admin`
- Erroneously listed `GET /api/v1/events/:id/attendees` instead of `GET /api/v1/admin/events/:id/registrations`
- Erroneously listed `POST /api/v1/events/:id/check-in` instead of `POST /api/v1/admin/events/:id/checkin`
- Completely omitted `POST /api/v1/events/:id/registrations/cancel`

This discrepancy created ambiguity as to whether actual source code drifted during #005A/#005B or if the issue was restricted to documentation.

---

### 5 Actual Controller Route Inspection
A line-by-line inspection of the NestJS controllers in `src/modules/events/controllers/` was performed:

#### 1. `src/modules/events/controllers/events.controller.ts`
- Controller Decorator: `@Controller('events')`
- Effective Global Prefix: `/api/v1/events`
- Endpoints:
  1. `@Get()` (line 68) -> `GET /api/v1/events`
  2. `@Get(':id')` (line 109) -> `GET /api/v1/events/:id`
  3. `@Post(':id/registrations')` (line 152) -> `POST /api/v1/events/:id/registrations`
  4. `@Post(':id/registrations/cancel')` (line 242) -> `POST /api/v1/events/:id/registrations/cancel`
- Route count for this controller: **4**

#### 2. `src/modules/events/controllers/event-registrations-me.controller.ts`
- Controller Decorator: `@Controller('me/event-registrations')`
- Effective Global Prefix: `/api/v1/me/event-registrations`
- Endpoints:
  5. `@Get()` (line 34) -> `GET /api/v1/me/event-registrations`
- Route count for this controller: **1**

#### 3. `src/modules/events/controllers/events-admin.controller.ts`
- Controller Decorator: `@Controller('admin/events')`
- Effective Global Prefix: `/api/v1/admin/events`
- Endpoints:
  6. `@Get()` (line 63) -> `GET /api/v1/admin/events`
  7. `@Post()` (line 113) -> `POST /api/v1/admin/events`
  8. `@Patch(':id')` (line 164) -> `PATCH /api/v1/admin/events/:id`
  9. `@Post(':id/publish')` (line 219) -> `POST /api/v1/admin/events/:id/publish`
  10. `@Post(':id/cancel')` (line 251) -> `POST /api/v1/admin/events/:id/cancel`
  11. `@Post(':id/complete')` (line 289) -> `POST /api/v1/admin/events/:id/complete`
  12. `@Post(':id/archive')` (line 319) -> `POST /api/v1/admin/events/:id/archive`
  13. `@Post(':id/checkin')` (line 349) -> `POST /api/v1/admin/events/:id/checkin`
  14. `@Get(':id/registrations')` (line 382) -> `GET /api/v1/admin/events/:id/registrations`
- Route count for this controller: **9**

---

### 6 Actual Source Route Inventory Before Correction
Combining the three controllers, the actual live production route inventory in source was:
1. `GET /api/v1/events`
2. `GET /api/v1/events/:id`
3. `POST /api/v1/events/:id/registrations`
4. `POST /api/v1/events/:id/registrations/cancel`
5. `GET /api/v1/me/event-registrations`
6. `GET /api/v1/admin/events`
7. `POST /api/v1/admin/events`
8. `PATCH /api/v1/admin/events/:id`
9. `POST /api/v1/admin/events/:id/publish`
10. `POST /api/v1/admin/events/:id/cancel`
11. `POST /api/v1/admin/events/:id/complete`
12. `POST /api/v1/admin/events/:id/archive`
13. `POST /api/v1/admin/events/:id/checkin`
14. `GET /api/v1/admin/events/:id/registrations`

Total: **14 routes**.

---

### 7 Source Drift or Documentation-Only Verdict
**VERDICT: DOCUMENTATION-ONLY.**
- The source controllers in `src/modules/events/controllers/` were never modified away from the #005 contract during #005A or #005B.
- The route paths, decorators, HTTP methods, and controller prefixes in production source match the authoritative 14-route contract with 100% precision.
- No production controller drift occurred. Therefore, zero production source code changes were required to restore the route contract.

---

### 8 Corrected Authoritative 14-Route Inventory
The confirmed, authoritative 14-route inventory is:

| # | HTTP Method | Route Path | Controller | Description | Permission Guard |
|---|---|---|---|---|---|
| 1 | `GET` | `/api/v1/events` | `EventsController` | List visible published events for caller | `events.read` |
| 2 | `GET` | `/api/v1/events/:id` | `EventsController` | Event detail & caller registration status | `events.read` |
| 3 | `POST` | `/api/v1/events/:id/registrations` | `EventsController` | Register self or linked child | `events.register` |
| 4 | `POST` | `/api/v1/events/:id/registrations/cancel` | `EventsController` | Cancel self or child registration | `events.register` |
| 5 | `GET` | `/api/v1/me/event-registrations` | `EventRegistrationsMeController` | List caller & linked child registrations | `events.read` |
| 6 | `GET` | `/api/v1/admin/events` | `EventsAdminController` | Admin event list scoped by authority | `events.manage` |
| 7 | `POST` | `/api/v1/admin/events` | `EventsAdminController` | Create event draft with targets | `events.manage` |
| 8 | `PATCH` | `/api/v1/admin/events/:id` | `EventsAdminController` | Update event (versioned if published) | `events.manage` |
| 9 | `POST` | `/api/v1/admin/events/:id/publish` | `EventsAdminController` | Publish event & emit `EventPublishedEvent` | `events.manage` |
| 10 | `POST` | `/api/v1/admin/events/:id/cancel` | `EventsAdminController` | Cancel event & emit `EventCancelledEvent` | `events.manage` |
| 11 | `POST` | `/api/v1/admin/events/:id/complete` | `EventsAdminController` | Complete event | `events.manage` |
| 12 | `POST` | `/api/v1/admin/events/:id/archive` | `EventsAdminController` | Archive event | `events.manage` |
| 13 | `POST` | `/api/v1/admin/events/:id/checkin` | `EventsAdminController` | Check in attendee by `registrationId` | `events.checkin` |
| 14 | `GET` | `/api/v1/admin/events/:id/registrations` | `EventsAdminController` | Attendee roster for check-in lookup | `events.checkin` |

---

### 9 Registration Cancel Route
- Method and Path: `POST /api/v1/events/:id/registrations/cancel`
- Status: **CONFIRMED PRESENT** in `EventsController` (lines 242-297).
- Behavior: Accepts `CancelRegistrationDto` (`studentId?: string`), derives registrant key (`USER:<userId>` or `STUDENT:<studentId>`), verifies guardian link for child cancellations, and invokes `EventsService.cancelRegistration(id, registrantKey)`.
- Idempotency: Returns `200 OK` idempotently if already cancelled; returns `409 Conflict` if already attended or marked no-show.

---

### 10 Admin Route Prefix
- Prefix: `/api/v1/admin/events`
- Status: **CONFIRMED CORRECT**.
- `EventsAdminController` is decorated with `@Controller('admin/events')`.
- All admin management endpoints reside under `/api/v1/admin/events...`. No `/events/admin` or `/events/:id/admin` paths exist in the controller.

---

### 11 Check-In Route
- Method and Path: `POST /api/v1/admin/events/:id/checkin`
- Status: **CONFIRMED CORRECT**.
- Method decorator is `@Post(':id/checkin')` (line 349) under `@Controller('admin/events')`.
- No hyphenated `/check-in` route exists in source.

---

### 12 Attendee-List Route
- Method and Path: `GET /api/v1/admin/events/:id/registrations`
- Status: **CONFIRMED CORRECT**.
- Method decorator is `@Get(':id/registrations')` (line 382) under `@Controller('admin/events')`.
- Resolves student display names via batch queries and strictly minimizes PII (excludes phone, email, DOB, guardian contact details).
- No `/events/:id/attendees` path exists in source.

---

### 13 OpenAPI Route Contract
Swagger decorators across all 3 controllers are fully aligned:
- `EventsController`: `@ApiTags('events')`
- `EventRegistrationsMeController`: `@ApiTags('me')`
- `EventsAdminController`: `@ApiTags('admin-events')`
- All parameter types, request DTOs, response DTOs, and error response decorators accurately reflect the authoritative 14 routes.

---

### 14 README Route Contract
Lines 950–967 of `README.md` already reflect the exact authoritative 14-route inventory established in #005:
- `GET /api/v1/events`
- `GET /api/v1/events/:id`
- `POST /api/v1/events/:id/registrations`
- `POST /api/v1/events/:id/registrations/cancel`
- `GET /api/v1/me/event-registrations`
- `GET /api/v1/admin/events`
- `POST /api/v1/admin/events`
- `PATCH /api/v1/admin/events/:id`
- `POST /api/v1/admin/events/:id/publish`
- `POST /api/v1/admin/events/:id/cancel`
- `POST /api/v1/admin/events/:id/complete`
- `POST /api/v1/admin/events/:id/archive`
- `POST /api/v1/admin/events/:id/checkin`
- `GET /api/v1/admin/events/:id/registrations`
No modifications were required for `README.md`.

---

### 15 Test/Spec Route Contract
- `src/modules/events/controllers/events.controller.spec.ts`: Unit tests `list`, `getDetail`, `register`, `cancelRegistration`.
- `src/modules/events/controllers/events-admin.controller.spec.ts`: Unit tests `listAdmin`, `create`, `publish`, `cancel`, `complete`, `archive`, `checkIn`, `listAttendees`.
- `src/modules/events/controllers/event-registrations-me.controller.spec.ts`: Unit tests `listMyRegistrations`.
- `test/integration/events.integration-spec.ts`: 23 scenarios covering the complete lifecycle and concurrency behavior.
- `test/e2e/events-db.e2e-spec.ts`: 21 scenarios covering scope enforcement, check-in, registration cancellation, and concurrent race resolution.

---

### 16 Documentation Corrections
Section 15 of `docs/CMS_ANNOUNCEMENT_EVENTS_NOTIFICATIONS_005B_ATOMIC_REGISTERED_RECIPIENT_SNAPSHOT_REPORT.md` has been updated and corrected to match the authoritative 14-route contract.

---

### 17 #005B Concurrency Correctness Retained
- `EventRegistrationService.register` continues to acquire `pessimistic_write` lock on `EventEntity` row inside transaction.
- `EventInternalService.update` acquires `pessimistic_write` lock on `EventEntity` row inside transaction.
- `EventInternalService.cancel` acquires `pessimistic_write` lock on `EventEntity` row inside transaction.
- Registration, update, and cancellation operations for the same event serialize deterministically under MSSQL `UPDLOCK, ROWLOCK`.

---

### 18 #005B Recipient Snapshot Correctness Retained
- Recipient query `listNotificationRecipientUserIds(entity.id, manager)` executes **inside** the mutation transaction before commit using the same `EntityManager`.
- Snapshot of active registered recipient user IDs (`REGISTERED`, `ATTENDED`) is returned in the transaction result.
- Post-commit handler uses transaction result snapshot only; zero post-commit recipient re-queries occur.

---

### 19 #005B Privacy Hardening Retained
- `cancellationReason` is stored solely in internal database `events.cancellation_reason` for staff auditing.
- `EventCancelledEvent` communication payload contains only `cancellationSummary: 'Event cancelled'` and does not contain `cancellationReason`.
- Student display names in attendee lookup omit phone numbers, email addresses, and dates of birth.

---

### 20 Final Module Route Counts
- **CMS Module**: 8 routes
- **Announcements Module**: 8 routes
- **Events Module**: 14 routes
- **Notifications Module (planned #006)**: 6 routes

---

### 21 Final Community Route Count
- **Total Community Target**: **36 routes**

---

### 22 Static Inspection
- `ReadLints` executed on controller source files: zero errors reported.
- Controller decorator routing verified against NestJS routing conventions and global `/api/v1` prefix.
- Clean separation between staff administration (`/api/v1/admin/events...`) and participant actions (`/api/v1/events...`, `/api/v1/me/event-registrations`).

---

### 23 Risks / Deferred Items
- Full live HTTP end-to-end routing with SuperTest against a running database will be validated during the dedicated FE integration & stabilization phase.

---

### 24 Defect Counts
- **Unresolved BLOCKER count:** 0
- **Unresolved HIGH count:** 0
- **Unresolved MEDIUM count:** 0
- **Unresolved LOW count:** 0

---

### 25 #006 Readiness
**#006 READINESS: YES**  
All prerequisites for phase #006 (Notifications) are satisfied:
- Events route contract is unambiguous, frozen, and verified in source (14 routes).
- Community total routes confirmed at 36 (8 CMS + 8 Announcements + 14 Events + 6 Notifications).
- Event communication payloads (`EventPublishedEvent`, `EventUpdatedEvent`, `EventCancelledEvent`) are stabilized.
- Recipient union contract (`targets UNION registeredRecipientUserIds`) is frozen for notification fan-out.

---

### 26 Commit Recommendation
Since actual source controllers were already in 100% alignment with the authoritative 14-route contract and only documentation was corrected, no production code changes were required.

---

### REQUIRED VERDICTS
```
EVENT AUTHORITATIVE ROUTE CONTRACT RESTORED: YES

ACTUAL EVENT ROUTE COUNT: 14

REGISTRATION CANCEL ROUTE PRESENT: YES
ADMIN EVENT ROUTE PREFIX CORRECT: YES
CHECKIN ROUTE PATH CORRECT: YES
ATTENDEE LIST ROUTE PATH CORRECT: YES

NO UNPLANNED EVENT ROUTE DRIFT: YES

OPENAPI ROUTE CONTRACT ALIGNED: YES
README ROUTE CONTRACT ALIGNED: YES
TEST/SPEC ROUTE CONTRACT ALIGNED: YES

#005B CAPACITY HARDENING RETAINED: YES
#005B ATOMIC RECIPIENT SNAPSHOT RETAINED: YES
#005B PRIVACY HARDENING RETAINED: YES

FINAL CMS ROUTE COUNT: 8
FINAL ANNOUNCEMENT ROUTE COUNT: 8
FINAL EVENT ROUTE COUNT: 14
FINAL NOTIFICATION ROUTE COUNT: 6
FINAL COMMUNITY ROUTE COUNT TARGET: 36

Unresolved BLOCKER count: 0
Unresolved HIGH count: 0
Unresolved MEDIUM count: 0

#006 READINESS: YES
```
