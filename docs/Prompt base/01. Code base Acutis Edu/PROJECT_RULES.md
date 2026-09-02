# CATECHISM API — PROJECT RULES

> Status: Mandatory
> Scope: Entire backend repository
> Stack baseline: Node.js v22.23.1, NestJS, TypeScript, MSSQL, Docker, Bitbucket Pipelines
> Purpose: Define non-negotiable engineering conventions for all human and AI-assisted changes.

---

## 1. Rule Priority

These rules apply to every change in this repository unless a later explicitly approved architecture decision updates this file.

When working with Cursor or any AI coding assistant:

1. Read this file before making changes.
2. Read relevant existing code and documentation before proposing implementation.
3. Preserve established project patterns unless an approved change intentionally replaces them.
4. Never silently override a rule in this document.
5. If a task conflicts with this document, stop implementation and report the conflict in the task report.

---

## 2. Core Engineering Principles

The codebase must optimize for:

- Correctness.
- Readability.
- Maintainability.
- Security.
- Testability.
- Predictable behavior.
- Clear domain boundaries.
- Small, reviewable changes.
- Backward compatibility whenever possible.

Avoid clever code when simpler code is easier to understand.

Do not introduce abstraction without a concrete reason.

Do not perform unrelated refactors while implementing a scoped task.

Do not duplicate logic when an existing reusable implementation already exists.

---

## 3. Runtime & Package Management

Required runtime:

- Node.js: `v22.23.1`

The repository must explicitly pin or declare the expected Node version using appropriate project files such as:

- `.nvmrc`
- `package.json` `engines`

Package manager must be explicitly chosen during bootstrap and used consistently.

Rules:

- Do not mix npm/yarn/pnpm lockfiles.
- CI must use deterministic dependency installation.
- Lockfile must be committed.
- Avoid unnecessary dependencies.
- Before adding a package, verify that the platform cannot reasonably solve the problem with existing dependencies or the Node/NestJS standard ecosystem.
- Prefer actively maintained packages with clear TypeScript support.

---

## 4. TypeScript Rules

TypeScript must run in strict mode.

Required principles:

- No implicit `any`.
- Avoid explicit `any`.
- Do not use `unknown` without narrowing before use.
- Do not use unsafe type assertions merely to silence the compiler.
- Prefer domain-specific types over loose objects.
- Prefer `readonly` when mutation is not required.
- Prefer enums or literal unions only when they improve domain clarity.
- Avoid magic strings and magic numbers.
- Prefer explicit return types on public methods, services, reusable helpers, and exported functions.
- Keep DTOs, persistence entities/models, and domain/business representations conceptually separated.
- Do not expose database models directly as API contracts unless explicitly designed that way.

Forbidden patterns unless strongly justified:

```ts
const value: any = ...
(value as any).foo
// @ts-ignore
// @ts-nocheck
```

If an exception is unavoidable, explain it in code comments and the implementation report.

---

## 5. Naming Conventions

Use English for:

- Source code.
- Variables.
- Functions.
- Classes.
- Database object names.
- API paths.
- Comments.
- Technical documentation committed to the repository.

Naming:

- Classes: `PascalCase`
- Interfaces/types: `PascalCase`
- Variables/functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE` only for true constants/config constants
- Files: `kebab-case`
- Environment variables: `UPPER_SNAKE_CASE`
- Database tables/columns: choose one convention during database bootstrap and use it consistently thereafter.

NestJS examples:

- `users.controller.ts`
- `users.service.ts`
- `users.module.ts`
- `create-user.dto.ts`
- `user.entity.ts`
- `user.repository.ts`

Boolean names should read naturally:

- `isActive`
- `hasPermission`
- `canPublish`
- `shouldRetry`

Avoid vague names:

- `data`
- `info`
- `item`
- `temp`
- `obj`
- `handleStuff`

unless their context is genuinely obvious and very local.

---

## 6. Folder & Module Conventions

Prefer domain/feature-oriented NestJS modules.

A feature should own the code that belongs to its domain.

Avoid creating dumping-ground folders such as:

- `helpers/`
- `utils/`
- `common/`

for unrelated logic.

Shared infrastructure is allowed only when genuinely cross-cutting.

Examples of legitimate shared concerns:

- Configuration.
- Logging.
- HTTP exception mapping.
- Pagination primitives.
- Authentication guards.
- Database infrastructure.
- File storage abstraction.

Do not create all future domain modules in advance.

Only introduce modules required by the active phase.

---

## 7. NestJS Conventions

Controllers:

- Keep controllers thin.
- Validate input through DTOs/pipes.
- Delegate business logic to services/use cases.
- Do not place database logic in controllers.
- Do not catch errors simply to rethrow the same error.
- Use explicit HTTP status behavior.
- Document public endpoints with Swagger.

Services:

- Own application/business logic appropriate to the feature.
- Keep methods focused.
- Avoid large services that accumulate unrelated behavior.
- Do not couple services to HTTP request/response objects.

Modules:

- Export only what another module genuinely requires.
- Avoid circular dependencies.
- Do not use `forwardRef()` as the default solution to poor module boundaries.

Dependency injection:

- Prefer constructor injection.
- Depend on abstractions where infrastructure replacement is realistic and beneficial.

---

## 8. DTO & Validation Rules

All external input must be validated.

Use DTOs for:

- Request bodies.
- Query parameters.
- Route parameters where transformation/validation is required.

Global validation should eventually enforce:

- Whitelisting of accepted properties.
- Rejection or safe handling of unexpected properties according to approved bootstrap configuration.
- Type transformation only when behavior is predictable.

Rules:

- Never trust frontend validation.
- Validate pagination limits.
- Validate enum/domain values.
- Validate IDs.
- Validate dates.
- Validate string lengths.
- Normalize only when domain behavior is explicitly defined.

Do not reuse persistence entities as incoming DTOs.

---

## 9. API Conventions

Initial API version:

```text
/api/v1
```

REST principles:

- Use nouns for resources.
- Use HTTP methods according to semantics.
- Keep endpoint naming predictable.
- Do not encode UI behavior into API naming.
- Avoid RPC-style routes unless the operation genuinely represents a domain command that does not map cleanly to CRUD.

Examples:

```text
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PATCH  /api/v1/users/:id
DELETE /api/v1/users/:id
```

Pagination conventions must be standardized before the first paginated business endpoint.

API responses and errors must use a consistent schema defined during backend bootstrap.

Do not return stack traces, SQL errors, secrets, or internal infrastructure details to clients.

---

## 10. Error Handling

Use centralized error handling.

Rules:

- Map known domain/application errors intentionally.
- Unexpected errors must be logged with enough diagnostic context.
- Client responses must not leak internal implementation details.
- Do not swallow exceptions.
- Do not use generic `try/catch` blocks everywhere.
- Do not convert every error to HTTP 500 manually.

Error messages exposed to clients should be safe and stable enough for API consumers.

Machine-readable error codes should be introduced when the bootstrap architecture defines the global error contract.

---

## 11. Logging

Use structured application logging.

Required principles:

- Do not rely on scattered `console.log`.
- Never log passwords.
- Never log access tokens or refresh tokens.
- Never log secrets.
- Avoid logging full sensitive request bodies.
- Include useful context such as request/correlation identifiers when the logging architecture supports them.
- Use appropriate log levels.

Expected levels:

- `error`
- `warn`
- `log/info`
- `debug` for local diagnostic use where appropriate

Production logs should be machine-readable or easily ingestible by centralized logging systems later.

---

## 12. Configuration & Environment Variables

All environment-dependent values must come from configuration.

Never hard-code:

- Database passwords.
- JWT secrets.
- API keys.
- Host-specific IP addresses.
- Production URLs.
- Credentials.

Repository must contain:

```text
.env.example
```

but never commit real `.env` secrets.

Configuration should be validated during application startup.

Application should fail fast when mandatory configuration is invalid or missing.

Group configuration logically rather than reading `process.env` throughout business code.

---

## 13. MSSQL & Database Rules

Database changes must be migration-driven once the migration system is established.

Rules:

- Never rely on ORM auto-sync in production.
- Schema changes must be reproducible.
- Migrations must be reviewable.
- Avoid destructive migrations unless explicitly approved.
- Define nullability intentionally.
- Define foreign keys intentionally.
- Define delete/update behavior intentionally.
- Add indexes based on real query/access patterns.
- Use transactions for multi-step writes that must succeed or fail atomically.
- Preserve historical records when the domain requires history.
- Prefer soft-delete/status/archive patterns for important business history where appropriate.

Do not directly concatenate SQL strings using untrusted input.

Database naming conventions must remain consistent after they are selected.

---

## 14. Data Integrity

Application validation is not enough.

Use database constraints where appropriate:

- `NOT NULL`
- `UNIQUE`
- foreign keys
- check constraints when supported and useful

Business rules that must survive concurrency should not depend only on frontend checks.

Design for race conditions on critical writes.

---

## 15. Formatting — Prettier

Prettier is the canonical formatter.

Recommended baseline to establish during bootstrap:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100,
  "endOfLine": "lf"
}
```

