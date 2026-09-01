# LOCALIZATION #001 — Cross-Domain Audit + Translation Model Design Report

**Phase:** LOCALIZATION / CONTENT TRANSLATION FOUNDATION #001 / 6  
**Date:** 2026-09-01  
**Status:** AUDIT COMPLETE — DESIGN READY  
**Prompt:** `LOCALIZATION_001_CROSS_DOMAIN_AUDIT_AND_MODEL_DESIGN.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| LOCALIZATION DOMAIN DESIGN READY | **YES** |
| LOCALE RESOLUTION MODEL READY | **YES** |
| SOURCE LOCALE MODEL READY | **YES** |
| TRANSLATION PERSISTENCE MODEL READY | **YES** |
| TRANSLATION VERSION/STALENESS MODEL READY | **YES** |
| RESOURCE ADAPTER MODEL READY | **YES** |
| PROVIDER ABSTRACTION MODEL READY | **YES** |
| CATHOLIC GLOSSARY MODEL READY | **YES** |
| CURRICULUM INTEGRATION MODEL READY | **YES** |
| QUESTION BANK INTEGRATION MODEL READY | **YES** |
| FE/MOBILE LOCALIZATION CONTRACT FOUNDATION READY | **YES** |
| PERSISTENCE REQUIRED NOW | **YES** (#002) |
| FINAL RECOMMENDED PROMPT COUNT | **6** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**#002 readiness:** **READY: YES** — proceed to **LOCALIZATION #002 — Locale Preferences + Translation Persistence Foundation**

---

## 1. Objective

Audit all existing locale/multilingual foundations across Curriculum, Learning Content, Media, Question Bank, Practice, Learning Progress, Users, and Parish; design the **Localization** bounded context (ownership, persistence, resolution, provider abstraction, glossary, integration strategy); and produce an exact 6-prompt implementation roadmap.

**This prompt is audit/design only.** No production code, schema, migrations, or API was implemented.

## 2. Current roadmap position

| Phase | Status |
|-------|--------|
| Backend Foundation | Complete |
| CI/CD Foundation | Complete |
| Auth/User/RBAC | Complete |
| Parish + Academic Structure | Complete |
| Class + Student + Enrollment | Complete |
| Curriculum + Learning Content | Complete |
| Media | Complete |
| Question Bank | Complete |
| Practice Engine | Complete |
| Learning Progress | **COMPLETE** |
| **Localization (#001–#006)** | **#001 audit (this report)** |
| Exam Engine | Not started |

## 3. Why Localization now

| Factor | Assessment |
|--------|------------|
| Content modules stable | Curriculum, Media, QB, Practice, Learning Progress all phase-complete |
| Source metadata present | `sourceLocale` on Curriculum + Question; `contentHash` / `sourceContentHash` for change detection |
| Delivery stub exists | Curriculum Delivery parses `Accept-Language` but always returns `translationStatus: 'SOURCE'` |
| Roadmap constraint | Localization should precede Exam and deeply coupled single-language downstream features |
| Risk if deferred | Retroactive translation of curriculum trees, structured lesson blocks, and question versions becomes costly |

Learning Progress explicitly deferred Localization **implementation** to this phase while confirming locale-neutral status/counters.

## 4. Existing locale/country/language inventory

| Field | Exists | Location |
|-------|--------|----------|
| `sourceLocale` | **Yes** | `curriculums.source_locale`, `questions.source_locale` |
| `locale` (session) | **Yes** | `practice_sessions.locale` — metadata only, no question filtering |
| `requestedLocale` | **Stub** | Curriculum Delivery learner lesson content response |
| `resolvedLocale` | **Stub** | Always equals `sourceLocale` today |
| `translationStatus` | **Stub** | Type `'SOURCE'` only |
| `languageCode` | **No** | — |
| `countryCode` | **No** | — |
| `preferredLocale` | **No** | — |
| `defaultLocale` | **No** | — |

**Shared utility:** `src/modules/curriculum/utils/curriculum-source-locale.util.ts` — BCP-47-like parse/normalize (reused by Curriculum, Question Bank, Practice, import validation).

## 5. User preference inventory

| Entity | Current fields | Gap |
|--------|----------------|-----|
| `UserEntity` | `email`, `passwordHash`, `status` | No `preferredLocale` |
| `StudentEntity` | `fullName`, `userId` | No locale preference (future self-learner may inherit user preference) |

**Design decision:** `UsersModule` owns `preferredLocale` column (nullable BCP47). Localization validates/resolves but does not own user profile data.

## 6. Parish locale configuration inventory

| Entity | Current fields | Gap |
|--------|----------------|-----|
| `ParishEntity` | `code`, `name`, `status` | No `defaultLocale`, no `supportedLocales` |

**Design decision:** `ParishModule` owns `defaultLocale` (nullable, default backfill `vi-VN` only when explicitly configured). Optional `supportedLocales` JSON array deferred to #005 unless admin UX requires it in #002.

## 7. Translatable resource inventory

| Module | Resource | Stable key | Version key | sourceLocale | Translatable fields | Hash | Priority |
|--------|----------|------------|-------------|--------------|---------------------|------|----------|
| Curriculum | Curriculum | `curriculumId` | N/A (metadata) | `curriculums.sourceLocale` | `name`, `description` | **Gap** — add metadata hash | P1 |
| Curriculum | CurriculumVersion | `curriculumVersionId` | `versionNumber` | inherited | `label` | **Gap** | P2 |
| Curriculum | Topic | `topicId` | tree position | inherited | `title`, `description` | **Gap** | P1 |
| Curriculum | Lesson | `canonicalLessonKey` | version tree membership | inherited | `title`, `summary` | **Gap** | P1 |
| Learning Content | LessonContent | `lessonId` + version | `contentHash` | inherited from curriculum | structured `blocks[]` | **`contentHash` exists** | P1 |
| Question Bank | QuestionVersion | `questionVersionId` | `versionNumber` | `questions.sourceLocale` | `prompt`, `instruction`, `explanation`, media JSON alts | **`sourceContentHash` exists** | P1 |
| Question Bank | QuestionOption | `optionId` | parent version | inherited | `text`, media alt | included in `sourceContentHash` | P1 |
| Question Bank | QuestionTag | `tagId` | N/A | none | `name` | low | P3 |
| Media | MediaAsset | `assetId` | checksum | none | alt/caption live in referencing docs | N/A | P2 (via blocks) |
| Practice | Session/Progress | — | — | session `locale` metadata | **None** — no translation ownership | N/A | — |
| Learning Progress | Lesson progress | — | — | — | **None** — status enums only | N/A | — |

## 8. Curriculum translatable fields

| Entity | Fields | Notes |
|--------|--------|-------|
| `CurriculumEntity` | `name`, `description` | `sourceLocale` on same row |
| `CurriculumVersionEntity` | `label` | Version-scoped display name |
| `TopicEntity` | `title`, `description` | Scoped to curriculum version tree |
| `LessonEntity` | `title`, `summary` | `canonicalLessonKey` stable across republish |

Non-translatable: `code`, `sortOrder`, `estimatedDurationMinutes`, status enums, IDs.

## 9. Learning Content translatable fields

**Schema:** `ContentDocumentV1` — up to 500 blocks, 256 KB cap.

| Block type | Translatable |
|------------|--------------|
| `heading`, `paragraph`, `callout` | `text` |
| `bullet_list`, `numbered_list` | `items[]` |
| `scripture_ref` | `reference`, optional `text` |
| `image_ref`, `video_ref` | optional `alt`, `caption` |
| Block IDs, `assetId`, `level`, `variant` | **Not translatable** |

Integrity: `computeContentHash({ schemaVersion, blocks })` — SHA-256 canonical JSON.

**No `sourceLocale` on `lesson_contents`** — lineage from parent curriculum.

## 10. Question Bank translatable fields

| Field | Translatable | In hash |
|-------|--------------|---------|
| `prompt` | Yes | Yes |
| `instruction` | Yes | Yes |
| `explanation` | Yes | Yes |
| `promptMediaJson` / `explanationMediaJson` | alt text in `image_ref` | Yes (parsed/normalized) |
| `question_options.text` | Yes | Yes (by sortOrder, excludes option UUID) |
| `answerDefinitionJson` | Structural | No (correctness) |
| Option IDs, `correctOptionIds` | **Never translate** | IDs excluded from semantic change |

`sourceContentHash` recomputed on publish. Immutable after publish.

## 11. Practice localization impact

**No translation ownership.**

- `practice_sessions.locale` — session metadata + idempotency hash input; default `vi-VN`
- Question selection **does not filter by locale** today
- Grading uses `sourceContentHash` + option IDs — language-neutral

**Future (#004+):** At session create, snapshot `translationRevisionId` per question version for reproducibility. Never on-demand translate during active session.

## 12. Learning Progress localization impact

**Fully locale-neutral.**

- Status enums (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`) — client-side label translation only
- Counters, ratios, `canonicalLessonKey` — no localized strings in API responses
- No Localization module dependency required

