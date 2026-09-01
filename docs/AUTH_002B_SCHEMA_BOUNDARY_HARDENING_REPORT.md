# AUTH #002B — Schema Boundary Hardening

> Status: **COMPLETE**
> Scope: UUID strategy correction, module export boundaries, migration fix — **no services, APIs, or auth packages**
> Next prompt: **AUTH #003** — User module + password/account lifecycle

---

## 1. Objective

Correct AUTH #002 design mismatches before service-layer work: align UUID generation with application-owned UUID v4 semantics, stop exporting raw TypeORM persistence from business modules, and harden integration tests for future module growth.

## 2. Findings From AUTH #002

| ID | Finding | Severity |
|----|---------|----------|
| F-001 | Migration used `NEWSEQUENTIALID()` PK defaults | **HIGH** — conflicts with AUTH #001 application UUID v4 decision |
| F-002 | `UsersModule`, `AuthModule`, `AccessControlModule` exported `TypeOrmModule` | **MEDIUM** — enables cross-module repository injection |
| F-003 | Integration test asserted exactly six business tables total | **LOW** — brittle when future modules add tables |

No incorrect cross-module `@ManyToOne` relations were found.

## 3. UUID Strategy Mismatch

**AUTH #001 decision:** IDs generated in application code (UUID v4), stored as MSSQL `uniqueidentifier`, no DB-generated IDs.

**AUTH #002 state:** Migration `1788055200000` set `default: 'NEWSEQUENTIALID()'` on `users`, `roles`, `permissions`, and `auth_sessions` primary keys. Entities used `@PrimaryGeneratedColumn('uuid')`, implying ORM/DB generation.

**Resolution:** Application assigns UUID v4 at entity construction via `crypto.randomUUID()` helper; corrective migration removes DB defaults on existing databases.

## 4. Migration History Assessment

| Factor | Assessment |
|--------|------------|
| Original migration committed? | **Yes** — commit `3175468 feat(auth): add auth foundation entities and migration` |
| Applied to test DB? | **Yes** |
| Applied to dev DB? | **Yes** (user confirmed `npm run migration:run`) |
| Safe to edit original migration? | **No** — would desync applied history |

**Decision:** Created **new corrective migration** `1788055300000-remove-auth-uuid-database-defaults.ts` that drops default constraints on `id` columns for the four UUID PK tables. Original migration left unchanged for operational history integrity.

Greenfield path: migration 1 creates schema (with defaults) → migration 2 removes UUID defaults immediately. Final schema matches target.

## 5. Final UUID Generation Strategy

| Component | Mechanism |
|-----------|-----------|
| Helper | `src/database/uuid-v4.util.ts` — `generateUuidV4()` wraps `crypto.randomUUID()`, `isUuidV4()` validates RFC v4 shape |
| Entities | `@PrimaryColumn({ type: 'uniqueidentifier' })` + field initializer `id: string = generateUuidV4()` |
| Affected entities | `UserEntity`, `RoleEntity`, `PermissionEntity`, `AuthSessionEntity` |
| Join tables | Unchanged composite PKs (`user_roles`, `role_permissions`) — no synthetic UUIDs |
| Base entity abstraction | **Not created** (per prompt) |

IDs are assigned when `new Entity()` is constructed; explicit assignment remains possible for tests and future seed flows.

## 6. DB Default Verification

Integration test queries `sys.default_constraints` for `id` columns on auth UUID PK tables and asserts `default_definition IS NULL` for all four tables after migrations run.

Fresh test DB (`npm run test:db:prepare -- --reset` + migrations): **PASS** — no UUID DB defaults remain.

## 7. Entity UUID Tests

| Test file | Coverage |
|-----------|----------|
| `src/database/uuid-v4.util.spec.ts` | Helper generates v4; rejects invalid / non-v4 UUIDs |
| `src/database/auth-foundation-uuid-generation.spec.ts` | New instances of all four entities receive distinct RFC UUID v4 ids; explicit id override works |
| `src/database/auth-foundation.entities.spec.ts` | No `@PrimaryGeneratedColumn` / generation metadata on auth entities |