Rules:

- Do not manually fight Prettier formatting.
- Formatting must be runnable from package scripts.
- CI should fail if formatting checks are configured and violated.
- Keep generated files excluded where appropriate.

If Cursor changes the Prettier configuration, it must explain why in the report.

---

## 16. ESLint

ESLint must use modern TypeScript-aware configuration compatible with the selected NestJS/TypeScript versions.

The exact config may evolve during bootstrap, but it must enforce at least:

- No unused variables/imports.
- No floating promises.
- No unsafe promise misuse.
- No accidental `any`.
- No unreachable code.
- Consistent async behavior.
- Reasonable TypeScript safety rules.
- Prettier compatibility without conflicting formatting rules.

Lint rules must not be disabled globally merely to make CI green.

When disabling a rule locally:

- Keep the disable scope minimal.
- Add a reason when it is not obvious.

---

## 17. Imports

Imports should be organized consistently.

Rules:

- Remove unused imports.
- Avoid deep relative import chains when a stable project alias is established.
- Do not create barrel exports everywhere by default.
- Avoid circular imports.
- Prefer explicit imports when they make dependency relationships clearer.

Path aliases may be introduced during bootstrap if configured consistently across:

- TypeScript.
- Jest/test runner.
- Build.
- Runtime where required.

---

## 18. Functions & Complexity

Prefer:

- Small focused functions.
- Early returns.
- Clear control flow.

Avoid:

- Deep nesting.
- Giant switch statements.
- Functions with many unrelated responsibilities.
- Boolean parameter explosions.
- Hidden side effects.

If a method becomes difficult to test independently, consider whether responsibilities should be split.

Do not split code solely to satisfy an arbitrary line-count metric.

---

## 19. Comments

Comments should explain:

- Why.
- Non-obvious business rules.
- Important constraints.
- Workarounds.
- Security-sensitive reasoning.

Comments should not restate obvious code.

Bad:

```ts
// Increment count
count++;
```

Useful:

```ts
// Preserve the published exam snapshot so later question edits cannot alter historical attempts.
```

Remove obsolete commented-out code.

Git already stores history.

---

## 20. Testing Rules

Every meaningful business feature must include appropriate tests.

Backend test layers:

### Unit tests
Use for:

- Domain/business logic.
- Transformation.
- Validation logic beyond DTO decorators.
- Scoring/calculation.
- Permission decisions where applicable.

### Integration/e2e tests
Use for:

- Important API flows.
- Authentication.
- Authorization.
- Database persistence behavior.
- Critical transactional behavior.

Rules:

- Tests must be deterministic.
- Do not depend on external public services.
- Do not rely on test execution order.
- Avoid meaningless snapshot tests.
- Test failure cases as well as happy paths.
- Bugs should receive regression tests when practical.

A task is not considered complete merely because it compiles.

---

## 21. Test Naming

Test descriptions should state behavior.

Prefer:

```ts
it('rejects a request when the user lacks exams.publish permission', ...)
```

Avoid:

```ts
it('test permission', ...)
```

Use Arrange / Act / Assert structure where it improves clarity.

---

## 22. Security Rules

Security is mandatory because the platform includes minors.

Never:

- Store plaintext passwords.
- Commit credentials.
- Trust client-provided authorization decisions.
- Return fields merely because they exist in the entity.
- Expose another student's records without explicit authorization.
- Log secrets/tokens/passwords.
- Disable validation to simplify implementation.
- Accept unrestricted file uploads.
- Store pastoral/confessional information in ordinary platform records.

Apply:

- Least privilege.
- Server-side authorization.
- Input validation.
- Output filtering.
- Secure password hashing.
- Rate limiting for sensitive/public endpoints when introduced.
- Safe HTTP headers when introduced.
- Appropriate auditability for administrative actions.

---

## 23. Privacy Rules for Children

Default to privacy.

The system should minimize personally identifying information.

Rules:

- No public child profile by default.
- Do not expose email/phone unnecessarily.
- Parent-child access must be based on explicit persisted relationships.
- Media publication involving children requires a future explicit moderation/consent design.
- Educational analytics should not be framed as spiritual worth or faith quality.
- Avoid storing sensitive pastoral notes in general student records.

