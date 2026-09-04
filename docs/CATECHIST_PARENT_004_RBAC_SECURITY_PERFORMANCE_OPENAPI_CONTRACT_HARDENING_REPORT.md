# CATECHIST + PARENT SUPPORTING APIs #004/5

## 1. Objective

Targeted audit and hardening of the existing Family Portal read contracts for RBAC, actor scope, privacy, deterministic output, bounded composition, OpenAPI, frontend/mobile readiness, and regression safety. No new portal route or business table was added.

## 2. Targeted audit scope

The audit was limited to `src/modules/family-portal/`, the public surfaces it consumes from Class, Enrollment, Student, Learning Progress, Exam, Auth, and Access Control, plus module-boundary tests, the six Family Portal DB e2e routes, README, package scripts, and the pre-existing integration cleanup helper reached by the required full gate. Media, Localization, Curriculum, and Question Bank internals were not audited.

## 3. Audit findings before implementation

- No BLOCKER or HIGH architecture defect was found.
- MEDIUM: HTTP DTOs reused Learning Progress-owned DTOs, and Parent progress exposed lesson detail instead of a compact portal contract.
- MEDIUM: several collections lacked explicit deterministic ordering or a unique pagination tie-breaker.
- LOW: OpenAPI actor/scope/error descriptions and README Family Portal guidance were incomplete.
- LOW: the denial matrix and batch helpers lacked several explicit empty-input, dedupe, invalid-input, admin, and payload allow-list assertions.
- During full regression, a pre-existing order-dependent Auth/RBAC seed cleanup omitted nullable Question Bank audit references; it was corrected only in test cleanup plumbing.

All code-level findings above were resolved. One dependency advisory remains, recorded in sections 41, 45, and 46.

## 4. Files created

- `src/modules/family-portal/dto/family-portal-progress-response.dto.ts`
- `docs/CATECHIST_PARENT_004_RBAC_SECURITY_PERFORMANCE_OPENAPI_CONTRACT_HARDENING_REPORT.md`

Local, gitignored `.env` / `.env.test` files were used only to reproduce the exact Node/MSSQL gates and are not deliverables.

## 5. Files modified

- `README.md`
- Family Portal controllers, response DTOs, mapper, services, and focused service specs
- Class, Enrollment, and Exam batch/service specs; Enrollment deterministic ordering
- `src/modules/module-boundaries.spec.ts`
- `test/family-portal-denial-matrix.db.e2e-spec.ts`
- `test/integration/helpers/cleanup-auth-rbac-seed-domain-dependencies.util.ts`

No entity, migration, repository, write endpoint, permission, or business table changed.

## 6. Final route inventory

| Route | Controller operation | Permission | Actor/scope | Response |
| --- | --- | --- | --- | --- |
| `GET /api/v1/me/catechist/context` | `getContext` | existing class/enrollment reads | CATECHIST; active assignments only | `CatechistContextResponseDto` |
| `GET /api/v1/me/catechist/classes` | `listClasses` | existing class/enrollment reads | CATECHIST; assigned IDs only | `CatechistClassListResponseDto` |
| `GET /api/v1/me/catechist/classes/:classId/roster` | `getRoster` | existing learning/student/enrollment reads | CATECHIST; assignment verified before roster load | `CatechistRosterResponseDto` |
| `GET /api/v1/me/parent/context` | `getContext` | existing student/enrollment reads | PARENT; active guardian links only | `ParentContextResponseDto` |
| `GET /api/v1/me/parent/children` | `listChildren` | existing student/enrollment reads | PARENT; active guardian links/enrollments | `ParentChildrenResponseDto` |
| `GET /api/v1/me/parent/enrollments/:enrollmentId/progress` | `getEnrollmentProgress` | existing learning/student/enrollment reads | PARENT; server-derived student and active guardian relationship | `ParentEnrollmentProgressResponseDto` |

Exactly six GET routes exist; no duplicate or additional #004 route was introduced.

## 7. FamilyPortal architecture

FamilyPortal remains a stateless orchestration/read-model module with zero tables, entities, migrations, repositories, `TypeOrmModule`, `forwardRef`, and reverse owning-module dependency. `FamilyPortalService` remains its only public export.

**FAMILY PORTAL ARCHITECTURE READY: YES**

## 8. RBAC audit

