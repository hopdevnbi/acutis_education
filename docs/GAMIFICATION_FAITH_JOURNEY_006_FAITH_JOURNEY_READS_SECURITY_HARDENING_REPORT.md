# GAMIFICATION + FAITH JOURNEY #006/7 — FAITH JOURNEY + LEARNER / PARENT / CATECHIST READS + SECURITY / CONTRACT HARDENING REPORT

## 1 Objective
Implement the composed Faith Journey read model, Learner Faith Journey read endpoint, Parent linked-child gamification reads (summary, Faith Journey, badges, missions, milestones), Staff scoped student Faith Journey endpoint, strict actor-specific `/me` semantics, privacy and data minimization hardening, resolution of the known #004/#005 badge/milestone list N+1 query issue, OpenAPI and README contract documentation, and comprehensive unit, integration, and DB e2e test suites under Fast Implementation Mode.

## 2 Fast Implementation Mode
- Mode: **Fast Implementation Mode** (`04-fast-implementation-mode.mdc` active).
- Production code written: YES.
- Test files written: YES.
- Validation commands executed: NO — deferred by Fast Implementation Mode.
- Static code inspection performed: YES.
- Security, privacy (minors), RBAC, modular boundaries, and N+1 performance enforced by static inspection.

## 3 State inherited
- #001: Domain audit and architecture design.
- #002: Persistence foundation (point ledger, reward rules, badges, milestones, missions schema).
- #003: Immutable points engine, idempotent reward ingest, manual adjustments.
- #004: Badge definitions/awards/bonuses, milestone definitions/achievements.
- #005: Mission definitions, admin lifecycle, mission progress/completion processor, `MISSION_COMPLETED` chaining.
- Known defect inherited: MEDIUM — badge and milestone list endpoints performed individual `getDefinitionById` queries in loops (N+1).

## 4 Files created
1. `src/modules/gamification/dto/faith-journey.dto.ts` — bounded Faith Journey response and timeline item DTOs.
2. `src/modules/gamification/controllers/parent-gamification.controller.ts` — parent linked-child gamification endpoints (`summary`, `faith-journey`, `badges`, `missions`, `milestones`).
3. `src/modules/gamification/faith-journey/services/faith-journey.service.spec.ts` — unit test suite for Faith Journey composition, timeline sort/cap/privacy, and latestAchievement logic.
4. `src/modules/gamification/access/gamification-access-faith-journey.spec.ts` — unit test suite for Parent guardian scope, Staff Catechist current-assignment scope, and actor-specific `/me` denial.
5. `test/integration/gamification-faith-journey.integration-spec.ts` — MSSQL integration specs covering summary, timeline, batch definition queries, and historical retention.
6. `test/gamification-faith-journey.db.e2e-spec.ts` — DB e2e specs covering Learner, Parent, Staff, and actor-specific denial matrix scenarios.
7. `docs/GAMIFICATION_FAITH_JOURNEY_006_FAITH_JOURNEY_READS_SECURITY_HARDENING_REPORT.md` — this report.