Before production, applicable legal/privacy requirements must be reviewed separately.

---

## 24. Docker Rules

Both development and production-oriented Docker files must remain understandable and reproducible.

Backend local Docker goals:

- NestJS API container.
- MSSQL container.
- Persistent DB volume.
- Health checks.
- Predictable service startup.
- Environment-driven configuration.

Rules:

- No machine-specific IP addresses.
- No hard-coded secrets.
- Use `.dockerignore`.
- Keep image layers efficient.
- Prefer multi-stage build for production image.
- Do not install unnecessary OS packages.
- Pin meaningful runtime versions.

Docker Compose should support local development without requiring Docker Desktop-specific behavior.

---

## 25. CI/CD Rules

Bitbucket Pipelines will be the CI/CD platform.

Every significant change must preserve:

- Install.
- Lint.
- Type check.
- Test.
- Build.

Later:
- Docker build.
- Image publishing.
- Staging deployment.
- Production deployment.

Rules:

- Never store secrets directly in `bitbucket-pipelines.yml`.
- Production deployment must not be an uncontrolled side effect of ordinary branch builds.
- Database migration deployment must be explicit and safe.
- Do not allow multiple replicas to race schema migrations.

---

## 26. Git Rules

Keep commits focused.

Do not commit:

- `.env`
- credentials
- local DB files
- logs
- build output that should be generated
- temporary files
- Cursor handoff reports under `docs/`

The root `.gitignore` must include:

```gitignore
docs/
```

Reason:
The `docs/` directory is reserved for temporary Cursor audit/implementation/review reports exchanged during development and is intentionally not versioned.

Important:
Permanent architecture documentation that MUST live in Git should therefore NOT be stored under ignored `docs/`.

Use a tracked location such as:

```text
PROJECT_RULES.md
architecture/
```

when permanent repository documentation is required.

Do not perform commits unless the active Cursor prompt explicitly permits or requests a commit.

---

## 27. Cursor / AI Workflow

For every Cursor task:

1. Read `PROJECT_RULES.md`.
2. Read the files relevant to the requested scope.
3. Inspect existing patterns before changing code.
4. Do not implement unrelated improvements.
5. Do not modify unrelated APIs.
6. Do not alter database behavior outside scope.
7. Do not introduce speculative future modules.
8. Run relevant validation commands.
9. Produce a report in `docs/`.

Required report location pattern:

```text
docs/<TASK_NAME>_REPORT.md
```

Reports should include:

- Objective.
- What was inspected.
- What changed.
- Files created/modified.
- Architecture decisions.
- Database changes.
- API changes.
- Environment/config changes.
- Tests added/updated.
- Commands executed.
- Results of lint/test/build.
- Risks or limitations.
- Anything not completed.
- Recommended next step.

Because `docs/` is ignored by Git, reports are local handoff artifacts.

---

## 28. No Silent Scope Expansion

If Cursor identifies additional useful work outside the requested task:

- Do not implement it automatically.
- Record it under `Recommended Follow-up` in the report.

Exceptions:
Only tiny changes required to make the requested implementation correct, secure, buildable, or testable may be included, and they must be reported.

---

## 29. Backward Compatibility

As the codebase grows:

- Preserve existing endpoint contracts unless change is explicitly approved.
- Preserve existing database behavior unless migration is explicitly part of the task.
- Avoid renaming public fields casually.
- Avoid changing HTTP status codes casually.
- Avoid changing default behavior silently.

Breaking changes require explicit approval and documentation.

---

## 30. Definition of Done

A backend task is complete only when applicable items are satisfied:

- Scope implemented.
- Code follows `PROJECT_RULES.md`.
- TypeScript compiles.
- Lint passes.
- Formatting passes.
- Relevant unit tests pass.
- Relevant integration/e2e tests pass.
- Build passes.
- Swagger updated for public APIs.
- DTO validation is present.
- Authorization is correct.
- Database migration is included if schema changed.
- No secrets added.
- No unrelated behavior changed.
- Cursor report created under `docs/`.
- Known limitations are documented.

---

## 31. Rule Changes

This document is intentionally strict but may evolve.

Any future change to this rules file must:

1. Be intentional.
2. Explain the reason.
3. Consider impact on existing code.
4. Avoid mass reformat/refactor unless explicitly approved.
5. Be mentioned in the Cursor task report.

Do not silently relax quality rules to make an implementation easier.
