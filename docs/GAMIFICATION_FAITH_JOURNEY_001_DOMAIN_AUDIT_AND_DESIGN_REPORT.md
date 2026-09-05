# GAMIFICATION + FAITH JOURNEY #001/7 — Domain Audit and Design Report

**Date:** 2026-09-05  
**Mode:** AUDIT / DESIGN ONLY — Fast Implementation Mode  
**Prior phase:** Attendance + Class Operations implementation complete (runtime validation deferred)  
**Next:** #002/7 Persistence foundation (not implemented here)

---

## 1. Objective

Define the bounded context, ownership, reward model, event integration, tables, RBAC, APIs, and 7-prompt plan for Gamification + Faith Journey — without implementing production business code or running validation.

---

## 2. Roadmap position

| Phase | Status |
| ----- | ------ |
| Learning Progress / Practice / Exam / Family Portal / Class Operations | Implementation complete (various validation postures) |
| Attendance + Class Operations | Implementation complete; runtime validation deferred |
| **Gamification + Faith Journey** | **#001/7 design** |
| FE Integration / Stabilization | Later, cross-cutting |

Estimated capability size: **7 prompts** (within requested 6–8).

---

## 3. Existing source-domain capabilities

| Module | Public facade | Owns (truth) | Relevant for rewards |
| ------ | ------------- | ------------ | -------------------- |
| `learning-progress` | `LearningProgressService` | `lesson_progress` | Lesson completed |
| `practice` | `PracticeService` | practice sessions/attempts | Practice completed |
| `exam` | `ExamService` | attempts/results | Exam completed / score threshold |
| `class-operations` | `ClassOperationsService` | sessions, roster, attendance | PRESENT / LATE marks on COMPLETED sessions |
| `enrollment` / `student` / `class` / `parish` | respective facades | people/structure | Scope IDs only |
| `family-portal` | portal services | none (composition) | May later compose gamification reads; **MVP: Gamification owns its own `/me` routes** (same pattern as Class Operations) |

Source modules must remain pedagogical/operational sources of truth. Gamification must not write into them.

---

## 4. Existing event/integration infrastructure

**Finding:** No Nest `EventEmitter`, CQRS, queue, or outbox exists in `src/` or `package.json`.

Cross-module pattern today: **synchronous public facade calls** (e.g. Family Portal → LearningProgress/Exam).

**Design implication:** Introduce a **narrow in-process reward-event contract** that is extraction-safe, without building a full message bus in MVP.

---

## 5. Bounded-context options

### OPTION A — One module `gamification`

Owns points, badges, missions, milestones, and Faith Journey as a **composed read model**.

**Pros:** Single facade; no artificial split; FE simpler; Faith Journey is projection not second ledger; easiest extraction boundary later (one service).  
**Cons:** Larger module; need internal package discipline.

### OPTION B — `gamification` + `faith-journey`

**Pros:** Terminology split.  
**Cons:** Faith Journey has little owned data if projection-only; risk of cycles or duplicated timeline tables; FE complexity; premature split.

### OPTION C — One module named `faith-journey` for everything

**Pros:** Branding.  
**Cons:** Overloads “faith journey” with points/badges; blurs engagement rewards vs journey markers; poorer naming for microservice extraction.

**Evaluation vs criteria:** Ownership clarity, microservice extraction, coupling, terminology, non-point milestones, FE simplicity, events, maintainability → **Option A wins**.

---

## 6. Final module strategy

**One NestJS module** with clear internal folders (`points/`, `badges/`, `missions/`, `milestones/`, `faith-journey/` read services) and **one public facade**.

---

## 7. Final module name(s)

**FINAL MODULE STRATEGY:** one module  
**FINAL MODULE NAME(S):** `gamification`

Path: `src/modules/gamification/`  
Export: `GamificationService` only (facade).

Faith Journey is a **read capability inside** `gamification`, not a separate Nest module in MVP.

---

## 8. Domain principles

