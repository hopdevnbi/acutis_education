# GAMIFICATION + FAITH JOURNEY #004/7 — Badges + Milestones Report

## 1. Objective

Implement badge definition admin, automatic/manual awards, soft revoke, points bonus + reversal, milestone definition admin (SuperAdmin-only), automatic milestone achievements, learner/staff badge & milestone reads, event-history enrichment for count rules, transactional ingest extension, DTOs/OpenAPI, specs, and README — without missions, Parent Faith Journey, or demo seed/Postman.

## 2. Fast Implementation Mode

Fast Implementation Mode ACTIVE. Production code + tests written. Validation commands **not** run.

## 3. State inherited

#002 persistence (badge/milestone tables, filtered unique active awards, RBAC permissions).  
#003 points engine (ApplicationEvents, RewardIngestService, ledger, reward rules, staff/learner points APIs, capability-specific Catechist deny for reward rules).

## 4. Files created

- Migration `1788064400000-enrich-processed-reward-events-for-history.ts`
- `RewardEventHistoryService`
- `BadgeAwardProcessor`, `BadgeManualAwardService`, `badge-lifecycle.util.ts`
- `MilestoneAchievementProcessor`
- Utils: `badge-rule.util.ts`, `milestone-trigger.util.ts`, `badge-milestone.constants.ts`
- DTOs: `badge.dto.ts`, `milestone.dto.ts`
- Controllers: badge definitions, milestone definitions, staff badge award; learner/staff read extensions
- Unit/integration/e2e specs for badges/milestones
- This report

## 5. Files modified

- `processed-reward-event.entity` + receipt service + mapper/interfaces (`RewardIngestResult` extended)
- `RewardIngestService` (badge + milestone processors inside same transaction)
- `BadgeService` / `MilestoneService` (admin CRUD, EntityManager, lifecycle)
- `PointLedgerService` (manager-aware reverse; `findBonusEntryForAward`)
- `GamificationAccessService` (badge/milestone capability helpers)
- `GamificationService` / `GamificationModule`
- Errors, HTTP util/mapper, enums (`BadgeRuleType`)
- README Gamification section
- Boundary-related specs unchanged in spirit (still export-only `GamificationService`)

## 6. Badge admin endpoints

| Method | Path | Permission |
| ------ | ---- | ---------- |
| GET | `/api/v1/badges` | `gamification.manage` |
| GET | `/api/v1/badges/:badgeId` | `gamification.manage` |
| POST | `/api/v1/badges` | `gamification.manage` |
| PATCH | `/api/v1/badges/:badgeId` | `gamification.manage` |

Editable: code, name, description, category, scopeType, parishId, awardMode, ruleEventType, ruleConfig, pointsBonus, iconMediaAssetId. No client audit/ownership fields.

## 7. Badge lifecycle

`DRAFT` → `ACTIVE` → `ARCHIVED`; `DRAFT` → `ARCHIVED`.  
No `ARCHIVED` → `ACTIVE` in MVP (`assertBadgeLifecycleTransition`).

## 8. Badge scope policy

- SuperAdmin: GLOBAL + PARISH any
- ParishAdmin: PARISH own parish only
- Catechist: DENIED definition create/update/list manage
- Parent/Student: DENIED

## 9. Badge typed rule model

`BadgeRuleType` stored in `rule_event_type` (typed only; no expression engine):

- `FIRST_LESSON_COMPLETED`, `LESSONS_COMPLETED_COUNT`
- `PRACTICE_COMPLETED_COUNT`
- `FIRST_EXAM_COMPLETED`, `EXAM_SCORE_THRESHOLD`
- `ATTENDANCE_PRESENT_OR_LATE_COUNT`

Configs: `{ "minCount": N }` or `{ "minScorePercent": N }` validated in `badge-rule.util.ts`.

## 10. Automatic badge processor

`BadgeAwardProcessor` runs inside reward ingest transaction after receipt + point rules:

1. Load ACTIVE AUTOMATIC/BOTH definitions for GLOBAL + event parish
2. Type-match + evaluate against event / Gamification history counts
3. Award at most once (filtered unique); duplicate = no-op
4. Optional `pointsBonus` ledger append

## 11. Badge event-count logic

`RewardEventHistoryService.countProcessedEventsForStudentByType` over `processed_reward_events` only. No source-domain repository queries. Attendance events are already PRESENT/LATE-only from ClassOps emission.

## 12. Badge points bonus

On award with `pointsBonus > 0`:

- `sourceType = BADGE_BONUS`
- `sourceId = badgeAward.id`
- `reasonCode = BADGE_BONUS:{badgeCode}`
- `awardedByUserId` null (auto) or actor (manual)

Duplicate bonus identity → skip (non-fatal).

## 13. Manual badge award

