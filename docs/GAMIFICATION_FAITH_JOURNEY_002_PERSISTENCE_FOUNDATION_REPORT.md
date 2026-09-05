# GAMIFICATION + FAITH JOURNEY #002/7 — Persistence Foundation Report

## 1. Objective

Implement the Gamification module persistence foundation: NestJS module shell, nine owned tables with migration/entities, internal repository services, public `GamificationService` facade, access helpers, RBAC permissions, neutral reward-event contract, and unit/integration specs — without reward ingest, HTTP controllers, or source-module emission.

## 2. Fast Implementation Mode

Fast Implementation Mode is ACTIVE.

- Production code, entities, migration, module wiring, and test/spec files were written.
- Runtime validation commands were **not** executed (tests, lint, typecheck, build, quality, Docker, DB migrate/seed, npm audit).

## 3. State inherited

From #001 domain audit:

- Single module `gamification`; Faith Journey is a composed read capability inside it.
- Append-only point ledger; balance = `SUM(points_delta)`.
- Idempotency via `processed_reward_events.event_id` + ledger unique `(student_id, source_type, source_id, reason_code)`.
- Nine tables; no leaderboard/streaks; system/learning milestones only.
- Permissions: `gamification.read`, `gamification.manage`, `points.adjust`, `badges.award`.

## 4. Files created

### Module

- `src/modules/gamification/gamification.module.ts`
- `src/modules/gamification/gamification.service.ts`
- `src/modules/gamification/access/gamification-access.service.ts`
- `src/modules/gamification/enums/gamification.enums.ts`
- `src/modules/gamification/constants/gamification-permissions.constants.ts`
- `src/modules/gamification/constants/gamification-permissions.constants.spec.ts`
- `src/modules/gamification/errors/gamification.errors.ts`
- `src/modules/gamification/interfaces/gamification.interfaces.ts`
- `src/modules/gamification/mappers/gamification.mapper.ts`
- `src/modules/gamification/utils/reward-rule.util.ts`
- `src/modules/gamification/utils/reward-rule.util.spec.ts`
- `src/modules/gamification/utils/reward-event.util.ts`
- `src/modules/gamification/utils/reward-event.util.spec.ts`

### Points / rewards / badges / missions / milestones / faith-journey

- Entities (9), services (RewardRule, RewardEventReceipt, PointLedger, Badge, Mission, Milestone), utils + specs under respective folders
- `src/modules/gamification/faith-journey/services/faith-journey.service.ts` (placeholder shell, not registered)
- `src/modules/gamification/faith-journey/interfaces/faith-journey.interface.ts`

### Application events (neutral contract)

- `src/modules/application-events/contracts/reward-eligible-event.contract.ts`
- `src/modules/application-events/index.ts`

### Migration / tests / report

- `src/database/migrations/1788064200000-create-gamification-schema.ts`
- `test/integration/gamification-foundation.integration-spec.ts`
- `docs/GAMIFICATION_FAITH_JOURNEY_002_PERSISTENCE_FOUNDATION_REPORT.md`

## 5. Files modified

- `src/app.module.ts` — register `GamificationModule`
- `src/database/seeds/auth-rbac.seed.constants.ts` — four permissions + role matrix
- `src/modules/module-boundaries.spec.ts` — Gamification boundary assertions

## 6. Module structure

```
src/modules/gamification/
  gamification.module.ts
  gamification.service.ts
  access/
  enums/
  constants/
  errors/
  interfaces/
  mappers/
  utils/
  points/entities|services|utils
  rewards/entities|services
  badges/entities|services|utils
  missions/entities|services|utils
  milestones/entities|services|utils
  faith-journey/interfaces|services
```

No HTTP controllers in #002.

## 7. Module imports

`StudentModule`, `EnrollmentModule`, `ClassModule`, `ParishModule`, `AuthModule`, `AccessControlModule`, `TypeOrmModule.forFeature([...9 entities])`.

**Not imported:** LearningProgress, Practice, Exam, ClassOperations, FamilyPortal, Localization, Media.

No `forwardRef`.

## 8. Module exports

`GamificationService` only.

## 9. Table ownership

All nine tables owned by `gamification`.

## 10. Exact 9-table schema

