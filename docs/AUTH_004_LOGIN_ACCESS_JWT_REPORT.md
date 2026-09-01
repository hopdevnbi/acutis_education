# AUTH #004 — Login + Access JWT

> Status: **COMPLETE**
> Scope: Login endpoint, HS256 access JWT, `JwtAuthGuard`, `@CurrentUser()`, `/auth/me`, auth config — **no refresh tokens, sessions, RBAC, rate limiting**
> Next prompt: **AUTH #005** — Refresh tokens / session persistence (when prompted)

---

## 1. Objective

Implement stateless access-token authentication: email/password login, short-lived JWT access tokens, bearer guard for protected routes, and a minimal authenticated profile endpoint — without refresh tokens, session rows, RBAC guards, or rate limiting.

## 2. State Inherited From AUTH #003

| Item | State |
|------|-------|
| `UserAccountService.verifyCredentials()` | **PASS** — timing-safe, generic invalid-credentials result |
| `UserAccountService.createAccount()` | **PASS** — Argon2id, email normalization |
| Auth schema + migrations | Applied |
| Module boundaries | UsersModule exports service only; AuthModule skeleton present |

## 3. Module Boundary Audit

| Check | Result |
|-------|--------|
| AuthModule uses UsersModule public API only | `UserAccountService.verifyCredentials()` + `getAccountSnapshotById()` |
| AuthModule does not import UserEntity/repository | **PASS** |
| UsersModule does not import AuthModule | **PASS** |
| AuthModule exports only guard for cross-module use | `JwtAuthGuard` only |
| JWT claims contain no permissions/roles | `sub`, `iat`, `exp` only |
| No refresh token or session persistence on login | **PASS** — `auth_sessions` entity registered but unused |

## 4. Dependencies Added

| Package | Version | Type |
|---------|---------|------|
| `@nestjs/jwt` | `^12.0.1` | **runtime** `dependencies` |

## 5. Configuration

| Variable | Validation | Default |
|----------|------------|---------|
| `JWT_ACCESS_SECRET` | Required, min 32 chars, forbidden placeholders (`secret`, `changeme`, `development-secret`) | — |
| `JWT_ACCESS_EXPIRES_IN` | Duration string (`15m`, `1h`, `30s`) parsed to seconds | `15m` (900 s) |

Files:

- `src/modules/auth/config/auth.config.types.ts`
- `src/modules/auth/config/auth.configuration.ts`
- `src/modules/auth/config/parse-duration-to-seconds.ts`
- `src/config/env.validation.ts` — Joi rules for JWT env vars
- `src/config/config.module.ts` — loads `authConfiguration`
- `.env.example`, `.env.test.example`, `test/setup-env.ts`, `test/database/load-test-environment.ts`
- `bitbucket-pipelines.yml` — exports JWT vars for DB integration step

**Local `.env` required (add if missing):**

```
JWT_ACCESS_SECRET=local-development-jwt-access-secret-32chars-min
JWT_ACCESS_EXPIRES_IN=15m
```

## 6. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/auth/login` | Public | Email + password → access token + user summary |
| `GET` | `/api/v1/auth/me` | Bearer JWT | Returns `{ id, email }` for authenticated user |

### Login request

```json
{ "email": "teacher@parish.example", "password": "SecurePassword123!" }
```

### Login response (200)

```json
{
  "accessToken": "<jwt>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": { "id": "<uuid>", "email": "teacher@parish.example" }
}
```

### Invalid credentials (401)

Generic message only: `"Invalid credentials"` — no account enumeration.

### `/auth/me` (401)

Missing/invalid/expired bearer token → `401` with same generic message.

Swagger bearer scheme added in `src/bootstrap/configure-swagger.ts`.

## 7. JWT Design

| Property | Value |
|----------|-------|
| Algorithm | HS256 |
| Secret | `JWT_ACCESS_SECRET` |
| TTL | Configurable via `JWT_ACCESS_EXPIRES_IN` (default 15 minutes) |
| Claims | `sub` (user id), `iat`, `exp` |
| Excluded | roles, permissions, session id, refresh token |

UUID normalization: MSSQL returns uppercase `uniqueidentifier` values; all API responses and JWT `sub` claims normalize to lowercase RFC UUID strings via `normalizeUuid()` in `src/database/uuid-v4.util.ts`.

## 8. Files Created

