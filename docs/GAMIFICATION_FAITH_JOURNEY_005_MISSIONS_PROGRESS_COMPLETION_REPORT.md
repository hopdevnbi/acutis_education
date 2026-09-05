# GAMIFICATION + FAITH JOURNEY #005/7 — Missions Progress Completion Report

## 1. Objective

Implement full Mission capability: definition admin/lifecycle, GLOBAL/PARISH/CLASS scopes, capability-specific manage, automatic progress from reward events, completion + pointsBonus, post-commit MISSION_COMPLETED event, FIRST_MISSION_COMPLETED milestone activation, learner/staff mission APIs, summary counts, specs, README — without Parent Faith Journey, timeline, or demo seed.

## 2. Fast Implementation Mode

Fast Implementation Mode ACTIVE. Code + tests written. Validation commands **not** run.

## 3. State inherited

#002 persistence (mission tables, scope_key). #003 points/events. #004 badges/milestones + enriched processed_reward_events. Capability denies for Catechist on reward-rules/badge defs; milestone SuperAdmin-only.

## 4. Files created

- `missions/utils/mission-matching.util.ts`, `mission-lifecycle.util.ts`
- `missions/services/mission-progress.processor.ts`
- `dto/mission.dto.ts`, `constants/mission.constants.ts`
- Controllers: `mission-definitions.controller.ts`, `staff-missions.controller.ts`
- Specs: matching/lifecycle/progress/access + integration/e2e shells
- This report

## 5. Files modified

- `RewardEligibleEvent` (+ `classId`, `MISSION_COMPLETED`, mission metadata keys)
- Source publishers (LearningProgress, Practice, Exam, ClassOperations) emit `classId`
- `MissionService` (admin CRUD, activate/archive, set-based matching/list, applyEventIncrement)
- `RewardIngestService` + listener (mission processor; post-commit publish)
- `milestone-trigger.util` (FIRST_MISSION_COMPLETED → MISSION_COMPLETED)
- Access helpers, GamificationService/Module, HTTP mapper/util, summary DTO, README

## 6. Mission admin endpoints

| Method | Path | Permission |
| ------ | ---- | ---------- |
| GET | `/api/v1/missions` | `gamification.manage` |
| GET | `/api/v1/missions/:missionId` | `gamification.manage` |
| POST | `/api/v1/missions` | `gamification.manage` |
| PATCH | `/api/v1/missions/:missionId` | `gamification.manage` |
| POST | `/api/v1/missions/:missionId/activate` | `gamification.manage` |
| POST | `/api/v1/missions/:missionId/archive` | `gamification.manage` |

## 7. Mission lifecycle

DRAFT → ACTIVE, DRAFT → ARCHIVED, ACTIVE → ARCHIVED. No ARCHIVED→ACTIVE, no ACTIVE→DRAFT. Status not via PATCH.

ACTIVE editable fields only: `name`, `description`, `endsAt`. Scope/condition/targetCount/pointsBonus/startsAt immutable when ACTIVE. ARCHIVED read-only.

## 8. Mission scope model

GLOBAL / PARISH / CLASS via `scope_key`. No STUDENT-targeted missions. Eligibility: GLOBAL any; PARISH match parish; CLASS requires trustworthy `event.classId`.

## 9. Reward event class context

Optional `classId` on `RewardEligibleEvent`. Metadata allow-list adds `missionCode`, `missionScopeType`.

## 10. Source class-context coverage

| Source | classId |
| ------ | ------- |
| LearningProgress | enrollment.classId |
| Practice | enrollment.classId |
| Exam | attempt.classId |
| ClassOperations attendance | session.classId |

CLASS missions only progress when classId present and matches.

## 11. Mission condition mapping

LESSONS_COMPLETED ← LEARNING_LESSON_COMPLETED  
PRACTICE_COMPLETED ← PRACTICE_COMPLETED  
ATTENDANCE_PRESENT_OR_LATE ← ATTENDANCE_SESSION_COMPLETED_MARK  
EXAMS_COMPLETED ← EXAM_COMPLETED  

