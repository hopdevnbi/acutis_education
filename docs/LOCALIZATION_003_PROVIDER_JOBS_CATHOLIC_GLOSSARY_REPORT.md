# LOCALIZATION #003 — Provider Abstraction + DB Jobs + Catholic Glossary Foundation Report

**Phase:** LOCALIZATION / CONTENT TRANSLATION FOUNDATION #003 / 6  
**Date:** 2026-09-01  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** `LOCALIZATION_003_PROVIDER_JOBS_CATHOLIC_GLOSSARY.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Provider abstraction | **PASS** |
| Translation jobs | **PASS** |
| Catholic glossary | **PASS** |
| CLI worker | **PASS** |
| quality:full (pristine DB) | **PASS** |
| Docker | **PASS** (`catechism-api:localization-provider-jobs`) |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**#004 readiness:** **READY: YES** — proceed to **LOCALIZATION #004 — Resource Adapters + Localized Delivery + Question Bank Integration + Practice Snapshot**

---

## 1. Objective

Implement TranslationProvider abstraction (mock + Google boundary), DB-backed `translation_jobs`, Catholic glossary persistence/lifecycle, job processor + CLI worker, and validation tests — without resource adapters, learner localized reads, admin HTTP, or RBAC seeds.

## 2. State inherited from #002

LocalizationModule, locale resolution, translation resource/revision persistence, user/parish locale columns, stale hash model, public exports (`LocalizationService`, `LocaleResolutionService`).

## 3. Rules applied

`PROJECT_RULES.md`, `AGENTS.md`, modular boundaries, migration-driven schema, no git commit, English source, metadata-only job logging.

## 4. Files created

| Path | Purpose |
|------|---------|
| `src/modules/localization/config/*` | Translation provider configuration |
| `src/modules/localization/providers/*` | Mock/Google providers, registry, validation |
| `src/modules/localization/entities/translation-job.entity.ts` | Job entity |
| `src/modules/localization/entities/catholic-glossary-*.entity.ts` | Glossary entities |
| `src/modules/localization/services/translation-job*.ts` | Queue/claim/process |
| `src/modules/localization/services/catholic-glossary.service.ts` | Glossary lifecycle |
| `src/modules/localization/services/translation-source-registry.service.ts` | Adapter registry stub |
| `src/modules/localization/interfaces/translation-source-adapter.interface.ts` | Adapter port (#004) |
| `src/database/migrations/1788063800000-create-localization-provider-jobs-glossary-schema.ts` | Schema |
| `scripts/localization-process-jobs.ts` | CLI worker |
| `test/integration/localization-provider-jobs.integration-spec.ts` | MSSQL integration |

## 5. Files modified

| Path | Change |
|------|--------|
| `src/modules/localization/localization.module.ts` | Register #003 providers/services |
| `src/modules/localization/services/localization.service.ts` | Facade: queue + process jobs |
| `src/modules/localization/interfaces/localization.interface.ts` | Job/glossary types |
| `src/modules/localization/mappers/localization.mapper.ts` | Job/glossary mappers |
| `src/modules/localization/errors/localization.errors.ts` | Job/glossary errors |
| `src/config/config.module.ts` | Load translation configuration |
| `src/database/localization.entities.spec.ts` | Five-table ownership test |
| `package.json` | `localization:process-jobs` script |

## 6. Final LocalizationModule architecture

Internal: provider registry, mock/Google providers, job service/processor, glossary service, source registry stub. Facade: `LocalizationService` orchestrates queue/process via internal services.

## 7. Public exports

Unchanged: **`LocalizationService`**, **`LocaleResolutionService`** only.

## 8. TranslationProvider interface

`translateBatch({ units, sourceLocale, targetLocale, glossary?, context? }) => TranslatedUnit[]` — no Google SDK types exposed.

## 9. TranslatableUnit contract

`id`, `text`, optional `context`/`unitType`; output must preserve every input ID exactly once.

## 10. Mock provider

Deterministic prefix `[source->target]`, CI-safe, glossary term overlay via registered terms map.

## 11. Google provider adapter

REST + service-account JWT boundary inside Localization; maps external failures to internal codes; no live Google in CI (default mock).

## 12. Provider selection

`TranslationProviderRegistry` lazy-initializes from `TRANSLATION_PROVIDER`; single selection point.

## 13. Config/env validation

`TRANSLATION_PROVIDER`, Google vars, batch limits, job max attempts; production fail-fast for mock unless `ALLOW_MOCK_TRANSLATION_PROVIDER=true`.

## 14. Provider error mapping

`RATE_LIMIT`, `TIMEOUT`, `UNAVAILABLE`, `AUTH`, `INVALID_REQUEST`, `PROVIDER_OUTPUT_INVALID`, `UNKNOWN`.

## 15. translation_jobs schema

UUID PK, resource FK, target locale, source hash, status, attempts, provider/error metadata, lock/retry timestamps.

## 16. job status enum

`QUEUED`, `PROCESSING`, `SUCCEEDED`, `FAILED`, `DEAD`.

## 17. job idempotency

Semantic key: resource + targetLocale + sourceContentHash + provider; filtered unique index on active jobs.

## 18. queue semantics

`queueTranslation()` returns queued | existing_active | short_circuit_revision.

## 19. approved-current short-circuit

Existing `APPROVED` revision for hash/locale skips new job.

## 20. machine-translation dedupe

Existing `MACHINE_TRANSLATED` revision for hash/locale skips duplicate provider work.

## 21. claim/locking strategy

MSSQL `UPDLOCK, READPAST, ROWLOCK` CTE claim inside transaction; reload claimed rows via TypeORM.

## 22. job processor

Claim → resolve source via registry → hash check → extract units → glossary → translate → validate → `MACHINE_TRANSLATED` revision → succeed.

## 23. source resolver/adapter registry stub

`TranslationSourceRegistryService.registerAdapter()` for tests; production unsupported types fail safely.

## 24. source-changed behavior

Hash mismatch → terminal `DEAD` with `last_error_code=SOURCE_CHANGED`.

## 25. retry/backoff

Bounded exponential backoff via `next_attempt_at` (30s base, 15m cap).

## 26. max attempts

Default 3 via `TRANSLATION_JOB_MAX_ATTEMPTS`.

## 27. CLI worker

`npm run localization:process-jobs` — Nest application context, bounded batch, exit.

## 28. logging/privacy

Job metadata only (id, resource type/id, locale, status, duration, error code); no source/translated text.

## 29. cost guardrails

`TRANSLATION_MAX_BATCH_UNITS`, `TRANSLATION_MAX_BATCH_CHARS`, per-unit max before provider call.

## 30. provider output validation

ID preservation, bounded text, `PROVIDER_OUTPUT_INVALID` on mismatch.

## 31. MACHINE_TRANSLATED revision creation

Processor creates revision via `TranslationRevisionService`; never auto-`APPROVED`.

## 32. provider metadata persistence

Stores `providerId`, optional `glossaryVersionId` on revision.

## 33. glossary version schema

System-global `catholic_glossary_versions` with locale pair, version number, status, provider glossary id.

## 34. glossary term schema

`catholic_glossary_terms` with source/target terms, notes, case sensitivity.

## 35. glossary status lifecycle

`DRAFT` → `PUBLISHED` → `ARCHIVED`.

## 36. publish/archive behavior

Publishing archives prior `PUBLISHED` version for same locale pair.

## 37. glossary immutability

Only `DRAFT` terms mutable; published/archived immutable.

## 38. CatholicGlossaryService

`createDraft`, term CRUD, `publish`, `getPublishedForPair`, `clonePublishedToDraft`.

## 39. provider glossary mapping

Neutral `{ glossaryVersionId, providerGlossaryId? }` passed to providers; mock applies terms internally.

## 40. revision glossaryVersionId

Machine translation revision stores glossary version used; glossary change does not auto-stale old translations.

## 41. table ownership

Exactly **5** Localization tables after #003.

## 42. FK strategy

Jobs → resources; terms → glossary versions; revisions → glossary versions; actor IDs → users NO ACTION.

## 43. indexes

Job status/next_attempt, resource/locale/hash; glossary locale/status; term version/source term unique.

## 44. no learner read integration

Deferred #004.

## 45. no Practice changes

Deferred #004.

## 46. permission seed decision

No RBAC seeds in #003 (deferred #005).

## 47. security

No PII in jobs, sanitized error messages, no HTTP admin routes, no translate-on-GET.

## 48. microservice extraction

Provider/jobs/glossary remain Localization-owned; future service boundary unchanged.

## 49. unit tests

Mock provider, Google error mapping, output validation, config validation, backoff util.

## 50. integration tests

`localization-provider-jobs.integration-spec.ts` — schema, glossary publish/archive, job process/dedupe, source-changed terminal.

## 51. DB e2e/regression

116 DB e2e tests **PASS** (no new HTTP routes required).

## 52. pristine quality:full

```bash
npm run test:db:prepare -- --reset
npm run quality:full
```

**PASS** — 574 unit + 227 integration + 116 DB e2e (one clean run).

## 53. Docker

```bash
docker build --target production -t catechism-api:localization-provider-jobs .
```

**PASS** (WSL, 2026-09-01)

## 54. commands

All required prompt gates executed successfully.

## 55. validation matrix

All prompt §Explicit PASS/FAIL items: **PASS**

## 56. known/deferred

| Item | Target |
|------|--------|
| Real Curriculum/QB/LearningContent adapters | #004 |
| Localized Curriculum Delivery reads | #004 |
| Practice `translationRevisionId` snapshot | #004 |
| Admin translation HTTP + RBAC | #005 |
| Google provider-side glossary provisioning | post-MVP |
| Live Google integration tests | manual/staging only |

## 57. out-of-scope

Learner GET localization, admin APIs, permission seeds, Exam, FE/Mobile contract hardening, auto-APPROVE.

## 58. LOCALIZATION #004 readiness

**READY: YES** — implement resource adapters + localized delivery integration + Practice snapshot fields.

## 59. prompt count

**LOCALIZATION #003/6 complete** — approximately **3 prompts remain**

## 60. commit recommendation

When ready (do not execute unless requested):

```bash
git commit -m "feat(localization): add provider jobs and catholic glossary"
```
