# AUTH #005 — Refresh Token + Session + Logout

> Status: **COMPLETE**
> Scope: Refresh tokens (HttpOnly cookie), session persistence, rotation, reuse detection, family revocation, logout — **no RBAC, rate limiting, session cleanup cron**
> Next prompt: **AUTH #006** — Role + Permission + RBAC Guards

---

## 1. Objective

Implement secure refresh-token and session lifecycle: create sessions on login, issue opaque refresh tokens (hashed at rest), rotate on refresh, detect replay/reuse, revoke token families, logout, and bind access JWTs to session id (`sid`).

## 2. State Inherited From AUTH #004

| Item | State |
|------|-------|
| `POST /api/v1/auth/login` | Access JWT only — no sessions |
| `GET /api/v1/auth/me` | Bearer JWT (`sub` only) |
| `auth_sessions` schema | Present but unused |
| AuthModule exports | `JwtAuthGuard` only |

## 3. Architecture / Module Boundary Audit

| Module | Ownership |
|--------|-----------|
| **AuthModule** | `auth_sessions`, refresh token lifecycle, login/refresh/logout, access JWT issuance |
| **UsersModule** | `users`, credential verification, account eligibility check |
| **AccessControlModule** | Unchanged |

AuthModule uses `UserAccountService` public API only — no `UserEntity` repository access.

## 4. Refresh Token Transport Decision

**Chosen: HttpOnly cookie** (`catechism_refresh_token`)

| Aspect | Decision |
|--------|----------|
| Access token | JSON response body (`Authorization: Bearer`) |
| Refresh token | HttpOnly cookie scoped to `/api/v1/auth` |
| Rationale | Browser-safe; JS cannot read refresh token; aligns with React SPA + separate API topology |

CORS/credentials implications documented for future frontend (`credentials: 'include'` on auth calls).

## 5. Cookie Security Decision

| Flag | Development | Production |
|------|-------------|------------|
| `httpOnly` | `true` | `true` |
| `secure` | `false` | `true` |
| `sameSite` | `lax` | `lax` |
| `path` | `/api/v1/auth` | `/api/v1/auth` |
| `maxAge` | From `JWT_REFRESH_EXPIRES_IN` | From `JWT_REFRESH_EXPIRES_IN` |

Centralized in `src/modules/auth/utils/auth-cookie.util.ts`.

## 6. Dependencies Added

| Package | Type |
|---------|------|
| `cookie-parser` | runtime |
| `@types/cookie-parser` | dev |

## 7. Configuration Added

| Variable | Validation | Default |
|----------|------------|---------|
| `JWT_REFRESH_HASH_SECRET` | Required, min 32 chars, forbidden placeholders | — |
| `JWT_REFRESH_EXPIRES_IN` | Duration string | `7d` |

Existing `JWT_ACCESS_*` unchanged.

**Local `.env` (add if missing):**

```
JWT_REFRESH_HASH_SECRET=local-development-refresh-hash-secret-32chars-min
JWT_REFRESH_EXPIRES_IN=7d
```

## 8. Files Created

| File |
|------|
| `src/database/migrations/1788055400000-add-auth-sessions-refresh-token-hash-index.ts` |
| `src/modules/auth/services/refresh-token.service.ts` |
| `src/modules/auth/services/refresh-token.service.spec.ts` |
| `src/modules/auth/services/auth-session.service.ts` |
| `src/modules/auth/services/auth-session.service.spec.ts` |
| `src/modules/auth/interfaces/auth-session-result.interface.ts` |
| `src/modules/auth/interfaces/authenticated-auth-result.interface.ts` |
| `src/modules/auth/dto/access-token-response.dto.ts` |
| `src/modules/auth/utils/auth-cookie.util.ts` |
| `test/integration/auth-session.integration-spec.ts` |
| `test/auth-refresh-logout.db.e2e-spec.ts` |
| `docs/AUTH_005_REFRESH_SESSION_LOGOUT_REPORT.md` |

## 9. Files Modified

| File | Change |
|------|--------|
| `src/modules/auth/config/auth.config.types.ts` | Refresh config + cookie constants |
| `src/modules/auth/config/auth.configuration.ts` | Parse refresh env vars |
| `src/modules/auth/config/auth.configuration.spec.ts` | Refresh config tests |
| `src/modules/auth/services/access-token.service.ts` | Required `sid` claim |
| `src/modules/auth/services/access-token.service.spec.ts` | `sid` validation tests |
| `src/modules/auth/services/auth.service.ts` | Session-aware login/refresh/logout |
| `src/modules/auth/services/auth.service.spec.ts` | Updated mocks |
| `src/modules/auth/controllers/auth.controller.ts` | `/refresh`, `/logout`, cookie handling |
| `src/modules/auth/interfaces/authenticated-user.interface.ts` | Added `sessionId` |
| `src/modules/auth/entities/auth-session.entity.ts` | Unique index on hash |
| `src/modules/auth/auth.module.ts` | New providers |
| `src/modules/auth/utils/auth-http.util.ts` | Cookie extraction |
| `src/modules/users/services/user-account.service.ts` | `isAccountEligibleForAuthentication()` |
| `src/bootstrap/configure-application.ts` | `cookie-parser` middleware |
| `src/config/env.validation.ts` | Refresh env Joi rules |
| `src/config/env.validation.spec.ts` | Refresh validation tests |
| `.env.example`, `.env.test.example`, `test/setup-env.ts`, `test/database/load-test-environment.ts` | Refresh secrets |
| `bitbucket-pipelines.yml` | CI refresh env exports |
| `test/auth-login.db.e2e-spec.ts` | `sid` + cookie assertions |
| `package.json` / `package-lock.json` | `cookie-parser` |