One condition per mission. No expression engine. MISSION_COMPLETED does not map to a mission condition (no self-progress).

## 12. Mission eligibility matching

ACTIVE + condition + scope + startsAt/endsAt vs occurredAt. DRAFT/ARCHIVED/wrong scope ignored.

## 13. Mission progress processor

`MissionProgressProcessor` after points→badges→milestones in same ingest txn. Returns pending MISSION_COMPLETED events for post-commit publish.

## 14. Progress idempotency

Receipt uniqueness ensures one increment per source event. Multiple missions may progress from one event. Completed never reopens.

## 15. Progress creation/update semantics

First event: create progress currentCount=1 (or COMPLETED if target=1). Subsequent: +1 capped at target. **enrollmentId = initial creation context only** (not overwritten).

## 16. Completion semantics

On crossing target: status COMPLETED, completedAt=occurredAt, bonus once, queue MISSION_COMPLETED after commit.

## 17. Mission completion points bonus

`sourceType=MISSION_COMPLETED`, `sourceId=progress.id`, `reasonCode=MISSION_COMPLETION:{code}`. Duplicate identity non-fatal. Archive does not reverse.

## 18. MISSION_COMPLETED reward event

`eventId=sourceId=progress.id`, parish/enrollment/academicYear from completing event, classId from mission if CLASS. Metadata: missionCode, missionScopeType.

## 19. Completion event timing

Listener publishes pending events **after** ingest transaction resolves. No publish inside open txn.

## 20. Event recursion protection

MISSION_COMPLETED ingest may award point rules + FIRST_MISSION_COMPLETED milestone. Mission condition map excludes MISSION_COMPLETED → no self-progress. Receipt on progress.id prevents double publish ingest.

## 21. FIRST_MISSION_COMPLETED milestone

Trigger maps to MISSION_COMPLETED; once-per-student achievement.

## 22. Mission activate behavior

DRAFT→ACTIVE with validation. **NO HISTORICAL BACKFILL IN MVP.**

## 23. Mission archive behavior

Stops new progress; retains rows; completed stays completed.

## 24. Historical mission semantics

Progress survives transfer/class archive/year close. Completed readable via progress even if no longer currently eligible.

## 25. Admin list/detail

Paginated list (max 50), actor-scoped. Detail capability-scoped. No progress aggregates on detail (separate endpoint).

## 26. Class missions read

`GET /api/v1/classes/:classId/missions` — default ACTIVE; staff scope.

## 27. Staff mission progress

`GET /api/v1/missions/:missionId/progress` — paginated; batch Student snapshots for displayName; Catechist GLOBAL/PARISH requires classId and filters assigned-class students only. ParishAdmin denied GLOBAL progress list.

## 28. Learner mission list

`GET /api/v1/me/learner/missions` — eligible ACTIVE (zero progress OK) + COMPLETED filter. Set-based definitions + progress.

## 29. Learner mission detail

Applicable ACTIVE or historical progress/completion.

## 30. Summary mission counts

`activeMissionCount` = eligible ACTIVE definitions; `completedMissionCount` = persisted COMPLETED progress. Set-based.

## 31. Capability-specific access

SuperAdmin all; ParishAdmin PARISH/CLASS own parish (not GLOBAL manage); Catechist CLASS assigned only; Parent/Student deny admin/staff.

## 32. DTO boundaries

Module-owned mission DTOs; no entity leakage.

## 33. Error contract

MissionNotFoundError, MissionDefinitionNotEditableError, InvalidMissionLifecycleTransitionError, MissionScopeAccessDeniedError, MissionNotApplicableError, MissionProgressAccessDeniedError, MissionDefinitionNotActiveError (+ existing code/scope errors). Mapped 400/403/404/409/422.

## 34. Transactional safety

Receipt+points+badges+milestones+mission progress+bonus atomic. MISSION_COMPLETED post-commit.

## 35. Performance/N+1

Mission processor: one bounded definition query. Learner list: set-based. Staff progress: paginated + batch student names. No per-mission foreign lookups.

