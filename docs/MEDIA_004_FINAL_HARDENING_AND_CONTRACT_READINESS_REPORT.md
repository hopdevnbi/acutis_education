# MEDIA #004 — Final Hardening and Contract Readiness Report

**Phase:** FILE / MEDIA STORAGE ABSTRACTION #004 / 4  
**Date:** 2026-08-31  
**Status:** IMPLEMENTATION COMPLETE  
**Prompt:** FILE/MEDIA #004 (final hardening, contextual learner delivery, Docker volume, FE/mobile contract)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| CONTEXTUAL LEARNER MEDIA READY | **YES** |
| FE MEDIA CONTRACT READY | **YES** |
| MOBILE MEDIA CONTRACT READY | **YES** |
| UPLOAD HARDENING READY | **YES** |
| DOCKER LOCAL VOLUME READY | **YES** |
| MODULE BOUNDARY COMPLIANT | **YES** |
| quality:full (pristine DB) | **PASS** |
| Docker production build | **PASS** (`wsl docker build --target production -t catechism-api:media-final .`) |
| S3 live smoke | **NOT CONFIGURED** (no AWS credentials in environment) |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**Recommendation:** FILE / MEDIA storage abstraction phase is complete. Proceed to **QUESTION BANK / ASSESSMENT CONTENT FOUNDATION** (next backend phase; do not auto-implement).

---

## Completion block

```
FILE / MEDIA STORAGE ABSTRACTION PHASE COMPLETE
LOCAL STORAGE PROVIDER READY: YES
S3 STORAGE PROVIDER READY: YES
FE MEDIA CONTRACT READY: YES
MOBILE MEDIA CONTRACT READY: YES
SAFE LOCAL→S3 MIGRATION FOUNDATION READY: YES
```

---

## 1. Objective

Close the learner media access gap, harden upload limits/throttling, persist uploads across Docker restarts, document the FE/mobile contract, and produce a clean `quality:full` gate on pristine DB.

## 2. State inherited from #003

- Admin upload/read HTTP API with RBAC and curriculum asset validation
- Generic `GET /api/v1/media/assets/:id/content` limited to admin/uploader roles
- CATECHIST/PARENT denied arbitrary asset-by-ID reads
- No contextual learner routes; lesson JSON stored `assetId` only

## 3. #003 carry-over fixes

- Integration test FK cleanup: `parish_memberships` deleted before `parishes` in `parish-academic-seed.integration-spec.ts`
- Curriculum delivery e2e: setup role granted `media.upload`; `media_assets` cleanup before user delete; distinct email localParts for setup vs role users; case-insensitive UUID assertion for `mediaContentPath`

## 4. Rules applied

- `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/*`
- Modular monolith: `CurriculumDeliveryModule` imports `MediaModule` public export only (`MediaAssetService`)
- Minors privacy: contextual scope checks before streaming; no public asset URLs
- English source; no secrets committed

## 5. Files created

| Path | Purpose |
|------|---------|
| `src/modules/curriculum-delivery/utils/learner-media-content-path.util.ts` | Build contextual content URLs |
| `src/modules/curriculum-delivery/utils/contextual-media-response.util.ts` | Stream response headers |
| `src/modules/curriculum-delivery/interfaces/learner-delivery-content.interface.ts` | Enriched learner document types |
| `docs/postman/Acutis-Education-Media.postman_collection.json` | Postman collection for media + contextual routes |

## 6. Files modified

| Path | Change |
|------|--------|
| `src/modules/curriculum-delivery/controllers/curriculum-delivery.controller.ts` | Contextual media content routes |
| `src/modules/curriculum-delivery/services/curriculum-delivery.service.ts` | `getClassLessonMediaContent`, `getEnrollmentLessonMediaContent` |
| `src/modules/curriculum-delivery/curriculum-delivery.module.ts` | Import `MediaModule` |
| `src/modules/curriculum-delivery/errors/curriculum-delivery.errors.ts` | `ContextualMediaAssetNotReferencedError` |
| `src/modules/curriculum-delivery/mappers/curriculum-delivery-response.mapper.ts` | `mediaContentPath` enrichment |
| `src/modules/curriculum-delivery/utils/curriculum-delivery-http.util.ts` | Map media + contextual errors |
| `src/modules/curriculum-delivery/services/curriculum-delivery.service.spec.ts` | Contextual media unit tests |
| `src/modules/learning-content/utils/content-media-reference.util.ts` | `documentReferencesMediaAsset()` |
| `src/modules/media/constants/media-upload.constants.ts` | `MULTIPART_UPLOAD_MAX_BYTES`, throttle constants |
| `src/modules/media/controllers/media-asset.controller.ts` | Reduced interceptor limit; upload throttle |
| `src/modules/auth/auth.module.ts` | `media-upload` throttler profile |
| `docker-compose.yml` | `MEDIA_LOCAL_ROOT`, `media-uploads` volume |
| `Dockerfile` | `/app/storage/uploads` mkdir + chown (dev + production) |
| `README.md` | Media storage + route contract section |
| `test/curriculum-delivery.db.e2e-spec.ts` | Contextual media e2e + fixture/content options |
| `test/media.db.e2e-spec.ts` | Oversized multipart → 413 e2e |
| `test/integration/parish-academic-seed.integration-spec.ts` | FK-safe parish cleanup |