## 10. Session Data Model Assessment

Existing `auth_sessions` schema is **sufficient** — no new columns.

Rotation model: **one row per refresh-token instance** within a shared `token_family_id`.

| Column | Role |
|--------|------|
| `id` | Token instance id → access JWT `sid` |
| `token_family_id` | Logical browser/login session family |
| `refresh_token_hash` | HMAC-SHA-256 digest (unique index) |
| `revoked_at` | Rotation/revocation marker |
| `expires_at` | Refresh expiry |

## 11. Migration Changes

**Added:** `1788055400000-add-auth-sessions-refresh-token-hash-index.ts`

- Unique index `UQ_auth_sessions_refresh_token_hash` on `refresh_token_hash`
- Enables O(1) hash lookup without scanning sessions

## 12. Refresh Token Generation

- 32 bytes (`randomBytes`) → base64url encoding (≥256 bits entropy)
- Opaque — not JWT
- Never persisted raw

## 13. Refresh Token Hash Strategy

- **HMAC-SHA-256** with dedicated `JWT_REFRESH_HASH_SECRET`
- Separate from access JWT signing secret
- Deterministic keyed digest for indexed equality lookup
- Hex output (~64 chars, fits `nvarchar(255)`)

## 14. Session Creation Flow

1. Generate opaque refresh token
2. HMAC hash token
3. Create `auth_sessions` row with new `token_family_id`
4. Return transient raw token + session metadata to controller
5. Controller sets HttpOnly cookie; raw token never in JSON body

## 15. Login Flow Changes

1. `UserAccountService.verifyCredentials()`
2. `AuthSessionService.createSession(userId)`
3. `AccessTokenService.signAccessToken(userId, sessionId)`
4. Return access token JSON + set refresh cookie

## 16. Access JWT sid Decision

Access JWT claims: **`sub`**, **`sid`**, **`iat`**, **`exp`**