## 13. Media metadata localization impact

`MediaAssetEntity` has **no** caption/alt/transcript columns.

Translatable media text lives in:
- Lesson content blocks (`alt`, `caption`)
- Question media JSON (`alt`)

**No transcript field** exists anywhere — defer until product defines media transcript schema.

Media module remains storage/ delivery only; Localization translates text embedded in referencing documents via adapters.

## 14. Business source ownership

| Content | Owner module | Source of truth |
|---------|--------------|-----------------|
| Curriculum metadata/tree | `CurriculumModule` | Authoring tables |
| Lesson structured content | `LearningContentModule` | `lesson_contents` |
| Question text/options | `QuestionBankModule` | `question_versions` + `question_options` |
| Media bytes | `MediaModule` | `media_assets` + storage provider |
| Translation metadata/workflow | **`LocalizationModule` (new)** | Translation tables |
| Locale preferences | `UsersModule`, `ParishModule` | Profile/parish settings |
| Locale resolution rules | **`LocalizationModule`** | Resolution service |

## 15. Localization bounded context

**LocalizationModule** owns:

- Translation resource registry + revisions
- Translation job state (async provider work)
- Locale resolution precedence
- Provider abstraction + credentials
- Catholic glossary (system-level)
- Admin review/approval workflow
- Cache/dedupe keys for provider cost control

