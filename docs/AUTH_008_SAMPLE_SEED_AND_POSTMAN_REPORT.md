# AUTH #008 — Sample Seed Data + Postman Verification

> Status: **COMPLETE**
> Scope: Local/dev Auth/RBAC seed workflow, dev-only RBAC endpoints, Postman collection — **no production bootstrap, admin CRUD APIs, business-domain seed**
> Next prompt: **AUTH #009** — Final Auth/RBAC Audit + Module Boundary Review

---

## 1. Objective

Provide a safe, explicit, repeatable local/dev seed workflow for Auth/RBAC sample data and a Postman collection to manually verify login, refresh cookie flow, logout, and RBAC allow/deny behavior.

## 2. State Inherited From AUTH #007

| Item | State |
|------|-------|
| Auth stack | Login, refresh, logout, JWT, RBAC guards — **PASS** |
| Rate limiting / rehash / cache-control | **PASS** |
| Seed data | None |
| Dev HTTP RBAC endpoints | None (test-only `/test-rbac` in e2e harness) |

## 3. Seed Architecture

| Component | Path |
|-----------|------|
| Constants | `src/database/seeds/auth-rbac.seed.constants.ts` |
| Orchestrator | `src/database/seeds/auth-rbac.seed.service.ts` |
| Nest module | `src/database/seeds/auth-rbac-seed.module.ts` |
| Environment guard | `src/database/seeds/seed-environment.guard.ts` |
| CLI entry | `scripts/seed-auth-rbac.ts` |

The orchestrator resolves `UserAccountService` and `AccessControlService` via Nest application context — no direct repository access.

## 4. Environment / DB Safety Guards

| Guard | Behavior |
|-------|----------|
| `NODE_ENV=production` | **Rejected** |
| Missing `DB_NAME` | **Rejected** |
| DB allow-list | `catechism_api`, `catechism_api_test` only |
| Auto-run | **Never** — manual CLI only |

## 5. Seed Command

```bash
npm run seed:auth-rbac
```

Requires local `.env` (same as migration CLI). Does not run in CI by default.

## 6. Roles Seeded

| Code | Name |
|------|------|
| `SUPER_ADMIN` | Super Admin |
| `PARISH_ADMIN` | Parish Admin |
| `CATECHIST` | Catechist |
| `PARENT` | Parent |

## 7. Permissions Seeded

| Code | Purpose |
|------|---------|
| `users.read` | Sample user read |
| `users.manage` | Sample user manage |
| `classes.read` | Sample class read |
| `classes.manage` | Sample class manage |
| `auth.test.read` | Dev RBAC read verification |
| `auth.test.manage` | Dev RBAC manage verification |

## 8. Role-Permission Matrix

| Role | Permissions |
|------|-------------|
| **SUPER_ADMIN** | All seeded permissions |
| **PARISH_ADMIN** | `users.*`, `classes.*`, `auth.test.*` |
| **CATECHIST** | `classes.read`, `classes.manage`, `auth.test.read` |
| **PARENT** | `classes.read` only |

## 9. Sample Users

| Email | Role |
|-------|------|
| `superadmin@local.catechism.test` | SUPER_ADMIN |
| `admin@local.catechism.test` | PARISH_ADMIN |
| `catechist@local.catechism.test` | CATECHIST |
| `parent@local.catechism.test` | PARENT |

Domain `@local.catechism.test` is unmistakably local/dev.

## 10. User-Role Matrix

One role per sample user (see section 9).

## 11. Local Sample Credentials

> **LOCAL / DEV ONLY — NOT FOR PRODUCTION**

| Account | Email | Password |
|---------|-------|----------|
| Super Admin | `superadmin@local.catechism.test` | `LocalDev!Sample2026` |
| Parish Admin | `admin@local.catechism.test` | `LocalDev!Sample2026` |
| Catechist | `catechist@local.catechism.test` | `LocalDev!Sample2026` |
| Parent | `parent@local.catechism.test` | `LocalDev!Sample2026` |

Passwords are stored as Argon2id hashes via `UserAccountService.createAccount()`.

## 12. Idempotency Behavior

| Entity | First run | Second run |
|--------|-----------|------------|
| Permissions | Create | Skip (log existing) |
| Roles | Create | Skip (log existing) |
| Users | Create with hash | Skip — **password unchanged** |
| Role assignments | Assign | Reconcile (idempotent) |
| Role-permission links | Assign | Reconcile (idempotent) |

No auth_sessions are seeded.

## 13. Existing Data Reconciliation Rules

- Uses local-only email domain to avoid colliding with real accounts
- Does not delete or overwrite existing passwords
- Does not reset account status
- Does not mutate unrelated roles/permissions outside seeded codes

## 14. Files Created

| File |
|------|
| `src/database/seeds/auth-rbac.seed.constants.ts` |
| `src/database/seeds/auth-rbac.seed.service.ts` |
| `src/database/seeds/auth-rbac-seed.module.ts` |
| `src/database/seeds/seed-environment.guard.ts` |
| `src/database/seeds/seed-environment.guard.spec.ts` |
| `scripts/seed-auth-rbac.ts` |
| `src/dev/dev-rbac.controller.ts` |
| `src/dev/dev-rbac.module.ts` |
| `test/integration/auth-rbac-seed.integration-spec.ts` |
| `test/auth-rbac-dev.db.e2e-spec.ts` |
| `docs/postman/Acutis-Education-Auth-RBAC.postman_collection.json` |
| `docs/postman/Acutis-Education-Local.postman_environment.json` |