| File |
|------|
| `src/modules/auth/config/auth.config.types.ts` |
| `src/modules/auth/config/auth.configuration.ts` |
| `src/modules/auth/config/auth.configuration.spec.ts` |
| `src/modules/auth/config/parse-duration-to-seconds.ts` |
| `src/modules/auth/config/parse-duration-to-seconds.spec.ts` |
| `src/modules/auth/services/access-token.service.ts` |
| `src/modules/auth/services/access-token.service.spec.ts` |
| `src/modules/auth/services/auth.service.ts` |
| `src/modules/auth/services/auth.service.spec.ts` |
| `src/modules/auth/controllers/auth.controller.ts` |
| `src/modules/auth/guards/jwt-auth.guard.ts` |
| `src/modules/auth/guards/jwt-auth.guard.spec.ts` |
| `src/modules/auth/decorators/current-user.decorator.ts` |
| `src/modules/auth/dto/login-request.dto.ts` |
| `src/modules/auth/dto/login-response.dto.ts` |
| `src/modules/auth/dto/authenticated-profile-response.dto.ts` |
| `src/modules/auth/interfaces/authenticated-user.interface.ts` |
| `src/modules/auth/utils/auth-http.util.ts` |
| `src/modules/auth/utils/auth-http.util.spec.ts` |
| `test/auth-login.db.e2e-spec.ts` |
| `docs/AUTH_004_LOGIN_ACCESS_JWT_REPORT.md` |

## 9. Files Modified

| File | Change |
|------|--------|
| `src/modules/auth/auth.module.ts` | Wired JwtModule, services, controller, guard export |
| `src/modules/users/services/user-account.service.ts` | Added `getAccountSnapshotById()` |
| `src/modules/users/mappers/user-account.mapper.ts` | Normalize UUID casing on read |
| `src/database/uuid-v4.util.ts` | Added `normalizeUuid()` |
| `src/database/uuid-v4.util.spec.ts` | Test for `normalizeUuid()` |
| `src/bootstrap/configure-swagger.ts` | Bearer auth scheme |
| `src/modules/module-boundaries.spec.ts` | AuthModule exports `JwtAuthGuard` only |
| `src/config/env.validation.spec.ts` | JWT env validation tests |
| `package.json` / `package-lock.json` | `@nestjs/jwt`; Jest ESM transform for `@nestjs/jwt` |
| `test/jest-integration.json` | Same Jest ESM transform |
| `test/jest-db-e2e.json` | Same Jest ESM transform |
| `test/jest-e2e.json` | Same Jest ESM transform |
| `bitbucket-pipelines.yml` | JWT env exports for CI DB step |

## 10. AuthModule Architecture

```
AuthModule
├── imports: UsersModule, ConfigModule (auth), JwtModule.registerAsync, TypeOrmModule (AuthSessionEntity — unused)
├── controllers: AuthController
├── providers: AuthService, AccessTokenService, JwtAuthGuard
└── exports: JwtAuthGuard
```

Cross-module contract:

- **Inbound:** HTTP login/me requests
- **Outbound:** `UserAccountService` (UsersModule public API)
- **Public export:** `JwtAuthGuard` + `@CurrentUser()` decorator for future feature modules

## 11. Security Notes

- Passwords never returned in responses; login DTO validated via class-validator.
- Invalid login paths return identical `401` message regardless of email existence, password mismatch, inactive, or locked status.
- JWT secret validated at startup; placeholder secrets rejected.
- Access tokens are short-lived; no refresh mechanism in this prompt.
- Bearer token extracted via `Authorization: Bearer <token>` header only.

## 12. Jest ESM Fix

`@nestjs/jwt` v12 is ESM-only (`"type": "module"`). Jest required:

```json
"transform": { "^.+\\.(t|j)s$": "ts-jest" },
"transformIgnorePatterns": ["node_modules/(?!(@nestjs/jwt)/)"]
```

Applied in `package.json` and all Jest config files under `test/`.

## 13. Validation Results

| Gate | Result |
|------|--------|
| `npm run format:check` | **PASS** |
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm test` (26 suites, 96 tests) | **PASS** |
| `npm run test:e2e` | **PASS** |
| `npm run build` | **PASS** |
| `npm run test:integration` | **PASS** |
| `npm run test:e2e:db` (auth login e2e) | **PASS** |
| `docker build --target production` | **PASS** |

## 14. Suggested Commit

```
feat(auth): add login and access token authentication
```

## 15. Deferred (Out of Scope)

- Refresh tokens and `auth_sessions` persistence (AUTH #005)
- RBAC / permission guards (AUTH #006+)
- Rate limiting / lockout counters
- Password reset / email verification
- Audit logging of login events