1. **POINTS ARE ENGAGEMENT REWARDS, NOT SPIRITUAL VALUE.**  
2. Educational analytics must not be framed as spiritual worth or faith quality (`PROJECT_RULES.md` §24).  
3. No pastoral/confessional data in gamification records.  
4. No public ranking of spiritual worth; no “holiness score.”  
5. Pedagogical/operational domains remain sources of truth; gamification stores **projections and awards** only.  
6. Distinguish **game-like rewards** (points, badges, missions) from **Faith Journey markers** (milestones + timeline of achievements).  
7. Sacramental/pastoral milestones are **out of scope** for this module (future dedicated domain).

---

## 9. Points ledger model

**POINT MODEL = immutable ledger**

Canonical store: append-only `point_ledger_entries`.  
Balance = `SUM(points_delta)` for student (optionally filtered by parish/year).

No mutable canonical balance column as source of truth. Optional future cached projection only if performance evidence requires it (deferred).

---

## 10. Point source types

Stable enum / varchar codes (MVP set — do not explode):

| sourceType | Meaning |
| ---------- | ------- |
| `LESSON_COMPLETED` | Learning progress completed |
| `PRACTICE_COMPLETED` | Practice session completed |
| `EXAM_COMPLETED` | Exam attempt finalized |
| `EXAM_SCORE_THRESHOLD` | Score met rule threshold |
| `ATTENDANCE_PRESENT` | Attendance PRESENT on completed session |
| `ATTENDANCE_LATE` | Attendance LATE on completed session |
| `MISSION_COMPLETED` | Mission completion bonus |
| `BADGE_BONUS` | Optional points with badge award |
| `MANUAL_AWARD` | Staff positive adjustment |
| `ADJUSTMENT` | Staff signed correction |
| `REVERSAL` | Compensating entry referencing prior ledger id |

Ledger fields (conceptual):  
`id`, `studentId`, `enrollmentId?`, `parishId`, `academicYearId?`, `pointsDelta`, `sourceType`, `sourceId`, `reasonCode`, `descriptionKey`, `awardedByUserId?`, `relatedLedgerEntryId?` (for reversals), `createdAt`.

---

## 11. Idempotency strategy

**Two layers:**

1. **Event receipt:** `processed_reward_events` unique on `eventId` (UUID from publisher). Duplicate ingest → no-op success (idempotent retry).  
2. **Ledger uniqueness:** unique `(student_id, source_type, source_id, reason_code)` for automatic/manual awards that must not double-fire.

`reasonCode` ties to `reward_rules.code` (or fixed system codes for manual/reversal).

Duplicate event / duplicate ledger insert → treat as **already applied**, not 500.

---

## 12. Reversal/correction strategy

- **Never UPDATE/DELETE** ledger monetary fields.  
- Correction = new row with negative/positive `pointsDelta`, `sourceType=REVERSAL|ADJUSTMENT`, `relatedLedgerEntryId` pointing at original.  
- Manual awards use `MANUAL_AWARD` / `ADJUSTMENT` with required reason note (stored as descriptionKey or staffNote max length; never log secrets).  
- Negative balance allowed only if staff correction produces it; no automatic “debt farming” rules in MVP.

---

## 13. Reward rule model

**DB-configurable `reward_rules`** with typed event matching — **not** a generic expression engine.

Fields (conceptual):  
`id`, `code` (unique), `eventType`, `sourceType`, `points` (non-negative for awards), `status` (`ACTIVE`|`INACTIVE`), `maxAwardsPerSource` (default 1), `scope` (`GLOBAL`|`PARISH`), `parishId?`, `effectiveFrom?`, `effectiveTo?`, timestamps.

Matching: inbound event `eventType` → active rules → emit ledger rows with rule `code` as `reasonCode`.

Hardcoded fallbacks only for system `REVERSAL` / structural codes.

**REWARD RULE MODEL READY: YES**

---

## 14. Badge definition model

Table `badge_definitions`:  
`id`, `code` (unique), `name`, `description`, `category`, `scope` (`GLOBAL`|`PARISH`), `parishId?`, `status` (`DRAFT`|`ACTIVE`|`ARCHIVED`), `awardMode` (`AUTOMATIC`|`MANUAL`|`BOTH`), `ruleEventType?`, `ruleConfig` (bounded JSON: e.g. `{ "minCount": 5 }` — typed schemas per ruleEventType, not free expression), `pointsBonus?`, `iconMediaAssetId?`, timestamps.

