# AUTH #003 — User Module + Password / Account Lifecycle Foundation

> Status: **COMPLETE**
> Scope: UserAccountService, Argon2id hashing, credential verification — **no HTTP/login/JWT/RBAC**
> Next prompt: **AUTH #004** — Authentication + Access Token

---

## 1. Objective

Implement UserModule application services: email normalization, secure password hashing (Argon2id), account creation, credential verification, and a narrow public contract for future AuthModule use — without HTTP endpoints, JWT, sessions, or RBAC.

## 2. State Inherited From AUTH #002B

| Item | State |
|------|-------|
| Auth schema + migrations | Applied (migrations #1 and #2) |
| Entity UUID v4 (application-generated) | **PASS** |
| Module persistence exports | Private (no TypeOrmModule export) |
| UsersModule | Entity registration only — no services yet |

Migration preflight: both migrations marked applied via `npm run migration:show`.

## 3. Module Boundary Audit Before Implementation

| Check | Result |
|-------|--------|
| AuthModule must not access UserEntity/repository | No AuthModule changes |
| UsersModule must not import AuthModule | Confirmed |
| password_hash owned by UserModule | Planned in service layer |

## 4. Dependencies Added

| Package | Version | Type |
|---------|---------|------|
| `argon2` | `^0.45.1` (runtime dependency) | **runtime** `dependencies` |

No `@nestjs/jwt`, `passport`, or `bcrypt` added.

## 5. Argon2 Compatibility Result

| Environment | Result |
|-------------|--------|
| Node.js 22.23.1 (local/WSL) | **PASS** — hash/verify unit tests |
| `npm run build` | **PASS** |
| Docker production (`docker build --target production`) | **PASS** |
| Bitbucket CI | Expected **PASS** — existing Docker build gate; no pipeline change |

**Algorithm:** Argon2id via `{ type: argon2.argon2id }` (library defaults for memory/time/parallelism). PHC strings fit `nvarchar(255)` (typical ~97 chars).

**Rehash:** `PasswordHashService.needsRehash()` delegates to `argon2.needsRehash()` for future upgrade path; automatic rehash deferred.

## 6. Files Created

| File |
|------|
| `src/modules/users/services/user-account.service.ts` |
| `src/modules/users/services/password-hash.service.ts` |
| `src/modules/users/utils/email-normalizer.ts` |
| `src/modules/users/utils/password-policy.ts` |
| `src/modules/users/mappers/user-account.mapper.ts` |
| `src/modules/users/interfaces/*.interface.ts` |
| `src/modules/users/errors/user-account.errors.ts` |
| `src/modules/users/services/*.spec.ts` |
| `src/modules/users/utils/*.spec.ts` |
| `test/integration/user-account.integration-spec.ts` |
| `docs/AUTH_003_USER_ACCOUNT_PASSWORD_FOUNDATION_REPORT.md` |

## 7. Files Modified

| File | Change |
|------|--------|
| `src/modules/users/users.module.ts` | Providers + export `UserAccountService` only |
| `src/modules/module-boundaries.spec.ts` | UsersModule may export service; others unchanged |
| `package.json` / `package-lock.json` | Added `argon2` dependency |

## 8. UserModule Architecture

```
UsersModule
├── TypeOrmModule.forFeature([UserEntity])  (private)
├── PasswordHashService                     (private)
└── UserAccountService                      (public export)
```

## 9. Public UserModule Exports

| Export | Purpose |
|--------|---------|
| `UserAccountService` | `createAccount`, `verifyCredentials` |

**Not exported:** `TypeOrmModule`, `UserEntity`, `PasswordHashService`, repository.

## 10. Email Normalization Strategy

`normalizeEmail(email)`: trim + lowercase. Used consistently for create and verify. No Gmail dot-removal or alias rewriting.

## 11. Email Validation

Uses existing `class-validator` `isEmail()` on normalized value. Invalid email on **create** → `InvalidEmailError`. Invalid email on **verify** → generic `{ valid: false }`.

## 12. Password Policy

| Rule | Value |
|------|-------|
| Minimum length | 12 |
| Maximum length | 128 |
| Complexity rules | None (length only) |

Violations → `InvalidPasswordError` on create.

## 13. Password Hashing Strategy

| Aspect | Detail |
|--------|--------|
| Algorithm | Argon2id |
| Wrapper | `PasswordHashService` (UserModule-owned) |
| Storage | `users.password_hash` PHC string |
| Plaintext | Never stored or logged |

## 14. Account Creation Flow

1. Normalize + validate email
2. Validate password policy
3. Hash password via `PasswordHashService`
4. Create `UserEntity` (UUID v4 from entity initializer)
5. Default status `ACTIVE` unless overridden
6. Save; map duplicate DB constraint → `UserEmailAlreadyExistsError`
7. Return `UserAccountSnapshot` (no hash)

## 15. Safe Account Contract

**`UserAccountSnapshot`:** `id`, `email`, `status`, `createdAt`, `updatedAt`

**`AuthenticatedAccountSnapshot`:** `id`, `email`, `status` (verify success only)

Never exposes `passwordHash` or `UserEntity`.

## 16. Credential Verification Contract

```typescript
verifyCredentials(email, password): Promise<VerifyCredentialsResult>
```

Success: `{ valid: true, account: AuthenticatedAccountSnapshot }`

Failure: `{ valid: false }` — uniform for wrong password, unknown email, invalid email, inactive, locked.

## 17. Account Status Behavior

| Status | verifyCredentials |
|--------|-------------------|
| `ACTIVE` | Allowed when password matches |
| `INACTIVE` | Generic invalid |
| `LOCKED` | Generic invalid |

## 18. Duplicate Email Handling

Unique index `UQ_users_email` + catch MSSQL errors 2627/2607 → `UserEmailAlreadyExistsError`. Handles race via DB constraint (no pre-check-only gap).

## 19. Enumeration / Timing Considerations

- All verify failures return identical `{ valid: false }` shape
- Unknown/invalid email paths run timing-safe dummy Argon2 verify (cached dummy hash)
- Residual timing differences possible; documented honestly — no distinct error messages

## 20. Repository Boundary

`UserAccountService` injects `Repository<UserEntity>` privately. No repository or entity exported from module.

## 21. Unit Tests

| Area | Tests |
|------|-------|
| Email normalization | trim/lowercase, valid/invalid shapes |
| Password policy | min/max length |
| PasswordHashService | Argon2id hash/verify, PHC length, needsRehash |
| UserAccountService | create, validation errors, duplicate mapping, verify paths (mocked repo) |
| Module boundaries | export audit |

## 22. Integration Tests

`test/integration/user-account.integration-spec.ts` against `catechism_api_test`:

- Create account (normalized email, Argon2 hash, UUID v4, ACTIVE, safe snapshot)
- Duplicate normalized email rejected
- Verify success
- Wrong password → invalid
- Unknown email → invalid
- INACTIVE / LOCKED → invalid

Tests clean up rows matching `auth003-integration-%@example.com`.

## 23. Argon2 Native Docker Validation

```bash
docker build --target production -t catechism-api:auth-user .
```

**PASS** — production image builds with `argon2` native module via prebuilt binaries on `node:22.23.1-bookworm-slim`.

## 24. Existing CI Compatibility

- `argon2` in runtime `dependencies` (included in `npm ci --omit=dev`)
- No `bitbucket-pipelines.yml` changes required
- Docker Build step validates native dependency on push

## 25. Security / Secret Review

| Check | Result |
|-------|--------|
| Plaintext passwords logged | **None found** |
| passwordHash logged | **None** |
| passwordHash in public API types | **Excluded** |
| Generic verify failures | **PASS** |

## 26. Module Boundary Audit After Implementation

| Module | Exports | Persistence private |
|--------|---------|---------------------|
| UsersModule | `UserAccountService` only | **PASS** |
| AuthModule | none | **PASS** |
| AccessControlModule | none | **PASS** |

No cyclic imports. AuthModule will consume `UserAccountService` in AUTH #004.

## 27. Future Microservice Extraction Review

Public `UserAccountService` maps to future Identity service APIs:

- `createAccount` → provisioning RPC
- `verifyCredentials` → credential verification RPC

Callers depend on snapshots/result types, not ORM entities.

## 28. Commands Executed

```bash
npm run migration:show
npm install argon2
npm run format
npm run quality
npm audit --audit-level=moderate
npm run test:db:migrations
npm run test:integration
npm run test:e2e:db
docker build --target production -t catechism-api:auth-user .
```

## 29. Validation Results

| Gate | Result |
|------|--------|
| format | **PASS** |
| lint | **PASS** |
| typecheck | **PASS** |
| unit | **PASS** (20 suites, 77 tests) |
| DB-free e2e | **PASS** |
| build | **PASS** |
| audit | **PASS** |
| quality | **PASS** |
| migrations | **PASS** |
| DB integration | **PASS** (16 tests) |
| DB e2e | **PASS** |
| quality:full equivalent | **PASS** |
| Argon2 hash/verify | **PASS** |
| production Docker build | **PASS** |
| duplicate normalized email | **PASS** |
| no persistence export | **PASS** |
| no cross-module repository access | **PASS** |

## 30. Known Issues / Deferred Items

- Automatic Argon2 rehash on login — deferred to AUTH #007 hardening
- `getAccountById` — not added; can add in AUTH #004 if login flow needs it
- Registration/admin HTTP endpoints — deferred until RBAC exists
- TypeORM logs duplicate-key SQL during expected duplicate-email integration test (caught and mapped correctly)

## 31. Out-of-Scope Confirmation

Not implemented:

- `POST /auth/login` or any user HTTP API
- JWT / passport / refresh sessions
- RBAC guards or role assignment
- Seed/admin account
- New migrations or schema columns

## 32. AUTH #004 Readiness

| Item | Ready |
|------|-------|
| `UserAccountService.verifyCredentials` public | Yes |
| Safe account snapshots | Yes |
| Argon2 validated in Docker/CI path | Yes |
| Module boundaries intact | Yes |

**AUTH #004 may proceed:** AuthModule login service, `POST /auth/login`, JWT access token, `JwtAuthGuard`, auth config — consuming `UserAccountService` only; no refresh lifecycle yet.

## 33. Commit Message Recommendation

```
git commit -m "feat(auth): add user account credential service"
```

---

**AUTH #003 COMPLETE**