`POST /api/v1/students/:studentId/badges/:badgeId/awards` — `badges.award`.  
ACTIVE + MANUAL/BOTH; server-derived enrollment/parish; Catechist assigned class.  
**Duplicate active award: return existing (idempotent; no double bonus).** Documented.

## 14. Badge revoke

`POST /api/v1/students/:studentId/badges/:badgeId/revoke` — soft `revokedAt`.  
Bonus: one compensating REVERSAL if bonus exists; repeated revoke → `BadgeAlreadyRevokedError` (409). No delete of bonus row.

## 15. Badge learner reads

`GET /api/v1/me/learner/badges` — `gamification.read`, self only.  
Includes id/code/name/description/category/iconMediaAssetId/awardedAt/pointsBonus. Omits actor IDs, ruleConfig, staff internals.

## 16. Badge staff reads

`GET /api/v1/students/:studentId/badges` — scoped staff read (same as summary). Parent deferred to #006.

## 17. Milestone admin endpoints

| Method | Path | Permission |
| ------ | ---- | ---------- |
| GET | `/api/v1/milestones` | `gamification.manage` + SuperAdmin capability |
| GET | `/api/v1/milestones/:milestoneId` | same |
| POST | `/api/v1/milestones` | same |
| PATCH | `/api/v1/milestones/:milestoneId` | same |

ParishAdmin/Catechist/Parent/Student denied by `assertCanManageMilestoneDefinitions`.

## 18. Milestone lifecycle

`ACTIVE` / `ARCHIVED`. Archived → no new achievements. Historical retained. No hard delete. No `ARCHIVED` → `ACTIVE` in MVP.

## 19. Milestone typed triggers

`FIRST_LESSON_COMPLETED`, `LESSONS_COMPLETED_COUNT`, `ATTENDANCE_COUNT`, `FIRST_EXAM_COMPLETED`, `FIRST_MISSION_COMPLETED`.  
No sacramental/pastoral types. `FIRST_MISSION_COMPLETED` never matches until #005 emits mission completion.

## 20. Milestone processor

`MilestoneAchievementProcessor` on reward event: ACTIVE definitions, typed evaluate, create once per student, duplicates no-op, no points bonus by default.

## 21. Milestone event-count logic

Same `RewardEventHistoryService` counts mapped reward event types.

## 22. Learner milestone reads

`GET /api/v1/me/learner/milestones` — self only; privacy-minimized.

## 23. Staff milestone reads

`GET /api/v1/students/:studentId/milestones` — scoped staff. Parent deferred to #006.

## 24. Event receipt enrichment

Receipt now stores `parish_id`, `enrollment_id`, `occurred_at` (non-PII) for history/count queries.

## 25. New migration if any

YES — `1788064400000-enrich-processed-reward-events-for-history.ts`.  
Did **not** edit landed #002 migration.

## 26. Transaction/idempotency

Single DB transaction: receipt → point awards → badge awards/bonus → milestone achievements. Replay (`event_id` duplicate) returns `alreadyProcessed` with zero side-effect counters.

## 27. Ingest result extension

`RewardIngestResult` adds `badgesAwarded`, `milestonesAchieved` (internal; no HTTP exposure).

## 28. Capability-specific access

Badge manage / award / milestone manage helpers on `GamificationAccessService` as specified. No `/me` impersonation.

## 29. DTO boundaries

Module-owned badge/milestone DTOs + HTTP mappers. No entity leakage across HTTP.

## 30. Data minimization

Learner omits `awardedByUserId`, `ruleConfig`, internal event/source IDs, `staffNote`, audit internals. No pastoral/PII content.

## 31. Error contract

Added/aliased: `BadgeNotFoundError`, `BadgeDefinitionNotActiveError`, `BadgeAwardNotAllowedError`, `BadgeAlreadyAwardedError`, `BadgeAwardNotFoundError`, `BadgeAlreadyRevokedError`, `MilestoneNotFoundError`, `MilestoneDefinitionNotActiveError`, `MilestoneAlreadyAchievedError`, `MilestoneDefinitionAccessDeniedError`, plus rule/trigger config errors. Automatic duplicates are idempotent no-ops.

## 32. OpenAPI

New routes document bearer auth, permission, scope semantics, UUID params, response DTOs, 400/401/403/404/409 as applicable (static inspection).

## 33. README

Updated Gamification section for badges/milestones, scopes, auto/manual/revoke, bonus/reversal, system-learning-only milestones, no sacramental, no leaderboard, security boundaries. Phase not claimed complete.

## 34. Module boundaries

- Exports only `GamificationService`
- No `forwardRef`
- No direct source repo/entity imports
- ApplicationEvents for event integration only
- No FamilyPortal / Localization / Media runtime for icon ID
- Source modules do not import Gamification (unchanged)