1. `reward_rules`
2. `processed_reward_events`
3. `point_ledger_entries`
4. `badge_definitions`
5. `badge_awards`
6. `mission_definitions`
7. `mission_progress`
8. `milestone_definitions`
9. `milestone_achievements`

Migration: `1788064200000-create-gamification-schema.ts` (create order above; down reverses).

## 11. reward_rules

Columns: `id`, `code` (unique), `event_type`, `source_type`, `points` (≥0), `status` ACTIVE|INACTIVE, `max_awards_per_source` (>0, default 1), `scope_type` GLOBAL|PARISH, `parish_id` nullable, `effective_from/to`, `created_at`, `updated_at`.

Checks: status, scope, GLOBAL⇒parish NULL / PARISH⇒parish NOT NULL, effective range, points, max awards.

FK: `parish_id` → `parishes` NO ACTION.

## 12. processed_reward_events

Event receipt / replay protection. Columns: `id`, `event_id` (unique), `event_type`, `student_id`, `source_id`, `processed_at`, `created_at`. No PII / no result_summary_json.

FK: `student_id` → `students` NO ACTION.

## 13. point_ledger_entries

Append-only ledger. Columns include signed `points_delta` (CHECK ≠ 0), source identity, `reason_code`, optional `staff_note` (staff-only), `related_ledger_entry_id` self-FK, `created_at` only (no `updated_at`).

Unique: `(student_id, source_type, source_id, reason_code)`.

Indexes: student+created_at, parish+created_at, source_type+source_id.

FKs to students/enrollments/parishes/academic_years/users/self — all NO ACTION.

## 14. badge_definitions

Definition table with status DRAFT|ACTIVE|ARCHIVED, award_mode AUTOMATIC|MANUAL|BOTH, scope GLOBAL|PARISH, optional `rule_config_json` (ISJSON), `points_bonus` ≥0, `icon_media_asset_id` scalar only (no MediaModule).

## 15. badge_awards

Historical awards with soft revoke (`revoked_at`). Filtered unique index:

`UQ_badge_awards_active_definition_student` on `(badge_definition_id, student_id) WHERE revoked_at IS NULL`.

Own FK to `badge_definitions` NO ACTION. No hard delete API.

## 16. mission_definitions

GLOBAL|PARISH|CLASS scope with derived `scope_key`:

- `GLOBAL`
- `PARISH:{parishId}`
- `CLASS:{classId}`

Unique `(scope_key, code)` avoids MSSQL nullable uniqueness traps.

CHECK enforces nullability + `scope_key` prefix pattern (not CONVERT equality — casing safe).

Condition types: LESSONS_COMPLETED, PRACTICE_COMPLETED, ATTENDANCE_PRESENT_OR_LATE, EXAMS_COMPLETED.

## 17. mission_progress

Unique `(mission_definition_id, student_id)`. Status ACTIVE|COMPLETED. `current_count` capped ≤ `target_count`. COMPLETED⇔`completed_at` NOT NULL. No reopen once completed (upsert short-circuits).

## 18. milestone_definitions

System/learning triggers only (no sacramental). Unique `code`. Status ACTIVE|ARCHIVED.

## 19. milestone_achievements

Unique `(milestone_definition_id, student_id)`. No hard delete.

## 20. Enum model

Module-owned varchar enums in `gamification.enums.ts`: PointSourceType, RewardRuleStatus/Scope, Badge*, Mission*, MilestoneTriggerType (learning/system only).

## 21. Scope/status constraints

DB CHECK constraints + domain helpers (`assertRewardRuleScope`, `buildMissionScopeKey`, badge scope validation).

## 22. Unique/index strategy

| Table | Unique |
| ----- | ------ |
| reward_rules | code |
| processed_reward_events | event_id |
| point_ledger_entries | (student_id, source_type, source_id, reason_code) |
| badge_definitions | code |
| badge_awards | filtered active (definition, student) |
| mission_definitions | (scope_key, code) |
| mission_progress | (mission_definition_id, student_id) |
| milestone_definitions | code |
| milestone_achievements | (milestone_definition_id, student_id) |

## 23. MSSQL nullable/filtered unique strategy

- Badge awards: filtered unique WHERE `revoked_at IS NULL` (project pattern matches practice/exam filtered indexes).
- Missions: non-null derived `scope_key` + unique `(scope_key, code)` instead of nullable composite uniqueness.