---

## 15. Badge award model

Table `badge_awards`:  
`id`, `badgeDefinitionId`, `studentId`, `enrollmentId?`, `parishId`, `awardedAt`, `sourceType`, `sourceId`, `awardedByUserId?`, `revokedAt?` (null = active).

---

## 16. Badge repeat/revoke policy

- **MVP default: non-repeatable** — unique active award `(badge_definition_id, student_id)` where `revoked_at IS NULL`.  
- Repeatable badges deferred.  
- **Revocation:** soft `revokedAt` only for staff mistake / policy; does not delete history row. Optional reverse of `pointsBonus` via compensating ledger entry.  
- Manual + automatic awards supported via `awardMode`.

---

## 17. Mission definition model

Table `mission_definitions`:  
`id`, `code` (unique per scope), `name`, `description`, `status` (`DRAFT`|`ACTIVE`|`ARCHIVED`), `scopeType` (`GLOBAL`|`PARISH`|`CLASS`), `parishId?`, `classId?`, `conditionType` (typed enum), `targetCount`, `pointsBonus?`, `startsAt?`, `endsAt?`, timestamps.

**Typed condition types (MVP — no generic engine):**

| conditionType | Progress source |
| ------------- | --------------- |
| `LESSONS_COMPLETED` | lesson completed events |
| `PRACTICE_COMPLETED` | practice completed events |
| `ATTENDANCE_PRESENT_OR_LATE` | attendance present/late events |
| `EXAMS_COMPLETED` | exam completed events |

---

## 18. Mission assignment model

**MVP:** No separate assignment table.  
Scope on definition is sufficient:

- `GLOBAL` / `PARISH` / `CLASS` → eligible students inferred from enrollment/class membership when progress is updated.  
- Individual STUDENT-targeted missions: **deferred** (can add `mission_assignments` later).

---

## 19. Mission progress model

**Persisted projection** updated idempotently when reward events are processed.

Table `mission_progress`:  
`id`, `missionDefinitionId`, `studentId`, `enrollmentId?`, `currentCount`, `targetCount`, `status` (`ACTIVE`|`COMPLETED`), `completedAt?`, `lastEventId?`, timestamps.

Unique `(mission_definition_id, student_id)`.

Contribution tracking: rely on event + ledger/mission update in same processor transaction; optional `mission_progress_contributions` deferred if uniqueness of source events is enough.

**MISSION PROGRESS MODEL:** hybrid — persisted counters, incremented only from idempotent event processing (not live full recompute on every GET).

---

## 20. Mission lifecycle

Definition: `DRAFT` → `ACTIVE` → `ARCHIVED`.  
Progress: `ACTIVE` → `COMPLETED` (terminal for that mission/student).  
No reopen in MVP. Archiving definition stops new progress; completed rows retained.

---

## 21. Milestone definition model

Table `milestone_definitions`:  
`id`, `code` (unique), `name`, `description`, `status` (`ACTIVE`|`ARCHIVED`), `triggerType` (typed), `triggerConfig` (bounded JSON), `sortOrder`, timestamps.

**SYSTEM/LEARNING only** (examples): first lesson completed; N attendances; first exam completed; first mission completed; catechism-level completion *if* signaled by a future stable event (otherwise defer).

**SACRAMENTAL/PASTORAL milestones: DEFERRED** to a dedicated pastoral domain — not faked here.

MVP: **SuperAdmin-managed system definitions**; parish-custom milestones deferred.

---

## 22. Milestone achievement model

Table `milestone_achievements`:  
`id`, `milestoneDefinitionId`, `studentId`, `enrollmentId?`, `parishId`, `achievedAt`, `sourceType`, `sourceId`.

Unique `(milestone_definition_id, student_id)`.

---

## 23. Faith Journey strategy

**FAITH JOURNEY DATA MODEL STRATEGY:** composed **read model / timeline projection** over:

- points summary (aggregate query)  
- badge awards  
- mission progress (active + completed)  
- milestone achievements  
- recent ledger + award events (bounded)

**No** second source-of-truth timeline table duplicating all events in MVP.  
Optional later: materialized `faith_journey_timeline_items` if read cost requires it.

---

