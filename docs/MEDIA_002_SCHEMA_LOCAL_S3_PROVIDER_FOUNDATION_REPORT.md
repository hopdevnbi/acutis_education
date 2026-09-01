# MEDIA #002 — Schema, Local/S3 Provider Foundation Report

**Phase:** FILE / MEDIA STORAGE ABSTRACTION #002 / 4  
**Date:** 2026-08-30  
**Status:** IMPLEMENTATION COMPLETE — NO HTTP UPLOAD API YET  
**Prompt:** FILE/MEDIA #002 (schema + MediaModule + local/S3 provider foundation)

---

## Required verdicts

| Verdict | Result |
|---------|--------|
| MEDIA SCHEMA FOUNDATION READY | **YES** |
| LOCAL STORAGE PROVIDER READY | **YES** |
| S3 STORAGE PROVIDER READY | **YES** |
| PROVIDER REGISTRY + RUNTIME CONFIG READY | **YES** |
| MEDIA ASSET METADATA SERVICE READY | **YES** |
| MODULE BOUNDARY COMPLIANT | **YES** |
| Unresolved BLOCKER count | **0** |
| Unresolved HIGH count | **0** |

**Recommendation:** Proceed to **FILE/MEDIA #003/4 — Upload/Read HTTP API + RBAC + Curriculum asset validation**.

---

## 1. Objective

Implement the Media bounded context foundation from MEDIA #001:

- `media_assets` MSSQL schema (migration-driven)
- `MediaModule` with narrow public export (`MediaAssetService`)
- Local filesystem provider (default) and optional S3 provider
- Startup provider selection with optional S3 readiness probe
- Per-asset `storage_provider` resolution for future reads/deletes
- Metadata lifecycle helpers (`PENDING` → `READY` / `FAILED`)

No HTTP upload/read endpoints in this phase.

---

## 2. Module boundary (§7.6)

| Item | Detail |
|------|--------|
| **Owns** | Table `media_assets`, `MediaAssetEntity`, internal providers, config |
| **Public exports** | `MediaAssetService` only |
| **Inbound deps** | `TypeOrmModule`, Nest config, `@aws-sdk/client-s3` (internal) |
| **Outbound deps** | None (no cross-module repository imports) |
| **Extraction boundary** | Media service + provider registry can move to a storage microservice later; callers use `assetId` only |

Verified in `src/modules/module-boundaries.spec.ts`.

---

## 3. Deliverables

### Schema & migration

- `src/database/migrations/1788063200000-create-media-assets-schema.ts`
  - Table `media_assets` with FK to `users.id` (nullable `created_by_user_id`)
  - Unique index on `(storage_provider, storage_key)`
  - Indexes on `(status, created_at)` and `created_by_user_id`
  - CHECK constraints: positive `size_bytes`, lowercase SHA-256 hex, allowed enum values
  - **No DB default on `id`** (application assigns UUID v4)

### MediaModule (`src/modules/media/`)

- Enums: storage provider, category, status, visibility
- Entity, mapper, errors, utils (checksum, storage key, filename sanitize, local path, S3 prefix)
- `MediaAssetService`: create pending metadata, mark ready/failed, snapshots, assert ready/category, resolve provider
- `LocalStorageProvider`: atomic write (temp + rename), path traversal protection
- `S3StorageProvider`: put/get/delete/exists with prefix; mockable client; `probeS3Readiness`
- `StorageProviderRegistry`: registers providers at init; write provider from config; per-asset lookup
- Config: `media.configuration.ts`, `MediaConfigService`, `MEDIA_RUNTIME_CONFIGURATION` token

### App wiring

- `MediaModule` imported in `src/app.module.ts`
- `mediaConfiguration` loaded in `src/config/config.module.ts`
- `.env.example` updated with media variables
- `.gitignore` ignores `storage/uploads/`
- Dependency: `@aws-sdk/client-s3`

### Tests

| Test | Path |
|------|------|
| Config resolution | `src/modules/media/config/media.configuration.spec.ts` |
| Checksum / key / filename utils | `src/modules/media/utils/*.spec.ts` |
| Local provider | `src/modules/media/providers/local-storage.provider.spec.ts` |
| S3 provider (mocked) | `src/modules/media/providers/s3-storage.provider.spec.ts` |
| Registry | `src/modules/media/providers/storage-provider-registry.service.spec.ts` |
| MediaAssetService | `src/modules/media/services/media-asset.service.spec.ts` |
| Entity metadata | `src/database/media-foundation.entities.spec.ts` |
| DB integration | `test/integration/media-foundation.integration-spec.ts` |
| Module boundary | `src/modules/module-boundaries.spec.ts` |

---

## 4. Configuration summary

| Variable | Default / notes |
|----------|-----------------|
| `MEDIA_STORAGE_PROVIDER` | `local` \| `s3` \| `auto` (`auto` blocked in production) |
| `MEDIA_LOCAL_ROOT` | `./storage/uploads` |
| `MEDIA_STORAGE_ALLOW_LOCAL_FALLBACK` | `false` (must stay false in production) |
| `MEDIA_MAX_*_BYTES` | Image 10MB, document/audio 25MB, video 100MB |
| `MEDIA_PRESIGNED_URL_TTL_SECONDS` | 900 |
| `MEDIA_S3_*` | Optional; bucket+region required when any S3 var set |
| `MEDIA_S3_READINESS_PROBE_ENABLED` | `false`; async probe at module init when true |

Write provider is fixed at startup. Existing assets keep their persisted `storage_provider` for reads/deletes.

---

## 5. Validation results

| Command | Result |
|---------|--------|
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS (includes all media unit tests) |
| `npm run test:e2e` | PASS |
| `npm run build` | PASS |
| `npm run test:db:migrations` | PASS |
| `npm run test:integration` (media-foundation) | PASS |
| `npm run test:integration` (full suite) | **Partial** — 2 seed suites fail when DB contains leftover seed/domain data (FK cleanup order); not caused by Media changes |
| `npm run test:e2e:db` | **Partial** — `parish.db.e2e-spec.ts` fails on dirty `catechism_api_test` after prior seed runs |
| `docker build -t catechism-api:media-foundation .` | PASS (WSL) |

**Clean run tip:** `npm run test:db:prepare -- --reset` before `test:integration` / `test:e2e:db` if seeds were run manually against the test database.

---

## 6. Migration command

```bash
npm run migration:run
```

Adds `media_assets` only; no seed for media in this phase.

---

## 7. Out of scope (#003)

- HTTP upload/download/delete controllers
- `media.*` RBAC permissions
- Multer / streaming upload pipeline
- Publish-time curriculum `assetId` existence checks
- Presigned URL HTTP responses

---

## 8. Suggested commit (not executed)

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat(media): add storage provider foundation

Introduce media_assets schema, MediaModule, local/S3 providers, and metadata service for curriculum asset references.
EOF
)"
```

---

## 9. Definition of Done checklist (§31)

- [x] Migration for `media_assets`
- [x] Entity matches migration; no ORM sync
- [x] Module exports only `MediaAssetService`
- [x] Local + S3 providers with safe keys/paths
- [x] Unit + integration tests for media scope
- [x] `.env.example` documented
- [x] `quality` gate passes
- [x] Docker production image builds
- [ ] Full `quality:full` on pristine test DB (blocked by pre-existing seed test isolation when DB is dirty)
