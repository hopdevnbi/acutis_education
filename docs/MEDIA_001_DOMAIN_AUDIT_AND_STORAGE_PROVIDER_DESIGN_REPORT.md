# MEDIA #001 — Domain Audit and Storage Provider Design Report

**Phase:** FILE / MEDIA STORAGE ABSTRACTION #001 / 4  
**Date:** 2026-08-30  
**Status:** AUDIT/DESIGN COMPLETE — NO IMPLEMENTATION  
**Prompt:** `Prompt base/07. FILEMEDIA/MEDIA_001_DOMAIN_AUDIT_AND_STORAGE_PROVIDER_DESIGN.txt`

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| MEDIA STORAGE ABSTRACTION DESIGN READY | **YES** |
| LOCAL PROVIDER DESIGN READY | **YES** |
| S3 PROVIDER DESIGN READY | **YES** |
| SAFE LOCAL/S3 SWITCHING STRATEGY | **YES** |
| CURRICULUM ASSET INTEGRATION PATH READY | **YES** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**Recommendation:** Proceed to **FILE/MEDIA #002/4 — Schema + MediaModule + Local/S3 Provider Foundation**.

---

## 1. Objective

Design a reusable **Media** bounded context that stores binary objects behind a provider abstraction, supports **local filesystem** (default) and **AWS S3** (when configured), persists metadata in MSSQL, and exposes a narrow public API so Curriculum, future Question Bank, Chat, Class Materials, and avatars reference stable `assetId` values without knowing storage backend details.

This prompt is **audit/design only**. No schema, module, or API code was added.

---

## 2. State inherited from Curriculum

From CURRICULUM #006 completion:

- Content block schema v1 includes `image_ref` and `video_ref` blocks with UUID `assetId`.
- Validator currently checks **UUID format only** — no Media module existence, MIME, or READY status.
- Demo seed content uses text blocks only; no real uploaded assets yet.
- Learner delivery returns content JSON as stored; clients would resolve `assetId` via future Media read API.
- Platform serves minors: private-by-default, authenticated access, no public child media profiles.
- Modular monolith boundaries are enforced (`module-boundaries.spec.ts`); new module must follow same export rules.

---

## 3. Existing asset/media reference audit

| Location | Current behavior |
|----------|------------------|
| `learning-content/interfaces/learning-content.interface.ts` | `ImageRefBlock.assetId`, `VideoRefBlock.assetId` (UUID) |
| `learning-content/utils/content-document-v1.validator.ts` | `parseAssetId()` — UUID v4 only via `isUuidV4` |
| `learning-content/dto/content-document-v1.dto.ts` | Swagger examples with placeholder UUIDs |
| `src/modules/*` (excluding learning-content) | **No** media/storage/file modules |
| `src/database/` | **No** `media_assets` table or migration |
| `package.json` | **No** AWS SDK or multer dependencies |
| `.env.example` | **No** media/S3 variables |
| `docker-compose.yml` | **No** upload volume mounted on API service |
| Auth RBAC seed | `lesson-content.read/manage` only; **no** `media.*` permissions yet |

**Gap:** Curriculum can reference arbitrary UUIDs that do not correspond to stored objects. MEDIA #003 will add optional publish-time asset validation through public `MediaAssetService`.

---

## 4. Rules applied

- `PROJECT_RULES.md` — modular monolith, strict TypeScript, no secrets in Git, minors privacy, migration-driven schema, English naming.
- `AGENTS.md` — scope-limited task, report in `docs/`, no commit unless requested.
- `.cursor/rules/*` — security for minors, module boundaries, engineering baseline.
- User reliability rule: **no silent per-request S3→local failover in production**.

---

## 5. Module naming decision

| Candidate | Decision |
|-----------|----------|
| `StorageModule` | Rejected — too infrastructure-generic, unclear domain |
| `FileModule` | Rejected — implies filesystem-only |
| `FileMediaModule` | Rejected — redundant compound name |
| **`MediaModule`** | **Selected** — domain term for assets reused across features |

Internal implementation detail (not exported): `StorageProvider` interface with `LocalStorageProvider` and `S3StorageProvider`.

---

## 6. Module boundary

**Owns:**