## 5 Files modified
1. `src/modules/gamification/faith-journey/services/faith-journey.service.ts` — replaced placeholder shell with complete composed read model service.
2. `src/modules/gamification/badges/services/badge.service.ts` — added batch `findDefinitionsByIds(rawIds)` returning `Map<string, BadgeDefinitionSnapshot>`.
3. `src/modules/gamification/milestones/services/milestone.service.ts` — added batch `findDefinitionsByIds(rawIds)` returning `Map<string, MilestoneDefinitionSnapshot>`.
4. `src/modules/gamification/missions/services/mission.service.ts` — added `findDefinitionsByIds(rawIds)` and `findLatestCompletedProgressForStudent(studentId)`.
5. `src/modules/gamification/interfaces/gamification.interfaces.ts` — added `LatestAchievementSnapshot`, `FaithJourneyTimelineItemSnapshot`, `FaithJourneySnapshot`, `LearnerBadgeView`, `LearnerMilestoneView`, `LearnerMissionView`.
6. `src/modules/gamification/dto/gamification-response.dto.ts` — added `LatestAchievementDto` and enriched `GamificationSummaryResponseDto` with `latestAchievement`.
7. `src/modules/gamification/gamification.service.ts` — resolved N+1 in badge and milestone list methods via batch definition fetching; wired `FaithJourneyService`; implemented canonical summary `latestAchievement` resolution.
8. `src/modules/gamification/access/gamification-access.service.ts` — implemented `assertParentCanReadStudentGamificationByEnrollment`; hardened `assertStaffCanReadStudentGamification` with explicit non-staff denial and active class assignment verification.
9. `src/modules/gamification/utils/gamification-http.util.ts` — added mapping for guardian access errors to `ForbiddenException` (403).
10. `src/modules/gamification/mappers/gamification-http.mapper.ts` — added mappers `toLatestAchievementDto`, `toFaithJourneyTimelineItemDto`, and `toFaithJourneyResponseDto`.
11. `src/modules/gamification/controllers/learner-gamification.controller.ts` — added `GET /api/v1/me/learner/faith-journey`.
12. `src/modules/gamification/controllers/staff-gamification.controller.ts` — added `GET /api/v1/students/:studentId/faith-journey`.
13. `src/modules/gamification/gamification.module.ts` — registered `FaithJourneyService` and `ParentGamificationController`.
14. `README.md` — documented Faith Journey architecture, endpoints, permissions, N+1 resolution, Parent scope, and privacy rules.

## 6 Faith Journey service
`FaithJourneyService` (`src/modules/gamification/faith-journey/services/faith-journey.service.ts`) serves as an internal composed read model service inside `gamification`.
- No new database table: composed dynamically strictly from Gamification-owned persistence (point ledger, badge awards, mission definitions/progress, milestone achievements).
- Fixed bounded parallel queries: balances, recent ledger entries, badge awards, milestones, progress rows, and eligible missions are queried in parallel.
- Definition lookups use set-based `IN` queries via batch methods (`findDefinitionsByIds`) on badge, milestone, and mission services.
- Bounded memory and payload footprint.

## 7 Faith Journey DTO
`FaithJourneyResponseDto` (`src/modules/gamification/dto/faith-journey.dto.ts`):
- `summary`: canonical `GamificationSummaryResponseDto` (pointsBalance, lifetimePositivePoints, activeBadgeCount, activeMissionCount, completedMissionCount, milestonesAchievedCount, latestAchievement).
- `activeMissions`: array of `LearnerMissionResponseDto` capped at 10.
- `recentBadges`: array of `LearnerBadgeItemDto` capped at 10.
- `milestones`: array of `LearnerMilestoneItemDto` capped at 20.
- `recentTimeline`: array of `FaithJourneyTimelineItemDto` capped at 20.

## 8 Timeline composition
Timeline items are composed from four distinct Gamification sources:
1. `POINTS`: learning and engagement activities recorded in `point_ledger_entries` (`LESSON_COMPLETED`, `PRACTICE_COMPLETED`, `EXAM_COMPLETED`, `ATTENDANCE_PRESENT`, etc.).
2. `BADGE`: active badge awards (`BadgeAwardEntity`).
3. `MISSION`: completed mission progress (`MissionProgressEntity` with status `COMPLETED`).
4. `MILESTONE`: milestone achievements (`MilestoneAchievementEntity`).

Ordering: stable, deterministic sort:
1. Primary: `occurredAt DESC`.
2. Tie-breaker 1: Kind priority (`MILESTONE` [4] > `BADGE` [3] > `MISSION` [2] > `POINTS` [1]).
3. Tie-breaker 2: `code ASC` (`localeCompare`).
4. Tie-breaker 3: `relatedId ASC` (`localeCompare`).
Capped strictly at max 20 items.

## 9 Timeline privacy
- Staff notes (`staffNote`) are completely omitted.
- Awarding user IDs (`awardedByUserId`) are completely omitted.
- Raw internal event IDs (`eventId`) are omitted.
- No student or guardian contact details, dates of birth, or attendance remarks are present.
- Related IDs expose only public domain entity IDs (`award.id`, `progress.id`, `achievement.id`, `ledgerEntry.id`).

