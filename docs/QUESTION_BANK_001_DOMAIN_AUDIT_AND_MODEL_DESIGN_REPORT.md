# QUESTION BANK #001 — Domain Audit and Model Design Report

**Phase:** QUESTION BANK / ASSESSMENT CONTENT FOUNDATION #001 / 8  
**Date:** 2026-08-31  
**Status:** AUDIT / DESIGN COMPLETE  
**Prompt:** QUESTION_BANK_001 (domain audit + bounded context + question model/versioning design)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| QUESTION BANK DOMAIN DESIGN READY | **YES** |
| QUESTION VERSIONING DESIGN READY | **YES** |
| MVP QUESTION TYPES DECIDED | **YES** |
| ANSWER MODEL READY | **YES** |
| CURRICULUM LINKAGE MODEL READY | **YES** |
| MEDIA INTEGRATION MODEL READY | **YES** |
| EXAM SNAPSHOT/AUDITABILITY READY | **YES** |
| MULTILINGUAL FOUNDATION READY | **YES** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**Recommendation:** Proceed to **QUESTION BANK #002/8 — Schema + Entities + Migrations** (persistence-only; no HTTP API).

---

## 1. Objective

Design a future-safe Question Bank bounded context for reusable, versioned assessment content with immutable published snapshots, objective grading semantics, curriculum/media integration, multilingual readiness, and clean boundaries for future Practice and Exam modules — **without implementing production code**.

## 2. State inherited from Curriculum / Media

| Completed phase | Relevant artifacts |
|-----------------|-------------------|
| Curriculum #006 | Version lifecycle (DRAFT/PUBLISHED/ARCHIVED), `canonicalLessonKey`, clone/publish orchestration, structured publish validation |
| Learning content | `ContentDocumentV1` blocks, `contentHash`, media ref validation via `MediaAssetService` |
| Media #004 | `MediaAssetService` public export, contextual learner media, `assetId`-only references |
| Class/Enrollment | `ClassScopeService`, `EnrollmentAccessService`, parish/catechist/parent scope patterns |
| Auth/RBAC | `{domain}.{read\|manage\|publish}` permission naming, role matrix seed |

No question, assessment, exam, or practice code exists in the repository.

## 3. Existing question/assessment code audit

**Result: greenfield.**

- No modules, entities, migrations, services, controllers, or permissions for questions/exams/practice
- Only future references in `PROJECT_RULES.md` (exam snapshot comment, `exams.publish` example in test naming guidance)
- Safe to introduce `QuestionBankModule` without migration conflicts

## 4. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*`
- Modular monolith: single owning module, public API exports only, no cross-module entity/repository imports
- Minors privacy: no learner attempt data in Question Bank; answer leakage prevention by DTO separation
- English for codes, enums, APIs, schema; Unicode (`nvarchar`) for human-readable fields
- Audit-only: **no production source or schema modified**

## 5. Bounded-context decision

**One cohesive bounded context: Question Bank.**

Question Bank owns question identity, versioned content, options, correct-answer definitions, tags, curriculum linkage metadata, and publish/clone lifecycle.

Question Bank does **not** own:
- Practice sessions or progress
- Exam definitions, attempts, or delivered snapshots (references `questionVersionId` only)
- Learner answers or grading history rows
- Curriculum entities (topics/lessons/versions)
- Media storage or streaming

Future **PracticeModule** and **ExamModule** consume Question Bank via public service contracts.

## 6. Module naming

**`QuestionBankModule`** under `src/modules/question-bank/`.

Do **not** split into `QuestionTypeModule`, `TagModule`, etc. at MVP. Internal folders (`entities/`, `services/`, `enums/`, `utils/`) provide structure within the single module.

Optional future **`QuestionBankOrchestrationModule`** (zero exports) if publish/clone spans Media + Curriculum validation — mirror `CurriculumOrchestrationModule` pattern. Not required in #002.

## 7. Domain definitions

