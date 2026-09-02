# LOCALIZATION #005 — Admin Review / RBAC / Contract Hardening Report

**Phase:** LOCALIZATION #005 / 6  
**Date:** 2026-09-02  
**Status:** COMPLETE  
**Prompt:** `LOCALIZATION_005_ADMIN_REVIEW_RBAC_CONTRACT_HARDENING.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| #004 test debt CLOSED | **YES** |
| Admin APIs | **PASS** |
| RBAC / tenant scope | **PASS** |
| Review / approve | **PASS** |
| FE LOCALIZATION ADMIN CONTRACT READY | **YES** |
| FE LOCALIZED LEARNER CONTRACT READY | **YES** |
| MOBILE LOCALIZED CONTENT CONTRACT READY | **YES** |
| `quality:full` | **PASS** |
| Docker `catechism-api:localization-admin` | **PASS** |
| BLOCKER / HIGH | **0** |
| #006 readiness | **YES** |

---

## 1. Objective

Close #004 localized-delivery integration debt, then deliver parish-scoped admin translation APIs (list/sync/request/bulk/review/approve/jobs/retry/preview), RBAC seeds, rate limits, glossary admin routes, and contract hardening for FE admin + learner/mobile consumers.

## 2. State inherited from #004

- Resource adapters, localized Curriculum Delivery tree/content, Question Bank localization, Practice `translationRevisionId` / `deliveredLocale` snapshot pinning — all PASS from #004.
- Deferred dedicated integration tests for approved EN curriculum tree and translated Practice sessions — **closed in this prompt**.

## 3. #004 integration test debt closure

Added `test/integration/localization-delivery.integration-spec.ts` with mandatory Test A + Test B before admin work.

## 4. Approved en-US curriculum tree integration test

- vi-VN source curriculum fixture with published assignment.
- Seeded APPROVED en-US revisions for metadata, version, topic, lesson.
- `getClassCurriculumTree` returns translated fields, `resolvedLocale=en-US`, `translationStatus=APPROVED`, `isFallback=false`, stable IDs/order/`canonicalLessonKey`.

## 5. Translated Practice session integration test

- Demo published question + APPROVED en-US revision.
- Session create with `locale=en-US` persists `translationRevisionId` + `deliveredLocale`.
- GET replays pinned revision after newer approval.
- Review-wrong inherits revision/locale; grading via 3 wrong attempts completes session.

## 6. Rules applied

`PROJECT_RULES.md`, `AGENTS.md`, modular boundaries, English source, no git commit, learner GET never calls provider / never `getOrCreateResource`.

## 7. Files created

- `test/integration/localization-delivery.integration-spec.ts`
- `src/modules/localization/constants/localization-permissions.constants.ts`
- `src/modules/localization/constants/localization-admin.constants.ts`
- `src/modules/localization/enums/admin-translation-effective-status.enum.ts`
- `src/modules/localization/errors/localization-admin.errors.ts`
- `src/modules/localization/services/localization-access.service.ts`
- `src/modules/localization/services/localization-admin.service.ts`
- `src/modules/localization/controllers/localization.controller.ts`
- `src/modules/localization/controllers/localization-glossary.controller.ts`
- `src/modules/localization/dto/localization-admin-request.dto.ts`
- `src/modules/localization/dto/localization-admin-response.dto.ts`
- `src/modules/localization/mappers/localization-admin-response.mapper.ts`
- `src/modules/localization/utils/localization-http.util.ts`
- `src/modules/localization/utils/validate-translation-payload-with-adapter.util.ts`
- `src/modules/localization/services/localization-access.service.spec.ts`
- `src/modules/localization/services/localization-admin.service.spec.ts`
- `test/integration/localization-admin.integration-spec.ts`
- `test/localization-admin.db.e2e-spec.ts`

## 8. Files modified

- `src/database/seeds/auth-rbac.seed.constants.ts`
- `src/modules/localization/interfaces/localization.interface.ts`
- `src/modules/localization/services/translation-resource.service.ts`
- `src/modules/localization/services/translation-revision.service.ts`
- `src/modules/localization/services/translation-job.service.ts`
- `src/modules/localization/localization.module.ts`
- `test/auth-security-hardening.db.e2e-spec.ts` (restore login throttle env after rate-limit suite)
- `test/database/load-test-environment.ts` (higher test login throttle budget)

## 9. Final module architecture

`LocalizationModule` owns admin controllers + internal services. Still imports Curriculum/LearningContent/QuestionBank public APIs only. `CurriculumDelivery` / `Practice` unchanged except regression coverage.

## 10. Public exports

Unchanged: **`LocalizationService`**, **`LocaleResolutionService`** only.

## 11. Permission seeds

- `localization.read`
- `localization.manage`
- `localization.approve`

## 12. Role grants

| Role | Grants |
|------|--------|
| SUPER_ADMIN | all (via full permission map) |
| PARISH_ADMIN | read / manage / approve |
| CATECHIST | read |
| PARENT | none |

## 13. Tenant scope

`LocalizationAccessService` enforces permission + `translation_resources.parishId`. Super admin global; parish admin/member own parish; cross-parish IDOR denied.

## 14. Resource discovery/sync

`POST /api/v1/localization/resources/sync` — adapter `resolveSource` → `getOrCreateTranslationResource`. No source repo imports.

## 15. Resource list API

`GET /api/v1/localization/resources` — paginated metadata filters (`resourceType`, locales, status, parish scope).

## 16. Resource detail API

`GET /api/v1/localization/resources/:id` — binding metadata, per-locale effective status, latest revision/job summaries, source hash metadata.

## 17. Request translation API

`POST /api/v1/localization/resources/:id/translations` — queue idempotently; short-circuit approved/machine/active job; never inline provider.

## 18. Queue idempotency

Reuses `TranslationJobService.queueTranslation` semantics: `201` queued, `200` existing active / short-circuit revision.

## 19. Bulk translation

`POST /api/v1/localization/bulk-translations` — parish-scoped, max 50 resources (`LOCALIZATION_BULK_MAX_RESOURCES`).

## 20. Job list/detail

`GET /api/v1/localization/jobs`, `GET /api/v1/localization/jobs/:jobId` — sanitized metadata, parish-filtered.

## 21. Retry job

`POST /api/v1/localization/jobs/:jobId/retry` — FAILED/DEAD semantics via `TranslationJobService.retryFailed`; throttled.

## 22. Revision detail

`GET /api/v1/localization/revisions/:revisionId` — full admin payload + audit + derived stale flag.

## 23. Human review/edit

`POST /api/v1/localization/revisions/:revisionId/review` — new immutable `REVIEWED` revision; adapter payload validation.

## 24. Immutable revision proof

Review/approve create new revision rows; prior revision payload unchanged.

## 25. Approval

`POST /api/v1/localization/revisions/:revisionId/approve` — from `MACHINE_TRANSLATED` or `REVIEWED`; records actor/timestamp.

## 26. Stale approval protection

Current source hash must match revision hash; mismatch → `LocalizationRevisionStale` (409/422).

## 27. Approved supersession

Latest current-hash APPROVED wins for new learner delivery; older APPROVED rows retained; Practice sessions stay pinned.

## 28. Preview

`GET /api/v1/localization/resources/:id/preview?locale=` — DB-only `LocalizedResourceResolutionService`; no provider.

## 29. Glossary admin APIs

`POST/GET /api/v1/localization/glossaries/*` — draft/term/publish/clone via `CatholicGlossaryService`.

## 30. Glossary RBAC

Mutations SUPER_ADMIN only; parish admin cannot mutate global glossary.

## 31. Status model

Admin effective: MISSING / MACHINE_TRANSLATED / REVIEWED / APPROVED / STALE. Jobs: QUEUED / PROCESSING / SUCCEEDED / FAILED / DEAD (separate).

## 32. Error contract

Stable admin errors mapped in `localization-http.util.ts`: access denied, invalid locale, stale revision, bulk limit, job not retryable, source unavailable, etc. No provider internals leaked.

## 33. Rate/cost controls

`@Throttle` on request/bulk/retry endpoints with inline limits in controller (not global auth-module registration — avoids cross-endpoint throttle interference). Bulk cap 50 resources.

## 34. FE Localization admin readiness

**YES** — list/filter, sync, request, jobs, revision inspect, review, approve, stale, retry, preview, tenant scope, glossary governance.

## 35. FE learner localized readiness

**YES** — #004 contracts unchanged; delivery tests prove APPROVED tree + Practice pinning.

## 36. Mobile localized readiness

**YES** — learner delivery only; cache metadata (`resolvedLocale`, `translationRevisionId`, `sourceContentHash`) stable.

## 37. Export/import/search decisions

Translated full-text search and localized export/import remain **deferred post-MVP**. Source export/import contracts unchanged.

## 38. Security/IDOR

Parish scope on every resource/revision/job path; sanitized job errors; payload bounds; adapter validation; no answer leakage in admin APIs.

## 39. Swagger/OpenAPI

Admin DTOs annotated on `LocalizationController` + glossary controller.

## 40. README/docs

This report documents RBAC, review workflow, pinning, deferred search/export. README update deferred to #006 if required by final audit prompt.

## 41. Unit tests

`localization-access.service.spec.ts`, `localization-admin.service.spec.ts` — permission/scope, bulk limits, review/approve paths.

## 42. Integration tests

`localization-admin.integration-spec.ts` — sync, queue→process, review, approve, stale denial, tenant isolation, bulk bounds.

## 43. DB e2e

`localization-admin.db.e2e-spec.ts` — 401/403 matrix, parish list, cross-parish detail denial.

## 44. Existing regression

`npm run quality:full` green including all prior modules.

## 45. Pristine quality:full

**PASS** (one clean run after fixes).

## 46. Docker

`docker build --target production -t catechism-api:localization-admin .` — **PASS**

## 47. Multilingual readiness

Admin + learner paths validated for vi-VN → en-US with BCP47 normalization.

## 48. Microservice extraction

Localization remains cohesive; adapters use public module APIs only.

## 49. Commands

```bash
npm run test:db:prepare -- --reset
npm run quality:full
wsl bash -lc "cd '<repo>' && docker build --target production -t catechism-api:localization-admin ."
```

## 50. Validation matrix

All explicit PASS gates from prompt satisfied.

## 51. Known / deferred

- List `translationStatus` filter applied post-page fetch (page may return fewer than `limit` when filtered).
- Glossary controller uses lighter inline request types vs full class-validator parity.
- README narrative consolidation left for #006 final audit if needed.

## 52. Out of scope (confirmed)

Exam, notifications, private chat translation, translated search/export, auto-approval, cross-parish sharing.

## 53. LOCALIZATION #006 readiness

**READY: YES** — admin workflow complete, #004 debt closed, contracts READY, quality + Docker PASS.

## 54. Prompt count

LOCALIZATION **#005 / 6** complete. **#006** remains (final audit + demo seed + Postman + phase completion).

## 55. Commit recommendation (not executed)

```
git commit -m "feat(localization): add translation review and approval workflow"
```

---

## Final summary

| Area | Verdict |
|------|---------|
| #004 debt | CLOSED |
| Admin APIs | PASS |
| RBAC / scope | PASS |
| Review / approve | PASS |
| FE admin | READY |
| FE learner | READY |
| Mobile | READY |
| quality:full | PASS |
| Docker | PASS |
| BLOCKER/HIGH | 0 |