Exports (proposed):

- `LocalizationService` — resolve translation for resource refs; admin operations
- `LocaleResolutionService` — resolve effective locale from request context

Internal: resource adapters, provider client, job runner, glossary mapper.

## 16. What Localization must NOT own

- Original/source authored content (Curriculum, Learning Content, Question Bank)
- Media binary storage
- Practice sessions, answers, grading
- Learning Progress states
- User credentials, student PII
- Parish organizational data (except reading `defaultLocale`)
- UI/static string catalogs (FE/Mobile client-side)
- Question correctness semantics

## 17. Locale terminology model

| Term | Meaning | Example |
|------|---------|---------|
| `countryCode` | ISO 3166-1 alpha-2 | `VN`, `US`, `FR` |
| `languageCode` | ISO 639-1/639-2 | `vi`, `en`, `fr` |
| `locale` | BCP 47 tag | `vi-VN`, `en-US`, `fr-FR` |

**Rule:** API uses full BCP 47 `locale` values. Do not conflate country with language.

## 18. BCP47 validation

**Existing:** `parseSourceLocale()` / `normalizeSourceLocale()` in `curriculum-source-locale.util.ts`

- Pattern: `/^[a-z]{2,3}(-[A-Z]{2})?(-[a-z0-9]{2,8})*$/i`
- Max length 32
- Normalizes language lower, region upper

**#002 action:** Move to shared `common/locale/` or `localization/utils/` (without creating god-module — single util package path). Re-export from Localization for new consumers. Curriculum keeps re-export during migration to avoid wide refactor in #001.

**Accept-Language parsing gap:** Curriculum Delivery uses naive first-tag split — **replace in #004** with proper parser (quality values, fallback chain) in `LocaleResolutionService`.

## 19. Default locale policy

| Level | Default |
|-------|---------|
| System | `vi-VN` |
| Parish | `parish.defaultLocale` if set, else system |
| User | `user.preferredLocale` if set |
| Content source | `curriculum.sourceLocale` / `question.sourceLocale` |

Content may be authored in `vi-VN` while user prefers `en-US` — resolution picks target for translation lookup; fallback to source when missing.

## 20. Locale resolution precedence

**Recommended order:**

1. Explicit `locale` query param (admin preview / forced testing — permission-gated)
2. `user.preferredLocale` (authenticated)
3. `Accept-Language` header (first supported match)
4. `parish.defaultLocale` (from enrollment/class parish context)
5. System default `vi-VN`

**Learner reads:** Accept-Language primary for anonymous-feeling parent app; query override admin-only.

## 21. sourceLocale ownership

| Resource | Owner | Column |
|----------|-------|--------|
| Curriculum family | Curriculum | `curriculums.sourceLocale` |
| Question | Question Bank | `questions.sourceLocale` |
| Lesson content | Inherited | From parent curriculum |
| Topic/Lesson metadata | Inherited | From parent curriculum |

Immutable after first publish (existing errors: `CurriculumSourceLocaleImmutableError`, `QuestionSourceLocaleImmutableError`).

## 22. Current sourceLocale gaps

| Gap | Severity | Target prompt |
|-----|----------|---------------|
| Topic/Lesson/CurriculumVersion lack own `sourceLocale` | LOW | Inherit from curriculum — document only |
| Lesson content no explicit `sourceLocale` | LOW | Inherited — document only |
| Media assets no locale | LOW | Translate via parent document adapters |
| User `preferredLocale` missing | **HIGH** | #002 |
| Parish `defaultLocale` missing | **HIGH** | #002 |
| Curriculum metadata hash missing | MEDIUM | #002 additive util |
| Topic/Lesson metadata hash missing | MEDIUM | #004 adapter computes composite tree hash |

## 23. Stable resource identity

| Resource type | Identity key | Version discriminator |
|---------------|--------------|----------------------|
| `curriculum.metadata` | `curriculumId` | metadata hash |
| `curriculum.version.label` | `curriculumVersionId` | versionNumber |
| `curriculum.topic` | `topicId` | parent `curriculumVersionId` |
| `curriculum.lesson` | `canonicalLessonKey` + `curriculumId` | tree membership version |
| `learning_content.document` | `lessonId` | `contentHash` |
| `question_bank.version` | `questionVersionId` | `sourceContentHash` |