| Concept | Definition |
|---------|------------|
| **Question** | Long-lived stable semantic identity within a parish (`questions` root row) |
| **QuestionVersion** | Point-in-time authoring/publishing snapshot; carries type, prompt, options, answers |
| **QuestionType** | Stable English machine code (`SINGLE_CHOICE`, etc.) controlling render + validation + grading |
| **QuestionOption** | Version-scoped selectable item with UUID identity and canonical `sortOrder` |
| **CorrectAnswer** | Machine-evaluable definition referencing option IDs (objective types) or strict typed JSON (future TEXT/NUMBER) |
| **Explanation** | Post-answer feedback text on version; exposure controlled by Practice/Exam, not auto-leaked to learners |
| **QuestionTag** | Parish-scoped classification metadata with stable machine `code` |
| **QuestionCurriculumLink** | Non-owning association to curriculum taxonomy via stable keys |

## 8. Parish ownership/scope

**Decision: `parishId` required on question root.**

- Every question belongs to exactly one parish
- `SUPER_ADMIN` bypasses via global role (existing `ParishScopeService.isSuperAdmin` pattern)
- `PARISH_ADMIN`: read/manage/publish within own parish
- `CATECHIST`: read (+ optional manage) scoped to parish membership / future assignment policy — **defer write policy to #006**; default MVP: read in own parish, manage only if granted `questions.manage`
- `PARENT` / student identities: **no authoring**; learner access via Practice/Exam delivery layers only

Do **not** introduce nullable/global/shared cross-parish question bank at MVP.

## 9. Question root identity

Table: `questions`

- `id` (UUID v4, PK)
- `parishId` (FK → parishes, required)
- `code` (varchar 64, optional but recommended; unique per parish when present)
- `status` (`ACTIVE` | `INACTIVE`)
- `sourceLocale` (varchar 32, BCP47-like, required — see §46)
- `currentPublishedVersionId` (nullable FK → question_versions)
- `createdByUserId`, `createdAt`, `updatedAt`

Root identity is stable across version lineage. Human title/prompt never defines canonical identity.

## 10. QuestionVersion identity

Table: `question_versions`

- `id` (UUID v4, PK) — **this is what Exam/Practice must reference**
- `questionId` (FK → questions)
- `versionNumber` (int, monotonic per question, starts at 1)
- `status` (`DRAFT` | `PUBLISHED` | `ARCHIVED`)
- `questionType` (varchar 32 enum code)
- Content fields (see §28–29)
- `difficulty` (see §36)
- `sourceContentHash` (varchar 64, SHA-256 hex — see §47)
- `createdByUserId`, `publishedByUserId`, `publishedAt`, `createdAt`, `updatedAt`

Unique: `(questionId, versionNumber)`, `(questionId)` where status = DRAFT (one draft enforced at app layer + partial unique index if feasible).

## 11. Root lifecycle

| Status | Meaning |
|--------|---------|
| `ACTIVE` | Question participates in authoring/search; may have published versions |
| `INACTIVE` | Soft-retired root; existing published versions remain historical; block new publish |

Separate from version lifecycle. Inactive root does not delete versions.

## 12. Version lifecycle

| Status | Rules |
|--------|-------|
| `DRAFT` | Mutable; at most **one** per question |
| `PUBLISHED` | **Immutable** content/answers/options; exactly one "current" per question via `questions.currentPublishedVersionId` |
| `ARCHIVED` | Previously published; readable for audit/historical exams |

Publishing a newer version archives the prior current published version (same pattern as `CurriculumService.publishDraftVersionTransaction`).

## 13. Published immutability

Once `PUBLISHED`:

- No updates to prompt, instruction, explanation, options, correct answers, difficulty, type, or media refs
- No deletes of options referenced by correct-answer rows
- Metadata audit fields (`publishedAt`, `publishedByUserId`) immutable

