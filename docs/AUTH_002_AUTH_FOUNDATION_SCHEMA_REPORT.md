# AUTH #002 — Auth Foundation Schema (Entities + Migrations)

> Status: **COMPLETE**
> Scope: TypeORM entities, module skeletons, reviewable migration — **no services, guards, controllers, or APIs**
> Next prompt: **AUTH #003** (password hashing + user account services)

---

## 1. Objective

Implement the Auth/RBAC database foundation from AUTH #001: TypeORM entities, NestJS module skeletons with `TypeOrmModule.forFeature`, and a single reviewable migration creating all auth-related tables on MSSQL.

## 2. Scope

In scope:

- `UserEntity`, `AuthSessionEntity`, `RoleEntity`, `PermissionEntity`, `UserRoleEntity`, `RolePermissionEntity`
- Minimal `UsersModule`, `AuthModule`, `AccessControlModule` (entity registration only)
- Migration `1788055200000-create-auth-foundation-schema.ts`
- Entity metadata unit tests
- Integration test update for expected auth tables after migration

Out of scope:

- Login/register/refresh/logout endpoints
- JWT, guards, decorators, DTOs for auth flows
- `UserAccountService`, password hashing (`argon2` package)
- Seed data for roles/permissions
- JWT environment variables

## 3. Design Alignment (AUTH #001)

| Decision | Implementation |
|----------|----------------|
| UserModule owns `users` | `UserEntity` in `src/modules/users/` |
| AuthModule owns `auth_sessions` | `AuthSessionEntity` in `src/modules/auth/` |
| AccessControlModule owns RBAC tables | Four entities in `src/modules/access-control/` |
| `password_hash` on users | Column mapped as `passwordHash` → `password_hash` via SnakeNamingStrategy |
| Email login identifier | `email` nvarchar(320), unique index |
| User status | `UserStatus` enum: `ACTIVE`, `INACTIVE`, `LOCKED` |
| No cross-module ORM relations | FK columns only (`userId`, etc.); no `@ManyToOne` across modules |
| Composite PK on join tables | `user_roles`, `role_permissions` |
| Session privacy | No IP/user agent columns |
| FK delete policy | `NO ACTION` on all foreign keys |

## 4. Module Structure

```
src/modules/
  users/
    enums/user-status.enum.ts
    entities/user.entity.ts
    users.module.ts
  auth/
    entities/auth-session.entity.ts
    auth.module.ts
  access-control/
    entities/role.entity.ts
    entities/permission.entity.ts
    entities/user-role.entity.ts
    entities/role-permission.entity.ts
    access-control.module.ts
```

`AppModule` imports all three modules. Each module exports `TypeOrmModule` for future service prompts.

## 5. Database Tables

| Table | Primary key | Notable constraints |
|-------|-------------|---------------------|
| `users` | `id` (uniqueidentifier) | `UQ_users_email` |
| `roles` | `id` | `UQ_roles_code` |
| `permissions` | `id` | `UQ_permissions_code` |
| `auth_sessions` | `id` | FK → `users`; indexes on `user_id`, `token_family_id` |
| `user_roles` | (`user_id`, `role_id`) | FKs → `users`, `roles` |
| `role_permissions` | (`role_id`, `permission_id`) | FKs → `roles`, `permissions` |

Migration order respects FK dependencies: base tables → sessions → join tables.

## 6. Migration

File: `src/database/migrations/1788055200000-create-auth-foundation-schema.ts`

- Hand-written using TypeORM `Table`, `TableIndex`, `TableForeignKey` APIs
- Reversible `down()` drops tables in reverse dependency order
- Uses `NEWSEQUENTIALID()` for PK defaults, `GETUTCDATE()` for timestamps

Apply locally:

```bash
npm run migration:run      # development DB (catechism_api)
npm run migration:show     # status
npm run migration:revert   # rollback last migration
```

## 7. Module Boundary Compliance

| Rule | Status |
|------|--------|
| No cross-module repository imports | **PASS** — modules only register own entities |
| No cross-module `@ManyToOne` relations | **PASS** — `AuthSessionEntity` has no relation to `UserEntity` |
| SQL FKs for integrity | **PASS** — in migration only |
| No auth business logic in shared folders | **PASS** |

## 8. Tests Added / Updated

| Test | Purpose |
|------|---------|
| `src/database/auth-foundation.entities.spec.ts` | Table names, column metadata, no cross-module relations, composite PKs |
| `test/integration/database.integration-spec.ts` | Runs pending migrations; asserts exactly six auth business tables |

## 9. Argon2 / Password Hashing

Per AUTH #001, **Argon2id** is the chosen algorithm for AUTH #003. This prompt does not install `argon2` — only the `password_hash` column exists. Docker/CI native module verification deferred to AUTH #003.

## 10. Validation Results

| Gate | Result |
|------|--------|
| `npm run quality` | **PASS** (13 suites, 49 unit tests) |
| `npm run test:db:migrations` | **PASS** — migration applied to `catechism_api_test` |
| `npm run test:integration` | **PASS** (9 tests) |
| `npm run test:e2e:db` | **PASS** |
| `npm run migration:run` (dev DB) | **PASS** |

## 11. Files Changed

| File | Change |
|------|--------|
| `src/modules/users/**` | User entity, status enum, module |
| `src/modules/auth/**` | Auth session entity, module |
| `src/modules/access-control/**` | RBAC entities, module |
| `src/database/migrations/1788055200000-create-auth-foundation-schema.ts` | New migration |
| `src/database/auth-foundation.entities.spec.ts` | Entity metadata tests |
| `src/app.module.ts` | Import auth foundation modules |
| `test/integration/database.integration-spec.ts` | Expected auth tables after migration |

## 12. Suggested Commit Message

```
feat(auth): add auth foundation entities and migration
```

## 13. AUTH #003 Readiness

| Item | Ready |
|------|-------|
| Schema and entities in place | Yes |
| Migration validated on test + dev DB | Yes |
| Module shells export TypeOrmModule | Yes |
| No conflicting auth implementation | Yes |

**AUTH #003 may proceed** with password hashing (`argon2id`), `UserAccountService`, and credential verification — still no login API until later prompts.

## 14. Completion Statement

**AUTH #002 COMPLETE.** Auth foundation schema is implemented as entities and a reviewable migration. No authentication APIs or business services were added.