- Table: `media_assets`
- Entity: `MediaAssetEntity`
- Services: `MediaAssetService` (public), provider implementations (internal)
- Controllers: upload/read/delete HTTP surface (#003)
- Config: `media.configuration.ts` (#002)

**Public exports:**

- `MediaAssetService` only (plus HTTP controllers registered on module, not exported)

**Does NOT export:**

- TypeORM module, entities, repositories, `StorageProvider`, AWS SDK types, fs paths

**Inbound dependencies (via public APIs only):**

- `UsersModule` — uploader identity (`createdByUserId`)
- `AccessControlModule` — RBAC (#003)
- `AuthModule` — JWT guards (#003)

**Outbound:** None into Curriculum/Class/Enrollment repositories. Owning domains call Media; Media never queries business tables.

**Future extraction:** Media Service microservice owns `media_assets` + object storage; other services use HTTP/gRPC with `assetId`.

---

## 7. StorageProvider interface

Internal narrow contract (TypeScript interface in `media/providers/storage-provider.interface.ts`):

```typescript
interface PutObjectInput {
  readonly storageKey: string;
  readonly body: Buffer | Readable;
  readonly contentType: string;
  readonly contentLength: number;
}

interface PutObjectResult {
  readonly etag?: string;
}

interface GetObjectResult {
  readonly body: Readable;
  readonly contentType: string;
  readonly contentLength: number;
}

interface StorageProvider {
  readonly providerId: 'local' | 's3';
  putObject(input: PutObjectInput): Promise<PutObjectResult>;
  getObject(storageKey: string): Promise<GetObjectResult>;
  deleteObject(storageKey: string): Promise<void>;
  exists?(storageKey: string): Promise<boolean>;
  createReadUrl?(storageKey: string, expiresInSeconds: number): Promise<string>;
}
```

No AWS SDK types, `fs` handles, or Express types in this interface.

---

## 8. Local provider

**Class:** `LocalStorageProvider`

- Root: `MEDIA_LOCAL_ROOT` resolved to absolute path (default `./storage/uploads`).
- Create root at startup if missing (mode `0700` for dir where OS allows).
- Object keys: opaque generated paths only (see §19).
- Writes: atomic where practical (temp file + rename).
- Reads: stream via `fs.createReadStream` with resolved path guard.
- Deletes: unlink after path guard.
- **Path guard:** reject `..`, absolute segments, null bytes; resolve and verify `resolved.startsWith(root + sep)`.
- **Symlink:** use `realpath`/`lstat` check — resolved target must remain under root.

---

## 9. S3 provider

**Class:** `S3StorageProvider`

- Uses `@aws-sdk/client-s3` (#002 dependency).
- Bucket, region, optional custom endpoint (MinIO/R2/Spaces path-style).
- Credentials: env keys in dev; **IAM role / instance profile in production** (empty explicit keys).
- `putObject`, `getObject`, `deleteObject` via SDK commands.
- Optional `createReadUrl` via `@aws-sdk/s3-request-presigner` for private reads (#003).
- Prefix: `MEDIA_S3_PREFIX` (e.g. `catechism/dev/`).
- Do not log credentials, presigned URLs with tokens, or full object keys containing PII.

**Compatibility note:** S3-compatible endpoints supported via config; full MinIO compatibility requires dedicated integration tests (#004), not promised in #002.

---

## 10. Provider selection

**Config:** `MEDIA_STORAGE_PROVIDER=local|s3|auto`

| Value | Behavior |
|-------|----------|
| `local` | Always `LocalStorageProvider` |
| `s3` | Require complete valid S3 config; fail startup if invalid |
| `auto` | Dev convenience: if S3 config complete **and** readiness probe passes → S3; else local. **Disallowed in production** (fail startup if `auto` in `NODE_ENV=production`). |

**Default when unset:** `local` (safe local-first).

**Production recommendation:** explicit `local` or `s3`, never `auto`.

Provider instance selected **once at module bootstrap** (factory provider in Nest DI), not per HTTP request.

---

## 11. Production fallback

If `MEDIA_STORAGE_PROVIDER=s3`:

- All new uploads go to S3.
- S3 operation failure → throw typed `MediaStorageUnavailableError` (retryable 503 class).
- **Never** silently write to local disk in production.

If `MEDIA_STORAGE_PROVIDER=local`:

- All new uploads go to local filesystem.
- Multi-replica production with local is **unsupported** — document as dev/single-node only.

---

## 12. Development fallback

Optional startup-only fallback:

```
MEDIA_STORAGE_ALLOW_LOCAL_FALLBACK=true
NODE_ENV != production
MEDIA_STORAGE_PROVIDER=s3 (requested but S3 probe failed)
```

→ Log warning, bootstrap with `LocalStorageProvider` for **new** uploads.

Existing assets still read via per-record `storage_provider` (§14).

**Never** enable in production.

---

## 13. Per-request fallback decision

**Rejected.**

Per-request S3→local failover causes split-brain: upload succeeds on node A local disk, read on node B fails after restart/scaling.

Only startup-level selection + per-asset recorded provider allowed.

---

## 14. Provider-per-asset

Every `media_assets` row stores **`storage_provider`** (`local` | `s3`).

- **Write path:** use currently selected bootstrap provider; persist that value on insert.
- **Read/delete path:** use provider matching row's `storage_provider`, not current global default.

Enables safe coexistence during migration and mixed environments.

---

## 15. Local/S3 coexistence

During local→S3 migration (future #004+ tooling):

- Old assets: `storage_provider=local`, served via `LocalStorageProvider`.
- New assets: `storage_provider=s3`, served via `S3StorageProvider`.
- Global config may switch default for new uploads without breaking old reads.

---

## 16. Future local→S3 migration

Deferred to post-MVP. Designed flow:

1. List assets where `storage_provider=local`.
2. Stream from local, `putObject` to S3 with new key.
3. Verify SHA-256 checksum match.
4. Update row: `storage_provider=s3`, `storage_key=newKey` in transaction.
5. Delete local object after success.
6. Rollback on checksum mismatch.

Not implemented in #002–#003.

---

## 17. media_assets schema

Proposed table `media_assets`:

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uniqueidentifier` PK | Same as public `assetId` |
| `storage_provider` | `varchar(16)` | `local` \| `s3` |
| `storage_key` | `nvarchar(512)` | Opaque provider key |
| `original_file_name` | `nvarchar(260)` | Display metadata, sanitized |
| `mime_type` | `varchar(127)` | Validated type |
| `media_category` | `varchar(32)` | IMAGE/DOCUMENT/AUDIO/VIDEO |
| `size_bytes` | `bigint` | |
| `checksum_sha256` | `char(64)` | Lowercase hex |
| `status` | `varchar(32)` | See §25 |
| `visibility` | `varchar(32)` | See §31 |
| `created_by_user_id` | `uniqueidentifier` NULL FK → users | Nullable for system imports |
| `created_at` | `datetime2` | |
| `updated_at` | `datetime2` | |
| `deleted_at` | `datetime2` NULL | Soft delete |

**Indexes:** unique on `id`; index on `(status, created_at)` for orphan cleanup; index on `created_by_user_id`.

**No blob columns.** Bytes live in provider only.

**No `metadata_json` in MVP** — defer until a concrete need (e.g. image dimensions). Avoid premature JSON bag.

---

## 18. Enums

```typescript
enum MediaStorageProvider { Local = 'local', S3 = 's3' }
enum MediaCategory { Image = 'IMAGE', Document = 'DOCUMENT', Audio = 'AUDIO', Video = 'VIDEO' }
enum MediaAssetStatus { Pending = 'PENDING', Ready = 'READY', Failed = 'FAILED', Deleted = 'DELETED' }
enum MediaVisibility { Private = 'PRIVATE', Authenticated = 'AUTHENTICATED', Public = 'PUBLIC' }
```

MVP synchronous upload sets `READY` immediately on success; `PENDING`/`FAILED` reserved for future async/direct-upload flows.

---

## 19. Object key strategy

**Format:** `{prefix}assets/{yyyy}/{mm}/{assetId}`

- `prefix` = optional `MEDIA_S3_PREFIX` or empty for local.
- `assetId` = row PK UUID.
- **No user filename, email, parish name, or student name in key.**
- Keys immutable; replacement = new `assetId` (§35).

---

## 20. Original filename

- Store sanitized Unicode for `Content-Disposition` download names.
- Strip path separators, control chars, leading dots.
- Truncate to 260 chars.
- **Never** use as filesystem or S3 key.
- Log asset id + category, not full original name in production info logs when name may contain PII.

---

## 21. MIME whitelist

**Do not trust** client `Content-Type` or file extension alone.

**Validation pipeline (#003):**

1. Reject disallowed declared type.
2. Magic-byte / signature sniff (e.g. `file-type` library or minimal custom sniffer).
3. Map detected type → `MediaCategory`.
4. Reject mismatch between declared and detected beyond tolerance.

**MVP whitelist:**

| Category | Allowed MIME |
|----------|--------------|
| IMAGE | `image/jpeg`, `image/png`, `image/webp` |
| DOCUMENT | `application/pdf` |
| AUDIO | `audio/mpeg`, `audio/mp4` (optional MVP) |
| VIDEO | `video/mp4` (optional MVP) |

**Blocked initially:** SVG, HTML, JS, executables, zip, generic `application/octet-stream` unless explicitly mapped.

---

## 22. Media categories

Four explicit categories (no generic `OTHER` in MVP).

Upload request must specify intended category; server validates detected MIME matches category rules.

---

## 23. Size limits

**MVP limits (configurable via env):**

| Category | Max size |
|----------|----------|
| IMAGE | 10 MB |
| DOCUMENT | 25 MB |
| AUDIO | 25 MB |
| VIDEO | 100 MB |
| Global hard cap | 100 MB |

Enforce before buffering entire file in memory where possible; use streaming + counted bytes. Align Nest body parser limit with global cap + margin.

---

## 24. Checksum

- Compute **SHA-256** over raw bytes during upload.
- Store lowercase hex in `checksum_sha256`.
- Use for integrity verification, cache ETag headers, future migration verification.
- **No cross-user deduplication** by checksum in MVP (privacy: same file uploaded by two users = two assets).

---

## 25. Metadata / status lifecycle

| Status | Meaning |
|--------|---------|
| `PENDING` | Reserved: direct upload initiated, bytes not committed |
| `READY` | Available for read; Curriculum may reference |
| `FAILED` | Upload/processing failed |
| `DELETED` | Soft-deleted; reads denied |

MVP single-request upload: insert `PENDING` → write bytes → update `READY` (or `FAILED` on error) in one service transaction.

---

## 26. Public snapshot

**`MediaAssetSnapshot`** (exported read model):

```typescript
interface MediaAssetSnapshot {
  readonly id: string;
  readonly originalFileName: string;
  readonly mimeType: string;
  readonly mediaCategory: MediaCategory;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly status: MediaAssetStatus;
  readonly visibility: MediaVisibility;
  readonly createdAt: Date;
}
```

**Never expose:** `storageKey`, local path, bucket name, provider credentials, presigned URL in snapshot.

---

## 27. Upload flow (MVP)

```
Client --multipart/form-data--> MediaController
  --> JwtAuthGuard + PermissionGuard (media.upload)
  --> MediaAssetService.createFromUpload()
       --> validate size, MIME, category
       --> compute checksum
       --> insert media_assets (PENDING)
       --> StorageProvider.putObject()
       --> update READY
  --> return MediaAssetSnapshot
```

Same code path for local and S3 providers.

**Not in MVP:** presigned direct-to-S3 upload (defer #004 design hook only).

---

## 28. Download/access flow

**Authorization:** Owning domain verifies business access first, OR Media endpoint receives scoped token/context from controller layer.

**MVP patterns:**

| Provider | Access |
|----------|--------|
| Local | Authenticated backend stream (`StreamableFile` / `Readable` pipe) |
| S3 private | Short-lived presigned GET URL **or** backend proxy stream |

**Default MVP:** backend proxy for both (consistent auth, simpler FE). Presigned URLs optional optimization in #004 for large video.

**Never persist** presigned URLs in DB.

---

## 29. Delete flow

**Conservative MVP:**

- Soft delete: set `status=DELETED`, `deleted_at=now`.
- Provider delete may be **deferred** (async job) or immediate based on policy flag.
- **No public delete endpoint in MVP** unless admin-only with `media.manage`.
- Media does **not** scan Curriculum/Chat for references — owning domain must unlink first.
- Hard delete + provider `deleteObject` in later phase with orphan job.

---

## 30. Orphan strategy

Assets uploaded but never referenced in content:

- Track `created_at`; future job deletes `READY` assets older than TTL (e.g. 24h) with no external reference.
- **No cross-module reference counting in #002–#003** — too coupled.
- Document TTL env: `MEDIA_ORPHAN_TTL_HOURS` (future).

---

## 31. Visibility

| Value | Meaning |
|-------|---------|
| `PRIVATE` | Default; uploader + admin |
| `AUTHENTICATED` | Any authenticated user (rare; not default for child content) |
| `PUBLIC` | Unauthenticated read — **disabled for MVP child platform defaults** |

Default new assets: **`PRIVATE`**.

Curriculum lesson media: authenticated delivery after domain scope check, regardless of visibility escalation rules.

---

## 32. Presigned URL

- Generated on demand in `MediaAssetService.createReadAccess()`.
- TTL: 5–15 minutes (config `MEDIA_PRESIGNED_URL_TTL_SECONDS`).
- Only for `storage_provider=s3` when enabled.
- Not stored; not logged.

---

## 33. Backend proxy

Preferred MVP for Web/Mobile consistency:

`GET /api/v1/media/assets/:assetId/content` streams bytes with correct `Content-Type`, `Content-Length`, safe `Content-Disposition`.

Supports auth middleware and audit logging without exposing bucket structure.

---

## 34. Range / media playback

**MVP:** document readiness; implement `Accept-Ranges` + `206 Partial Content` for `video/mp4` and `audio/mpeg` in #003 or #004 if feasible.

Minimum #003: full-file stream; Range as enhancement if time permits.

Mobile video playback likely needs Range — flag as **MEDIUM priority for #003**.

---

## 35. Immutable object strategy

- **Replace file → new assetId.** Do not overwrite bytes under existing id.
- Curriculum content update replaces block with new `assetId`.
- Improves CDN/cache versioning and audit trail.

---

## 36. Docker volume

**Current gap:** `docker-compose.yml` API service has no upload volume; local files lost on container recreate.

**#004 plan (designed now):**

```yaml
volumes:
  - media-uploads:/app/storage/uploads
# ...
volumes:
  media-uploads:
```

Set `MEDIA_LOCAL_ROOT=/app/storage/uploads` in `.env` for Docker.

Production multi-replica: use S3, not shared local volume.

---

## 37. Test storage (local)

#002+ tests:

- Temp directory per test suite (`fs.mkdtemp`).
- Path traversal attempts rejected.
- Symlink escape attempts rejected.
- Cleanup in `afterAll`.
- No writes to repo `./storage/uploads` during CI.

---

## 38. S3 testing

- Unit tests: mock `@aws-sdk/client-s3` client.
- CI: **no real AWS credentials required.**
- Optional #004: MinIO service container for integration smoke test (custom pipeline target).

---

## 39. Path traversal

Threats: `../../etc/passwd`, URL-encoded dots, Unicode dots.

**Mitigation:** generated keys only; path guard on any join of root + key; reject keys containing `..` or absolute paths.

---

## 40. MIME spoofing

Threat: executable renamed `.jpg` with `image/jpeg` header.

**Mitigation:** magic-byte detection + whitelist; reject polyglot where detectable.

---

## 41. SVG / HTML / executable policy

| Type | Policy |
|------|--------|
| SVG | **Block** — active content / XSS |
| HTML | **Block** |
| JS/executables | **Block** |
| PDF | Allow with size cap; serve with `Content-Disposition: attachment` optional for inline policy |

---

## 42. Child privacy

- Default `PRIVATE` visibility.
- No public asset URLs for student-related content.
- No child PII in object keys or logs.
- Access requires authentication + owning-domain authorization path.
- Media module must not become god ACL querying student/enrollment tables.

---

## 43. Logging

**Safe:** assetId, category, size, provider id, duration ms, HTTP status.

**Never log:** file bytes, presigned URLs, storage keys with embedded secrets, AWS keys, `Authorization` headers.

---

## 44. Credentials

- `.env.example` documents variable names only; placeholder empty for secrets.
- Production: IAM roles; no `MEDIA_S3_ACCESS_KEY_ID` in prod env.
- Bitbucket secured variables for CI MinIO if added later.

---

## 45. S3 readiness validation

At bootstrap when `s3` selected:

1. Validate required env vars present.
2. Optional lightweight probe: `HeadBucket` or `ListObjectsV2` with max-keys=1 **if IAM allows**.
3. If probe fails and `MEDIA_STORAGE_ALLOW_LOCAL_FALLBACK=true` (non-prod) → fallback local with warning.
4. If probe fails in prod → **fail startup** with clear error message.

Do not require broad IAM permissions for probe if policy intentionally minimal — config flag to skip probe.

---

## 46. S3 failure behavior

| Operation | On failure |
|-----------|------------|
| putObject | Mark asset FAILED; return 503; no local write |
| getObject | 503/404 to client; log error code |
| deleteObject | Retryable error; soft-delete row anyway |

Retry: SDK built-in retry for transient errors; app-level idempotency on upload via new assetId.

---

## 47. Retry policy

- Use AWS SDK default retry mode for S3.
- Local IO transient errors: single retry on read.
- No unbounded retry loops.

---

## 48. Curriculum integration

**Current (#001–#006):** UUID-only validation in `content-document-v1.validator.ts`.

**#003 plan:**

- `LearningContentService` / publish validation optionally calls:
  - `mediaAssetService.assertAssetReady(assetId)`
  - `mediaAssetService.assertAssetCategory(assetId, 'IMAGE' | 'VIDEO')`
- Through **public** `MediaAssetService` only — no Media repository in LearningContent module.
- Publish blocked if referenced asset not READY.

**Delivery:** FE/Mobile resolve `assetId` via `GET /api/v1/media/assets/:id/content` or metadata endpoint after loading lesson content (authorized).

---

## 49. Question Bank integration (future)

- Questions reference `assetId` for diagrams/audio.
- QuestionBank module owns authorization; calls Media for bytes.

---

## 50. Chat integration (future)

- Attachments store `assetId` on message row.
- Chat module verifies conversation membership before Media read.

---

## 51. Class Materials integration (future)

- Materials row references `assetId`.
- Class/parish scope checked by owning module.

---

## 52. Multilingual implications

- Media binary is language-neutral.
- `originalFileName` may be Unicode (Vietnamese filenames OK).
- Alt text / captions stay in Curriculum translation/content blocks, not Media table — aligns with CURRICULUM localization design.

---

## 53. Future CDN

- Public `PUBLIC` assets (if ever enabled for non-child content) could use CloudFront in front of S3.
- Private assets: signed CloudFront URLs or backend proxy.
- CDN not in MVP; design preserves `assetId` indirection so origin can change.

---

## 54. Malware scanning

**Deferred.** Hook: transition `PENDING → READY` could await scan callback in future.

Document extension point in `MediaAssetService` without implementing scanner.

---

## 55. Quotas

**Deferred.** Future: per-parish upload quota, daily byte limit.

MVP: global size limits only (§23).

---

## 56. Dependency graph (target after #002)

```
UsersModule / AccessControlModule / AuthModule
        ↓
MediaModule (MediaAssetService)
        ↑ (future #003)
LearningContentModule ── calls MediaAssetService for publish validation
CurriculumDeliveryModule ── may expose asset URLs in content responses (ids only)
```

No edge from MediaModule to Curriculum/Class/Enrollment repositories.

---

## 57. Public contracts (MediaAssetService)

Planned methods:

| Method | Purpose |
|--------|---------|
| `getAssetSnapshot(assetId)` | Metadata read |
| `assertAssetReady(assetId)` | Publish gate |
| `assertAssetCategory(assetId, category)` | Block type gate |
| `createFromUpload(input)` | MVP upload |
| `openAssetStream(assetId)` | Backend proxy read |
| `createReadAccess(assetId, ttl)` | Presigned URL (S3, optional) |
| `softDeleteAsset(assetId)` | Admin delete |

Return snapshots/DTOs only — never entities.

---

## 58. Risks / open questions

| ID | Risk | Severity | Mitigation |
|----|------|----------|------------|
| R1 | Multi-replica + local storage | HIGH in prod | Document; enforce S3 for prod |
| R2 | Large video memory pressure | MEDIUM | Stream upload; body size limits |
| R3 | Range support delay hurts mobile video | MEDIUM | Prioritize in #003/#004 |
| R4 | Orphan assets consume disk | LOW | TTL job in #004 |
| R5 | MinIO vs AWS S3 subtle differences | LOW | Optional integration test |

**Open questions:**

- OQ1: Presigned vs proxy default for S3 in MVP? **Recommend proxy first.**
- OQ2: Include AUDIO/VIDEO in MVP whitelist or IMAGE+PDF only? **Recommend IMAGE+PDF first; AUDIO/VIDEO flags in config.**

No BLOCKERs.

---

## 59. Files created

| File |
|------|
| `docs/MEDIA_001_DOMAIN_AUDIT_AND_STORAGE_PROVIDER_DESIGN_REPORT.md` |

---

## 60. Files modified

None (audit-only phase).

---

## 61. Commands run

```bash
npm run format:check   # PASS
npm run lint           # PASS
npm run typecheck      # PASS
npm test               # PASS (323 tests)
npm run test:e2e       # PASS (5 tests)
npm run build          # PASS
```

---

## 62. Validation

All audit-only validation gates **PASS**. No implementation to migrate or integration-test.

---

## 63. Out of scope (#001)

- Schema migration, entities, providers, controllers
- AWS SDK dependency
- Docker volume changes
- RBAC permission seed changes
- Curriculum validator changes
- Postman collection

---

## 64. MEDIA #002 readiness

#002 should implement:

1. Migration `media_assets`
2. `MediaModule` + `MediaAssetEntity` + repository internal to module
3. `media.configuration.ts` + Joi env validation
4. `LocalStorageProvider` + `S3StorageProvider` + factory
5. Provider unit tests (local temp dir + S3 mock)
6. Update `.env.example` with documented media vars (no secrets)
7. Register module in `AppModule` (minimal — no HTTP yet if preferred split)

---

## 65. Prompt count

**FILE/MEDIA #001 / 4** complete. Next: **#002 / 4**.

---

## 66. Commit recommendation

Audit-only report under gitignored `docs/`. **No commit required** unless the team chooses to track design docs outside `docs/`.

If implementing #002 in same session later:

```bash
git commit -m "feat(media): add storage provider foundation"
```

---

## Appendix A — Proposed environment variables (#002)

```env
# Media storage
MEDIA_STORAGE_PROVIDER=local
MEDIA_LOCAL_ROOT=./storage/uploads
MEDIA_STORAGE_ALLOW_LOCAL_FALLBACK=false

# S3 (when MEDIA_STORAGE_PROVIDER=s3)
MEDIA_S3_BUCKET=
MEDIA_S3_REGION=
MEDIA_S3_ENDPOINT=
MEDIA_S3_ACCESS_KEY_ID=
MEDIA_S3_SECRET_ACCESS_KEY=
MEDIA_S3_FORCE_PATH_STYLE=false
MEDIA_S3_PREFIX=
MEDIA_S3_PUBLIC_BASE_URL=

# Limits
MEDIA_MAX_IMAGE_BYTES=10485760
MEDIA_MAX_DOCUMENT_BYTES=26214400
MEDIA_MAX_AUDIO_BYTES=26214400
MEDIA_MAX_VIDEO_BYTES=104857600

# Access
MEDIA_PRESIGNED_URL_TTL_SECONDS=900
```

---

## Appendix B — Proposed RBAC permissions (#003)

| Permission | Roles (initial) |
|------------|-----------------|
| `media.read` | SUPER_ADMIN, PARISH_ADMIN, CATECHIST (scoped via owning domain) |
| `media.upload` | SUPER_ADMIN, PARISH_ADMIN |
| `media.manage` | SUPER_ADMIN, PARISH_ADMIN |

Exact scoped read may be enforced in controller by passing user context to service; Media does not implement parish scope alone for curriculum assets.