No `family-portal.read` permission was added. Controllers reuse owning-domain permissions, while service-layer actor and relationship checks remain authoritative. Permission is not treated as scope.

**RBAC MODEL READY: YES**

## 9. Actor identity

Actor identity comes only from authenticated request context. No portal endpoint accepts a client-controlled actor, parent, catechist, child, or student identity.

## 10. Admin impersonation

PARISH_ADMIN and SUPER_ADMIN do not receive an actor fallback for `/me/catechist/*` or `/me/parent/*`. DB e2e explicitly verifies both administrator roles receive 403 on both portal groups.

**ADMIN IMPERSONATION SAFE: YES**

## 11. Catechist scope

Context and class list use active assigned classes only. Roster authorization is checked before learner composition, and no parish-wide escalation exists. Assigned class/parish identifiers are sorted deterministically.

**CATECHIST SCOPE SAFE: YES**

## 12. Parent scope

Only ACTIVE guardian links and ACTIVE enrollments participate. Enrollment is resolved first, its student ID is derived server-side, and guardian authorization precedes Learning Progress composition. No arbitrary student ID is accepted.

**PARENT SCOPE SAFE: YES**

## 13. Cross-actor denial

DB e2e verifies Parent→Catechist, Catechist→Parent, Student→both, PARISH_ADMIN→both, and SUPER_ADMIN→both as 403. Parent and Catechist formal exam attempt starts are denied.

## 14. Parent class-wide leakage

Parent actors cannot access class-wide Learning Progress/Practice aggregates. Parent portal output is enrollment-scoped only.

**PARENT CLASS-WIDE LEAKAGE SAFE: YES**

## 15. Data minimization

Roster, child, and progress responses use explicit allow-lists. Parent progress no longer exposes `lessons`. No DOB, address, phone, email, guardian contacts, siblings, private notes, raw answers, correct answers, explanations, or auth/session fields are returned. E2E assertions verify absent PII/answer/detail keys.

**DATA MINIMIZATION READY: YES**

## 16. DTO boundaries

All controller responses now use FamilyPortal-owned DTOs. Public owning-domain snapshots remain internal composition inputs; entities and owning-domain HTTP/internal DTOs are not exposed directly.

## 17. Error contract

Validation and authorization remain normalized through existing global/domain mappings: malformed UUID/query is 400, unauthenticated is 401, wrong actor/foreign relationship/unassigned class is 403, and safely unknown enrollment is 404. No raw DB error reaches HTTP responses.

**ERROR CONTRACT READY: YES**

## 18. Unknown vs foreign resource semantics

- Unknown enrollment: 404.
- Existing enrollment outside active guardian relationship: 403.
- Unassigned class roster: 403, avoiding existence probing through the actor-specific route.

## 19. Pagination

Catechist classes expose stable `page`, `limit`, `total`, and `items` with maximum limit 50. Roster reuses Learning Progress bounds. Parent children remains intentionally unpaginated for MVP because guardian-child cardinality is naturally bounded and this assumption is documented.

## 20. Deterministic sorting

Parish IDs and assigned class IDs are sorted. Catechist class/roster paths preserve explicit business ordering. Parent children sort by display name then ID; active enrollments sort by class name then enrollment ID. Enrollment pagination adds `enrollment.id ASC` as a unique tie-breaker, and active enrollment batches use `enrolledAt DESC, id ASC`.

**PAGINATION/SORTING READY: YES**

## 21. N+1 verification

Existing orchestration call budgets remain bounded: roster uses scope + one class Learning Progress composition + Exam/Student/Enrollment batch reads; children uses guardian IDs + active enrollment + Student + Class batches; Parent progress performs bounded enrollment/guardian resolution plus one Learning Progress composition. No per-child/per-learner public service loop was introduced.

**N+1/PERFORMANCE READY: YES**

## 22. Batch API contracts

Class snapshot, Enrollment snapshot/list/count, and Exam summary batches retain empty-input short-circuiting, dedupe, narrow snapshot values, stable missing-ID behavior, and no FamilyPortal type dependency. Focused tests were added for missing empty/dedupe cases.

**BATCH API CONTRACTS READY: YES**

## 23. Performance budget

Roster remains at or below five orchestration-level calls, Parent children at or below four, and Parent progress is bounded. Payloads are compact and no follow-up request per roster learner is required.

## 24. LearningProgress delegation

