# AUTH #009 — Final Auth/RBAC Audit + Module Boundary Review

> Status: **COMPLETE**
> Phase decision: **AUTH / USER / ROLE / PERMISSION PHASE COMPLETE**
> Scope: Independent final audit of AUTH #001–#008 deliverables, one security hardening fix, full validation

---

## 1. Objective

Independently audit the entire Auth/User/Role/Permission phase: module boundaries, security flows, tests, seed/Postman assets, CI/Docker compatibility, and microservice-readiness. Fix genuine issues only, then declare phase completion.

## 2. State Before Final Audit

| Area | State |
|------|-------|
| AUTH #001–#008 | Reports marked COMPLETE |
| Modules | Users, Auth, AccessControl implemented |
| Migrations | 3 auth foundation migrations |
| Seed + Postman | AUTH #008 delivered |
| Dev RBAC HTTP | Registered when `NODE_ENV !== production` (auto-enabled) |
| Uncommitted work | Demo-flag hardening applied in this audit |

## 3. Audit Method

1. Read all AUTH reports (#001–#008), `PROJECT_RULES.md`, module source
2. Cross-module ORM import search
3. Export/metadata boundary spec review
4. Security flow review (JWT, refresh, RBAC, cookies, logging, rate limits)
5. Test matrix mapping to E2E/integration coverage
6. Implement one HIGH-priority hardening fix (demo endpoint opt-in)
7. Re-run full quality + DB gates + Docker production build

## 4. Findings Summary

| ID | Severity | Area | Finding | Action |
|----|----------|------|---------|--------|
| F-009-001 | **HIGH** | Dev endpoints | `/api/v1/dev/rbac/*` registered for all non-production runtimes by default | **FIXED** — require `AUTH_RBAC_DEMO_ENABLED=true` + non-production |
| F-009-002 | INFO | AuthModule exports | `JwtModule` export required for `JwtAuthGuard` DI on controllers outside AuthModule | **KEEP** — framework export, not business API |
| F-009-003 | INFO | Access JWT | Stateless access token valid until expiry after logout | **ACCEPT** — documented residual risk (~15 min) |
| F-009-004 | INFO | Rate limiting | IP/in-memory `@nestjs/throttler` not replica-safe | **DEFER** — document; Redis out of scope |
| F-009-005 | INFO | RBAC scope | Global roles/permissions; no parish/tenant scope | **ACCEPT** — phase boundary |
| F-009-006 | INFO | RBAC performance | `PermissionGuard` queries DB per protected request | **ACCEPT** — cache deferred |
| F-009-007 | INFO | Postman RBAC changes | No HTTP API to mutate permissions during Postman run | **ACCEPT** — covered by integration/e2e tests |
| F-009-008 | LOW | CSRF | No dedicated CSRF middleware | **DEFER** — document mitigations; topology-dependent |

**Unresolved BLOCKER:** 0  
**Unresolved HIGH:** 0

## 5. Module Ownership Audit — PASS

| Module | Owns |
|--------|------|
| **UsersModule** | `users`, password hash, account lifecycle, credential verification |
| **AuthModule** | login, access JWT, `auth_sessions`, refresh, logout, guards |
| **AccessControlModule** | roles, permissions, assignments, permission evaluation |

No module mutates another module's tables via repository in application code.

## 6. Dependency Direction Audit — PASS

```
UsersModule          (no auth dependency)
    ↑
AuthModule           → UsersModule (UserAccountService)
AccessControlModule  (no UsersModule import; FK at SQL only)
AppModule            → all three + optional DevRbacModule
```

- No cycles, no `forwardRef()`

## 7. Public Export Audit — PASS

| Module | Exports | Notes |
|--------|---------|-------|
| UsersModule | `UserAccountService` | |
| AuthModule | `JwtAuthGuard`, `JwtModule` | JwtModule required for guard DI cross-module |
| AccessControlModule | `AccessControlService`, `PermissionGuard` | |

Not exported: entities, repositories, TypeOrmModule, `AccessTokenService`, `PasswordHashService`, session services.

## 8. Cross-Module ORM Audit — PASS

Entity imports outside owning module limited to:
- Module-internal services/mappers
- `src/database/*.spec.ts` metadata tests
- Test harness (acceptable)

No production cross-module repository usage.

## 9. UUID / Migration Audit — PASS

- Application-generated UUID v4 (`generateUuid()`)
- Migration #2 removed DB UUID defaults
- No `NEWID()` / `NEWSEQUENTIALID()` in committed migrations
- `synchronize=false`, `migrationsRun=false`
- Migration chain: create schema → remove UUID defaults → refresh hash unique index

## 10. User Account Security Audit — PASS

- Email normalized (trim + lowercase)
- Global unique email (DB + service mapping)
- Password policy min 12 / max 128
- Argon2id hashing; no plaintext storage
- Timing-safe dummy verify for unknown email
- Generic `Invalid credentials` for failures
- ACTIVE / INACTIVE / LOCKED enforced
- Rehash on successful login (non-blocking)
- Safe snapshots only (no password hash in exports)

## 11. Password / Argon2 Audit — PASS

`PasswordHashService`: argon2id via `argon2` package. Verified in Docker build (native module compiles).

## 12. JWT Config Audit — PASS

- `JWT_ACCESS_SECRET` required, min 32 chars, forbidden placeholders rejected
- HS256 explicit in sign/verify
- Claims: `sub`, `sid`, `iat`, `exp` only
- No roles/permissions in token

## 13. JwtAuthGuard Audit — PASS

- Bearer Authorization only
- Missing/malformed/invalid/expired/wrong signature → 401
- Invalid `sub`/`sid` UUID → 401
- Algorithms restricted to HS256

## 14. Refresh / Session Audit — PASS

- Opaque 256-bit refresh tokens
- HMAC-SHA-256 hash at rest (`JWT_REFRESH_HASH_SECRET`)
- One row per refresh instance; `token_family_id`
- Unique index on `refresh_token_hash`
- Rotation on refresh; family revocation on replay
- Logout revokes session + clears cookie

## 15. Replay / Concurrency Audit — PASS

- Reuse detection runs outside rotation transaction (AUTH #005 fix)
- Sequential replay tested in integration/e2e
- Pessimistic lock used in rotation path

## 16. Access JWT Revocation Tradeoff — ACCEPTED

After logout/session revocation, access JWT remains valid until expiry (~15 min with default TTL). RBAC permission checks remain live (DB-backed). Acceptable for current scale; document for operators.

## 17. Cookie Security Audit — PASS

- HttpOnly refresh cookie
- Secure in production
- SameSite, path scoped to auth routes
- maxAge from config
- Clear cookie matches set options
- Refresh token not in JSON body

## 18. CSRF / CORS Review — DOCUMENTED

Current mitigations:
- Refresh token in HttpOnly cookie (not accessible to JS)
- Short-lived access JWT in Authorization header
- No wildcard CORS + credentials configuration added

Future trigger: explicit CSRF/origin policy when frontend deployment topology is fixed.

## 19. Rate Limiting Audit — PASS

- Login + refresh throttled via named limiters
- Env-configurable limits with safe defaults
- High limits in test harness
- 429 covered in e2e
- Documented: not distributed across replicas

## 20. Cache-Control Audit — PASS

Login and refresh responses set `Cache-Control: no-store` and `Pragma: no-cache`.

## 21. Logging / Redaction Audit — PASS

`ApplicationLoggingModule` redacts: Authorization, Cookie, Set-Cookie, password fields, token fields, secrets. No token/password logging found in auth code paths.

## 22. RBAC Model Audit — PASS

- User → Roles → Permissions (no direct user-permission grants)
- No role hierarchy, no hard-coded SUPER_ADMIN bypass in guards
- Permissions data-driven from DB

## 23. AccessControlService Audit — PASS

- Idempotent create/assign/remove
- Effective permissions via single joined query with DISTINCT
- Code normalization (uppercase roles, lowercase dotted permissions)
- Duplicate/error mapping clean

## 24. PermissionGuard Audit — PASS

- JwtAuthGuard must run first (401 without auth)
- Missing permission → 403 generic
- `@RequirePermissions` = ALL required
- No metadata → authenticated-only pass-through
- Permission/role changes effective immediately with same JWT

## 25. Tenant Scope Deferred Decision — ACCEPTED

Phase-1 RBAC is global (no `parish_id`). Future domain modules may require scoped authorization redesign.

## 26. Seed Workflow Audit — PASS

- Manual CLI only (`npm run seed:auth-rbac`)
- Production rejected; DB allow-list
- Idempotent; uses `UserAccountService` + `AccessControlService`
- No session seed; strong local-only passwords in gitignored docs/constants

## 27. Demo Endpoint Audit — HARDENED

**Decision:** Keep dev endpoints with **explicit opt-in**.

| Condition | Dev RBAC routes |
|-----------|-----------------|
| `NODE_ENV=production` | Never registered |
| `AUTH_RBAC_DEMO_ENABLED=false` (default) | Not registered |
| Non-production + `AUTH_RBAC_DEMO_ENABLED=true` | Registered |

Implementation:
- `AppModule.forRoot()` dynamic module
- `src/dev/is-auth-rbac-demo-enabled.ts`
- Env validation default `false`

E2E verifies both enabled (200) and disabled (404) behavior.

## 28. Postman Collection Audit — PASS

- Valid Postman v2.1 JSON
- Folders: Health, Auth, RBAC Admin/Catechist/Parent, Negative
- Cookie jar for refresh; accessToken scripts
- No JWT/refresh hash secrets; no hard-coded live tokens
- **Note:** Set `AUTH_RBAC_DEMO_ENABLED=true` before running RBAC dev routes locally

## 29. README Audit — PASS

Documents migrations, seed, optional demo flag, Postman import. No plaintext passwords in tracked README.

## 30. Dependency Audit — PASS

Runtime additions justified: `argon2`, `@nestjs/jwt`, `cookie-parser`, `@nestjs/throttler`. No redundant auth packages. `npm audit --audit-level=moderate` passes in quality gate.

## 31. Schema / Index Audit — PASS

Indexes present: unique email, role code, permission code, user_roles pair, role_permissions pair, auth_sessions user_id, token_family_id, unique refresh_token_hash.

## 32. Test Architecture Audit — PASS

| Layer | DB | Notes |
|-------|-----|-------|
| Unit | No | 34 suites |
| Infrastructure e2e | No | Health/global filter |
| Integration | `catechism_api_test` | Users, auth session, RBAC, seed |
| DB e2e | `catechism_api_test` | Full auth/RBAC matrix |
| RBAC test controller | Test module only | Not in production AppModule |

## 33. Full Auth/RBAC E2E Matrix

| Flow | Result |
|------|--------|
| ACTIVE login success | PASS |
| INACTIVE denied | PASS |
| LOCKED denied | PASS |
| Wrong password / unknown email | PASS |
| Malformed login body | PASS |
| Rate limit 429 | PASS |
| JWT valid / missing / malformed | PASS |
| Refresh success + rotation | PASS |
| Refresh replay → family revoke | PASS |
| Refresh after logout → 401 | PASS |
| Logout 204 | PASS |
| RBAC no role → 403 | PASS |
| RBAC allow / deny | PASS |
| Permission add/remove same JWT | PASS |
| Role remove same JWT | PASS |
| Seed first/second run | PASS |
| Production seed reject | PASS |
| Dev demo disabled → 404 | PASS |
| Dev demo enabled allow/deny | PASS |

## 34. Docker Production Build — PASS

```bash
wsl docker build --target production -t catechism-api:auth-final .
```

Exit code 0.

## 35. CI Compatibility — PASS

Bitbucket pipeline: quality → DB tests → Docker build. JWT + refresh secrets in CI env. No seed in CI. Demo module not enabled (`AUTH_RBAC_DEMO_ENABLED` defaults false).

## 36. Files Created (AUTH #009)

| File |
|------|
| `src/dev/is-auth-rbac-demo-enabled.ts` |
| `src/dev/is-auth-rbac-demo-enabled.spec.ts` |
| `docs/AUTH_009_FINAL_AUTH_RBAC_AUDIT_REPORT.md` |

## 37. Files Modified (AUTH #009)

| File | Change |
|------|--------|
| `src/app.module.ts` | Dynamic `AppModule.forRoot()` + demo opt-in |
| `src/main.ts` | Use `AppModule.forRoot()` |
| `src/config/env.validation.ts` | `AUTH_RBAC_DEMO_ENABLED` |
| `src/config/env.validation.spec.ts` | Updated expectations |
| `.env.example` | Demo flag documented |
| `README.md` | Demo flag in local workflow |
| `test/create-database-test-application.ts` | Accept `AppModuleOptions` |
| `test/create-rbac-database-test-application.ts` | `AppModule.forRoot()` |
| `test/auth-rbac-dev.db.e2e-spec.ts` | Demo enabled/disabled tests |

## 38. Changes Implemented

Single substantive fix: **demo RBAC endpoint explicit opt-in** (F-009-001). No other code defects requiring change were found.

## 39. Security Review — PASS

- No production bootstrap credentials
- No auto-seed on startup/CI/migrations
- Demo routes never in production
- Secrets not in Postman/README
- Raw refresh tokens never persisted

## 40. Module Boundary Matrix

| Module | Owned tables | Public exports | Inbound | Outbound |
|--------|--------------|----------------|---------|----------|
| UsersModule | `users` | `UserAccountService` | AuthModule, seed | DatabaseModule |
| AuthModule | `auth_sessions` | `JwtAuthGuard`, `JwtModule` | App, DevRbac, tests | UsersModule, JWT config |
| AccessControlModule | `roles`, `permissions`, `user_roles`, `role_permissions` | `AccessControlService`, `PermissionGuard` | App, DevRbac, tests | DatabaseModule |

## 41. Future Microservice Extraction Map

| Future service | Extract with | Boundary change |
|----------------|--------------|-----------------|
| Identity/Users | `users` table + `UserAccountService` API | Auth calls HTTP verify instead of in-process service |
| Auth | `auth_sessions` + token issuance | Depends on Identity API for credentials |
| Policy/RBAC | roles/permissions/assignments | User references become scalar IDs validated at API edge |

ORM entities must not cross service boundaries; public module APIs become client contracts.

## 42. Remaining Risks (Accepted/Deferred)

| Risk | Severity | Status |
|------|----------|--------|
| Access JWT valid after logout (~15 min) | MEDIUM | Accepted |
| In-memory rate limit per instance | LOW | Deferred |
| No RBAC cache | LOW | Deferred |
| No CSRF middleware | LOW | Deferred (documented) |
| Global RBAC without tenant scope | INFO | Future design trigger |

## 43. Out-of-Scope Confirmation

No parish/student/class modules, admin CRUD, registration, password reset, MFA, OAuth, Redis, deployment, or production bootstrap.

## 44. Commands Executed

```
npm run format
npm run quality
npm run test:integration
npm run test:e2e:db
wsl docker build --target production -t catechism-api:auth-final .
```

## 45. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit (34 suites, 132 tests) | **PASS** |
| DB-free e2e (5 tests) | **PASS** |
| build | **PASS** |
| integration (30 tests) | **PASS** |
| DB auth/rbac e2e (21 tests) | **PASS** |
| seed first/second run | **PASS** |
| production seed rejection | **PASS** |
| Postman JSON parse | **PASS** |
| Docker production build | **PASS** |
| module export boundaries | **PASS** |
| no cross-module repositories | **PASS** |
| no raw refresh persistence | **PASS** |
| no production demo exposure | **PASS** |

## 46. Completion Decision

**AUTH / USER / ROLE / PERMISSION PHASE COMPLETE**

## 47. Next Phase Recommendation

Per master roadmap sequence, the next major backend phase is likely:

**Parish / Academic Year / Catechism Level foundation**

(Implement only when the corresponding prompt explicitly authorizes it.)

## 48. Suggested Commit

```
fix(auth): finalize auth RBAC boundaries
```
