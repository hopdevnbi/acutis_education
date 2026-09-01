# LOCALIZATION #002 — Locale Preferences + Translation Persistence Foundation Report

**Phase:** LOCALIZATION / CONTENT TRANSLATION FOUNDATION #002 / 6  
**Date:** 2026-09-01  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** `LOCALIZATION_002_LOCALE_PREFERENCES_TRANSLATION_PERSISTENCE.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Locale preferences | **PASS** |
| Locale resolution | **PASS** |
| Resource/revision persistence | **PASS** |
| Stale/version model | **PASS** |
| Module boundary | **PASS** |
| quality:full (pristine DB) | **PASS** |
| Docker | **PASS** (`catechism-api:localization-foundation`) |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**#003 readiness:** **READY: YES** — proceed to **LOCALIZATION #003 — Provider Abstraction + DB Jobs + Catholic Glossary Foundation**

---

## 1. Objective

Implement Localization module skeleton, shared locale utilities, user/parish locale preferences, translation resource/revision persistence, internal services, and validation tests — without provider, jobs, glossary, adapters, or learner localized reads.

## 2. State inherited from #001

Design locked: Localization owns translation metadata; Users own `preferredLocale`; Parish owns `defaultLocale`; resource+revision+adapter model; stale derived from hash mismatch; 6-prompt plan.

## 3. Rules applied

`PROJECT_RULES.md`, `AGENTS.md`, modular boundaries, no git commit, English source, migration-driven schema.

## 4. Files created

| Path | Purpose |
|------|---------|
| `src/common/locale/*` | Shared BCP47 + Accept-Language utilities |
| `src/modules/localization/**` | Module, entities, services, enums, errors |
| `src/database/migrations/1788063700000-create-localization-foundation-schema.ts` | Schema migration |
| `src/database/localization.entities.spec.ts` | Entity mapping tests |
| `src/database/localization-uuid-generation.spec.ts` | UUID v4 tests |
| `test/integration/localization-foundation.integration-spec.ts` | MSSQL integration |

## 5. Files modified

| Path | Change |
|------|--------|
| `src/modules/curriculum/utils/curriculum-source-locale.util.ts` | Re-export from `common/locale` |
| `src/modules/users/entities/user.entity.ts` | `preferredLocale` nullable |
| `src/modules/parish/entities/parish.entity.ts` | `defaultLocale` nullable |
| User/Parish/Auth DTOs, mappers, services, specs | Expose/update locale fields |
| `src/app.module.ts` | Import `LocalizationModule` |
| `src/modules/module-boundaries.spec.ts` | Export boundary test |
| `test/auth-login.db.e2e-spec.ts` | Auth `/me` includes `preferredLocale` |

## 6–7. LocalizationModule / Public exports

Exports: **`LocalizationService`**, **`LocaleResolutionService`** only. No entity/repo/TypeORM export.

## 8. Dependency graph

```
LocalizationModule (internal TypeORM for translation_* tables)
├── LocaleResolutionService (pure)
├── TranslationResourceService
├── TranslationRevisionService
└── LocalizationService (facade)

No imports from Curriculum/QB/LearningContent/Practice.
UsersModule / ParishModule unchanged dependency direction.
```

## 9–12. Shared locale utility / BCP47 / Accept-Language / system default

- `src/common/locale/parse-locale.util.ts` — normalize + validate
- `src/common/locale/parse-accept-language.util.ts` — q-values, malformed ignore, q=0 exclude, wildcard skip, max 32 entries
- `SYSTEM_DEFAULT_LOCALE = vi-VN`
- Curriculum util backward-compatible re-export

## 13. User preferredLocale

- Column: `users.preferred_locale varchar(32) NULL`
- `UserAccountService.updatePreferredLocale()`
- Snapshot + `/auth/me` includes `preferredLocale` (not JWT)

## 14. Parish defaultLocale

- Column: `parishes.default_locale varchar(32) NULL`
- `UpdateParishInput` / PATCH parish supports `defaultLocale`
- Response DTO includes `defaultLocale`

## 15–16. LocaleResolutionService / precedence

1. explicit locale  
2. user `preferredLocale`  
3. `Accept-Language`  
4. parish `defaultLocale`  
5. `vi-VN`

Pure service — receives values, no repository queries.

## 17. TranslationResourceType enum

`CURRICULUM_METADATA`, `CURRICULUM_VERSION`, `CURRICULUM_TOPIC`, `CURRICULUM_LESSON`, `LEARNING_CONTENT_DOCUMENT`, `QUESTION_BANK_VERSION`

## 18–19. TranslationStatus / derived vs persisted

**Persisted:** `QUEUED`, `TRANSLATING`, `MACHINE_TRANSLATED`, `REVIEWED`, `APPROVED`, `FAILED`

**Derived (read):** `MISSING`, `SOURCE`, `STALE`, `APPROVED`, `MACHINE_TRANSLATED`

Historical `APPROVED` rows are **not mutated** when source hash changes; staleness is **derived** on read.

## 20–24. translation_resources schema / identity / parish / sourceLocale

- Unique `(resource_type, resource_id)`
- `parish_id` scalar nullable
- `source_locale` required
- No FK to source modules
- Rebinding conflict if same resource with different parish/sourceLocale

## 25–27. translation_revisions / numbering / immutability

- Unique `(translation_resource_id, target_locale, revision_number)`
- Transaction + MAX(revision_number)+1 with retry on unique violation
- Payload immutable after insert

## 28–29. Approval metadata / stale detection

- DB CHECK: `APPROVED` requires `approved_by_user_id` + `approved_at`
- `getLatestApprovedRevision()` compares `revision.sourceContentHash` vs current hash → `isStale`

## 30–32. Payload / hash / sourceVersionKey / targetLocale

- `payload_json` nvarchar(MAX) + ISJSON + max 512 KB service validation
- `source_content_hash` 64-char lowercase hex (DB CHECK)
- Optional `source_version_key varchar(128)`
- Target locale must parse and differ from source locale

## 33–36. Internal services / approved lookup / concurrency / transactions

- `TranslationResourceService.getOrCreateResource()`, `getResourceByRef()`
- `TranslationRevisionService.createRevision()`, `getLatestRevision()`, `getLatestApprovedRevision()`
- Revision create wrapped in transaction

## 37–40. FK / UUID / zero ORM relations

- FK: revision → resource; optional actor FKs → users
- App-generated UUID v4; no DB UUID defaults
- Zero TypeORM `@ManyToOne` relations on localization entities

## 41. Permission seed decision

**Deferred to #005** — no `localization.*` permissions in #002.

## 42–44. No provider/jobs/glossary / no adapters / no Practice changes

Confirmed — not implemented.

## 45–46. Security / multilingual readiness

No provider calls; no PII in translation tables; locale-neutral enums; Unicode via nvarchar.

## 47. Microservice extraction

`LocalizationService` + locale resolution remain future service boundary.

## 48–50. Tests

| Layer | Result |
|-------|--------|
| Unit | locale, resolution, validation, derive-stale specs |
| Integration | `localization-foundation.integration-spec.ts` (4 tests) |
| DB e2e regression | PASS (116 tests) |

## 51. Existing regression

**PASS** — Auth, Parish, Curriculum, QB, Practice, Learning Progress unchanged behavior except additive locale fields.

## 52. Pristine quality:full

```bash
npm run test:db:prepare -- --reset
npm run quality:full
```

**PASS** — 559 unit + 223 integration + 116 DB e2e (one clean run).

## 53. Docker

```bash
docker build --target production -t catechism-api:localization-foundation .
```

**PASS** (WSL, 2026-09-01)

## 54. Commands

All required gates executed successfully.

## 55. Validation matrix

All prompt §Explicit PASS/FAIL items: **PASS**

## 56. Known/deferred

| Item | Target |
|------|--------|
| Provider integration | #003 |
| translation_jobs | #003 |
| Catholic glossary | #003 |
| Resource adapters + localized reads | #004 |
| Admin API + RBAC seeds | #005 |
| Accept-Language in Curriculum Delivery | #004 |

## 57. Out-of-scope

Provider SDK, jobs table, glossary tables, HTTP admin routes, Curriculum Delivery localization, Practice snapshot fields.

## 58. LOCALIZATION #003 readiness

**READY: YES** — add mock/Google provider abstraction, `translation_jobs`, glossary tables, job processor CLI.

## 59. Prompt count

**LOCALIZATION #002/6 complete** — approximately **4 prompts remain**

## 60. Commit recommendation

When ready (do not execute unless requested):

```bash
git commit -m "feat(localization): add locale preferences and translation persistence foundation"
```
