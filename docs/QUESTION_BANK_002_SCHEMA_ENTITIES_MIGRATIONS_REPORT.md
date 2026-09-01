# QUESTION BANK #002 — Schema + Entities + Migrations Report

**Phase:** QUESTION BANK / ASSESSMENT CONTENT FOUNDATION #002 / 8  
**Date:** 2026-08-31  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** QUESTION_BANK_002 (persistence-only schema foundation)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| Schema foundation | **PASS** |
| Migration integration | **PASS** (18 tests) |
| Multilingual foundation | **PASS** |
| Exam auditability foundation | **PASS** |
| Module boundary compliant | **PASS** |
| quality:full (pristine DB) | **PASS** |
| Docker production build | **PASS** (`catechism-api:question-bank-schema`) |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**Recommendation:** Proceed to **QUESTION BANK #003/8 — Question Root/Version CRUD + Tags/Curriculum Link Metadata + RBAC**.

---

## 1. Objective

Implement persistence-only Question Bank foundation: module skeleton, enums, entities, migration with constraints/indexes, metadata tests, and MSSQL integration tests — no HTTP API or business services.

## 2. State inherited from #001

Design decisions from `docs/QUESTION_BANK_001_DOMAIN_AUDIT_AND_MODEL_DESIGN_REPORT.md` applied verbatim: 7 owned tables, parish-scoped roots, version immutability model, normalized correct options, no media FK, `canonicalLessonKey` curriculum links.

## 3. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*`
- Scalar IDs only; zero TypeORM relations
- Application UUID v4; no DB UUID defaults
- `QuestionBankModule` exports nothing at #002
- No RBAC seeds, no business logic, no translation tables

## 4. Files created

| Path | Purpose |
|------|---------|
| `src/modules/question-bank/question-bank.module.ts` | Module skeleton (TypeORM only) |
| `src/modules/question-bank/enums/*.enum.ts` | Status, type, difficulty enums |
| `src/modules/question-bank/entities/*.entity.ts` | 7 entity classes |
| `src/database/migrations/1788063300000-create-question-bank-schema.ts` | MSSQL migration |
| `src/database/question-bank.entities.spec.ts` | Entity metadata tests |
| `src/database/question-bank-uuid-generation.spec.ts` | UUID v4 tests |
| `test/integration/question-bank-foundation.integration-spec.ts` | MSSQL constraint tests |

## 5. Files modified

| Path | Change |
|------|--------|
| `src/app.module.ts` | Register `QuestionBankModule` |
| `src/modules/module-boundaries.spec.ts` | Assert zero exports from QuestionBankModule |
| `test/parish.db.e2e-spec.ts` | Fix shared-permission cleanup flake in full e2e suite |