Catechist roster still delegates to `getClassLearningProgress`; Parent progress still delegates to `getEnrollmentLearningProgress`. Completion, practice, exam, and activity-time calculations were not duplicated.

## 25. Exam summary semantics

Portal DTOs expose only `assignmentsAvailable`, `attemptsCompleted`, and `latestScorePercent`. Raw attempts, review data, questions, answers, and explanations remain absent. Batch semantics are unchanged from the owning Exam service.

## 26. Locale/time contract

Responses use stable IDs, enum codes, numeric metrics, owning-domain human names, and ISO 8601 UTC timestamps. Enum/status labels are not translated, and FamilyPortal does not import LocalizationModule.

## 27. OpenAPI

All six operations document authentication, existing permission requirements, actor scope, response DTOs, and applicable 400/401/403/404 outcomes. Roster is explicitly assigned-class only; Parent progress is explicitly linked-child enrollment scoped. No unavailable feature is advertised.

**OPENAPI READY: YES**

## 28. README

README now documents purpose, zero-table/stateless ownership, six routes, actor/relationship scope, denied Parent exam/class-wide operations, bounded batching, test commands, and deferred features without declaring the phase complete.

**README READY: YES**

## 29. FE Catechist contract

Web FE has bootstrap context, paginated assigned classes, roster rows, and compact learning/practice/exam metrics with stable identifiers.

**FE CATECHIST CONTRACT READY: YES**

## 30. FE Parent contract

Web FE has bootstrap context, linked children, active class/enrollment context, compact progress, and may use the existing Exam result-detail route when its policy permits.

**FE PARENT CONTRACT READY: YES**

## 31. Mobile Catechist contract

Large lists are paginated, records are flat/compact, identifiers/enums are stable, timestamps are ISO UTC, and batch composition avoids request storms.

**MOBILE CATECHIST CONTRACT READY: YES**

## 32. Mobile Parent contract

Naturally bounded children and compact enrollment progress avoid excessive nesting; stable IDs/enums and ISO UTC timestamps are suitable for mobile clients.

**MOBILE PARENT CONTRACT READY: YES**

## 33. Security logging

Targeted inspection found no FamilyPortal logging of child objects, roster/progress payloads, guardian relationships, or raw answers. Existing request logs contain route/request IDs and redacted sensitive headers only.

## 34. Module boundaries

The boundary spec now asserts the exact necessary FamilyPortal imports and rejects `TypeOrmModule`, Practice, Curriculum, Localization, and Media imports. Owning modules do not import FamilyPortal.

**ZERO-TABLE MODULE BOUNDARY READY: YES**

## 35. God-module guard

FamilyPortal imports only Auth, Access Control, Class, Enrollment, Student, Learning Progress, and Exam. Practice remains behind Learning Progress; no Localization, Curriculum, Media, or notification dependency was added.

## 36. Unit tests

- Targeted: 7 suites, 58 tests passed.
- Full: 128 suites, 651 tests passed.
- Added stable-order, empty/dedupe batch, actor-denial, allow-list, and compact DTO assertions.

## 37. Integration tests

Real MSSQL full integration: 42 suites, 236 tests passed. The order-dependent seed cleanup regression was fixed by nulling nullable `questions` / `question_versions` creator/publisher references before deleting seeded users.

**FULL INTEGRATION: PASS**

## 38. DB e2e

- Targeted Family Portal: 3 suites, 26 tests passed.
- Full DB e2e within final `quality:full`: 27 suites, 150 tests passed.
- Coverage includes all six routes, 400/401/403/404, all actor classes, Parent class-wide denial, Parent/Catechist exam-attempt denial, and payload minimization.

**DB E2E: PASS**

## 39. Regression

Full unit, DB-free e2e (2 suites/5 tests), build, integration, migrations, and DB e2e passed. The required production image also built successfully.

## 40. quality:full

`npm run quality:full` passed self-contained without a manual reset immediately before the command. It ran in one ephemeral Node 22.23.1 container mirror normalized by the canonical formatter, because the active Windows API process locked the host `argon2` native binary and the checkout uses CRLF worktree conversion. The command itself performed both required DB reset cycles.

**SELF-CONTAINED QUALITY:FULL: PASS**

## 41. npm audit

