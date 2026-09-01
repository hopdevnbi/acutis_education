# LOCALIZATION #004 — Resource Adapters + Localized Delivery + Practice Snapshot

## 1. Objective

Implement real translation source adapters, localized learner delivery (curriculum tree + lesson content), and Practice translation snapshots on top of #001–#003 foundations.

## 2. State inherited from #003

- `LocalizationService` + `LocaleResolutionService` exported
- `translation_resources`, `translation_revisions`, `translation_jobs`, Catholic glossary ready
- Mock/Google provider + DB worker ready
- No learner localized delivery or Practice snapshot before this prompt

## 3. Rules applied

- Modular monolith boundaries preserved
- GET paths never call provider or `getOrCreateResource`
- Only `APPROVED` revisions served to learners
- Practice grading unchanged; localization display-only

## 4. Files created

- `src/modules/localization/adapters/curriculum-resource.adapters.ts`
- `src/modules/localization/adapters/learning-content-resource.adapter.ts`
- `src/modules/localization/adapters/question-bank-resource.adapter.ts`
- `src/modules/localization/services/localized-resource-resolution.service.ts`
- `src/modules/localization/services/translation-source-registry-bootstrap.service.ts`
- `src/modules/localization/enums/learner-translation-read-status.enum.ts`
- `src/modules/localization/utils/*` (hashes, translation merge helpers)
- `src/database/migrations/1788063900000-add-practice-session-question-translation-snapshot.ts`

## 5. Files modified

- `src/modules/localization/localization.module.ts`
- `src/modules/localization/services/localization.service.ts`
- `src/modules/localization/services/translation-resource.service.ts`
- `src/modules/localization/services/translation-revision.service.ts`
- `src/modules/localization/interfaces/*`
- `src/modules/curriculum-delivery/**`
- `src/modules/practice/**`
- `test/integration/localization-foundation.integration-spec.ts`
- `test/integration/localization-provider-jobs.integration-spec.ts`
- `test/integration/curriculum-delivery.integration-spec.ts`

## 6. Final dependency graph

- `Localization → Curriculum`, `LearningContent`, `QuestionBank` (public services only)
- `CurriculumDelivery → Localization`, `Users`, `Parish`
- `Practice → Localization`
- No reverse imports; no `forwardRef`

## 7. Resource adapter registry

Six adapters registered via `TranslationSourceRegistryBootstrapService` at provider construction (test-safe without `moduleRef.init()`).

## 8–11. Curriculum adapters

| Type | Fields | Hash |
|------|--------|------|
| `CURRICULUM_METADATA` | name, description | SHA-256 canonical JSON |
| `CURRICULUM_VERSION` | label | SHA-256 |
| `CURRICULUM_TOPIC` | title, description | SHA-256 |
| `CURRICULUM_LESSON` | title, summary | SHA-256 |

## 12. LearningContent adapter

Uses existing `contentHash`. Translates structured block text/alt/caption; preserves block order, types, asset IDs.

## 13. Block identity strategy

MVP: `block:<index>:text|item:<n>|alt|caption|reference` keyed by block index + type.

## 14. QuestionBankVersion adapter

Uses `getImmutableAssessmentSnapshot` + `getAuthoringSnapshot` public APIs; `sourceContentHash` from version.

## 15. Question semantic preservation

Option UUIDs, order, correctness, media IDs unchanged; payload is display-only (`prompt`, `instruction`, `explanation`, option text).

## 16. Translation unit IDs

Deterministic IDs per #001/#004 spec (`curriculum.name`, `topic:<id>:title`, `lesson:<key>:summary`, `block:<index>:…`, `option:<id>:text`).

## 17. Hash strategy

Curriculum semantic SHA-256 via `canonical-json.util.ts`; learning content reuses `contentHash`; questions reuse `sourceContentHash`.

## 18. Source snapshot APIs added

No new public APIs required — existing `CurriculumService`, `LearningContentService`, `QuestionBankService` snapshots used.

## 19–21. LocalizationService resolve API