## 6. QuestionBankModule skeleton

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([/* 7 entities */])],
})
export class QuestionBankModule {}
```

No controllers, providers, or exports.

## 7. Public exports

**None** — enforced by `module-boundaries.spec.ts`.

## 8. Enums

| Enum | Values |
|------|--------|
| `QuestionStatus` | ACTIVE, INACTIVE |
| `QuestionVersionStatus` | DRAFT, PUBLISHED, ARCHIVED |
| `QuestionType` | SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE |
| `QuestionDifficulty` | EASY, MEDIUM, HARD |
| `QuestionTagStatus` | ACTIVE, INACTIVE |

## 9. Questions entity/table

`questions` — `parishId`, optional `code`, `status`, `sourceLocale`, `currentPublishedVersionId`, audit fields.

## 10. QuestionVersions entity/table

`question_versions` — version lineage, type, prompt/instruction/explanation, media JSON columns, `answerDefinitionJson`, `difficulty`, `sourceContentHash`, publish audit fields.

## 11. QuestionOptions entity/table

`question_options` — version-scoped options with optional `code`, `text`, `mediaAssetId`, `sortOrder`.

## 12. QuestionCorrectOptions entity/table

`question_correct_options` — composite PK `(questionVersionId, optionId)`.

## 13. QuestionTags entity/table

`question_tags` — parish-scoped tag registry with machine `code` and Unicode `name`.

## 14. QuestionTagLinks entity/table

`question_tag_links` — composite PK `(questionId, tagId)` at question root scope.

## 15. QuestionCurriculumLinks entity/table

`question_curriculum_links` — `curriculumId`, optional `canonicalLessonKey`, optional `authoringCurriculumVersionId`.

## 16. UUID strategy

All PKs use `generateUuidV4()` at entity construction. No `NEWID()` / `@Generated` columns.

## 17. Root/version circular FK

Migration order: create `questions` → `question_versions` → add `FK_questions_current_published_version_id` (same pattern as curriculum).

## 18. FK strategy

FKs to `parishes`, `users`, `curriculums`, `curriculum_versions`. **No FK** to `media_assets`.

## 19. Delete/cascade strategy

- `question_options` / `question_correct_options`: CASCADE on version delete (draft cleanup)
- Root/question links: NO ACTION on parish/curriculum FKs
- No automatic cascade deleting published history from question root

## 20. Question code uniqueness

Filtered unique index `UQ_questions_parish_id_code` WHERE `code IS NOT NULL`.

## 21. One DRAFT filtered unique

`UQ_question_versions_question_id_draft` WHERE `status = 'DRAFT'`.

## 22. Version constraints

- `version_number > 0`
- Unique `(question_id, version_number)`
- Status/type/difficulty CHECK constraints
- `published_at` consistency CHECK

## 23. Question type/difficulty constraints

`question_type IN (SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE)`  
`difficulty IS NULL OR IN (EASY, MEDIUM, HARD)`

## 24. JSON constraints

`ISJSON = 1` when non-null on `prompt_media_json`, `explanation_media_json`, `answer_definition_json`.

## 25. sourceContentHash constraint

Nullable; when set must be exactly 64 lowercase hex chars.

## 26. Option representation constraint

`CK_question_options_representation_required`: `text IS NOT NULL OR media_asset_id IS NOT NULL`.

## 27. Option sort/code uniqueness

- `sort_order >= 0`
- Unique `(question_version_id, sort_order)`
- Filtered unique `(question_version_id, code)` WHERE `code IS NOT NULL`

## 28. Correct-answer cross-version integrity

Composite FK `(question_version_id, option_id)` → `question_options(question_version_id, id)` with supporting unique index `UQ_question_options_question_version_id_id`.

## 29. Tag uniqueness

Unique `(parish_id, code)` on `question_tags`.

## 30. Curriculum link uniqueness

- Filtered unique `(question_id, curriculum_id)` WHERE `canonical_lesson_key IS NULL`
- Filtered unique `(question_id, curriculum_id, canonical_lesson_key)` WHERE NOT NULL

## 31. No media FK

`media_asset_id` stored as scalar UUID only; validated via `MediaAssetService` in future prompts.

## 32. Entity ORM-relation audit

All 7 entities: **0 TypeORM relations** (verified in metadata tests).

## 33. Unicode validation

Integration test persists Vietnamese + French accented prompt/tag text via `nvarchar` columns.

## 34. Locale persistence

`source_locale` on question root; `vi-VN` / `fr-FR` values verified in integration test.

## 35. Index strategy

Indexes on parish/status, version status/type/difficulty, option version, tag parish/status, curriculum link filters — per #001 plan.

## 36. Metadata tests

`question-bank.entities.spec.ts` — table names, columns, no relations, sourceLocale, sourceContentHash, no translation tables.

## 37. UUID tests

`question-bank-uuid-generation.spec.ts` — v4 generation and explicit ID preservation.

## 38. Migration integration tests

18 tests in `question-bank-foundation.integration-spec.ts` covering all constraints listed in prompt §42.

## 39. Multilingual readiness

Root `sourceLocale` + version `sourceContentHash` columns present; no translation tables (deferred).

## 40. Exam auditability readiness

Immutable version IDs, stable option UUIDs per version, `sourceContentHash` field — supports future exam snapshots without schema changes.

## 41. Existing regression

Curriculum/Media tests unchanged in behavior. Fixed pre-existing `parish.db.e2e-spec.ts` flake when global permissions were deleted while other suites' roles still referenced them.

## 42. quality:full

**PASS** (pristine DB reset):

| Gate | Count |
|------|-------|
| unit | 402 |
| DB-free e2e | 5 |
| integration | 158 |
| DB e2e | 68 |

## 43. Docker

**PASS** — `wsl docker build --target production -t catechism-api:question-bank-schema .`

## 44. Microservice extraction readiness

Owned tables isolated under `QuestionBankModule`; scalar FKs only; no cross-module entity imports. Ready for future service extraction.

## 45. Commands

```bash
npm run format && npm run lint && npm run typecheck && npm test && npm run test:e2e && npm run build
npm run test:db:prepare -- --reset && npm run quality:full
wsl docker build --target production -t catechism-api:question-bank-schema .
```

## 46. Validation matrix

| Gate | Result |
|------|--------|
| format | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS (402) |
| DB-free e2e | PASS |
| build | PASS |
| npm audit | PASS |
| quality | PASS |
| migrations | PASS |
| integration | PASS (158) |
| DB e2e | PASS (68) |
| quality:full ONE CLEAN RUN | PASS |
| Docker | PASS |
| 7 tables created | PASS |
| no blob columns | PASS |
| UUID no DB defaults | PASS |
| one DRAFT unique | PASS |
| version constraints | PASS |
| JSON ISJSON | PASS |
| sourceContentHash | PASS |
| option representation | PASS |
| cross-version correct-answer FK | PASS |
| tag/curriculum uniqueness | PASS |
| no media FK | PASS |
| no ORM relations | PASS |
| no HTTP API | PASS |
| Git rule compliance | PASS |

## 47. Known/deferred

- Business services, RBAC seeds, publish/clone/grade (#003–#005)
- HTTP Range, translation tables, Practice/Exam modules
- Full-text search index (#007)

## 48. Out-of-scope

Controllers, DTOs, grading engine, import/export, FE/Mobile, S3 changes.

## 49. QUESTION BANK #003 readiness

**Ready: YES**

#003 implements CRUD for question roots/versions, tag/link metadata, parish scope, `questions.read/manage/publish` permissions — **not** type-specific option/answer validation (#004).

## 50. Prompt count

**QUESTION BANK #002/8 complete.** Approximately **6 prompts remain** (#003–#008).

## 51. Commit recommendation

When ready to commit (not executed by agent):

```bash
git commit -m "feat(question-bank): add versioned question schema"
```

---

## Explicit PASS/FAIL summary

All prompt §55 matrix items: **PASS**.  
BLOCKER/HIGH: **0**.