## 10 Learner Faith Journey
- Endpoint: `GET /api/v1/me/learner/faith-journey`.
- Permission: `gamification.read`.
- Actor restriction: genuine `STUDENT` actor only.
- Identity derived server-side via `GamificationAccessService.assertLearnerCanReadOwnGamification(userId)`. Client-provided `studentId` is not accepted.
- Returns bounded `FaithJourneyResponseDto`.

## 11 Learner summary
- Endpoint: `GET /api/v1/me/learner/gamification/summary`.
- Permission: `gamification.read`.
- Hardened in #006 to return `latestAchievement` alongside `activeMissionCount` and `completedMissionCount`.
- Omits staff notes and audit trails.

## 12 Parent summary
- Endpoint: `GET /api/v1/me/parent/enrollments/:enrollmentId/gamification/summary`.
- Permission: `gamification.read`.
- Returns canonical `GamificationSummaryResponseDto` for the linked child.
- Safe for minor privacy: no staff notes, no audit metadata.

## 13 Parent Faith Journey
- Endpoint: `GET /api/v1/me/parent/enrollments/:enrollmentId/faith-journey`.
- Permission: `gamification.read`.
- Composed Faith Journey for the child enrolled in `:enrollmentId`.
- Active missions evaluate using the enrollment's class and parish context.
- Historical achievements (badges, milestones, completed missions) remain visible regardless of transfer.

## 14 Parent badges
- Endpoint: `GET /api/v1/me/parent/enrollments/:enrollmentId/badges`.
- Permission: `gamification.read`.
- Returns `LearnerBadgeListResponseDto`.
- Omits `awardedByUserId`, `ruleConfigJson`, and internal staff notes.

## 15 Parent missions
- Endpoint: `GET /api/v1/me/parent/enrollments/:enrollmentId/missions`.
- Permission: `gamification.read`.
- Query: `LearnerMissionListQueryDto` (`status: ACTIVE | COMPLETED`).
- Returns `LearnerMissionListResponseDto`.
- Omits internal event tracking keys and raw rule configs.

## 16 Parent milestones
- Endpoint: `GET /api/v1/me/parent/enrollments/:enrollmentId/milestones`.
- Permission: `gamification.read`.
- Returns `LearnerMilestoneListResponseDto`.
- Omits `triggerConfigJson` and internal source event IDs.

## 17 Parent full ledger decision
- Verdict: **PARENT FULL POINT LEDGER IN MVP: NO**.
- Parents have access to points summary balance, lifetime positive points, badges, missions, milestones, and composed Faith Journey timeline.
- Detailed granular ledger line items with transaction audit logs are restricted to student self and catechist/parish staff.
- No parent point ledger route was created.

## 18 Parent guardian scope
- Guard: `GamificationAccessService.assertParentCanReadStudentGamificationByEnrollment(userId, enrollmentId)`.
- Step 1: verifies actor has `PARENT` role code. (403 if missing).
- Step 2: resolves enrollment via `EnrollmentService.getEnrollmentById(enrollmentId)`. (404 if enrollment does not exist).
- Step 3: asserts active guardian relationship via `StudentGuardianService.assertGuardianLinked(userId, enrollment.studentId)`. (403 if foreign child or inactive link).
- Cross-parish linked child is permitted if the guardian relationship is active.

## 19 Staff student summary
- Endpoint: `GET /api/v1/students/:studentId/gamification/summary`.
- Permission: `gamification.read`.
- Scoped to SuperAdmin, ParishAdmin (own parish active enrollment), or Catechist (active assigned class).
- Returns canonical `GamificationSummaryResponseDto` with `latestAchievement`.

## 20 Staff Faith Journey
- Endpoint: `GET /api/v1/students/:studentId/faith-journey`.
- Permission: `gamification.read`.
- Returns bounded `FaithJourneyResponseDto` for staff pastoral guidance.
- Excludes PII, attendance notes, exam answers, confessional/pastoral records, and raw manual adjustment reasons.

## 21 Catechist current-assignment scope
- Catechists are authorized only if they have a CURRENT ACTIVE assignment to a class in which the student has a CURRENT ACTIVE enrollment.
- Verified via `ClassCatechistAssignmentService.assertCatechistAssigned(userId, classId)`.
- Historical catechists who previously taught the student in a completed or archived class are denied (HTTP 403).