## 36. #004 N+1 status

Badge/milestone learner list definition-fetch N+1 **unchanged** (accepted MEDIUM remains). Not worsened. Mission reads designed set-based.

## 37. Data minimization

Learner self-only. Staff progress: studentId + displayName + counts/status. No DOB/contact/guardian/notes/answers. No leaderboard.

## 38. OpenAPI

Routes annotated (static inspection).

## 39. README

Updated with Missions section; phase not claimed complete.

## 40. Module boundaries

Exports GamificationService only; no forwardRef; no source imports; ApplicationEvents neutral.

## 41–43. Tests written

Unit YES · Integration YES · DB e2e YES

## 44–48. Deferred validation

TESTS EXECUTED: NO — deferred by Fast Implementation Mode  
DB VALIDATION: NOT RUN — deferred  
QUALITY:FULL: NOT RUN — deferred  
DOCKER: NOT RUN — deferred  
NPM AUDIT: NOT RUN — deferred

## 49. Static inspection

Checked: scopes, classId coverage, no guessed class, no backfill, bonus uniqueness, stable MISSION_COMPLETED id, no recursion, idempotent progress, no foreign repos, mission N+1 design, learner self, staff class scoping, DTO privacy, no hard delete.

## 50. Risks/deferred

- ParishAdmin cannot list GLOBAL mission progress (by design privacy)
- Catechist class roster page limit 1000 for progress filter
- Parent Faith Journey / timeline (#006)
- Demo seed/Postman (#007)
- #004 badge/milestone N+1 remains

## 51. BLOCKER/HIGH/MEDIUM/LOW

| Severity | Item | Status |
| -------- | ---- | ------ |
| BLOCKER | — | 0 |
| HIGH | — | 0 |
| MEDIUM | #004 badge/milestone list N+1 | remains |
| LOW | Catechist progress filter limit 1000 | accepted |

Unresolved BLOCKER: **0** · HIGH: **0** · MEDIUM: **1**

## 52. #006 readiness

YES — gates met by static inspection.

## 53. Commit recommendation

```
git commit -m "feat(gamification): add missions and progress"
```

Do not run git add/commit/push from this prompt.

---

## REQUIRED VERDICTS

| Verdict | Value |
| ------- | ----- |
| MISSION DEFINITION ADMIN READY | YES |
| MISSION LIFECYCLE READY | YES |
| MISSION SCOPE MODEL READY | YES |
| CATECHIST CLASS-ONLY MANAGEMENT SAFE | YES |
| PARISH ADMIN SCOPE SAFE | YES |
| SUPERADMIN MISSION MANAGEMENT READY | YES |
| MISSION EVENT CLASS CONTEXT READY | YES |
| MISSION CONDITION MATCHING READY | YES |
| MISSION PROGRESS PROCESSOR READY | YES |
| MISSION PROGRESS IDEMPOTENCY READY | YES |
| MISSION COMPLETION READY | YES |
| MISSION BONUS POINTS READY | YES |
| MISSION_COMPLETED EVENT READY | YES |
| EVENT RECURSION SAFE | YES |
| FIRST_MISSION_COMPLETED MILESTONE READY | YES |
| LEARNER MISSION LIST READY | YES |
| LEARNER MISSION DETAIL READY | YES |
| STAFF CLASS MISSIONS READY | YES |
| STAFF MISSION PROGRESS READY | YES |
| MISSION SUMMARY COUNTS READY | YES |
| HISTORICAL MISSION RETENTION READY | YES |
| NO HISTORICAL BACKFILL POLICY READY | YES |
| DATA MINIMIZATION READY | YES |
| N+1/PERFORMANCE READY BY INSPECTION | YES |
| SOURCE MODULE DECOUPLING PRESERVED | YES |
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
| #006 READINESS | YES |

**Next prompt (do not implement automatically):**  
GAMIFICATION + FAITH JOURNEY #006/7 — FAITH JOURNEY + LEARNER / PARENT / CATECHIST READS + SECURITY / CONTRACT HARDENING