## 24. FK/scalar-ID strategy

Cross-module refs are scalar UUIDs on entities. Migration adds SQL FKs with **NO ACTION** where conventions exist (students, enrollments, parishes, classes, academic_years, users). `icon_media_asset_id` remains soft scalar (no Media FK / no MediaModule).

## 25. Delete/cascade strategy

No CASCADE deletes. Historical ledger/awards/progress/achievements retained. Definitions archive via status later.

## 26. Ledger append-only design

`PointLedgerService` exposes `append`, `reverseEntry` (compensating row), `getBalance`, `listByStudentId`, `findByIdentity`. No `updatePoints` / `setBalance` / `deleteEntry`. Spec asserts API surface.

## 27. Entity design

Nine TypeORM entities; app UUID PKs; varchar enums; no cross-module relations; no lazy loads; no cascade deletes.

## 28. Snapshot/interface design

Narrow snapshots in `gamification.interfaces.ts` (rules, ledger, balance, badges, missions, milestones, summary, Faith Journey placeholder). No HTTP DTOs.

## 29. RewardRuleService foundation

Find by code/id, find active matching (GLOBAL + parish), create/update primitives with scope/effective validation.

## 30. PointLedgerService foundation

Append-only primitives, balance aggregate, list, reversal compensating entries, duplicate identity detection.

## 31. RewardEventReceiptService foundation

`findByEventId`, `isDuplicateEventId`, `recordProcessed` with unique `event_id` collision → `RewardEventAlreadyProcessedError`.

## 32. BadgeService foundation

Definition persistence, active list, award create, soft revoke, active-award uniqueness handling.

## 33. MissionService foundation

Definition persistence with `scope_key`, progress upsert with cap/completed semantics (no reopen).

## 34. MilestoneService foundation

Definition + achievement persistence; unique achievement handling.

## 35. GamificationService facade

Safe reads: balance, ledger (staff_note stripped), badges, missions, milestones, matching rules, event-processed check, summary aggregate. Does not expose repositories or ingest mutations.

## 36. Access service foundation

`GamificationAccessService`: SuperAdmin, ParishAdmin parish membership, Catechist assigned class, Parent guardian link, Learner self — via public Student/Class/Enrollment/Parish/AccessControl APIs. No foreign repositories. Controllers deferred.

## 37. RBAC permissions

Seeded exactly:

- `gamification.read`
- `gamification.manage`
- `points.adjust`
- `badges.award`

## 38. RBAC matrix

| Role | read | manage | points.adjust | badges.award |
| ---- | ---- | ------ | ------------- | ------------ |
| SUPER_ADMIN | Yes | Yes | Yes | Yes |
| PARISH_ADMIN | Yes | Yes | Yes | Yes |
| CATECHIST | Yes | Yes | Yes | Yes |
| PARENT | Yes | No | No | No |
| STUDENT | Yes | No | No | No |

Permission ≠ scope (scope enforced in access service / later HTTP).

## 39. Reward event contract foundation

Neutral location: `src/modules/application-events/contracts/reward-eligible-event.contract.ts`.

`RewardEligibleEvent`: eventId, eventType, occurredAt, studentId, enrollmentId?, parishId, academicYearId?, sourceId, allow-listed metadata.

Producers need not import GamificationModule.

## 40. Reward event type constants

- `LEARNING_LESSON_COMPLETED`
- `PRACTICE_COMPLETED`
- `EXAM_COMPLETED`
- `ATTENDANCE_SESSION_COMPLETED_MARK`

Metadata allow-list: `attendanceStatus`, `scorePercent`, `canonicalLessonKey`.

## 41. Idempotency foundation

Receipt unique `event_id`; ledger unique award identity helpers; duplicate detection primitives. Full ingest engine deferred to #003.

## 42. Module boundaries

Boundaries asserted in `module-boundaries.spec.ts`: export-only facade, approved imports, no source-module reverse imports, no forwardRef, no FamilyPortal/Localization/Media, no foreign entity imports in module file.

## 43. Unit tests written

YES — ledger util/API surface, reward rules, missions, badges, milestones, reward events, RBAC matrix, module boundaries.

## 44. Integration tests written

YES — `test/integration/gamification-foundation.integration-spec.ts` covering table presence, uniques, append-only zero-delta, filtered badge unique, mission scope/progress, milestone uniqueness/trigger check, NO ACTION FKs.