## 22 ParishAdmin scope
- ParishAdmins are authorized if they hold active parish membership (`ParishScopeService.hasActiveParishMembership`) in the parish of the student's active enrollment.
- Access to students in foreign parishes without active enrollment in the admin's parish returns 403 Forbidden.

## 23 SuperAdmin scope
- SuperAdmins have global read access across all students and enrollments.

## 24 Actor-specific /me semantics
- `/me/learner/*` strictly asserts `STUDENT` role. Any non-student (Administrator, Catechist, Parent) receives 403 Forbidden.
- `/me/parent/*` strictly asserts `PARENT` role. Any non-parent (Administrator, Catechist, Student) receives 403 Forbidden.
- No administrator impersonation fallback is permitted on actor-specific `/me` routes.

## 25 Current vs historical context
- Historical student achievements (earned badges, completed missions, milestone achievements) belong to the student and persist across enrollment transfers, class archiving, and academic year closure.
- Current scope context applies to:
  - Parent authorization: requires ACTIVE guardian relationship at request time.
  - Catechist authorization: requires current ACTIVE class assignment and student current active enrollment.
  - Active missions: dynamically computed against the student's current active class and parish enrollments.

## 26 Active mission eligibility
- Active missions in Faith Journey and learner/parent mission lists dynamically resolve:
  - `GLOBAL` active missions
  - `PARISH` active missions matching the student's current parish
  - `CLASS` active missions matching the student's current active class enrollments
- If a student has no active enrollments (e.g. between academic years), active missions may be empty, but historical completed missions and achievements remain intact.

## 27 Canonical summary aggregate
Single canonical implementation in `GamificationService.getGamificationSummary(input)`:
- `pointsBalance`: `PointLedgerService.getBalance().balance`.
- `lifetimePositivePoints`: `PointLedgerService.getBalance().lifetimePositivePoints`.
- `activeBadgeCount`: active awards count.
- `activeMissionCount`: eligible active missions count.
- `completedMissionCount`: completed mission progress rows count.
- `milestoneAchievementCount`: milestone achievements count.
- `latestAchievement`: deterministic latest achievement aggregate.

## 28 Latest achievement
- Evaluates candidate items among:
  1. Most recent active badge award (`awardedAt`).
  2. Most recent completed mission (`completedAt ?? updatedAt`).
  3. Most recent milestone achievement (`achievedAt`).
- Selection criteria: highest timestamp.
- Tie-breaker: `MILESTONE` > `BADGE` > `MISSION`, then `code ASC`.
- Nullable if the student has zero achievements.

## 29 Badge batch query
- Implemented `BadgeService.findDefinitionsByIds(rawIds: readonly string[])`.
- Returns `Map<string, BadgeDefinitionSnapshot>` keyed by definition ID.
- Executes a single set-based query `WHERE id IN (:uniqueIds)`.

## 30 Milestone batch query
- Implemented `MilestoneService.findDefinitionsByIds(rawIds: readonly string[])`.
- Returns `Map<string, MilestoneDefinitionSnapshot>` keyed by definition ID.
- Executes a single set-based query `WHERE id IN (:uniqueIds)`.

## 31 #004/#005 N+1 resolution
- In `GamificationService`:
  - `listLearnerBadges`: replaced per-award definition fetch with `findDefinitionsByIds`.
  - `listStaffStudentBadges`: replaced per-award definition fetch with `findDefinitionsByIds`.
  - `listLearnerMilestones`: replaced per-achievement definition fetch with `findDefinitionsByIds`.
  - `listStaffStudentMilestones`: replaced per-achievement definition fetch with `findDefinitionsByIds`.
- In `FaithJourneyService`:
  - Batch queries executed for all badge, milestone, and completed mission definitions in parallel.
- Status: **BADGE/MILESTONE N+1 RESOLVED BY INSPECTION: YES**.

