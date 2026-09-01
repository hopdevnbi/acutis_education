# AUTH #006 — Role + Permission + RBAC Guards

> Status: **COMPLETE**
> Scope: AccessControlService, role/permission assignment, effective permission resolution, `@RequirePermissions()`, `PermissionGuard` — **no seed data, admin CRUD APIs, tenant scope, caching**
> Next prompt: **AUTH #007** — Security Hardening + Full Auth/RBAC Integration

---

## 1. Objective

Implement AccessControlModule application behavior: role/permission creation, user-role and role-permission assignment, effective permission resolution, `@RequirePermissions()` decorator, and `PermissionGuard` — without sample seeds, admin HTTP APIs, or JWT permission claims.

## 2. State Inherited From AUTH #005

| Item | State |
|------|-------|
| Login/refresh/logout | **PASS** |
| Access JWT claims | `sub`, `sid`, `iat`, `exp` only |
| RBAC schema | Present, unused |
| AccessControlModule | Entity registration only |

## 3. Architecture / Module Boundary Audit

| Module | Owns | Public exports |
|--------|------|----------------|
| **UsersModule** | `users`, credentials | `UserAccountService` |
| **AuthModule** | identity, sessions, JWT | `JwtAuthGuard`, `AccessTokenService`* |
| **AccessControlModule** | roles, permissions, assignments | `AccessControlService`, `PermissionGuard` |

\* `AccessTokenService` exported so `JwtAuthGuard` resolves when composed on controllers outside AuthModule (NestJS DI requirement for test RBAC routes).

AccessControlModule has **no** dependency on UsersModule — user existence validated via SQL FK on `user_roles.user_id`.

## 4. Existing RBAC Schema Assessment

Existing tables sufficient — **no migration added**:

- `roles`, `permissions`, `user_roles`, `role_permissions`

## 5. Files Created

| File |
|------|
| `src/modules/access-control/services/access-control.service.ts` |
| `src/modules/access-control/guards/permission.guard.ts` |
| `src/modules/access-control/guards/permission.guard.spec.ts` |
| `src/modules/access-control/decorators/require-permissions.decorator.ts` |
| `src/modules/access-control/constants/require-permissions-metadata.constants.ts` |
| `src/modules/access-control/errors/access-control.errors.ts` |
| `src/modules/access-control/interfaces/*.interface.ts` |
| `src/modules/access-control/mappers/role.mapper.ts` |
| `src/modules/access-control/mappers/permission.mapper.ts` |
| `src/modules/access-control/utils/role-code.util.ts` |
| `src/modules/access-control/utils/role-code.util.spec.ts` |
| `src/modules/access-control/utils/permission-code.util.ts` |
| `src/modules/access-control/utils/permission-code.util.spec.ts` |
| `test/integration/access-control.integration-spec.ts` |
| `test/auth-rbac.db.e2e-spec.ts` |
| `test/rbac-test/rbac-test.controller.ts` |
| `test/rbac-test/rbac-test.module.ts` |
| `test/create-rbac-database-test-application.ts` |
| `docs/AUTH_006_ROLE_PERMISSION_RBAC_REPORT.md` |

## 6. Files Modified

| File | Change |
|------|--------|
| `src/modules/access-control/access-control.module.ts` | Service, guard, exports |
| `src/modules/auth/auth.module.ts` | Export `AccessTokenService` for guard DI |
| `src/modules/module-boundaries.spec.ts` | Updated export expectations |

## 7. AccessControlModule Architecture

```
AccessControlModule
├── repositories (private): Role, Permission, UserRole, RolePermission
├── AccessControlService (public)
├── PermissionGuard + Reflector (public guard)
└── @RequirePermissions decorator (direct import)
```

## 8. Public Exports

| Export | Module |
|--------|--------|
| `UserAccountService` | UsersModule |
| `JwtAuthGuard`, `AccessTokenService` | AuthModule |
| `AccessControlService`, `PermissionGuard` | AccessControlModule |

No TypeOrmModule, repository, or entity exports.

## 9. Role Code Strategy

- Trim + uppercase
- Pattern: `[A-Z][A-Z0-9_]*`
- Max length: 64
- Examples: `CATECHIST`, `PARISH_ADMIN` (not seeded)

## 10. Permission Code Strategy

- Trim + lowercase
- Pattern: `[a-z][a-z0-9_-]*(\.[a-z][a-z0-9_-]*)+` (requires at least one dot)
- Convention: `{resource}.{action}` e.g. `users.read`, `classes.manage`

## 11–14. Creation & Assignment

**AccessControlService** public API:

| Method | Behavior |
|--------|----------|
| `createRole(input)` | Normalize code, persist, return `RoleSnapshot` |
| `createPermission(input)` | Normalize code, persist, return `PermissionSnapshot` |
| `assignRoleToUser(userId, roleCode)` | Idempotent |
| `removeRoleFromUser(userId, roleCode)` | Idempotent |
| `assignPermissionToRole(roleCode, permissionCode)` | Idempotent |
| `removePermissionFromRole(roleCode, permissionCode)` | Idempotent |
| `getRolesForUser(userId)` | `RoleSnapshot[]` |
| `getEffectivePermissions(userId)` | Unique sorted permission codes |
| `userHasPermission(userId, permissionCode)` | Boolean |