## 7. Final dependency graph

```
CurriculumDeliveryModule → MediaModule (MediaAssetService)
CurriculumDeliveryModule → ClassModule, EnrollmentModule, CurriculumModule, LearningContentModule (existing)
MediaModule ↛ CurriculumDeliveryModule
LearningContentModule → MediaModule (MediaAssetService)
```

## 8. Module boundary audit

No TypeORM entities or repositories cross module boundaries. Contextual streaming delegates to `MediaAssetService.assertAssetReady` + `openAssetContent` after delivery-layer scope and document-reference checks.

## 9. Contextual learner media routes

| Route | Permission | Scope |
|-------|------------|-------|
| `GET /api/v1/classes/:classId/lessons/:lessonId/media/:assetId/content` | `lesson-content.read` | Assigned catechist / parish admin |
| `GET /api/v1/enrollments/:enrollmentId/lessons/:lessonId/media/:assetId/content` | `lesson-content.read` | Linked parent / enrolled learner context |

Flow: scope assertion → published assigned version → lesson in version → `documentReferencesMediaAsset` → `assertAssetReady` → `openAssetContent`.

Unreferenced asset in lesson document → **403** (`ContextualMediaAssetNotReferencedError`).

## 10. Generic vs contextual access policy

| Audience | Arbitrary asset by ID | Contextual lesson route |
|----------|----------------------|-------------------------|
| PARISH_ADMIN | ✓ (`media.read`) | ✓ (scope) |
| CATECHIST (assigned) | ✗ | ✓ |
| PARENT (linked) | ✗ | ✓ |
| Unrelated user | ✗ | ✗ |

## 11. Learner URL contract (`mediaContentPath`)

Lesson content responses enrich `image_ref` / `video_ref` blocks with derived `mediaContentPath` (not persisted in DB JSON):

```json
{
  "type": "image_ref",
  "assetId": "<uuid>",
  "alt": "Lesson photo",
  "mediaContentPath": "/api/v1/classes/<classId>/lessons/<lessonId>/media/<assetId>/content"
}
```

Enrollment responses use `/api/v1/enrollments/...` prefix. Clients should treat UUID segments as case-insensitive.

## 12. FE contract notes

- Fetch lesson content first; use `mediaContentPath` for binary fetch (same JWT)
- Do not construct generic `/api/v1/media/assets/:id/content` URLs for learners
- Handle 403 when asset not referenced in published lesson
- `Cache-Control: private, no-store` on streams — do not cache in shared stores

## 13. Mobile contract notes

- Same as FE; relative paths work with configured API base URL
- Use authenticated GET; no presigned public URLs in MVP
- Binary responses: honor `Content-Type` and `Content-Disposition`
- Deferred: HTTP Range for video (see §26)

## 14. Upload hardening — multipart memory cap

`MULTIPART_UPLOAD_MAX_BYTES = DEFAULT_MEDIA_MAX_DOCUMENT_BYTES + 65_536` (~25 MiB + margin).  
`FileInterceptor` limit aligned (was 100 MiB). Oversized request rejected at middleware → **413** (e2e verified).

## 15. Upload hardening — throttle

Dedicated `media-upload` throttler: **30 requests / 60s** per IP on `POST /api/v1/media/assets`. Response headers expose limit/remaining/reset.

## 16. Enabled upload categories (unchanged MVP)

IMAGE (jpeg, png, webp) and DOCUMENT (pdf) only. AUDIO/VIDEO upload remains disabled.

## 17. Docker Compose volume

```yaml
environment:
  MEDIA_LOCAL_ROOT: /app/storage/uploads
volumes:
  - media-uploads:/app/storage/uploads
```

Uploads survive container recreation.

## 18. Dockerfile permissions

Both `development` (`node`) and `production` (`catechism`) targets:

```dockerfile
RUN mkdir -p /app/storage/uploads && chown -R <user>:<user> /app/storage/uploads
```