## 32 Faith Journey query budget
Total queries per Faith Journey request:
1. `EnrollmentQueryService.listActiveEnrollmentsByStudentIds` — 1 query (omitted if enrollmentId provided).
2. `EnrollmentService.getEnrollmentById` — 1 query (if enrollmentId provided).
3. `PointLedgerService.getBalance` — 1 query.
4. `PointLedgerService.listPointLedgerPaginated` — 1 query (page 1, limit 30).
5. `BadgeService.listAwardsForStudent` — 1 query.
6. `MilestoneService.listAchievementsForStudent` — 1 query.
7. `MissionService.listProgressForStudent` — 1 query.
8. `MissionService.listEligibleActiveDefinitionsForLearner` — 1 query.
9. `BadgeService.findDefinitionsByIds` — 1 batch IN query.
10. `MilestoneService.findDefinitionsByIds` — 1 batch IN query.
11. `MissionService.findDefinitionsByIds` — 1 batch IN query.
Total: **10 bounded queries**. Zero query-per-row loops.

## 33 DTO boundaries
- `FaithJourneyResponseDto`, `FaithJourneyTimelineItemDto`, `LatestAchievementDto`, `GamificationSummaryResponseDto` separate HTTP contracts from internal database entities.
- Zero TypeORM entities exposed in controller return types.
- Learner and Parent endpoints use privacy-minimized DTO shapes.

## 34 Data minimization
- Response payloads exclude:
  - Phone numbers, email addresses, dates of birth.
  - Staff notes and administrative commentary.
  - Awarding staff user IDs.
  - Internal event receipts and event UUIDs.
  - Raw rule configuration JSON strings.

## 35 Manual adjustment privacy
- Manual point awards (`MANUAL_AWARD`), adjustments (`ADJUSTMENT`), and reversals (`REVERSAL`) affect the student's points balance and lifetime positive points.
- They are **strictly omitted** from learner and parent Faith Journey timeline items.
- No administrative adjustment reasons or staff notes are ever revealed to students or parents.

## 36 Security/minors
- Aligned with `.cursor/rules/01-security-privacy-minors.mdc` and `PROJECT_RULES.md` §22–§23:
  - No public child profiles.
  - No competitive leaderboards or public ranking.
  - Points strictly framed as engagement, not spiritual quality or holiness.
  - Parent access enforced by server-side active guardian relationship checks.

## 37 Error contract
- 401 Unauthorized: unauthenticated requests.
- 403 Forbidden: missing permission, non-student on `/me/learner`, non-parent on `/me/parent`, unlinked guardian, foreign parish student without class assignment, former catechist.
- 404 Not Found: unknown enrollment, non-existent student/badge/milestone/mission.

## 38 OpenAPI
- All new and updated controllers annotated with Swagger metadata:
  - `@ApiTags('gamification')`
  - `@ApiOperation`, `@ApiOkResponse`, `@ApiForbiddenResponse`, `@ApiNotFoundResponse`, `@ApiUnauthorizedResponse`
  - `@ApiParam` with UUID format descriptions.

## 39 README
- Updated `README.md` under `Gamification & Faith Journey API (#003–#006)`:
  - Documented Faith Journey composed read model.
  - Documented Parent routes and `PARENT FULL POINT LEDGER IN MVP: NO`.
  - Documented Staff Faith Journey and Catechist current-assignment scoping.
  - Documented actor-specific `/me` semantics and N+1 resolution.

## 40 Module boundaries
- Modular monolith boundary maintained:
  - `GamificationModule` owns all gamification tables and services.
  - Only `GamificationService` is exported publicly.
  - `FaithJourneyService` is internal to `GamificationModule`.
  - No circular dependencies or `forwardRef()`.
  - No foreign repository or TypeORM entity imports; interaction with Enrollment, Class, Student, Parish via exported services only.

## 41 Unit tests written
- `src/modules/gamification/faith-journey/services/faith-journey.service.spec.ts` (summary composition, latestAchievement tie-breakers, timeline exclusion of manual adjustments, 20-item cap, batch queries).
- `src/modules/gamification/access/gamification-access-faith-journey.spec.ts` (parent linked child, foreign child 403, non-parent 403, catechist active class, former catechist 403, student/parent staff route 403).