**Translation lookup key:** `(resourceType, resourceId, targetLocale, sourceContentHash)`

## 24. Generic vs domain-specific translation persistence

| Option | Verdict |
|--------|---------|
| A — Single generic `translations` table | Too opaque for structured payloads |
| B — Per-domain translation tables | Duplicates workflow/status/revision |
| **C — Localization-owned resource + revision + adapters** | **SELECTED** |

Localization stores workflow metadata and validated structured payloads. Adapters know how to extract/apply translatable fields from source modules.

## 25. Final translation unit model

**`translation_resources`** — one row per logical translatable resource binding:

- `resourceType` (enum)
- `resourceId` (UUID)
- `sourceLocale`
- `sourceVersionKey` (e.g. contentHash or sourceContentHash)
- `parishId` (nullable — for parish-scoped resources; null for system glossary)

**`translation_revisions`** — immutable revision per target locale + source version:

- `translationResourceId`
- `targetLocale`
- `sourceContentHash` (copy at translation time)
- `status` (enum — see §31)
- `payloadJson` (nvarchar MAX, ISJSON) — adapter-validated structured translation
- `providerId`, `providerModel`, `glossaryVersionId` (nullable)
- `createdByUserId`, `approvedByUserId`, timestamps
- Unique: `(translationResourceId, targetLocale, revisionNumber)` or latest-pointer pattern

**Latest approved revision** resolved at read time.

## 26. Structured payload design

Payloads mirror source shape with **only translatable fields** + preserved IDs:

```typescript
// Example: learning_content.document translation payload
{
  "blocks": [
    { "blockIndex": 0, "type": "heading", "text": "..." },
    { "blockIndex": 3, "type": "image_ref", "assetId": "...", "alt": "...", "caption": "..." }
  ]
}
```

**Rules:**
- Preserve block order indices or stable block IDs (future schema may add block IDs — design extensible)
- Never alter `assetId`, option IDs, correctness fields
- Validate via adapter before persist
- Max size bounded by source document limits

## 27. Resource adapter strategy

**`TranslationResourceAdapter` interface** (internal to LocalizationModule):

| Method | Purpose |
|--------|---------|
| `resourceType` | Enum value |
| `fetchSourceSnapshot(resourceId)` | Via owning module public API |
| `extractTranslatableUnits(snapshot)` | Flatten for provider |
| `buildPayload(translatedUnits)` | Structured payloadJson |
| `applyTranslation(source, payload)` | Merge for learner DTO |

**Adapters registered in LocalizationModule** at bootstrap — call **public APIs only**:

- `CurriculumService` — tree/metadata
- `LearningContentService` — document
- `QuestionBankService` — version snapshot

**No repository imports from other modules.**

## 28. sourceContentHash strategy

| Resource | Hash | Staleness trigger |
|----------|------|-------------------|
| Question version | `sourceContentHash` (existing) | Re-publish changes hash |
| Lesson content | `contentHash` (existing) | Upsert changes hash |
| Curriculum metadata | **New** `computeCurriculumMetadataHash(name, description)` | #002 |
| Topic/Lesson metadata | **New** composite per entity or tree-version hash | #004 |

When `translation_revision.sourceContentHash !== current source hash` → status becomes **`STALE`** (or flagged on read).

## 29. Question Bank hash reuse

**REUSE existing `sourceContentHash`** — do not duplicate.

Translation revision stores copy of hash at approval time. Practice grading continues to use source hash + option IDs — translation revision ID is display-only metadata for sessions.

## 30. Curriculum/LearningContent hash requirements

| Item | Action |
|------|--------|
| Lesson `contentHash` | **Reuse as-is** |
| Curriculum `name`/`description` | Add metadata hash utility in #002 |
| Topic/Lesson titles | Adapter computes hash from `(title, description/summary)` for staleness |
| Full tree bulk translate | Admin operation iterates adapters — not a single tree hash |

## 31. Translation status lifecycle

**Recommended enum:**

| Status | Meaning |
|--------|---------|
| `MISSING` | No revision for target locale |
| `QUEUED` | Job created, not started |
| `TRANSLATING` | Provider in progress |
| `MACHINE_TRANSLATED` | Provider finished, pending review |
| `REVIEWED` | Human edited, pending approval |
| `APPROVED` | Active for learner reads |
| `STALE` | Source hash changed since approval |
| `FAILED` | Provider/job error |

Read path uses latest `APPROVED` non-stale; otherwise fallback to source.

## 32. Translation revisions

**Immutable revision history required** — yes.

- Machine output creates new revision
- Human edit creates new revision
- Approval pins revision as active pointer
- Never silently overwrite approved revision — new source hash → `STALE` + new translation required

## 33. Human review/approval

**Policy:**