Duplicate codes → `RoleCodeAlreadyExistsError` / `PermissionCodeAlreadyExistsError`.  
Missing role/permission → `RoleNotFoundError` / `PermissionNotFoundError`.  
Invalid user on assignment → `UserNotFoundForRoleAssignmentError` (FK violation mapped).

## 15. Idempotency Decisions

All assign/remove operations are **idempotent** — repeat assign/remove does not fail.

## 16. Effective Permission Resolution

Single joined query across `user_roles → roles → role_permissions → permissions`:

- Deduplicated permission codes
- Sorted ascending
- No caching (DB query per guard invocation)

## 17. Query Strategy / N+1 Review

One query for `getEffectivePermissions()` — no N+1 loop. `PermissionGuard` calls it once per request and checks all required permissions in memory.

## 18. userHasPermission Behavior

- Malformed code → `InvalidPermissionCodeError`
- Well-formed but unassigned → `false`

## 19. @RequirePermissions Decorator

```typescript
@RequirePermissions('users.read', 'users.manage')
```

- Validates/normalizes codes at decorator registration
- Rejects empty declarations

## 20. PermissionGuard

- Reads metadata via `Reflector`
- Requires prior `JwtAuthGuard` authentication
- No metadata → allow authenticated request
- Missing auth context → `401 Unauthorized`
- Missing permission → `403 Forbidden` (generic message)

## 21. Guard Composition

```typescript
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions('test.read')
```

## 22. Multiple Permission Semantics

**ALL required** — every listed permission must be present.

## 23. Forbidden / Unauthorized Behavior

| Case | Status | Message |
|------|--------|---------|
| Not authenticated | 401 | `Invalid credentials` |
| Authenticated, missing permission | 403 | `Forbidden` |

No permission topology leaked in responses.

## 24. JWT Claims Review

JWT remains: `sub`, `sid`, `iat`, `exp` — **no roles or permissions embedded**.

## 25. Integration Tests

`test/integration/access-control.integration-spec.ts` — create role/permission, duplicates, assignment idempotency, effective permissions union/dedup, removal updates, FK user mapping.

## 26. DB-Aware RBAC E2E

Test-only routes (not in production AppModule controllers):

- `GET /api/v1/test-rbac/read` → requires `test.read`
- `GET /api/v1/test-rbac/manage` → requires `test.manage`
- `GET /api/v1/test-rbac/authenticated-only` → auth only

## 27. Immediate Permission Change Test

Same access JWT reflects new permission after `assignPermissionToRole()` — **PASS** (proves permissions not in JWT).

## 28. Multiple Roles / Deduplication Test

User with two roles granting overlapping permissions receives deduplicated effective list — **PASS**.

## 29. Existing Test Regression

All prior auth/CI tests pass.

## 30. CI / Docker Compatibility

No pipeline changes required. Docker production build **PASS**.

## 31. Security Review

| Check | Result |
|-------|--------|
| Deny unauthorized → 403 | **PASS** |
| No permission info leak | **PASS** |
| No role-name bypass | **PASS** |
| No direct user-permission grants | **PASS** |
| No JWT permission claims | **PASS** |
| No cross-module repository access | **PASS** |
| No hard-coded super-admin bypass | **PASS** |
| FK integrity on assignments | **PASS** |

## 32. Module Boundary Audit After Implementation

**PASS** — acyclic, no persistence exports, no entity leakage.

## 33. Future Microservice Extraction

AccessControl service owns RBAC tables; public API accepts `userId` + permission codes as scalars.

## 34. Performance / Cache Deferred

DB query per protected request — Redis/cache deferred.

## 35. Tenant/Parish Scope Deferred

Current RBAC is **global** — no `parish_id` scoping.

## 36. Commands Executed

```
npm run format
npm run quality
npm run test:integration
npm run test:e2e:db
npm audit --audit-level=moderate
docker build --target production
```

## 37. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit (31 suites, 120 tests) | **PASS** |
| DB-free e2e | **PASS** |
| build | **PASS** |
| audit | **PASS** |
| quality | **PASS** |
| DB integration | **PASS** (27 tests) |
| RBAC DB e2e | **PASS** |
| Docker production build | **PASS** |
| role/permission creation | **PASS** |
| assignment idempotency | **PASS** |
| effective permissions | **PASS** |
| allow/deny 403 | **PASS** |
| immediate permission change (same JWT) | **PASS** |
| no JWT permission claims | **PASS** |
| no persistence exports | **PASS** |
| no sample seed data | **PASS** |

## 38. Known Issues / Deferred Items

- Permission caching
- Admin CRUD HTTP APIs
- Tenant/parish-scoped RBAC
- Role hierarchy/inheritance
- Sample seed data (AUTH #008)
- Rate limiting, CSRF hardening (AUTH #007)

## 39. Out-of-Scope Confirmation

Not implemented: seed data, admin endpoints, tenant scope, role hierarchy, permission cache, super-admin bypass.

## 40. AUTH #007 Readiness

Next: security hardening audit — rate limiting, CSRF, session cleanup, Argon2 rehash, full auth/RBAC e2e matrix.

## 41. Commit Message Recommendation

```
git commit -m "feat(auth): add role permission authorization"
```