## 42 Integration tests written
- `test/integration/gamification-faith-journey.integration-spec.ts` (11 scenarios covering summary counts, recent badges, active missions, milestone history, timeline ordering, manual note exclusion, batch definition fetching, historical retention after transfer).

## 43 DB e2e tests written
- `test/gamification-faith-journey.db.e2e-spec.ts` (Learner routes, Parent linked reads, Parent ledger route 404, Staff scoped reads, Actor-specific `/me` denial matrix, 401 unauthenticated).

## 44 Tests executed
- `TESTS EXECUTED: NO — deferred by Fast Implementation Mode`.

## 45 DB validation
- `DB VALIDATION: NOT RUN — deferred`.

## 46 quality:full
- `QUALITY:FULL: NOT RUN — deferred`.

## 47 Docker
- `DOCKER: NOT RUN — deferred`.

## 48 npm audit
- `NPM AUDIT: NOT RUN — deferred`.

## 49 Static inspection
- Verified clean imports, strict TypeScript types, correct method signatures, deterministic sorting algorithms, set-based batch queries, and no circular dependencies.
- `ReadLints` executed across all modified and created files: 0 errors found.

## 50 Risks/deferred
- Runtime query execution and live MSSQL index verification deferred to #007 / stabilization phase.
- Postman collections and demo seeds deferred to #007.

## 51 BLOCKER/HIGH/MEDIUM/LOW
- Unresolved BLOCKER: 0
- Unresolved HIGH: 0
- Unresolved MEDIUM: 0 (the inherited #004/#005 badge/milestone N+1 defect is now resolved)
- Unresolved LOW: 0

## 52 #007 readiness
- Readiness: **YES**.
- Proceed to #007/7: Fast-mode finalization (demo seed, Postman collection, README/OpenAPI finalization, static audit).

## 53 Commit recommendation
`git commit -m "feat(gamification): add faith journey read contracts"`

---

### REQUIRED VERDICTS

```
FAITH JOURNEY COMPOSED READ MODEL READY: YES
NO FAITH JOURNEY SOURCE TABLE ADDED: YES
LEARNER FAITH JOURNEY READY: YES
LEARNER SUMMARY READY: YES
LEARNER SELF SCOPE SAFE: YES
PARENT SUMMARY READY: YES
PARENT FAITH JOURNEY READY: YES
PARENT BADGE READ READY: YES
PARENT MISSION READ READY: YES
PARENT MILESTONE READ READY: YES
PARENT GUARDIAN SCOPE SAFE: YES
PARENT FULL POINT LEDGER IN MVP: NO
STAFF FAITH JOURNEY READY: YES
CATECHIST CURRENT-ASSIGNMENT SCOPE SAFE: YES
PARISH ADMIN SCOPE SAFE: YES
SUPERADMIN STAFF READ READY: YES
ACTOR-SPECIFIC /ME IMPERSONATION SAFE: YES
HISTORICAL ACHIEVEMENT RETENTION READY: YES
ACTIVE MISSION ELIGIBILITY READY: YES
CANONICAL SUMMARY READY: YES
LATEST ACHIEVEMENT READY: YES
BADGE/MILESTONE N+1 RESOLVED BY INSPECTION: YES
FAITH JOURNEY PERFORMANCE READY BY INSPECTION: YES
DATA MINIMIZATION READY: YES
MANUAL ADJUSTMENT PRIVACY SAFE: YES
SECURITY/MINORS READY: YES
OPENAPI READY BY STATIC INSPECTION: YES
README READY: YES
MODULE BOUNDARY READY BY INSPECTION: YES
CLASS GAMIFICATION SUMMARY IN MVP: NO
UNIT TESTS WRITTEN: YES
INTEGRATION TESTS WRITTEN: YES
DB E2E TESTS WRITTEN: YES
TESTS EXECUTED: NO — deferred by Fast Implementation Mode
DB VALIDATION: NOT RUN — deferred
QUALITY:FULL: NOT RUN — deferred
DOCKER: NOT RUN — deferred
NPM AUDIT: NOT RUN — deferred

Unresolved BLOCKER count: 0
Unresolved HIGH count: 0
Unresolved MEDIUM count: 0

#007 READINESS: YES
```