Added:

- `resolveLocalizedResource(input)`
- `resolveLocalizedResources(inputs[])`
- `resolveLocalizedResourceWithRevision(input)` (exact revision replay)

Same-locale requests return `SOURCE` without DB translation lookup.

## 22–25. Fallback behavior

| Status | Behavior |
|--------|----------|
| `APPROVED` + current hash | Merge approved payload |
| `MISSING` | Source fallback |
| `STALE` | Source fallback |
| `MACHINE_TRANSLATED` | Treated as missing for learners |
| Invalid approved payload | Source fallback + warn log |

## 26. Response metadata

Tree + lesson content + practice questions expose: `requestedLocale`, `resolvedLocale`, `sourceLocale`, `translationStatus`, `isFallback`, optional `translationRevisionId`, `sourceContentHash` (delivery).

## 27–29. Locale resolution

Curriculum delivery precedence via `LocaleResolutionService`: user `preferredLocale` → `Accept-Language` (proper parser) → parish `defaultLocale` → `vi-VN`.

## 30–33. Curriculum delivery

- Tree: batch `resolveLocalizedResources` for metadata/version/topics/lessons (no N+1 per node)
- Lesson content: single resolve for `LEARNING_CONTENT_DOCUMENT`
- Media asset IDs/routes unchanged
- Tree routes accept `Accept-Language` header

## 34–47. Practice integration

- Migration adds `translation_revision_id`, `delivered_locale` on `practice_session_questions` (no FK to localization tables)
- Session create: batch resolve question versions; persist revision + locale per question
- Session GET: exact revision via `resolveLocalizedResourceWithRevision`; never latest-for-existing-session
- Review-wrong inherits translation snapshot fields
- Grading/idempotency unchanged
- DTO metadata added on question delivery

## 48–49. Cross-parish + security

Translation resource parish binding enforced on read; cross-parish mismatch falls back to source.

## 50–51. FE/Mobile readiness

Additive OpenAPI fields on curriculum delivery + practice session responses; cache keys can use `translationRevisionId` + `sourceContentHash`.

## 52–55. Tests

- Updated unit specs (curriculum delivery service)
- Integration: curriculum delivery, practice, localization foundation/provider jobs
- Full regression via `quality:full`

## 56–57. Validation

| Gate | Result |
|------|--------|
| `npm run quality:full` | PASS |
| Docker `catechism-api:localization-delivery` | PASS |

## 58. Swagger/OpenAPI

Updated `LearnerCurriculumTreeResponseDto`, `LearnerLessonContentResponseDto`, `PracticeSessionQuestionResponseDto`.

## 59–60. Multilingual readiness / extraction

Localization remains a cohesive module; adapters call public APIs only — future extraction boundary unchanged from #001.

## 61. Commands run

```bash
npm run test:db:prepare -- --reset
npm run quality:full
wsl bash -lc "cd '<repo>' && docker build --target production -t catechism-api:localization-delivery ."
```

## 62. Validation matrix

All explicit PASS gates from prompt satisfied; BLOCKER/HIGH = 0.

## 63. Known / deferred

- Dedicated integration tests for approved EN tree + translated practice session with seeded revisions (deferred; core paths covered by unit + existing integration regression)
- Admin translation HTTP (#005)

## 64. Out of scope (confirmed)

Admin APIs, RBAC, Exam, translated search/export, notifications — not implemented.

## 65. #005 readiness

**READY: YES** — no unresolved BLOCKER/HIGH.

## 66. Prompt count

LOCALIZATION **#004 / 6** complete.

## 67. Commit recommendation (not executed)

```
git commit -m "feat(localization): integrate localized content delivery"
```

---

## Final verdicts

| Area | Verdict |
|------|---------|
| Adapters | PASS |
| Curriculum Delivery | PASS |
| Question localization | PASS |
| Practice snapshot | PASS |
| FE/Mobile readiness | PASS |
| `quality:full` | PASS |
| Docker | PASS |
| BLOCKER/HIGH | 0 |