## 8. Module Export Audit

| Module | Before | After |
|--------|--------|-------|
| `UsersModule` | exported `TypeOrmModule` | exports **nothing** |
| `AuthModule` | exported `TypeOrmModule` | exports **nothing** |
| `AccessControlModule` | exported `TypeOrmModule` | exports **nothing** |

All three remain imported in `AppModule` for entity registration via `TypeOrmModule.forFeature` internally.

## 9. Module Export Changes

Removed `exports: [TypeOrmModule]` from all three business modules. Future public APIs will export services/guards only (AUTH #003+).

## 10. Cross-Module Persistence Boundary Test

`src/modules/module-boundaries.spec.ts` asserts each auth business module has **zero exports** and does not export `TypeOrmModule`.

## 11. Cross-Module Entity Import Audit

| Entity | Cross-module imports | Relations |
|--------|---------------------|-----------|
| `AuthSessionEntity` | None | Scalar `userId` only |
| `UserRoleEntity` | None | Scalar `userId`, `roleId` |
| `RolePermissionEntity` | None | Scalar `roleId`, `permissionId` |

**PASS** — unchanged correct behavior. SQL FKs remain in migrations only.

## 12. Integration Test Future-Proofing

Changed assertion from exact equality of six business tables to:

```typescript
expect(businessTableNames).toEqual(expect.arrayContaining([...EXPECTED_AUTH_TABLES]));
```

Future domain modules may add tables without breaking this suite.

Added dedicated integration test for absence of DB UUID defaults on auth PK columns.

## 13. Files Created

| File |
|------|
| `src/database/uuid-v4.util.ts` |
| `src/database/uuid-v4.util.spec.ts` |
| `src/database/auth-foundation-uuid-generation.spec.ts` |
| `src/database/migrations/1788055300000-remove-auth-uuid-database-defaults.ts` |
| `src/modules/module-boundaries.spec.ts` |
| `docs/AUTH_002B_SCHEMA_BOUNDARY_HARDENING_REPORT.md` |

## 14. Files Modified

| File | Change |
|------|--------|
| `src/modules/users/entities/user.entity.ts` | Application UUID v4 primary key |
| `src/modules/auth/entities/auth-session.entity.ts` | Application UUID v4 primary key |
| `src/modules/access-control/entities/role.entity.ts` | Application UUID v4 primary key |
| `src/modules/access-control/entities/permission.entity.ts` | Application UUID v4 primary key |
| `src/modules/users/users.module.ts` | Removed TypeOrmModule export |
| `src/modules/auth/auth.module.ts` | Removed TypeOrmModule export |
| `src/modules/access-control/access-control.module.ts` | Removed TypeOrmModule export |
| `src/database/auth-foundation.entities.spec.ts` | No generated-column metadata assertion |
| `test/integration/database.integration-spec.ts` | Future-safe table assertion + UUID default check |

## 15. Migration Changes

| Migration | Action |
|-----------|--------|
| `1788055200000-create-auth-foundation-schema.ts` | **Unchanged** (committed history) |
| `1788055300000-remove-auth-uuid-database-defaults.ts` | **Added** — drops `NEWSEQUENTIALID()` defaults on four auth PK `id` columns; reversible `down()` restores defaults |

## 16. Fresh Test DB Validation

```bash
npm run test:db:prepare -- --reset
npm run test:db:migrations
```

**PASS** — schema builds from zero; both migrations apply; six auth tables present; no UUID DB defaults on PK columns.

## 17. Development DB Validation

CLI `migration:run` during validation connected to configured test database (`catechism_api_test`) where both migrations were already applied.

**Action for developer dev DB (`catechism_api`):** run once:

```bash
npm run migration:run
```

This applies migration #2 (`RemoveAuthUuidDatabaseDefaults`) non-destructively to remove UUID defaults. No table drops required.

## 18. Migration Re-run Result

Second `npm run migration:show`:

```
[X] 1 CreateAuthFoundationSchema1788055200000
[X] 2 RemoveAuthUuidDatabaseDefaults1788055300000
```

`migration:run` → **No migrations are pending** — **PASS**

## 19. Existing Test Regression

All pre-existing unit, e2e, integration, and DB e2e tests pass after changes. No regressions observed.

## 20. Module Boundary Matrix

| Module | Owns | Repository access | Public exports (002B) | Inbound deps |
|--------|------|-------------------|----------------------|--------------|
| UsersModule | `users` | Private (forFeature internal) | None | AppModule only |
| AuthModule | `auth_sessions` | Private | None | AppModule only |
| AccessControlModule | RBAC tables | Private | None | AppModule only |

No cyclic imports.

## 21. Microservice Extraction Review

| Improvement | Effect |
|-------------|--------|
| Application UUID v4 | User/Auth/Policy services own ID creation semantics consistently |
| No TypeORM exports | Other modules cannot accidentally depend on foreign repositories |
| Scalar FK columns | Auth and RBAC services reference user ids without ORM entity coupling |

Extraction boundary is clearer for AUTH #003 service work.

## 22. Security Review

| Check | Result |
|-------|--------|
| No plaintext passwords introduced | **PASS** |
| No auth packages added | **PASS** |
| No new API surface | **PASS** |
| No logging of secrets | **PASS** |
| Module boundaries reduce privilege leakage risk | **PASS** |

## 23. Commands Executed

```bash
npm run format
npm run quality
npm audit --audit-level=moderate
npm run test:db:prepare -- --reset
npm run test:db:migrations
npm run test:integration
npm run test:e2e:db
npm run migration:run
npm run migration:show
```

## 24. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** (16 suites, 60 tests) |
| DB-free e2e | **PASS** (5 tests) |
| build | **PASS** |
| audit (moderate) | **PASS** (0 vulnerabilities) |
| fresh DB reset + migrations | **PASS** |
| migration run | **PASS** |
| migration rerun (no pending) | **PASS** |
| integration | **PASS** (10 tests) |
| DB e2e | **PASS** |
| quality:full equivalent | **PASS** |
| UUID v4 generation | **PASS** |
| no DB UUID defaults | **PASS** |
| no raw TypeORM exports | **PASS** |
| no cross-module ORM relations | **PASS** |

## 25. Known Issues / Assumptions

- Dev DB must run `npm run migration:run` once if only migration #1 was applied before this prompt (user reported prior run — re-run applies #2 only).
- Original migration still creates then immediately corrects UUID defaults on greenfield installs (two-step). Acceptable for history safety; alternative would require DB reset on all environments.
- Entity field initializers assign IDs at construction; future services should use repository `.create()` / `new Entity()` patterns consistently.
- Docker production build not re-run this prompt; entity-only changes are low risk; CI Docker gate will validate on next push.

## 26. Out-of-Scope Confirmation

Not implemented (as required):

- argon2, bcrypt, JWT, passport
- Login/refresh APIs, guards, services
- New schema columns (lockout, email verify, tenant scope)
- Seed data
- Original migration rewrite

## 27. AUTH #003 Readiness

| Check | Status |
|-------|--------|
| UUID strategy aligned | **PASS** |
| Module persistence private | **PASS** |
| Migrations validated fresh + rerun | **PASS** |
| Integration tests future-safe | **PASS** |
| No boundary regressions | **PASS** |

**AUTH #003 may proceed:** User module + password/account lifecycle foundation (`argon2id`, `UserAccountService`, credential verification) — still no login API until later prompts.

## 28. Commit Message Recommendation

```
git commit -m "fix(auth): harden schema module boundaries"
```

---

**AUTH #002B COMPLETE**