Edits require **clone → new DRAFT** workflow (#005).

## 14. Clone semantics

Mirror curriculum clone pattern:

1. Source version must be `PUBLISHED` or `ARCHIVED`
2. Reject if question already has a `DRAFT`
3. New version row: `versionNumber = max + 1`, status `DRAFT`
4. Deep-copy options (new option UUIDs) and correct-answer mappings (remapped to new option IDs)
5. Copy curriculum links and tag links to new version (or root-level links — see §56)
6. Copy translatable fields; recompute `sourceContentHash` on first save

Question root and `code` unchanged.

## 15. Exam auditability

Future `ExamAttemptQuestionSnapshot` (Exam module, not Question Bank) must store at minimum:

- `questionVersionId` (exact published revision)
- `deliveredOptionOrder` (array of option UUIDs as shown to learner)
- `sourceContentHash` at delivery time (copy from version row)
- `locale` / future `translationRevisionId`

Grading uses **snapshotted** option IDs and correct-answer definition copied or resolved at exam publish time — never live mutable root state.

An attempt remains gradable after authors publish newer question versions.

## 16. MVP question types

| Type | MVP |
|------|-----|
| `SINGLE_CHOICE` | **Yes** |
| `MULTIPLE_CHOICE` | **Yes** |
| `TRUE_FALSE` | **Yes** |

## 17. Deferred question types

| Type | Phase | Rationale |
|------|-------|-----------|
| `SHORT_TEXT` | Post-MVP (#004+) | Locale, case, accent, alias complexity; needs fuzzy policy |
| `NUMBER` | Post-MVP | Requires numeric value + tolerance model |
| `LONG_TEXT` | Deferred | Manual/semi-manual grading; not objective MVP |
| `ORDERING` | Deferred | Partial credit + shuffle semantics |
| `MATCHING` | Deferred | Complex UI + grading |
| `FILL_IN_THE_BLANK` | Deferred | Tokenization + locale |

## 18. SINGLE_CHOICE

- 2..N options (`MIN_OPTIONS = 2`, `MAX_OPTIONS = 10` recommended)
- Exactly **one** correct option (via `question_correct_options` — single row enforced at validation)
- Correctness references **option UUID**, never label text
- Canonical display order via `sortOrder`; delivery may shuffle (Exam stores delivered order)

## 19. MULTIPLE_CHOICE

- 2..N options
- ≥1 correct options
- **Exact-set scoring** for MVP (learner selection must match correct set exactly)
- **No partial credit** until product explicitly defines policy (#004 document as future flag)

## 20. TRUE_FALSE

**Decision: two ordinary options** (not a separate boolean column).

- Auto-provision options with stable machine codes `true` and `false` (English codes; localized display text in `text` field)
- Exactly one correct option via same `question_correct_options` join table as SINGLE_CHOICE
- Keeps grading engine unified; avoids special-case boolean JSON for MVP
- Display labels ("Đúng"/"Sai") live in localized `text` — correctness never encoded in display strings

## 21. SHORT_TEXT / NUMBER

**Deferred from MVP.**

If added later:
- `SHORT_TEXT`: `answer_definition_json` with `schemaVersion`, normalized acceptable aliases list, case-folding policy — **no fuzzy matching without product sign-off**
- `NUMBER`: JSON with `value`, `tolerance`, optional `unit` — independent of formatted display

## 22. Ordering / Matching / FillBlank / LongText

All **deferred**. Would require extended option models, partial credit policies, and non-objective grading pipelines. Out of #001–#005 MVP scope.

## 23. Option identity

Table: `question_options`

- `id` (UUID v4, PK) — version-scoped, stable for life of that version
- `questionVersionId` (FK)
- `code` (varchar 32, optional machine code — required for TRUE_FALSE `true`/`false`)
- `text` (nvarchar 512, nullable)
- `mediaAssetId` (nullable UUID — no FK to media table at app boundary)
- `sortOrder` (int, canonical order)

Constraint: at least one of `text` or `mediaAssetId` must be present (app + CHECK or validation).

## 24. Option ordering / randomization

- **Persistence**: always store canonical `sortOrder`
- **Delivery**: Practice/Exam may shuffle for presentation
- **Exam**: must persist `deliveredOptionOrder[]` in Exam module snapshot
- Question Bank never randomizes at rest

## 25. Answer representation

**Decision: hybrid (normalized for MVP objective types).**

| Layer | MVP | Future |
|-------|-----|--------|
| Objective types | `question_correct_options` join table | Same |
| TEXT/NUMBER | — | Strict `answer_definition_json` on version |

Avoid generic untyped JSON for MVP.

## 26. Correct-answer storage

Table: `question_correct_options`

- `questionVersionId` (FK)
- `optionId` (FK → question_options)
- Composite PK or unique `(questionVersionId, optionId)`

Validation rules by type enforce count (1 for SINGLE_CHOICE/TRUE_FALSE, ≥1 for MULTIPLE_CHOICE).

Future TEXT/NUMBER: add nullable `answer_definition_json` (nvarchar MAX) on `question_versions` with strict schema validator — only populated when type requires it; must be empty for option-based types.

## 27. Partial-credit policy

**MVP: none.** MULTIPLE_CHOICE uses exact-set match (all correct selected, no incorrect selected).

Document extension point in grading interface for future `partialCreditPolicy` enum on version — **not in schema until required**.

## 28. Prompt/content representation

**Decision: hybrid — Unicode columns + structured media JSON fragment.**

| Field | Storage |
|-------|---------|
| `prompt` | nvarchar(2000), required for publish |
| `instruction` | nvarchar(1000), optional learner hint |
| `promptMediaJson` | nullable nvarchar(MAX) — strict schema: `{ schemaVersion: 1, items: [{ type: 'image_ref', assetId, alt? }] }` |

Mirror learning-content media ref shape for consistency. Reuse validation patterns from `content-media-reference.util.ts` (cross-module via `MediaAssetService`).

**No raw HTML.** Plain Unicode text only in prompt/instruction.

## 29. Explanation model

- Field: `explanation` nvarchar(2000), optional on version
- Optional `explanationMediaJson` same schema as prompt media
- Owned by version; copied on clone
- **Learner exposure**: Practice/Exam decides when to show (after submit, after exam close, etc.)
- Learner delivery DTO may omit explanation entirely until policy allows

## 30. Media integration

- Store **only `assetId`** (UUID) in option rows and media JSON fragments
- Never store bucket/key/path/URL/signed URL
- Validate on draft save and publish via public **`MediaAssetService`** only:
  - `assertAssetReady(assetId)`
  - `assertAssetCategory(assetId, MediaCategory.Image)` for MVP prompt/option images
- Future audio: `MediaCategory` extension + validation in #006

Dependency: `QuestionBankModule` → `MediaModule` (import `MediaAssetService` only).

## 31. Option media

Options may have:
- `text` only (typical)
- `mediaAssetId` only (image-based answer choice)
- both

At least one representation required. Image options validated as IMAGE category.

## 32. Curriculum linkage

Questions are **reusable** across curriculum versions. Linkage is **metadata/classification**, not ownership.

Table: `question_curriculum_links`

- `id` (UUID)
- `questionId` (FK — root level so links survive version publish)
- `parishId` (denormalized for scope queries — matches question.parishId)
- `curriculumId` (FK → curriculums)
- `canonicalLessonKey` (nullable UUID — stable across curriculum version clones)
- `authoringCurriculumVersionId` (nullable — optional context only, not used for delivery identity)
- `createdAt`

**Do not** use version-scoped `lessonId` alone — breaks on curriculum clone.

## 33. canonicalLessonKey strategy

Reuse curriculum fact: `lessons.canonicalLessonKey` is UUID v4, preserved across version clone (`cloneVersionStructureTransaction`).

Question links store `canonicalLessonKey` when associating to a lesson semantic. Resolution to current lesson row happens at query time via Curriculum public API (future: lookup by curriculum + key).

If only curriculum-level association needed, leave `canonicalLessonKey` null.

## 34. Topic linkage limitation

Topics **lack** `canonicalTopicKey` today. **Do not modify Curriculum schema in #001–#002** to add it.

Topic association options:
1. **Derive through lesson link** (preferred when lesson known)
2. **Tag-based** topic labeling (e.g. tag code `topic-sacraments`)
3. **Defer** direct topic FK until product requires canonical topic identity

**Decision: defer direct topic FK; use lesson link + tags.**

## 35. Tags model

Tables:

**`question_tags`**
- `id`, `parishId`, `code` (varchar 64, unique per parish), `name` (nvarchar 128), `status` (`ACTIVE`|`INACTIVE`), timestamps

**`question_tag_links`**
- `questionId` (FK), `tagId` (FK), unique `(questionId, tagId)`

Tag `code` is language-neutral; `name` is display Unicode. Future i18n translates name, not code.

Permission: `questions.manage` covers tag CRUD at MVP — **no separate `question-tags.manage`** unless tag admin split needed later.

## 36. Difficulty model

**Decision: enum `EASY` | `MEDIUM` | `HARD`** (varchar 16 on version).

Simple, stable, sufficient for MVP filtering. No numeric 1–5 scale; no Bloom taxonomy.

Optional on draft; required before publish (validation issue `DIFFICULTY_REQUIRED`).

## 37. Question code

- Optional `questions.code` varchar(64, unique per parish when not null)
- Machine-oriented: `[a-z0-9-]` normalized (mirror `curriculum-code.util.ts` patterns)
- Useful for import/export, support tickets, external references
- Never derived from Vietnamese prompt text

## 38. Publish validation

Structured issues (mirror `CurriculumPublishValidationIssue`):

| Code | When |
|------|------|
| `PROMPT_REQUIRED` | Empty prompt |
| `INVALID_OPTION_COUNT` | Below min or above max for type |
| `CORRECT_ANSWER_REQUIRED` | No correct options |
| `TOO_MANY_CORRECT_ANSWERS` | SINGLE_CHOICE/TRUE_FALSE has >1 |
| `ANSWER_OPTION_NOT_FOUND` | Correct option ID not in version |
| `DUPLICATE_OPTION_CODE` | Duplicate option `code` within version |
| `OPTION_REPRESENTATION_REQUIRED` | Both text and media null |
| `DIFFICULTY_REQUIRED` | Missing difficulty |
| `ASSET_NOT_FOUND` / `ASSET_NOT_READY` / `ASSET_CATEGORY_MISMATCH` | Media validation |
| `DRAFT_ONLY` | Publish on non-draft |

HTTP: **422** with `{ message, issues[] }`.

## 39. Admin/learner DTO separation

| DTO | Contains |
|-----|----------|
| **Authoring** | Full version, options, correct option IDs, `answer_definition_json`, internal notes |
| **Learner delivery** | Prompt, instruction, options (id + text/media only), **no correct IDs**, no answer JSON |
| **Grading internal** | Correct answers, type, grading rules — service-to-service only (Practice/Exam modules) |

Never expose authoring fields on learner routes.

## 40. Answer leakage prevention

- Learner API responses strip `question_correct_options` and `answer_definition_json`
- List endpoints for learners (future) use dedicated mapper
- Explanation withheld unless Practice/Exam policy enables post-submit
- Logs must not include correct answers or full prompts (see §66)

## 41. Grading service boundary

Future public method on `QuestionBankService` (or dedicated `QuestionGradingService` exported from module):

```typescript
gradeAnswer(input: {
  questionVersionId: string;
  learnerAnswer: LearnerAnswerPayload; // type-specific, validated
}): GradingResult;
```

Practice/Exam call this — **never** Question Bank repositories directly.

Not implemented in #001. MVP grading inputs: selected `optionId[]` for objective types.

## 42. Practice integration

Future PracticeModule will:
- Select published `questionVersionId`s (by tag, curriculum link, or explicit set)
- Fetch learner-safe projection
- Accept submission, call `gradeAnswer`
- Optionally reveal explanation after grading
- Track progress in **Practice-owned tables**

Question Bank provides content semantics only.

## 43. Exam integration

Future ExamModule will:
- Snapshot exact `questionVersionId`s at exam publish
- Store immutable copy or hash of options + correct answers + `sourceContentHash`
- Store `deliveredOptionOrder` per attempt question
- Grade via Question Bank grading contract against snapshot

Question Bank schema supports this via immutable version rows + option UUIDs.

## 44. Search/filter requirements

Admin list filters (implement #007):

- `parishId` (scope)
- root `status`, version `status`
- `questionType`, `difficulty`
- tag IDs
- `curriculumId`, `canonicalLessonKey`
- text search on prompt (collated nvarchar)
- `code`
- has published version / draft exists

Plan indexes accordingly in #002.

## 45. Import/export readiness

- Stable `questions.code` (parish-scoped) + UUIDs in export files
- Option `code` for TRUE_FALSE and import mapping
- Version `versionNumber` + `questionVersionId` in export manifest
- Export format spec deferred to #007 — schema now avoids export tied only to surrogate keys

## 46. sourceLocale strategy

**Decision: root-level `questions.sourceLocale`.**

Rationale: source language stable across version lineage for a question (same as curriculum root). Version inherits locale from root at creation; if source language ever changes, that is a new question root (edge case — document, do not automate translation migration).

Reuse `parseSourceLocale()` pattern from curriculum (`vi-VN` BCP47-like).

## 47. source content hash readiness

Field: `question_versions.sourceContentHash` (SHA-256 hex)

Hash canonical JSON of translatable/source fields:

```json
{
  "prompt": "...",
  "instruction": "...",
  "explanation": "...",
  "promptMediaJson": {...},
  "explanationMediaJson": {...},
  "options": [{ "id", "code", "text", "mediaAssetId", "sortOrder" }]
}
```

Exclude audit timestamps. Recomputed on draft save. Published hash immutable.

Future translation rows key off `(questionVersionId, optionId?, sourceLocale, targetLocale, sourceContentHash)`.

## 48. Translation correctness safety

- Correctness tied to option UUIDs, not translated text
- Grading never compares learner input to localized prompt strings for objective types
- No runtime machine translation on exam hot path
- Translations prepared ahead; exam snapshot records `translationRevisionId` when used

## 49. Exam localization auditability

Exam snapshot (future) stores:

- `questionVersionId`
- `locale`
- `translationRevisionId` (nullable)
- `deliveredOptionOrder`
- copy of `sourceContentHash`

Achievable without Question Bank schema changes beyond fields defined here.

## 50. Unicode / no-HTML

- All human text: MSSQL `nvarchar`
- No HTML columns; no `<script>` acceptance
- Media JSON: strict whitelist schema (same philosophy as `content-document-v1.validator.ts`)
- Prompt/instruction/explanation validated for length + no HTML tags at DTO layer

## 51. questions schema candidate

```sql
questions (
  id UNIQUEIDENTIFIER PK,
  parish_id UNIQUEIDENTIFIER NOT NULL FK → parishes,
  code VARCHAR(64) NULL,
  status VARCHAR(32) NOT NULL, -- ACTIVE|INACTIVE
  source_locale VARCHAR(32) NOT NULL,
  current_published_version_id UNIQUEIDENTIFIER NULL FK → question_versions,
  created_by_user_id UNIQUEIDENTIFIER NULL FK → users,
  created_at DATETIME2 NOT NULL,
  updated_at DATETIME2 NOT NULL,
  UQ (parish_id, code) WHERE code IS NOT NULL
)
```

## 52. question_versions schema candidate

```sql
question_versions (
  id UNIQUEIDENTIFIER PK,
  question_id UNIQUEIDENTIFIER NOT NULL FK → questions,
  version_number INT NOT NULL,
  status VARCHAR(32) NOT NULL, -- DRAFT|PUBLISHED|ARCHIVED
  question_type VARCHAR(32) NOT NULL,
  prompt NVARCHAR(2000) NOT NULL,
  instruction NVARCHAR(1000) NULL,
  explanation NVARCHAR(2000) NULL,
  prompt_media_json NVARCHAR(MAX) NULL,
  explanation_media_json NVARCHAR(MAX) NULL,
  answer_definition_json NVARCHAR(MAX) NULL, -- future TEXT/NUMBER only
  difficulty VARCHAR(16) NULL,
  source_content_hash VARCHAR(64) NULL,
  created_by_user_id UNIQUEIDENTIFIER NULL,
  published_by_user_id UNIQUEIDENTIFIER NULL,
  published_at DATETIME2 NULL,
  created_at DATETIME2 NOT NULL,
  updated_at DATETIME2 NOT NULL,
  UQ (question_id, version_number)
)
```

## 53. question_options schema candidate

```sql
question_options (
  id UNIQUEIDENTIFIER PK,
  question_version_id UNIQUEIDENTIFIER NOT NULL FK → question_versions ON DELETE CASCADE,
  code VARCHAR(32) NULL,
  text NVARCHAR(512) NULL,
  media_asset_id UNIQUEIDENTIFIER NULL,
  sort_order INT NOT NULL,
  created_at DATETIME2 NOT NULL,
  updated_at DATETIME2 NOT NULL,
  UQ (question_version_id, sort_order),
  UQ (question_version_id, code) WHERE code IS NOT NULL
)
```

## 54. answer schema candidate

```sql
question_correct_options (
  question_version_id UNIQUEIDENTIFIER NOT NULL FK → question_versions ON DELETE CASCADE,
  option_id UNIQUEIDENTIFIER NOT NULL FK → question_options,
  PRIMARY KEY (question_version_id, option_id)
)
```

## 55. tags schema candidate

See §35. Index `(parish_id, code)` unique.

## 56. curriculum-link schema candidate

See §32. Index `(question_id)`, `(curriculum_id)`, `(canonical_lesson_key)` for filter queries.

## 57. uniqueness constraints

| Constraint | Purpose |
|------------|---------|
| `(parish_id, code)` on questions | Stable import keys |
| `(question_id, version_number)` | Version lineage |
| One DRAFT per question | App + optional filtered unique index |
| `(question_version_id, sort_order)` | Canonical option order |
| `(question_id, tag_id)` | No duplicate tags |

## 58. indexes

- `questions(parish_id, status)`
- `question_versions(question_id, status)`
- `question_versions(question_type)`
- `question_options(question_version_id)`
- `question_correct_options(question_version_id)`
- `question_tags(parish_id, status)`
- `question_curriculum_links(curriculum_id, canonical_lesson_key)`
- Full-text on `prompt` deferred until search volume justifies

## 59. FK strategy

- SQL FKs allowed within Question Bank tables
- FK to `parishes`, `users`, `curriculums` permitted (shared infrastructure / cross-context reference by ID)
- **No FK** to `media_assets` — validate via `MediaAssetService` only (Media module owns lifecycle)
- ON DELETE CASCADE: options + correct options when version deleted (draft-only delete)

## 60. dependency graph

```
ParishModule
    ↓
QuestionBankModule → MediaModule (MediaAssetService)
                   → CurriculumModule (CurriculumService — read-only taxonomy lookups)
    ↓ (future)
PracticeModule / ExamModule → QuestionBankModule (public grading + delivery contracts)
```

No reverse dependency from Media, Curriculum, or Parish into QuestionBank.

## 61. public contracts

**#002 export (skeleton):** `QuestionBankService` (minimal — metadata only)

**Future exports (#003–#006):**

- `QuestionBankService` — CRUD, publish, clone, list
- `QuestionGradingService` or methods on above — `gradeAnswer`, `getLearnerProjection`, `getAuthoringSnapshot`
- Narrow read models (interfaces), not TypeORM entities

Update `module-boundaries.spec.ts` in #002:

```typescript
QuestionBankModule exports: QuestionBankService only
Must NOT export: TypeOrmModule
```

## 62. conceptual API surface

Not implemented until #003+. Planned routes:

| Method | Route | Permission |
|--------|-------|------------|
| POST | `/api/v1/parishes/:parishId/questions` | `questions.manage` |
| GET | `/api/v1/parishes/:parishId/questions` | `questions.read` |
| GET/PATCH | `/api/v1/questions/:questionId` | read/manage |
| POST | `/api/v1/questions/:questionId/versions` | manage (create draft from clone) |
| PATCH | `/api/v1/question-versions/:versionId` | manage (draft only) |
| POST | `/api/v1/question-versions/:versionId/publish` | `questions.publish` |
| GET | `/api/v1/question-versions/:versionId` | read (authoring) |

Learner routes deferred to #006 (Practice/Exam or scoped delivery).

## 63. RBAC namespace

New permissions (seed in #003):

- `questions.read`
- `questions.manage`
- `questions.publish`

Pattern matches `curricula.*`, `media.*`.

## 64. role/scope plan

| Role | read | manage | publish |
|------|------|--------|---------|
| SUPER_ADMIN | ✓ all | ✓ all | ✓ all |
| PARISH_ADMIN | ✓ own parish | ✓ own parish | ✓ own parish |
| CATECHIST | ✓ own parish | *audit #006* | ✗ |
| PARENT | ✗ | ✗ | ✗ |

Always combine permission check + `ParishScopeService` (or successor) resource scope.

## 65. security/privacy

- Server-side authorization only
- No learner PII in Question Bank tables
- Minors: no public question endpoints; delivery through scoped Practice/Exam
- Do not log correct answers, full prompts, or child identifiers in info logs

## 66. observability

Log fields: `questionId`, `questionVersionId`, `questionType`, `action`, `actorUserId`, `parishId`

Do **not** log: full question body, correct option IDs, learner answers.

## 67. microservice extraction

Future **Question Bank Service** owns tables §51–56. Depends on:

- Parish API (scope)
- Curriculum taxonomy API (link validation)
- Media metadata API (`MediaAssetService` equivalent)

Practice/Exam remain separate services consuming REST/gRPC contracts. Current modular monolith design does not block extraction.

## 68. risks/open questions

| ID | Risk / question | Severity | Mitigation |
|----|-----------------|----------|------------|
| R1 | CATECHIST write scope undefined | MEDIUM | Decide in #006; default read-only |
| R2 | Topic linkage without canonical key | LOW | Tags + lesson link |
| R3 | Full-text search performance | LOW | Defer to #007 |
| R4 | Partial credit demand for MULTIPLE_CHOICE | LOW | Document exact-set MVP |
| R5 | Shared question bank across parishes | LOW | Deferred — parish-scoped MVP |

No BLOCKER or HIGH items open.

## 69. files created

| Path | Purpose |
|------|---------|
| `docs/QUESTION_BANK_001_DOMAIN_AUDIT_AND_MODEL_DESIGN_REPORT.md` | This report |

## 70. files modified

**None.** Audit-only prompt — no production source changes.

## 71. commands

```bash
npm run format:check   # PASS
npm run lint           # PASS
npm run typecheck      # PASS
npm test               # PASS (384 unit)
npm run test:e2e       # PASS (5 DB-free)
npm run build          # PASS
```

No DB migration or `quality:full` required for audit-only work.

## 72. validation

| Gate | Result |
|------|--------|
| format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit | PASS |
| DB-free e2e | PASS |
| build | PASS |
| Git working tree | Clean (read-only check) |

## 73. out-of-scope

- Schema migrations, entities, HTTP API (#002–#003)
- Grading engine implementation (#004)
- Practice/Exam modules
- Translation tables
- Import/export files (#007)
- Frontend/mobile UI
- Changes to Curriculum schema (canonicalTopicKey)

## 74. QUESTION BANK #002 readiness

**Ready: YES** (no BLOCKER/HIGH)

#002 scope (persistence-only):

- `QuestionBankModule` skeleton
- Entities + enums mirroring §51–56
- Migration(s) with constraints/indexes
- Entity metadata tests (`question-bank.entities.spec.ts`, UUID generation spec)
- `module-boundaries.spec.ts` update
- No business HTTP API

## 75. prompt count

**QUESTION BANK #001/8 complete.** Approximately **7 prompts remain** (#002–#008).

## 76. commit recommendation

**None.** Audit-only prompt with no tracked source changes. No commit required unless the team chooses to version this report separately (report lives in gitignored `docs/`).

---

## Final summary

| Topic | Decision |
|-------|----------|
| Module | `QuestionBankModule` (single cohesive context) |
| MVP types | `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TRUE_FALSE` |
| Versioning | Root + immutable published versions; one DRAFT; clone-after-publish |
| Answer model | Normalized `question_correct_options`; JSON deferred for TEXT/NUMBER |
| TRUE_FALSE | Two options with codes `true`/`false` |
| Curriculum link | `curriculumId` + optional `canonicalLessonKey` on root link table |
| Media | `assetId` only; validate via `MediaAssetService` |
| Multilingual | Root `sourceLocale` + version `sourceContentHash`; no translation tables yet |
| Exam safety | Future snapshots reference `questionVersionId` + delivered option order |

**Next:** QUESTION BANK #002 — Schema + Entities + Migrations.