## 15. Files Modified

| File | Change |
|------|--------|
| `src/modules/users/services/user-account.service.ts` | Added `findAccountSnapshotByEmail()` |
| `src/app.module.ts` | Conditional `DevRbacModule` (non-production) |
| `package.json` | `seed:auth-rbac` script |
| `tsconfig.json` | Include `scripts/**/*.ts` |
| `README.md` | Local Auth/RBAC demo steps |
| `src/modules/users/services/user-account.service.spec.ts` | Lookup test |

## 16. Dev-Only RBAC Endpoint Decision

**Added** — registered only when `NODE_ENV !== 'production'`:

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/v1/dev/rbac/read` | `auth.test.read` |
| GET | `/api/v1/dev/rbac/manage` | `auth.test.manage` |

Returns `{ "status": "ok" }` only. Uses `JwtAuthGuard` + `PermissionGuard`. Documented for AUTH #009 audit.

## 17. Module Boundary Audit

| Rule | Status |
|------|--------|
| Seed uses `UserAccountService` | **PASS** |
| Seed uses `AccessControlService` | **PASS** |
| No auth_sessions seed | **PASS** |
| No cross-module repository imports in seed | **PASS** |
| Dev controller uses guards only | **PASS** |

## 18. Postman Collection Structure

1. Health / Setup
2. Auth (login, me, refresh, logout, refresh-after-logout)
3. RBAC - Admin (allow read + manage)
4. RBAC - Catechist (allow read, deny manage)
5. RBAC - Parent (deny read + manage)
6. Negative Cases (401/400)

## 19. Postman Environment Variables

`baseUrl`, `email`, `password`, `accessToken`, `userId`, `adminEmail`, `adminPassword`, `catechistEmail`, `catechistPassword`, `parentEmail`, `parentPassword`

No JWT secrets or refresh hash secrets in Postman env.

## 20. Cookie Handling in Postman

- Refresh token managed by Postman cookie jar (`catechism_refresh_token`)
- Login/refresh scripts store `accessToken` only
- Do not extract HttpOnly cookie into environment variables

## 21–27. Verification Flows

| Flow | Expected | Verified via |
|------|----------|--------------|
| Login | 200 + accessToken + Set-Cookie | DB e2e + Postman JSON |
| `/auth/me` | 200 profile | Postman JSON |
| Refresh | 200 + rotated token | Postman JSON |
| Logout | 204 | Postman JSON |
| Refresh after logout | 401 | Postman JSON |
| Admin RBAC | read 200, manage 200 | DB e2e |
| Catechist RBAC | read 200, manage 403 | DB e2e |
| Parent RBAC | read 403, manage 403 | DB e2e |
| Wrong password | 401 | Postman JSON |
| Unknown email | 401 | Postman JSON |
| Malformed login | 400 | Postman JSON |

## 28. Rate Limit Manual Test Note

Postman collection does not auto-fire burst login requests. Rate limit verification remains in `test/auth-security-hardening.db.e2e-spec.ts`. Manual test: repeat login > limit within TTL window.

## 29. Seed Integration Tests

`test/integration/auth-rbac-seed.integration-spec.ts`:
- First run creates all entities
- Second run idempotent
- Production guard rejection

## 30–32. Seed Run Results

Integration tests against `catechism_api_test`: **PASS**

## 33. Local HTTP Verification

`test/auth-rbac-dev.db.e2e-spec.ts`: seed + HTTP allow/deny — **PASS**

## 34. Postman JSON Validation

Both JSON files parse successfully. No hard-coded live tokens or server secrets.

## 35. Existing Test Regression

| Suite | Result |
|-------|--------|
| Unit | 33 suites, 128 tests — **PASS** |
| Integration | 6 suites, 30 tests — **PASS** |
| DB e2e | 6 suites, 20 tests — **PASS** |

## 36. CI Compatibility

Seed is **not** invoked in Bitbucket pipeline. No CI behavior change.

## 37. Docker Validation

`docker build --target production` — not run in this session (Docker unavailable in PowerShell host; use WSL per README).

## 38. Security Review

| Check | Status |
|-------|--------|
| Local-only credentials | **PASS** |
| Strong sample passwords | **PASS** |
| No production bootstrap | **PASS** |
| No session seed | **PASS** |
| Production env guard | **PASS** |
| DB allow-list | **PASS** |
| No destructive reset | **PASS** |
| Dev endpoints disabled in production | **PASS** |

## 39. Commands Executed

`npm run format`, `npm run quality`, `npm run test:integration`, `npm run test:e2e:db`

## 40. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** (128) |
| DB-free e2e | **PASS** (5) |
| build | **PASS** |
| integration | **PASS** (30) |
| auth/rbac DB e2e | **PASS** (20) |
| seed first run | **PASS** |
| seed idempotent second run | **PASS** |
| production guard | **PASS** |
| RBAC allow/deny HTTP | **PASS** |
| Postman JSON parse | **PASS** |

## 41. Known Issues / Deferred

- Permission change via Postman not possible (no admin RBAC HTTP API — by design)
- Docker build not re-validated in this session
- AUTH #009 should audit whether dev endpoints remain or move to test-only module

## 42. Out-of-Scope Confirmation

No production bootstrap admin, parish/class/student seed, admin CRUD APIs, or permission caching.

## 43. AUTH #009 Readiness

Recommend **AUTH #009 — Final Auth/RBAC Audit + Module Boundary Review** when ready.

## 44. Suggested Commit

```
feat(auth): add local RBAC seed workflow
```