Production build verified via WSL.

## 19. Postman collection

`docs/postman/Acutis-Education-Media.postman_collection.json` — admin upload/read + contextual learner examples.

## 20. README updates

New "Media storage (local-first)" section documents env vars, enabled types, Docker volume, S3 switch notes, and route matrix.

## 21. Shared util — document reference check

`documentReferencesMediaAsset(document, lessonId, assetId)` centralizes "is this asset referenced in this lesson's published document?" for delivery authorization.

## 22. HTTP Range support

**Deferred.** Not required while VIDEO upload disabled.

## 23. DELETE / soft-delete admin API

**Omitted** per phase scope.

## 24. S3 live verification

S3 provider code path exists from #002; no live AWS bucket configured in this environment. Reported as **NOT CONFIGURED** — not a blocker for local-first MVP.

## 25. Local → S3 migration foundation

Per-asset `storage_provider` column + registry from #002; production rejects `auto` fallback and per-request S3→local fallback. New uploads follow active provider config; existing rows read via stored provider.

## 26. Curriculum integration with real uploads

Publish flow validates assets via `MediaAssetService` (#003). Contextual e2e uploads real JPEG, publishes lesson with `image_ref`, verifies learner stream — end-to-end path covered in `curriculum-delivery.db.e2e-spec.ts`.

## 27. Test coverage added

| Layer | Tests |
|-------|-------|
| Unit | `curriculum-delivery.service.spec.ts` — contextual media happy/deny paths |
| DB e2e | Contextual catechist + parent enrollment media; generic deny |
| DB e2e | `media.db.e2e-spec.ts` — oversized upload 413 |
| Integration | `parish-academic-seed` FK cleanup fix |

## 28. Validation matrix

| Gate | Result |
|------|--------|
| format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit (`npm test`) | PASS |
| DB-free e2e | PASS |
| build | PASS |
| test:db:migrations | PASS |
| test:integration | PASS (140) |
| test:e2e:db | PASS (68) |
| quality:full ONE CLEAN RUN | PASS |
| Docker production build | PASS |

## 29. Known deferred items

- HTTP Range for video streaming
- AUDIO/VIDEO upload enablement
- Public DELETE / lifecycle admin API
- Live S3 smoke test (needs credentials)
- Malware scanning, CDN, presigned upload URLs

## 30. Out of scope

Question bank, assessment content, frontend/mobile implementation, chat attachments.

## 31. Git rule compliance

No `git add`, commit, or push executed by agent.

## 32. Commit recommendation

When ready to commit (not executed by agent):

```bash
git commit -m "feat(media): finalize storage abstraction"
```

---

## 33–66. Section index (audit parity with prompt template)

| § | Topic | Status |
|---|-------|--------|
| 33 | Contextual class route | DONE |
| 34 | Contextual enrollment route | DONE |
| 35 | Scope enforcement | DONE |
| 36 | Document reference gate | DONE |
| 37 | Asset ready gate | DONE |
| 38 | Stream headers | DONE |
| 39 | mediaContentPath mapper | DONE |
| 40 | Learner DTO types | DONE |
| 41 | Generic learner deny (e2e) | DONE |
| 42 | Multipart cap | DONE |
| 43 | Upload throttle | DONE |
| 44 | Compose volume | DONE |
| 45 | Dockerfile uploads dir | DONE |
| 46 | Postman | DONE |
| 47 | README contract | DONE |
| 48 | Unit tests | DONE |
| 49 | Integration isolation fix | DONE |
| 50 | DB e2e contextual | DONE |
| 51 | DB e2e oversized | DONE |
| 52 | Module boundary | PASS |
| 53 | No forwardRef added | PASS |
| 54 | Minors privacy | PASS |
| 55 | No secrets in repo | PASS |
| 56 | English source | PASS |
| 57 | quality:full | PASS |
| 58 | Docker build | PASS |
| 59 | S3 code ready | YES (not live-tested) |
| 60 | Local provider ready | YES |
| 61 | FE contract | YES |
| 62 | Mobile contract | YES |
| 63 | Migration foundation | YES |
| 64 | BLOCKER count | 0 |
| 65 | HIGH count | 0 |
| 66 | Phase complete | YES |

---

## Final response summary

- **FILE/MEDIA #004:** COMPLETE  
- **Contextual learner media:** PASS  
- **Upload hardening:** PASS  
- **Docker volume + build:** PASS  
- **quality:full:** PASS (68 DB e2e, 140 integration)  
- **S3 live smoke:** NOT CONFIGURED  
- **BLOCKER/HIGH:** 0  
- **Next phase:** Question Bank / Assessment Content Foundation