- Machine translation auto-accepted: **NO** for MVP — default to `MACHINE_TRANSLATED` requiring `APPROVED` for learner reads (configurable per parish later)
- Human-approved overrides machine permanently until stale
- Admin can edit payload before approval
- Audit: `approvedByUserId`, `approvedAt`

## 34. Staleness policy

On read:

1. Fetch latest `APPROVED` revision for `(resource, targetLocale)`
2. Compare `revision.sourceContentHash` with current source hash
3. If mismatch → mark `STALE`, fall back to source content, expose metadata

On source publish (Question Bank / curriculum publish hook — future event or explicit invalidation call):

- Localization service marks affected revisions `STALE` (batch by resourceType + resourceId)

## 35. Provider abstraction

**Interface:** `TranslationProvider` (internal)

```typescript
translateBatch(input: {
  units: TranslatableUnit[];
  sourceLocale: string;
  targetLocale: string;
  glossaryId?: string;
}): Promise<TranslatedUnit[]>;
```

- No Google SDK in business modules
- LocalizationModule owns provider selection, credentials, retry
- Mock provider for tests/CI

## 36. Google Cloud Translation Advanced mapping

**Future initial provider (#003):**

- Google Cloud Translation Advanced API (v3)
- Glossary support via Catholic glossary export
- Batch document translation for structured units
- Model identifier stored on revision for cache key

**Not configured in #001.** Design assumes batch translate, not per-field REST in GET path.

## 37. Credentials/config

Environment variables (backend only, never client):

- `TRANSLATION_PROVIDER` (default `mock` in dev/test)
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS` or workload identity
- Rate/cost limits configurable

Fail fast in production if provider=google and credentials missing.

## 38. Translation jobs

**`translation_jobs` table (proposed):**

- `id`, `translationResourceId`, `targetLocale`, `status`, `attemptCount`, `lastError`, `requestedByUserId`, timestamps
- Idempotency: one active job per `(resource, targetLocale, sourceContentHash)`

**Worker:** CLI/cron command `npm run localization:process-jobs` (#003) — no new infra required for MVP.

## 39. Queue/worker infrastructure audit

| Technology | Present |
|------------|---------|
| Redis | **No** |
| BullMQ / @nestjs/bull | **No** |
| SQS | **No** (only S3 SDK for media) |
| Cron/scheduler | **No** |
| Job tables | **No** |

**Decision:** DB-backed jobs + CLI worker for MVP. Revisit Redis/BullMQ only if job volume requires it (post-MVP).

## 40. Sync vs async decision

| Operation | Mode |
|-----------|------|
| Learner GET | **Sync read** — never waits for provider |
| Admin request translation | **Async job** |
| Bulk parish translate | **Async batch job** |
| Admin preview (optional) | Sync mock/small payload — rate limited |

## 41. GET/read-path policy

1. Resolve effective locale (§20)
2. Load source snapshot via adapter
3. Lookup approved translation revision
4. If valid → merge via adapter
5. If missing/stale/failed → **fallback to source** (GET must not fail)
6. Attach metadata (§43)

**Never call provider on GET.**

## 42. Fallback policy

When translation unavailable:

- Return **source language content**
- `isFallback: true`
- `resolvedLocale: sourceLocale`
- `translationStatus: 'SOURCE' | 'STALE' | 'MISSING'`

Client may show "not available in your language" using metadata.

## 43. Response metadata

**Standard learner content envelope** (extend Curriculum Delivery pattern):

| Field | Purpose |
|-------|---------|
| `requestedLocale` | What client asked for |
| `resolvedLocale` | What content language is |
| `sourceLocale` | Authoring language |
| `translationStatus` | `SOURCE` \| `APPROVED` \| `MACHINE_TRANSLATED` \| `STALE` \| `MISSING` |
| `isFallback` | boolean |
| `translationRevisionId` | optional UUID for cache/debug |
| `sourceContentHash` / `contentHash` | cache invalidation |

## 44. Accept-Language/query locale contract

| Channel | Mechanism |
|---------|-----------|
| Learner reads | `Accept-Language` primary |
| Admin preview | `?locale=en-US` (requires `localization.read`) |
| Authenticated user | `preferredLocale` in resolution chain |

Validate all through `parseSourceLocale()`. Reject malformed with 400 on explicit query; ignore malformed Accept-Language tags individually.

## 45. Dependency graph options

| Option | Verdict |
|--------|---------|
| Localization wrapper endpoints duplicating delivery | Rejected — duplicates Curriculum Delivery |
| Localized delivery facade module | Rejected — unnecessary third module |
| Source modules call Localization | Rejected — pushes resolution into authoring modules |
| **CurriculumDelivery + Practice integrate LocalizationService** | **Partial** |
| **Adapter registry inside Localization; delivery modules call in** | **SELECTED** |

## 46. Final dependency-direction decision

```
UsersModule ──────────────┐
ParishModule ─────────────┤
CurriculumModule ─────────┼──► LocalizationModule ──► TranslationProvider (Google/mock)
LearningContentModule ────┤         ▲
QuestionBankModule ───────┘         │
                                    │
CurriculumDeliveryModule ───────────┘ (calls LocalizationService on read)
PracticeModule ─────────────────────┘ (future: snapshot at session create)
LearningProgressModule ─────────────── (no dependency)
```

**Rules:**
- Localization **may import** public exports of Curriculum, LearningContent, QuestionBank, Users, Parish
- Curriculum/QuestionBank/LearningContent **must NOT import** Localization
- CurriculumDelivery **may import** Localization (learner read integration #004)
- Move `parseSourceLocale` to shared path in #002 to reduce Curriculum-as-util-host

## 47. Existing endpoint integration strategy

| Endpoint | Integration |
|----------|-------------|
| `GET .../curriculum-tree` | #004 — localize curriculum/topic/lesson metadata fields |
| `GET .../lessons/:id/content` | #004 — localize structured document |
| Practice session create | #004 — attach `translationRevisionId` per question in snapshot |
| Question Bank admin CRUD | Unchanged source editing |
| Learning Progress APIs | No change |

**No new parallel learner content routes** — extend existing Curriculum Delivery responses.

## 48. Admin translation API concept

**Prefix:** `/api/v1/localization/...` (#005)

| Operation | Description |
|-----------|-------------|
| List resources | Filter by status, locale, resourceType, parish |
| Request translation | Queue job for resource + targetLocale |
| Get revision | View payload + status |
| Edit revision | Human corrections pre-approval |
| Approve revision | Promote to active |
| Retry failed | Re-queue job |
| Bulk translate | Parish-scoped batch |

## 49. RBAC/authorization concept

**Permissions (proposed #002 seeds):**

| Code | Scope |
|------|-------|
| `localization.read` | View status/revisions |
| `localization.manage` | Request/edit translations |
| `localization.approve` | Approve for learner use |

| Role | Grants |
|------|--------|
| SUPER_ADMIN | all |
| PARISH_ADMIN | read/manage/approve within parish |
| CATECHIST | read only (optional) |
| PARENT | none |

Parish scope enforced on parish-owned content resources.

## 50. Parish/tenant scope

- Curriculum/Question Bank already parish-scoped
- Translation resources inherit `parishId` from source
- Cross-parish translation reuse: **denied by default** — same source in two parishes gets separate translation rows
- System Catholic glossary: global (`parishId = null`)

## 51. Cross-parish reuse decision

**NO automatic cross-parish reuse** for MVP.

Rationale: parish may customize glossary overrides later; audit trail per parish. Future optimization: optional shared translation pool for identical `sourceContentHash` — deferred.

## 52. Catholic terminology glossary

**`catholic_glossary_versions`** + **`catholic_glossary_terms`**

| Field | Purpose |
|-------|---------|
| `sourceLocale`, `targetLocale` | Pair |
| `term`, `translation`, `notes` | Human-governed |
| `versionNumber` | Immutable version |
| `status` | DRAFT / PUBLISHED |

System-global first. Parish overrides deferred unless required in #003.

**Do not hardcode sample terms** in migrations — seed demo terms in dev seed only.

## 53. Glossary versioning/provider mapping

- Active published glossary version per locale pair
- Provider batch calls include `glossaryConfig` reference
- Revision stores `glossaryVersionId` used
- Changing glossary does not auto-invalidate old translations — admin may bulk re-translate

## 54. PII/provider privacy

**Never send to provider by default:**

- User names, emails, student profiles
- Practice answers, free text responses
- Learning Progress records
- Pastoral/private notes
- Auth tokens

**In scope:** authored educational content only (curriculum, lesson blocks, question prompts/explanations/options).

Private chat translation: **out of scope** — future privacy review required.

## 55. Machine translation content scope

| In scope | Out of scope |
|----------|--------------|
| Curriculum metadata | User-generated answers |
| Lesson blocks | Chat messages |
| Question prompt/explanation/options | Student names |
| Media alt/caption in documents | Pastoral notes |

## 56. Question correctness preservation

**Invariant:** Translation must never change:

- Option UUIDs
- `correctOptionIds` / answer definition
- Option internal `code` used by grading
- `sourceContentHash` grading path

Adapter validates post-translation structure matches source IDs. Practice grading unchanged.

## 57. Practice snapshot future impact

At session creation (#004):

- Store `translationRevisionId` per session question (nullable)
- Store session `locale` (existing)
- Replay/regrade uses original revision + source hash — not latest translation

Review-wrong sessions inherit source session translation snapshots.

## 58. Exam snapshot future impact

Future Exam module should snapshot:

- `questionVersionId`
- `sourceContentHash`
- `translationRevisionId`
- `locale`

Never on-demand translate during active exam attempt.

## 59. Learning Progress behavior

No changes. Status enums remain locale-neutral strings. FE translates labels client-side.

## 60. Translation cache design

**Cache key:**

```
(resourceType, resourceId, sourceContentHash, targetLocale, providerModel, glossaryVersionId)
```

- Skip provider call if approved revision exists for key
- In-memory LRU optional in API process (post-MVP)
- DB is source of truth

## 61. Cost controls

- Batch translation requests
- Dedupe by cache key
- Rate limit admin translate endpoints
- Max payload size per job (align with 256 KB lesson cap)
- Audit log job counts per parish (no content in logs)

## 62. Unicode/MSSQL audit

| Field type | Usage | Verdict |
|------------|-------|---------|
| `nvarchar` / `nvarchar(max)` | Question prompts, lesson JSON, translation payloads | **Correct** |
| `varchar` | Hashes, locale tags, codes | **Correct** |
| ISJSON constraints | `contentJson`, translation `payloadJson` | **Required on translation table** |

Vietnamese diacritics supported. Existing curriculum/QB schema already uses `nvarchar` for text.

## 63. Text size/storage audit

| Limit | Value |
|-------|-------|
| Lesson document | 256 KB |
| Question prompt | 2000 chars |
| Option text | 512 chars |
| Translation payload | Same bounds as source — adapter enforces |

No truncation — reject oversize at validation.

## 64. Backfill/migration strategy

| Change | Strategy |
|--------|----------|
| Localization tables | Create empty in #002 migration |
| `users.preferredLocale` | Nullable — no forced backfill |
| `parishes.defaultLocale` | Nullable — no forced backfill |
| Existing demo content | Remains `vi-VN` source — do not auto-translate |
| Production | Admin-triggered translation only |

**Do not** mass-backfill all content as `vi-VN` translated — source already is `vi-VN`.

## 65. FE contract impact

- UI strings: **client-side i18n** (React i18n / mobile bundles)
- Domain content: backend locale-aware delivery endpoints
- Cache keys must include: `locale + contentHash/translationRevisionId`
- Display fallback UX when `isFallback: true`
- Admin translation UI consumes `/api/v1/localization/*` (#005)

## 66. Mobile/offline contract impact

- Download lesson content with locale metadata for offline cache
- Retry same PATCH/translate irrelevant — reads are GET
- Offline stale detection via `contentHash` + `translationRevisionId`
- No provider secrets on device

## 67. Search/export/import deferred decisions

| Feature | Decision |
|---------|----------|
| Question search by translated text | Defer post-#005 |
| Export package localized | Export source + translation revisions as optional bundle — #005 |
| Import translated package | #005+ |
| Curriculum list filter by locale | Existing `sourceLocale` filter sufficient for MVP |

## 68. Security threat model

| Threat | Mitigation |
|--------|------------|
| Cross-parish translation leakage | `parishId` on resources + scope checks |
| Provider credential exposure | Backend env only; never log |
| Prompt/content injection via translation | Adapter schema validation; no HTML execution |
| Script/HTML in translated payload | Structured blocks only; sanitize text fields |
| Semantic corruption (wrong glossary) | Human approval; Catholic glossary |
| Job/cost abuse | RBAC + rate limits + batch caps |
| Oversized payload DoS | Size limits aligned with source |
| Locale header abuse | Validate/limit Accept-Language tags |
| Logging full content | Log resource IDs/status only |

## 69. Testing strategy

| Layer | Focus |
|-------|-------|
| Unit | Locale resolution, adapter extract/apply, hash staleness, payload validation |
| Migration | Translation tables, user/parish locale columns |
| Integration | Job lifecycle, idempotency, approval, glossary mapping |
| DB e2e | Curriculum Delivery localized read, fallback, cross-parish deny |
| Provider mock | No live Google in CI |
| Regression | Source modules unchanged behavior when Localization disabled |

## 70. Demo/seed strategy

**#006 final gate:**

- Extend demo chain: existing curriculum-demo (`vi-VN`) + optional `en-US` approved translation for one lesson + one question
- Dev seed via `LocalizationService` public methods
- Postman: Accept-Language `en-US` shows translation; fallback demo

Not implemented in #001.

## 71. Performance/scalability

| Concern | MVP | Future |
|---------|-----|--------|
| Translation lookup | Indexed by `(resourceType, resourceId, targetLocale)` | Read replica |
| Bulk class translate | Admin async jobs | Worker pool |
| Curriculum tree localization | Per-request merge in Delivery | CDN edge cache |
| Provider latency | Never on GET path | — |

**MEDIUM:** Large curriculum tree localization may add latency — acceptable if single batch revision fetch per request.

## 72. Microservice extraction

Future **Localization Service** owns translation tables, jobs, glossary, provider.

Consumes: Curriculum API, Question Bank API, Learning Content API (HTTP).

Current boundary: `LocalizationService` + adapter registry + Delivery integration.

## 73. Risks/open questions

| ID | Risk | Severity |
|----|------|----------|
| R1 | Block ID absence in ContentDocumentV1 complicates partial re-translate | MEDIUM — use blockIndex for MVP |
| R2 | Naive Accept-Language parser in Delivery | HIGH — fix in #004 |
| R3 | No job infra — DB worker may lag under bulk load | MEDIUM |
| R4 | Approval workflow UX complexity for parish admins | MEDIUM |
| R5 | `parseSourceLocale` living in Curriculum module | LOW — move #002 |
| R6 | Question tag translation priority low | LOW |

## 74. BLOCKER/HIGH/MEDIUM/LOW

| Severity | Count | Items |
|----------|-------|-------|
| BLOCKER | **0** | — |
| HIGH | **0** (design resolves) | R2 scheduled #004 |
| MEDIUM | **4** | R1, R3, R4, tree localization perf |
| LOW | **2** | R5, R6 |

All HIGH items have planned prompt assignment — no #001 blockers.

## 75. Required schema changes (#002+)

| Table/Column | Prompt |
|--------------|--------|
| `translation_resources` | #002 |
| `translation_revisions` | #002 |
| `translation_jobs` | #003 |
| `catholic_glossary_versions` | #003 |
| `catholic_glossary_terms` | #003 |
| `users.preferred_locale` | #002 |
| `parishes.default_locale` | #002 |

No changes to Practice/Learning Progress tables.

## 76. Required source-module additive changes

| Module | Change | Prompt |
|--------|--------|--------|
| Users | `preferredLocale` column + DTO | #002 |
| Parish | `defaultLocale` column + DTO | #002 |
| Curriculum | metadata hash utility (optional column deferred) | #002 |
| Curriculum Delivery | integrate LocalizationService | #004 |
| Question Bank | export snapshot method for adapter if missing | #004 |
| Practice | snapshot `translationRevisionId` on session questions | #004 |

## 77. Files created (#001)

| Path | Purpose |
|------|---------|
| `docs/LOCALIZATION_001_CROSS_DOMAIN_AUDIT_AND_MODEL_DESIGN_REPORT.md` | This report |

## 78. Files modified (#001)

**None** — audit/design only per prompt.

## 79. Commands

| Command | Result |
|---------|--------|
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS (537 tests) |
| `npm run test:e2e` | PASS (5 tests) |
| `npm run build` | PASS |

## 80. Validation

Audit-only validation complete. No schema or production code changes — repo remains green.

## 81. Out-of-scope (#001)

Production entities, migrations, controllers, services, providers, permissions, seeds, Docker, Postman, provider credentials, Exam module, Learning Progress changes, auto-translation on GET.

## 82. Final prompt count recommendation

**FINAL RECOMMENDED PROMPT COUNT: 6**

| Prompt | Scope |
|--------|-------|
| **#001** | Cross-domain audit + model design (**this report**) |
| **#002** | Locale preferences (user/parish) + translation persistence schema + LocalizationModule skeleton |
| **#003** | Provider abstraction (mock + Google stub) + DB jobs + Catholic glossary foundation |
| **#004** | Resource adapters + Curriculum Delivery + Question Bank localized read integration + Practice snapshot fields |
| **#005** | Admin/review/approve APIs + RBAC seeds + FE/Mobile contract hardening + export/import decisions |
| **#006** | Final audit + demo seed + Postman + quality:full + Docker + phase completion |

Provisional 6-prompt plan **confirmed** — no reduction justified.

## 83. LOCALIZATION #002 readiness

**READY: YES**

Proposed #002 scope:

1. `LocalizationModule` skeleton (no provider yet)
2. Migrations: `translation_resources`, `translation_revisions`
3. `users.preferred_locale`, `parishes.default_locale`
4. `LocaleResolutionService` + move/share locale util
5. Permission seed stubs (inactive until #005) OR full seeds if simpler
6. Entity/repository tests + migration integration tests

Do not auto-proceed without explicit user prompt.

## 84. Commit recommendation

No production code changed. Report only (gitignored `docs/`).

When #002+ implementation is committed later:

```bash
git commit -m "feat(localization): add locale preferences and translation persistence foundation"
```

---

## Translatable resource matrix (summary)

| resourceType | resourceId | version key | sourceLocale | hash |
|--------------|------------|-------------|--------------|------|
| `curriculum.metadata` | curriculumId | metadataHash | curriculum.sourceLocale | new |
| `curriculum.version` | curriculumVersionId | versionNumber | inherited | new |
| `curriculum.topic` | topicId | curriculumVersionId | inherited | new |
| `curriculum.lesson` | canonicalLessonKey | curriculumVersionId | inherited | new |
| `learning_content.document` | lessonId | contentHash | inherited | **exists** |
| `question_bank.version` | questionVersionId | sourceContentHash | question.sourceLocale | **exists** |

---

## Explicit PASS/FAIL matrix (audit)

All design gates: **PASS** | Implementation gates: deferred to #002–#006