## 45. Tests executed

TESTS EXECUTED: NO — deferred by Fast Implementation Mode

## 46. DB validation

DB VALIDATION: NOT RUN — deferred

## 47. quality:full

QUALITY:FULL: NOT RUN — deferred

## 48. Docker

DOCKER: NOT RUN — deferred

## 49. npm audit

NPM AUDIT: NOT RUN — deferred

## 50. Static inspection findings

Inspected manually:

- Module registration in AppModule present
- Export surface = `GamificationService` only
- No forwardRef / no source reward module imports
- Migration/entity column alignment for nine tables
- Filtered badge unique + mission `scope_key` uniqueness
- Fixed mission CHECK to avoid GUID casing mismatch with `CONVERT(varchar(36), …)`
- Ledger append-only service surface
- RBAC seed four permissions without duplication of unrelated codes
- Event contract outside Gamification
- Access service uses public APIs (`assertActingAsLinkedStudent`, `assertGuardianLinked`)

MEDIUM (deferred product): FaithJourneyService placeholder not registered (intentional for #002). Catechist `gamification.manage` is permission-wide; CLASS-only mission management remains a later service-scope gate.

## 51. Risks/deferred

- Reward ingest engine / EventEmitter wiring (#003)
- Source module emission (#003)
- HTTP APIs (#004+)
- Faith Journey composition (#005+)
- Demo seed / Postman (later finalization)
- Runtime migration apply + test execution deferred by Fast Mode

## 52. BLOCKER/HIGH/MEDIUM/LOW

| Severity | Count | Notes |
| -------- | ----- | ----- |
| BLOCKER | 0 | |
| HIGH | 0 | |
| MEDIUM | 2 | Faith Journey shell unregistered (expected); Catechist manage scope refinement deferred |
| LOW | 1 | Integration FK delete-action helper uses sys catalog query — validate when DB run |

Unresolved BLOCKER count: **0**  
Unresolved HIGH count: **0**  
Unresolved MEDIUM count: **2**

## 53. #003 readiness

Gate checklist:

- Module foundation exists — YES
- Nine tables/entities/migration — YES
- Append-only ledger intact — YES
- Event receipt/idempotency foundation — YES
- Reward rule persistence — YES
- Badge/mission/milestone persistence — YES
- RBAC seeded — YES
- Event contract ready — YES
- Tests/specs written — YES
- No BLOCKER/HIGH by static inspection — YES

**#003 READINESS: YES**

Recommended next prompt (do not auto-implement):

GAMIFICATION + FAITH JOURNEY #003/7 —  
POINTS ENGINE + REWARD EVENT INGESTION + RULES + MANUAL ADJUSTMENTS

## 54. Commit recommendation

```
git commit -m "feat(gamification): add persistence foundation"
```

(Do not run git add/commit/push from this prompt.)

---

## REQUIRED VERDICTS

GAMIFICATION MODULE FOUNDATION READY: **YES**  
NINE-TABLE SCHEMA IMPLEMENTED: **YES**  
REWARD RULE PERSISTENCE READY: **YES**  
EVENT RECEIPT PERSISTENCE READY: **YES**  
POINT LEDGER PERSISTENCE READY: **YES**  
LEDGER APPEND-ONLY MODEL READY: **YES**  
BADGE PERSISTENCE READY: **YES**  
MISSION PERSISTENCE READY: **YES**  
MILESTONE PERSISTENCE READY: **YES**  
REWARD EVENT CONTRACT FOUNDATION READY: **YES**  
IDEMPOTENCY FOUNDATION READY: **YES**  
RBAC PERMISSIONS READY: **YES**  
MODULE BOUNDARY READY BY INSPECTION: **YES**  
UNIT TESTS WRITTEN: **YES**  
INTEGRATION TESTS WRITTEN: **YES**  
TESTS EXECUTED: NO — deferred by Fast Implementation Mode  
DB VALIDATION: NOT RUN — deferred  
QUALITY:FULL: NOT RUN — deferred  
DOCKER: NOT RUN — deferred  
NPM AUDIT: NOT RUN — deferred  

Unresolved BLOCKER count: **0**  
Unresolved HIGH count: **0**  
Unresolved MEDIUM count: **2**  

#003 READINESS: **YES**