The production dependency install reported **1 moderate severity vulnerability**. A standalone `npm audit --audit-level=moderate` registry request did not complete before the user stopped the long-running audit turn, so the advisory package/path was not resolved in this report. No automatic dependency upgrade was applied outside scope.

**NPM AUDIT: FAIL**

## 42. Docker

`docker build --target production -t catechism-api:family-portal-hardened .` completed successfully using Node.js 22.23.1.

**DOCKER: PASS**

## 43. Commands

Executed commands included:

- `node --version` → `v22.23.1`
- `npm --version` → `10.9.8`
- formatter and targeted Prettier verification
- targeted ESLint and full ESLint within `quality:full`
- `npm run typecheck`
- targeted Jest unit suites
- `npm test`
- `npm run test:e2e`
- `npm run build`
- isolated test DB reset and migration validation
- targeted Family Portal DB e2e
- `npm run test:integration`
- `npm run quality:full`
- production Docker build
- `npm audit --audit-level=moderate` (registry call did not finish; production install independently reported one moderate advisory)

## 44. Validation matrix

| Gate | Result |
| --- | --- |
| Exact Node/npm | PASS (`22.23.1` / `10.9.8`) |
| Targeted formatting | PASS |
| Lint | PASS |
| Typecheck | PASS |
| Targeted unit | PASS (58/58) |
| Full unit | PASS (651/651) |
| DB-free e2e | PASS (5/5) |
| Integration | PASS (236/236) |
| Targeted Family Portal DB e2e | PASS (26/26) |
| Full DB e2e | PASS (150/150) |
| Self-contained `quality:full` | PASS |
| npm audit at moderate threshold | FAIL (1 moderate; detail unresolved) |
| Production Docker build | PASS |

## 45. Risks/deferred

- Resolve the single moderate dependency advisory, rerun `npm audit --audit-level=moderate`, then update this gate before #005.
- Existing Nest legacy wildcard-route warnings appeared in tests and remain outside this Family Portal prompt.
- Attendance, Schedule, Prayer Memorization, Notifications, Recent Activity, write APIs, new tables, cache persistence, and UI work remain deferred.

## 46. BLOCKER/HIGH/MEDIUM/LOW

- Unresolved BLOCKER count: **0**
- Unresolved HIGH count: **0**
- Unresolved MEDIUM count: **1** (npm production dependency advisory)
- Unresolved LOW count: **1** (pre-existing Nest legacy wildcard warning, outside Family Portal scope)

All Family Portal code/contract findings are resolved.

## 47. #005 readiness

Architecture, RBAC/scope, privacy, performance, contracts, OpenAPI, README, integration, DB e2e, `quality:full`, and Docker are ready. However, the #005 gate requires npm audit PASS. Therefore:

**#005 READINESS: NO — blocked only on resolving/verifying the moderate npm advisory.**

Do not auto-proceed to #005.

## 48. Prompt count

Completed numbered business prompts: **#004/5**. One numbered prompt remains: **#005/5**, subject to the npm-audit gate above. Corrective prompts #001A and #003A remain supporting gates, not additional numbered phase prompts.

## 49. Commit recommendation

Recommended commit message after the user reviews the tracked diff:

`git commit -m "fix(family-portal): harden portal contracts and access"`

No staging, commit, or push operation was executed.

## Required verdict summary

- FAMILY PORTAL ARCHITECTURE READY: YES
- RBAC MODEL READY: YES
- CATECHIST SCOPE SAFE: YES
- PARENT SCOPE SAFE: YES
- ADMIN IMPERSONATION SAFE: YES
- PARENT CLASS-WIDE LEAKAGE SAFE: YES
- DATA MINIMIZATION READY: YES
- ERROR CONTRACT READY: YES
- PAGINATION/SORTING READY: YES
- N+1/PERFORMANCE READY: YES
- BATCH API CONTRACTS READY: YES
- OPENAPI READY: YES
- README READY: YES
- FE CATECHIST CONTRACT READY: YES
- FE PARENT CONTRACT READY: YES
- MOBILE CATECHIST CONTRACT READY: YES
- MOBILE PARENT CONTRACT READY: YES
- ZERO-TABLE MODULE BOUNDARY READY: YES
- FULL INTEGRATION: PASS
- DB E2E: PASS
- SELF-CONTAINED QUALITY:FULL: PASS
- NPM AUDIT: FAIL
- DOCKER: PASS