## 24. Event integration strategy

**Chosen:** In-process **publish/subscribe via a thin Application Events infrastructure module** (to be added in #002/#003), not direct LearningProgress→Gamification hard coupling preferred long-term.

**MVP practical shape:**

1. Add small infrastructure module e.g. `application-events` (or Nest `@nestjs/event-emitter` dependency) that is **not** domain logic.  
2. Source modules emit **narrow reward-eligible domain events** after successful commit of their own transaction (or immediately after successful write if no outbox yet — document at-least-once).  
3. `gamification` listens and calls internal `RewardIngestService`.  
4. **Gamification does not import source repositories/entities.**  
5. Sources **do not import** Gamification services/entities — only emit events (avoids cycles).

Fallback if event package deferred one prompt: temporary `GamificationService.ingestRewardEvent` called from source modules — still no reverse Gamification→source repo calls; migrate to emitter ASAP. Preferred design remains emitter direction.

**At-least-once + idempotency** covers retries.

---

## 25. Reward event contract

```text
RewardEligibleEvent {
  eventId: uuid          // publisher-generated, stable per occurrence
  eventType: string      // LEARNING_LESSON_COMPLETED | PRACTICE_COMPLETED | EXAM_COMPLETED | ATTENDANCE_MARKED ...
  occurredAt: Date
  studentId: uuid
  enrollmentId?: uuid
  parishId: uuid
  academicYearId?: uuid
  sourceId: uuid         // lesson progress id / practice session id / attempt id / attendance composite key id
  metadata: allow-listed primitives only (e.g. attendanceStatus, examScorePercent, canonicalLessonKey)
}
```

No entities, no PII (no names/emails/phones), no notes from attendance.

**REWARD EVENT MODEL READY: YES**

---

## 26. Cross-module dependency graph

```text
learning-progress ──emit──┐
practice ─────────────────┤
exam ─────────────────────┼──► application-events (infra)
class-operations ─────────┘              │
                                         ▼
                                   gamification
                                         │
                    ┌────────────────────┼────────────────────┐
                    ▼                    ▼                    ▼
              points/badges         missions            milestones
                    └────────────────────┬────────────────────┘
                                         ▼
                              faith-journey read APIs
                                         │
                                         ▼
                              FE / Mobile (HTTP only)

student / enrollment / parish / class / access-control
  ▲
  └── gamification may depend on their PUBLIC APIs for scope checks only
```

**Forbidden:** Gamification → source repos; source modules → Gamification entities; FamilyPortal required import of Gamification in MVP (Gamification owns `/me` routes).  
**No `forwardRef` by default.**

---

## 27. LearningProgress integration

Emit `LEARNING_LESSON_COMPLETED` when status becomes `COMPLETED` (first transition only; progress module already monotonic).  
Gamification awards points/badges/missions/milestones from rules.  
No write-back to `lesson_progress`.

---

## 28. Practice integration

Emit `PRACTICE_COMPLETED` when a practice session reaches terminal completed state.  
Same ingest path.

---

## 29. Exam integration

Emit `EXAM_COMPLETED` on finalized attempt.  
Optional second event or metadata for `EXAM_SCORE_THRESHOLD` rules using score in allow-listed metadata.

---

## 30. Attendance integration

Emit only for durable marks that should count — **recommend:** when session is **COMPLETED** and mark is PRESENT/LATE (batch emit on complete, or emit on mark upsert and ignore until session completed via rule filter).  

**Preferred:** emit `ATTENDANCE_SESSION_COMPLETED_MARK` per roster mark when session transitions to COMPLETED (set-based from ClassOperations complete flow). Avoids rewarding SCHEDULED drafts.

Gamification never writes attendance.

---

## 31. Manual point adjustment policy

| Actor | Allowed |
| ----- | ------- |
| SUPER_ADMIN | Yes, global |
| PARISH_ADMIN | Yes, own parish students |
| CATECHIST | Yes, ACTIVE assigned class students only |
| PARENT / STUDENT | **Never** |

Rules:

- Required reason (1–500 chars).  
- Signed integer delta; reject 0; MVP max absolute magnitude e.g. 1000 per entry (constant).  
- Creates ledger `MANUAL_AWARD` (delta>0) or `ADJUSTMENT` (any signed).  
- `awardedByUserId` required.  
- Client cannot submit auto-reward `pointsDelta` on event ingest endpoints (ingest is internal).

---

## 32. Badge administration

| Actor | Definitions | Manual award |
| ----- | ----------- | ------------ |
| SUPER_ADMIN | GLOBAL (+ any) | Yes |
| PARISH_ADMIN | PARISH (own parish) | Own parish students |
| CATECHIST | No create/manage | Manual award only if badge `awardMode` allows MANUAL and student in assigned class |
| PARENT/STUDENT | Read awarded only | No |

---

## 33. Mission administration

| Actor | Manage definitions |
| ----- | ------------------ |
| SUPER_ADMIN | GLOBAL / any |
| PARISH_ADMIN | PARISH (+ CLASS in own parish) |
| CATECHIST | CLASS missions for **assigned** classes only |
| PARENT/STUDENT | Read progress only |

No cross-class Catechist assignment.

---

## 34. Milestone administration

MVP: **SUPER_ADMIN** manages system milestone definitions.  
Achievements automatic via event processor.  
Parish-specific custom milestones: deferred.

---

## 35. Student scope

Self only via `/me/learner/...`.  
No client-supplied `studentId` for authorization.  
Server resolves linked student via existing learner self-scope APIs.

---

## 36. Parent scope

ACTIVE guardian link only via `/me/parent/enrollments/:enrollmentId/...`.  
Resolve enrollment → studentId → guardian assert.  
Foreign child → 403; unknown → 404.  
No `/me` admin impersonation.

---

## 37. Catechist scope

ACTIVE class assignment only for staff student/class gamification reads and manual awards/adjustments.

---

## 38. ParishAdmin / SuperAdmin scope

ParishAdmin: own parish.  
SuperAdmin: global admin endpoints.  
Neither uses learner `/me` unless they genuinely hold PARENT/STUDENT roles.

---

## 39. Leaderboard decision

**LEADERBOARD IN MVP: NO**

Reasons: minors privacy; spiritual context; unhealthy competition; moderation; out of scope.  
Future: optional class-local opt-in engagement board only after explicit product decision.

---

## 40. Streak decision

**STREAKS IN MVP: NO**

Missions/milestones cover multi-step goals without streak state machines. Revisit later if product demands.

---

## 41. Exact table set

**NEW TABLES REQUIRED: 9**

1. `reward_rules`  
2. `point_ledger_entries`  
3. `processed_reward_events`  
4. `badge_definitions`  
5. `badge_awards`  
6. `mission_definitions`  
7. `mission_progress`  
8. `milestone_definitions`  
9. `milestone_achievements`  

Not in MVP: mission_assignments, contribution journal, faith_journey_timeline_items, leaderboard tables, streak tables, sacramental tables.

---

## 42. Table ownership

All nine owned by **`gamification`**.

Cross-module references: scalar UUIDs only (`student_id`, `enrollment_id`, `parish_id`, `class_id`, `academic_year_id`, optional `media` id).  
No FK to foreign domain tables required if project prefers soft references (follow Class Operations / Exam conventions in #002 — prefer FKs where existing pattern uses them for students/enrollments/parishes).

**Primary keys:** UUID v4 app-generated.  
**Timestamps:** `created_at` / `updated_at` as appropriate; ledger append-only has `created_at` only.  
**Statuses:** as defined above.  
**Uniques (critical):**

| Table | Unique |
| ----- | ------ |
| reward_rules | `code` |
| point_ledger_entries | `(student_id, source_type, source_id, reason_code)` |
| processed_reward_events | `event_id` |
| badge_definitions | `code` |
| badge_awards | filtered unique active `(badge_definition_id, student_id)` |
| mission_definitions | `(scope_type, parish_id, class_id, code)` or global `code` — finalize in #002 migration |
| mission_progress | `(mission_definition_id, student_id)` |
| milestone_definitions | `code` |
| milestone_achievements | `(milestone_definition_id, student_id)` |

**Deletion:** no hard delete of ledger/awards/achievements/progress history. Definitions archive only.

---

## 43. Ledger retention

Append-only. Survives enrollment transfer/withdraw, class completion, year close.  
No cascade delete from enrollment/class.  
Reversals are new rows.

---

## 44. Achievement retention

Badge awards, mission progress (completed), milestone achievements retained historically when enrollment transfers or class archives.  
Definitions may archive without wiping awards.

---

## 45. Localization strategy

MVP: store **stable `code` + default English `name`/`description`** on definitions.  
Translation revisions via existing Localization module **later** (do not import Localization into Gamification runtime for MVP responses).  
API may expose `descriptionKey` for future i18n.

---

## 46. Exact permission set

Avoid explosion:

| Permission | Purpose |
| ---------- | ------- |
| `gamification.read` | Read summaries, points, badges, missions, milestones, faith journey |
| `gamification.manage` | Manage reward rules, badge/mission/milestone definitions (subject to scope) |
| `points.adjust` | Manual ledger adjustments |
| `badges.award` | Manual badge award |

Existing `learner.self.read` may accompany `/me/learner` routes where project convention requires — prefer **`gamification.read`** as primary for gamification routes (align with `attendance.read` style).

**NEW RBAC PERMISSIONS REQUIRED: YES**

---

## 47. Role matrix

| Role | gamification.read | gamification.manage | points.adjust | badges.award |
| ---- | ----------------- | ------------------- | ------------- | ------------ |
| SUPER_ADMIN | Yes | Yes | Yes | Yes |
| PARISH_ADMIN | Yes (own parish) | Yes (parish-scoped defs) | Yes (own parish) | Yes (own parish) |
| CATECHIST | Yes (assigned class) | CLASS missions only | Yes (assigned) | Yes (assigned, if allowed) |
| PARENT | Yes (linked child `/me/parent`) | No | No | No |
| STUDENT | Yes (self `/me/learner`) | No | No | No |

Scope always enforced server-side in addition to permission.

---

## 48. Exact API inventory

### Learner (`STUDENT` + `gamification.read`)

1. `GET /api/v1/me/learner/gamification/summary`  
2. `GET /api/v1/me/learner/points` (paginated ledger; default recent page)  
3. `GET /api/v1/me/learner/points/balance` (optional compact; or included in summary only — **prefer summary + optional ledger list**)  
4. `GET /api/v1/me/learner/badges`  
5. `GET /api/v1/me/learner/missions`  
6. `GET /api/v1/me/learner/missions/:missionId`  
7. `GET /api/v1/me/learner/milestones`  
8. `GET /api/v1/me/learner/faith-journey`  

### Parent (`PARENT` + `gamification.read`)

9. `GET /api/v1/me/parent/enrollments/:enrollmentId/gamification/summary`  
10. `GET /api/v1/me/parent/enrollments/:enrollmentId/faith-journey`  
11. `GET /api/v1/me/parent/enrollments/:enrollmentId/badges`  
12. `GET /api/v1/me/parent/enrollments/:enrollmentId/missions`  
13. `GET /api/v1/me/parent/enrollments/:enrollmentId/milestones`  

(Parent points full ledger: optional; MVP may omit detailed ledger for privacy minimization — **include summary pointsBalance only** unless product requires ledger.)

### Staff reads

14. `GET /api/v1/students/:studentId/gamification/summary` (`gamification.read` + staff scope)  
15. `GET /api/v1/classes/:classId/missions` (list class-scoped missions)  
16. `GET /api/v1/missions/:missionId/progress` (staff; scoped)

### Staff writes / admin

17. `POST /api/v1/students/:studentId/points/adjustments` (`points.adjust`)  
18. `GET /api/v1/reward-rules` / `POST` / `PATCH /api/v1/reward-rules/:id` (`gamification.manage`)  
19. `GET/POST /api/v1/badges` / `PATCH /api/v1/badges/:id` (`gamification.manage`)  
20. `POST /api/v1/students/:studentId/badges/:badgeId/awards` (`badges.award`)  
21. `POST /api/v1/students/:studentId/badges/:badgeId/revoke` (`badges.award` or manage)  
22. `GET/POST /api/v1/missions` / `PATCH /api/v1/missions/:id` / `POST .../activate` / `POST .../archive` (`gamification.manage`)  
23. `GET/POST /api/v1/milestones` / `PATCH /api/v1/milestones/:id` (`gamification.manage`, SuperAdmin-focused)

**No** public auto-award HTTP endpoint for clients.  
**No** leaderboard endpoints.  
**No** global student gamification search for Parent/Student.

Final count may trim Parent mission/badge detail routes into faith-journey only if FE agrees in #006 — inventory above is the design maximum for MVP readiness.

---

## 49. Learner read models

**GamificationSummaryDto:**  
`pointsBalance`, `lifetimePointsEarned` (sum of positive deltas), `badgesEarnedCount`, `activeMissionCount`, `completedMissionCount`, `milestonesAchievedCount`, `latestAchievement` (discriminated: BADGE|MISSION|MILESTONE|POINTS compact).

**FaithJourneyDto:**  
`summary` (same compact numbers), `activeMissions[]`, `milestones[]`, `recentTimeline[]` (bounded, e.g. limit 20), optional `recentBadges[]`.

Ledger list: paginated, no PII, no staff-only notes beyond public descriptionKey.

---

## 50. Parent read models

Same summary + faith journey shapes; enrollment-scoped; **omit** staff adjustment reasons if sensitive — expose descriptionKey only.

---

## 51. Catechist/admin read models

Student summary + mission progress lists for assigned class; admin definition DTOs include status/scope; never return other parish data.

---

## 52. Data minimization

No emails/phones/DOB; no attendance notes; no exam free-text; no pastoral fields; timeline items use codes + default labels + IDs.

---

## 53. Security / minors

- No public profiles / leaderboards  
- Parent linked-child only; Student self only; Catechist assigned; ParishAdmin parish  
- No `/me` impersonation  
- No client-trusted `pointsDelta` on automatic paths  
- No client-controlled actor ids on `/me`  
- Manual adjustments audited via `awardedByUserId`  
- Points ≠ spiritual worth  

**SECURITY/MINORS MODEL READY: YES**

---

## 54. Abuse / fraud prevention

| Risk | Mitigation |
| ---- | ---------- |
| Duplicate events | `eventId` unique + ledger unique key |
| Replayed completions | same |
| Manual award abuse | scope + permission + magnitude cap + reason |
| Badge repeat | unique active award |
| Mission farming | one progress row; events from trusted sources only |
| Deleted sources | retain awards; sourceId historical |
| Negative balance | allowed only via audited adjustment |

No heavy anti-cheat engine in MVP.

---

## 55. Error contract

| Error | HTTP |
| ----- | ---- |
| validation | 400 |
| unauthenticated | 401 |
| `GamificationAccessDenied` | 403 |
| `RewardRuleNotFound` / `BadgeNotFound` / `MissionNotFound` / `MilestoneNotFound` / student not found | 404 |
| `DuplicateRewardEvent` / `BadgeAlreadyAwarded` / `MilestoneAlreadyAchieved` / `MissionNotActive` | 409 |
| `InvalidPointAdjustment` / domain rule violations | 400 or 422 per project convention |

Minimal set; map consistently in `#003+` HTTP util.

---

## 56. Performance / N+1 design

- Ingest: set-based rule match; single transaction per event.  
- Summary: bounded aggregates (SQL SUM/COUNT), not per-row loops in JS.  
- Faith journey: capped timeline query with UNION or multi-query fixed count.  
- Class mission progress lists: paginated.  
- Indexes on `(student_id, created_at)`, event_id, mission/badge uniques.

---

## 57. FE contract

Dashboard cards bind to `GamificationSummary` + `FaithJourney`.  
Admin screens for rules/badges/missions.  
No leaderboard UI expected from API.

---

## 58. Mobile contract

Same `/me/learner` and `/me/parent` read DTOs; pagination for ledger/missions; compact summary first.

---

## 59. Test strategy

**Write in later prompts; do not execute under Fast Mode.**

Unit: balance math, idempotency, adjustments, badge uniqueness, mission progress, milestone once, scope, mappers.  
Integration: ledger append-only, event receipts, awards, missions, retention across transfer.  
DB e2e: actor matrix, denials, duplicate auto-reward, manual adjust, no PII.

---

## 60. Demo seed strategy (#007)

After upstream seeds: student with multi-source points, ≥2 badges, 1 active + 1 completed mission, multiple milestones, faith-journey timeline; Parent/Catechist fixtures for scoped reads. Idempotent codes/titles.

---

## 61. Postman strategy (#007)

Learner summary/points/badges/missions/milestones/faith-journey; parent reads; staff adjust/manage; denial matrix. No live JWTs. Newman deferred to stabilization.

---

## 62. Risks / deferred

| Item | Disposition |
| ---- | ----------- |
| Leaderboards | Deferred |
| Streaks | Deferred |
| Sacramental milestones | Deferred (pastoral domain) |
| STUDENT-targeted missions | Deferred |
| Expression rule engine | Out of scope |
| Outbox/queue | Future; at-least-once + idempotency now |
| FamilyPortal composition | Deferred (own `/me` routes first) |
| Localization of labels | Deferred |
| Cached point balance table | Deferred |
| Attendance emit timing edge cases | Detail in #003 |

---

## 63. BLOCKER / HIGH / MEDIUM / LOW

| Severity | Count | Notes |
| -------- | ----- | ----- |
| BLOCKER | **0** | |
| HIGH | **0** | |
| MEDIUM | 1 | Exact Parent ledger exposure vs summary-only — finalize in #006 with FE |
| LOW | 2 | Emitter package vs temporary ingest adapter; mission code uniqueness shape |

---

## 64. Exact prompt count

**FINAL RECOMMENDED PROMPT COUNT: 7**

---

## 65. Prompt plan

| Prompt | Scope |
| ------ | ----- |
| **#001/7** | Domain audit + design (**this report**) |
| **#002/7** | Persistence foundation: 9 tables + module shell + event receipt entity + RBAC seed constants |
| **#003/7** | Points engine: event ingest + reward rules + ledger + manual adjustments + idempotency |
| **#004/7** | Badges + milestones (definitions + awards/achievements + auto/manual) |
| **#005/7** | Missions + progress/completion + admin lifecycle |
| **#006/7** | Learner/Parent/Catechist Faith Journey + summaries + security/contracts/OpenAPI |
| **#007/7** | Fast-mode finalization: demo seed + Postman + README + static final audit |

Ordering rationale: ledger/idempotency foundation first; badges/milestones before missions (missions may grant badge/points bonuses); Faith Journey reads after all projections exist.

---

## 66. #002 readiness

**YES** — proceed to persistence foundation.

Recommend next prompt exactly:

**GAMIFICATION + FAITH JOURNEY #002/7 — PERSISTENCE FOUNDATION + LEDGER / DEFINITIONS / EVENT RECEIPTS**

Do **not** implement automatically.

---

## 67. Commit recommendation

Audit/design-only; no production code changes expected.  
**No commit required** unless unexpected tracked file edits occurred (none intended).

---

## REQUIRED VERDICTS

| Verdict | Result |
| ------- | ------ |
| GO / NO-GO FOR IMPLEMENTATION | **GO** |
| FINAL MODULE STRATEGY | **one module** |
| FINAL MODULE NAME(S) | **`gamification`** |
| POINT MODEL | **immutable ledger** |
| REWARD RULE MODEL READY | **YES** |
| REWARD EVENT MODEL READY | **YES** |
| IDEMPOTENCY MODEL READY | **YES** |
| BADGE MODEL READY | **YES** |
| MISSION MODEL READY | **YES** |
| MILESTONE MODEL READY | **YES** |
| FAITH JOURNEY MODEL READY | **YES** (composed read model) |
| LEADERBOARD IN MVP | **NO** |
| STREAKS IN MVP | **NO** |
| NEW TABLES REQUIRED | **9** |
| NEW RBAC PERMISSIONS REQUIRED | **YES** |
| STUDENT CONTRACT READY | **YES** |
| PARENT CONTRACT READY | **YES** |
| CATECHIST CONTRACT READY | **YES** |
| SECURITY/MINORS MODEL READY | **YES** |
| MODULE BOUNDARY READY BY DESIGN | **YES** |
| FINAL RECOMMENDED PROMPT COUNT | **7** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |
| #002 READINESS | **YES** |