- `sub` = user id
- `sid` = current auth session row id (changes on refresh rotation)
- Tokens without `sid` (AUTH #004 legacy) → **invalid**

`AuthenticatedUser`: `{ userId, sessionId }`

No DB session lookup per protected request (short-lived access token).

## 17. Refresh Flow

`POST /api/v1/auth/refresh` (public — refresh cookie authenticates)

1. Read refresh cookie
2. HMAC hash → lookup session by unique hash index
3. Reject if missing / expired / revoked
4. Check `UserAccountService.isAccountEligibleForAuthentication()`
5. Transaction: pessimistic lock → revoke current row → insert new row (same family)
6. Issue new access JWT with new `sid`
7. Rotate refresh cookie

All failures → generic `401 Invalid credentials`.

## 18. Rotation Model

**One row per refresh-token instance, shared `token_family_id`:**

- Login → row A (family F)
- Refresh → revoke A, insert row B (family F), new `sid`
- Access JWT always references current active row id

## 19. Token Family / Reuse Detection

Replay of a **revoked** refresh token hash:

1. Detect `revoked_at IS NOT NULL`
2. Revoke all active rows in same `token_family_id` (committed outside rotation transaction to avoid rollback)
3. Return `401`

Subsequent refresh attempts (including the latest rotated token) also fail — family fully revoked.

## 20. Concurrent Refresh Handling

- Pessimistic write lock on session row during rotation transaction
- First request wins rotation
- Second request with same token finds revoked row → family revocation
- Reuse revocation runs **outside** rotation transaction to ensure persistence on throw

## 21. Logout / Revocation Flow

`POST /api/v1/auth/logout` (requires access JWT)

1. Extract `sessionId` from JWT
2. Lookup session → get `token_family_id`
3. Revoke all active rows in family
4. Clear refresh cookie
5. Return `204 No Content`

## 22. Account Status on Refresh

`UserAccountService.isAccountEligibleForAuthentication(userId)` — returns `true` only for `ACTIVE` accounts.

Inactive/locked/missing → revoke family + generic `401`.

## 23. Cookie / CSRF Considerations

- Refresh/logout mutate auth state via cookie
- Access token remains in `Authorization` header (not CSRF-vulnerable for API calls)
- `SameSite=Lax` mitigates cross-site cookie submission for current topology
- Full CSRF token subsystem deferred to AUTH #007 hardening review
- Future frontend must use `credentials: 'include'` for auth cookie endpoints

## 24. Swagger Changes

- Login documents HttpOnly refresh cookie behavior
- `/auth/refresh` documented as cookie-based
- `/auth/logout` documented as `204` with bearer auth

## 25. Repository Boundary

| Export | AuthModule |
|--------|------------|
| Public | `JwtAuthGuard` only |
| Private | `AuthSessionService`, `RefreshTokenService`, `Repository<AuthSessionEntity>` |

No TypeOrmModule export. No entity export.

## 26. Unit Tests

| Area | File |
|------|------|
| Refresh token generation/hash | `refresh-token.service.spec.ts` |
| Session create/revoke/refresh reject | `auth-session.service.spec.ts` |
| Login/refresh/logout orchestration | `auth.service.spec.ts` |
| Access JWT `sid` required | `access-token.service.spec.ts` |
| Auth config refresh vars | `auth.configuration.spec.ts` |
| Env validation refresh vars | `env.validation.spec.ts` |

## 27. Integration Tests

`test/integration/auth-session.integration-spec.ts`:

- Session creation stores hash (not raw token)
- Refresh rotation revokes prior row
- Replay triggers family revocation
- Ineligible account check available

## 28. DB-Aware HTTP E2E Flow

`test/auth-refresh-logout.db.e2e-spec.ts`:

1. Create user → login → cookie + access token with `sid`
2. `/auth/me` success
3. Refresh → new access token + rotated cookie
4. Replay old cookie → `401` + family revoked
5. Fresh login → logout `204`
6. Refresh after logout → `401`

`test/auth-login.db.e2e-spec.ts` updated for `sid` + Set-Cookie assertions.

## 29. Existing Test Regression

All prior unit/e2e/integration tests pass with updated JWT `sid` requirement.

## 30. CI Compatibility

`bitbucket-pipelines.yml` Database Tests step exports test-only:

- `JWT_REFRESH_HASH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`

## 31. Security / Secret Review

| Check | Result |
|-------|--------|
| Refresh tokens high entropy | **PASS** |
| Raw refresh never persisted | **PASS** |
| Hash secret separate from JWT secret | **PASS** |
| Replay → family revocation | **PASS** |
| Expiration enforced | **PASS** |
| Logout revokes family | **PASS** |
| Generic 401 errors | **PASS** |
| Cookie HttpOnly + scoped path | **PASS** |
| No token logging | **PASS** |
| No RBAC in auth flow | **PASS** |
| No production secrets committed | **PASS** |

## 32. Module Boundary Audit After Implementation

| Module | Exports |
|--------|---------|
| UsersModule | `UserAccountService` only |
| AuthModule | `JwtAuthGuard` only |
| AccessControlModule | Nothing |

**PASS** — no cycles, no persistence exports.

## 33. Future Microservice Extraction Review

Auth service would own:

- `auth_sessions` table
- login / refresh / logout / token issuance

External dependency: user credential + account-state API (not direct `users` table access).

## 34. Commands Executed

```
npm install cookie-parser @types/cookie-parser
npm run format
npm run quality
npm run test:integration
npm run test:e2e:db
npm audit --audit-level=moderate
docker build --target production
```

## 35. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** (28 suites) |
| DB-free e2e | **PASS** |
| build | **PASS** |
| audit | **PASS** (0 vulnerabilities) |
| quality | **PASS** |
| migrations | **PASS** (via test:db:prepare) |
| DB integration | **PASS** |
| DB auth e2e | **PASS** |
| production Docker build | **PASS** |
| login creates session | **PASS** |
| refresh rotation | **PASS** |
| replay detection | **PASS** |
| family revocation | **PASS** |
| logout revocation | **PASS** |
| no raw refresh persistence | **PASS** |
| JWT sid validation | **PASS** |
| no persistence export | **PASS** |
| no RBAC implementation | **PASS** |

## 36. Known Issues / Deferred Items

- Session row cleanup (expired/revoked) — no cron/scheduler
- Rate limiting / lockout counters
- Per-request account/session revocation check on access JWT routes
- Full CSRF hardening for cookie refresh (AUTH #007)
- RBAC guards (AUTH #006)
- Sample seed data (AUTH #008)

## 37. Out-of-Scope Confirmation

Not implemented: RBAC, permissions, roles, rate limiting, session cleanup jobs, CORS changes, refresh token in JSON body.

## 38. AUTH #006 Readiness

Next: **AUTH/RBAC #006 — Role + Permission + RBAC Guards**

Should implement:

- `AccessControlService`
- Role/permission assignment services
- Effective permission resolution
- `@RequirePermissions()` + `PermissionGuard`
- Protected endpoint authorization tests

## 39. Commit Message Recommendation

```
git commit -m "feat(auth): add refresh session and logout flow"
```