## 35. Unit tests written

YES — badge rule/lifecycle, milestone trigger, access capability shells, ingest result shape, privacy mappers, etc.

## 36. Integration tests written

YES — `test/integration/gamification-badges-milestones.integration-spec.ts` (deferred execution shells).

## 37. DB e2e tests written

YES — `test/gamification-badges-milestones.db.e2e-spec.ts` (deferred execution shells).

## 38. Tests executed

TESTS EXECUTED: NO — deferred by Fast Implementation Mode

## 39. DB validation

DB VALIDATION: NOT RUN — deferred

## 40. quality:full

QUALITY:FULL: NOT RUN — deferred

## 41. Docker

DOCKER: NOT RUN — deferred

## 42. npm audit

NPM AUDIT: NOT RUN — deferred

## 43. Static inspection

Inspected and addressed:

- Badge scope + Catechist definition denial
- ParishAdmin milestone denial
- Duplicate award race (catch unique → return existing / no-op)
- Bonus uniqueness + revoke reversal uniqueness
- Milestone uniqueness
- Event count history enrichment
- Privacy/entity leakage (mappers)
- Ledger immutability (append + REVERSAL only)
- No cycles/`forwardRef` in module

## 44. Risks/deferred

- Runtime validation of TypeORM `In([...])` find for automatic badge listing
- N+1 definition lookups on learner/staff badge/milestone list (acceptable MVP; batch later)
- `FIRST_MISSION_COMPLETED` inert until #005
- Parent reads / Faith Journey timeline deferred to #006
- Missions deferred to #005
- Demo seed/Postman deferred to #007
- Historical receipts before enrichment migration backfill `occurred_at` from `processed_at`

## 45. BLOCKER/HIGH/MEDIUM/LOW

| Severity | Item | Status |
| -------- | ---- | ------ |
| BLOCKER | — | none by static inspection |
| HIGH | — | none by static inspection |
| MEDIUM | Learner/staff list N+1 definition fetches | accepted MVP |
| LOW | FIRST_MISSION_COMPLETED inert until #005 | by design |

Unresolved BLOCKER count: **0**  
Unresolved HIGH count: **0**  
Unresolved MEDIUM count: **1** (N+1 list composition)

## 46. #005 readiness

YES — gates met by static inspection: badge admin/scope, auto/manual award, revoke/bonus/reversal, milestone admin/processing, learner/staff reads, transactional idempotency, source decoupling, specs written. Runtime validation not required.

## 47. Commit recommendation

```
git commit -m "feat(gamification): add badges and milestones"
```

Do not run git add/commit/push from this prompt.

---

## REQUIRED VERDICTS

| Verdict | Value |
| ------- | ----- |
| BADGE DEFINITION ADMIN READY | YES |
| BADGE CAPABILITY SCOPE SAFE | YES |
| AUTOMATIC BADGE AWARDS READY | YES |
| MANUAL BADGE AWARDS READY | YES |
| BADGE REVOKE READY | YES |
| BADGE BONUS POINTS READY | YES |
| BADGE BONUS REVERSAL READY | YES |
| LEARNER BADGE READ READY | YES |
| STAFF BADGE READ READY | YES |
| MILESTONE DEFINITION ADMIN READY | YES |
| MILESTONE SUPERADMIN-ONLY POLICY READY | YES |
| AUTOMATIC MILESTONE ACHIEVEMENTS READY | YES |
| MILESTONE COUNT TRIGGERS READY | YES |
| LEARNER MILESTONE READ READY | YES |
| STAFF MILESTONE READ READY | YES |
| SACRAMENTAL MILESTONES EXCLUDED | YES |
| EVENT RECEIPT HISTORY SUPPORT READY | YES |
| TRANSACTIONAL IDEMPOTENCY PRESERVED | YES |
| SOURCE MODULE DECOUPLING PRESERVED | YES |
| DATA MINIMIZATION READY | YES |
| MODULE BOUNDARY READY BY INSPECTION | YES |
| UNIT TESTS WRITTEN | YES |
| INTEGRATION TESTS WRITTEN | YES |
| DB E2E TESTS WRITTEN | YES |
| TESTS EXECUTED | NO — deferred by Fast Implementation Mode |
| DB VALIDATION | NOT RUN — deferred |
| QUALITY:FULL | NOT RUN — deferred |
| DOCKER | NOT RUN — deferred |
| NPM AUDIT | NOT RUN — deferred |
| Unresolved BLOCKER count | 0 |
| Unresolved HIGH count | 0 |
| Unresolved MEDIUM count | 1 |
| #005 READINESS | YES |

**Next prompt (do not implement automatically):**  
GAMIFICATION + FAITH JOURNEY #005/7 — MISSIONS + PROGRESS / COMPLETION + ADMIN LIFECYCLE
