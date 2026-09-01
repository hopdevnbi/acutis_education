# AUTH #007 — Security Hardening + Integration Audit

> Status: **COMPLETE**
> Scope: Rate limiting, Argon2 rehash, cache-control headers, module export audit, RBAC removal E2E, logging redaction review — **no seeds, admin CRUD, session DB lookup per request**
> Next prompt: **AUTH #008** — Seed data + Postman collection (when explicitly requested)

---

## 1. Objective

Harden the auth/RBAC stack introduced in AUTH #004–#006: audit integration boundaries, add proportional abuse controls, upgrade password hashes on login, prevent token response caching, extend E2E coverage for permission/role revocation, and document accepted trade-offs.

## 2. Audit Findings and Decisions

| Area | Finding | Action |
|------|---------|--------|
| **AuthModule exports** | AUTH #006 exported `AccessTokenService` so `JwtAuthGuard` resolved in `RbacTestModule` | Removed `AccessTokenService` export; refactored `JwtAuthGuard` to inject `JwtService` + `ConfigService`; export `JwtModule` for cross-module guard DI |
| **Access JWT session validation** | Stateless JWT (~15 min TTL) does not re-check DB session on every request | **Accepted** — logout revokes refresh session immediately; access token remains valid until expiry (documented trade-off) |
| **Logging redaction** | `ApplicationLoggingModule` already redacts passwords, tokens, cookies, Authorization | **No change** — audit confirmed coverage |
| **Rate limiting** | Login/refresh had no abuse throttling | Added `@nestjs/throttler` with env-configured named limiters |
| **Password rehash** | Argon2 `needsRehash()` unused after login | Rehash on successful `verifyCredentials()` (non-blocking on failure) |
| **Token response caching** | Login/refresh JSON could be cached by intermediaries | `Cache-Control: no-store` + `Pragma: no-cache` on login/refresh |

## 3. Implementation Summary

### 3.1 Rate limiting (`@nestjs/throttler`)

- Registered in `AuthModule` with named throttlers: `auth-login`, `auth-refresh`
- Applied via `@UseGuards(ThrottlerGuard)` + `@Throttle({ 'auth-login': {} })` on login; `auth-refresh` on refresh
- Config (defaults in parentheses):
  - `AUTH_LOGIN_THROTTLE_LIMIT` (10)
  - `AUTH_LOGIN_THROTTLE_TTL_MS` (60000)
  - `AUTH_REFRESH_THROTTLE_LIMIT` (20)
  - `AUTH_REFRESH_THROTTLE_TTL_MS` (60000)
- Test harness sets high limits (1000) via `load-test-environment.ts` and `.env.test.example`

### 3.2 Argon2 rehash on login

- `UserAccountService.verifyCredentials()` calls `passwordHashService.needsRehash()` after successful verify
- Upgrades hash with `hash(password)` + `save()` inside try/catch so rehash failures never block login

### 3.3 Cache-Control on auth token responses

- `applyNoStoreCacheControl()` in `src/modules/auth/utils/auth-response.util.ts`
- Called from `AuthController.login()` and `AuthController.refreshAccessToken()`

### 3.4 JwtAuthGuard decoupling

- Shared verification logic: `src/modules/auth/utils/access-token-verification.util.ts`
- Used by `AccessTokenService` (sign/verify for auth flow) and `JwtAuthGuard` (HTTP guard)
- **AuthModule exports:** `JwtAuthGuard`, `JwtModule` — **not** `AccessTokenService`

### 3.5 Extended E2E coverage

| File | New/updated scenarios |
|------|----------------------|
| `test/auth-rbac.db.e2e-spec.ts` | Permission removal → 403 with same JWT; role removal → 403 with same JWT |
| `test/auth-security-hardening.db.e2e-spec.ts` | Cache-Control on login/refresh; login rate limit → 429 |

## 4. Module Boundaries (post-#007)

| Module | Public exports |
|--------|----------------|
| **UsersModule** | `UserAccountService` |
| **AuthModule** | `JwtAuthGuard`, `JwtModule` |
| **AccessControlModule** | `AccessControlService`, `PermissionGuard` |

Cross-module guard usage: importing modules must import `AuthModule` (for `JwtAuthGuard` + `JwtModule`) and `AccessControlModule` (for `PermissionGuard` + `AccessControlService`).

## 5. Files Changed

| File | Change |
|------|--------|
| `src/modules/auth/auth.module.ts` | ThrottlerModule, export `JwtModule` only |
| `src/modules/auth/controllers/auth.controller.ts` | Throttle decorators, cache-control headers |
| `src/modules/auth/config/auth.config.types.ts` | Throttle config fields |
| `src/modules/auth/config/auth.configuration.ts` | Parse throttle env vars |
| `src/modules/auth/guards/jwt-auth.guard.ts` | Inject JwtService + ConfigService |
| `src/modules/auth/utils/access-token-verification.util.ts` | **New** shared JWT verify |
| `src/modules/auth/utils/auth-response.util.ts` | **New** no-store helper |
| `src/modules/users/services/user-account.service.ts` | Argon2 rehash on login |
| `.env.example`, `.env.test.example` | Throttle vars |
| `test/database/load-test-environment.ts` | High test throttle defaults |
| `test/auth-rbac.db.e2e-spec.ts` | Removal scenarios |
| `test/auth-security-hardening.db.e2e-spec.ts` | **New** hardening E2E |
| Unit/spec updates | auth.configuration, user-account, jwt-auth.guard, module-boundaries, auth-response |

## 6. Validation

| Gate | Result |
|------|--------|
| `npm run quality` | **PASS** — 32 unit suites, 123 tests |
| `npm run test:integration` | **PASS** — 27 tests |
| `npm run test:e2e:db` | **PASS** — 5 suites, 17 tests |
| `npm run build` | **PASS** |

## 7. Environment Variables Added

```env
AUTH_LOGIN_THROTTLE_LIMIT=10
AUTH_LOGIN_THROTTLE_TTL_MS=60000
AUTH_REFRESH_THROTTLE_LIMIT=20
AUTH_REFRESH_THROTTLE_TTL_MS=60000
```

## 8. Known Trade-offs

1. **Stateless access JWT** — After logout or RBAC revocation, access token remains usable until expiry (~15 min). Refresh/logout paths revoke sessions immediately; RBAC checks DB permissions on each guarded request (permissions/roles effective immediately).
2. **IP-based throttling** — Suitable for single-node/dev; production may need Redis-backed throttler storage behind load balancers (future hardening, out of scope).
3. **JwtModule export** — Required NestJS infrastructure export for guard DI across modules; not a business-domain public API.

## 9. Suggested Commit

```
fix(auth): harden authentication and authorization
```

## 10. Definition of Done

- [x] Rate limits on login/refresh
- [x] Argon2 rehash on successful login
- [x] No-store cache headers on token responses
- [x] AccessTokenService no longer exported; guard DI fixed via JwtModule
- [x] RBAC E2E: permission + role removal with same JWT
- [x] Security hardening E2E (cache-control, throttle)
- [x] Logging redaction audit documented
- [x] Session validation trade-off documented
- [x] All quality gates pass
