# PROMPT 003 — Application Bootstrap Infrastructure Report

## 1. Objective

Implement application-level infrastructure that every future NestJS module will rely on:

- environment/configuration management with startup validation
- global request validation baseline
- centralized exception handling with a safe public error contract
- structured logging with sensitive-field redaction
- request/correlation ID support
- Swagger/OpenAPI baseline (environment-controlled)
- environment-driven HTTP port
- shared bootstrap setup for production and e2e tests

No MSSQL, ORM, migrations, Docker, auth, RBAC, or catechism business modules were introduced.

## 2. State Inherited From Prompt #002

- NestJS **11.2.3** skeleton with strict TypeScript, ESLint, Prettier, Jest
- `GET /api/v1/health` → `{ "status": "ok" }`
- Global API prefix `api/v1`
- Hard-coded port `3000` in `src/app.constants.ts`
- E2e tests manually applied prefix only (risk of drift from production bootstrap)
- Prompt #001 rules files preserved (`PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/`)
- Node pinned to `22.23.1`, npm lockfile present, no commits yet

## 3. Files Created

| Path | Purpose |
| --- | --- |
| `.env.example` | Tracked non-secret environment template |
| `src/config/config.types.ts` | Typed configuration model |
| `src/config/app.configuration.ts` | Config factory + parsing helpers |
| `src/config/env.validation.ts` | Joi startup validation schema |
| `src/config/app-config.service.ts` | Typed config accessor |
| `src/config/config.module.ts` | Global `@nestjs/config` module |
| `src/config/env.validation.spec.ts` | Joi schema unit tests |
| `src/config/app.configuration.spec.ts` | Config parsing unit tests |
| `src/bootstrap/configure-application.ts` | Shared bootstrap (prefix, pipes, filter, swagger) |
| `src/bootstrap/configure-swagger.ts` | Swagger/OpenAPI setup |
| `src/bootstrap/create-validation-pipe.ts` | Global `ValidationPipe` factory |
| `src/bootstrap/create-validation-pipe.spec.ts` | Validation pipe unit tests |
| `src/http/api-error-response.types.ts` | Public API error contract type |
| `src/http/global-exception.filter.ts` | Global exception filter |
| `src/http/global-exception.filter.spec.ts` | Exception filter unit tests |
| `src/logging/logging.module.ts` | `nestjs-pino` structured logging module |
| `src/request-context/request-context.types.ts` | Request ID constants/types |
| `src/request-context/request-id.util.ts` | Request ID resolve/read helpers |
| `src/request-context/request-id.util.spec.ts` | Request ID unit tests |
| `test/create-test-application.ts` | Shared e2e/production-parity app factory |
| `test/get-test-http-server.ts` | Typed supertest HTTP server helper |
| `test/infrastructure.e2e-spec.ts` | Error contract, request ID, Swagger e2e tests |
| `docs/PROMPT_003_APPLICATION_BOOTSTRAP_INFRASTRUCTURE_REPORT.md` | This report (gitignored) |

## 4. Files Modified

| Path | Change |
| --- | --- |
| `package.json` / `package-lock.json` | Added infrastructure dependencies |
| `src/app.constants.ts` | Removed hard-coded `HTTP_PORT`; kept `API_GLOBAL_PREFIX` |
| `src/app.module.ts` | Wired config, logging, global exception filter |
| `src/main.ts` | Uses config port, pino logger, shared bootstrap |
| `src/health/health.controller.ts` | Added Swagger metadata decorators (no behavior change) |
| `test/health.e2e-spec.ts` | Uses shared `createTestApplication()` |

Prompt #001 files were not modified.

## 5. Dependencies Added

| Package | Version | Reason |
| --- | --- | --- |
| `@nestjs/config` | 4.0.4 | Central env/config loading compatible with NestJS 11 |
| `@nestjs/swagger` | 11.4.7 | OpenAPI/Swagger UI aligned with NestJS 11 |
| `class-validator` | 0.14.4 | DTO validation for global `ValidationPipe` |
| `class-transformer` | 0.5.1 | DTO transformation for global `ValidationPipe` |
| `joi` | 17.13.6 | Startup env validation (NestJS documented pattern) |
| `nestjs-pino` | 4.6.1 | Structured JSON logging integrated with NestJS 11 |
| `pino-http` | (transitive) | HTTP request logging via nestjs-pino |
| `pino-pretty` | 13.1.3 (dev) | Readable local/dev log output only |

NestJS major version was **not** upgraded (remains 11.2.3).

## 6. Configuration Architecture

### `@nestjs/config` setup

- `ApplicationConfigModule` (`src/config/config.module.ts`) is `@Global()`
- Uses `ConfigModule.forRoot({ isGlobal: true, load: [appConfiguration], validationSchema })`
- Business code reads config through `AppConfigService`, not raw `process.env`

### Environment validation approach

**Joi** was chosen because it is the standard NestJS documented approach, integrates directly with `ConfigModule.forRoot`, fails fast at startup, and keeps validation declarative without a custom framework.

### Config values currently supported

| Variable | Type | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | `development` \| `test` \| `production` | `development` | Controlled enum |
| `PORT` | TCP port integer | `3000` | Validated by Joi + parser |
| `SWAGGER_ENABLED` | boolean | `true` in development, `false` otherwise | Overridable via env |

No DB/JWT/storage/SMTP/Redis variables were added.

### Fail-fast behavior

- Invalid `NODE_ENV`, `PORT`, or `SWAGGER_ENABLED` cause Joi validation failure during bootstrap
- `buildAppConfiguration()` throws on malformed values that bypass Joi in edge cases
- Application does not start with invalid foundation config

## 7. `.env.example`

Tracked at repository root:

```env
NODE_ENV=development
PORT=3000
SWAGGER_ENABLED=true
```

Comments explain each variable. No secrets or fake production credentials. Real `.env` remains gitignored.

## 8. HTTP Port Configuration

- Removed `HTTP_PORT` constant from `src/app.constants.ts`
- Port is loaded via `AppConfigService.getPort()` from validated `PORT` env var
- `src/main.ts` listens on configured port (default `3000`)
- Port parsing lives only in `src/config/app.configuration.ts`

## 9. Global Validation

`createValidationPipe()` settings:

```typescript
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: false },
  validationError: { target: false, value: false },
});
```

**Rationale:**

- `whitelist` + `forbidNonWhitelisted`: strict API surface; reject unexpected client fields
- `transform`: enable DTO class transformation for future endpoints
- `enableImplicitConversion: false`: avoid unsafe automatic coercion
- `validationError.target/value: false`: do not echo submitted objects back in validation errors

No fake business endpoints were added. Coverage is via `create-validation-pipe.spec.ts` using an inline sample DTO.

## 10. Request / Correlation ID

### Generation

- Uses `crypto.randomUUID()` via `resolveRequestId()` when no valid incoming ID exists

### Incoming header behavior

- Accepts `X-Request-Id` (`x-request-id`) only if it matches UUID v1–v5 pattern and length ≤ 128
- Invalid/unbounded values are replaced with a newly generated UUID (never trusted blindly)

### Storage / propagation

- **Decision:** use `nestjs-pino` `pinoHttp.genReqId` as the single source of truth (not a separate Nest middleware)
- Sets `request.requestId` on the Express/Node request object for the lifetime of that request
- Avoids global mutable state and AsyncLocalStorage complexity at this stage

### Response header behavior

- Every response receives `X-Request-Id` via pino `genReqId` and the global exception filter

### Concurrency safety

- Request ID is stored on the per-request object; no shared global variable across concurrent requests

## 11. Structured Logging

### Library

- **nestjs-pino** 4.6.1 on top of **pino** / **pino-http**

### Request logging

- Automatic HTTP request/response logging via pino-http
- Health endpoint request logging suppressed (`/api/v1/health`) to reduce noise
- Request ID included via `customProps`

### Log format

- **Production / test:** JSON structured logs (`info` level in test/production)
- **Development:** `pino-pretty` transport for readable local output (`debug` level)

### Startup logging

- `main.ts` logs successful listen message via Nest pino logger

### No `console.log`

- Application code uses Nest/pino logger only

## 12. Sensitive Data Redaction

Redacted log paths (minimum set from prompt):

- `authorization`, `cookie`, `set-cookie` headers
- `password`, `token`, `accessToken`, `refreshToken` body fields

Global HTTP logging does not dump full request/response bodies.

## 13. Global Exception Handling

### Response schema (`ApiErrorResponse`)

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "...",
  "path": "/api/v1/...",
  "timestamp": "2026-08-29T...",
  "requestId": "..."
}
```

`message` may be `string | string[]` to preserve validation error details.

### HTTP exception behavior

- Known `HttpException` instances preserve their HTTP status and client-safe message

### Unknown exception behavior

- Returns HTTP 500 with generic message `"An unexpected error occurred."`
- Logged via pino at error level with request metadata and error object (not returned to client)

### Request ID inclusion

- Always included in JSON body and `X-Request-Id` response header

### Stack trace protection

- Stack traces are never included in API responses (verified by unit/e2e tests)

## 14. Swagger / OpenAPI

| Item | Value |
| --- | --- |
| Package | `@nestjs/swagger` 11.4.7 |
| UI route | `/api/docs` |
| OpenAPI JSON | `/api/docs-json` |
| API routes | remain under `/api/v1` (Swagger mounted outside global prefix) |
| Enable/disable | `SWAGGER_ENABLED` env var |
| Default | enabled in `development`, disabled in `test`/`production` unless explicitly enabled |
| Auth schemas | none (auth not implemented) |

Metadata: title `Catechism API`, version `1.0`, description for parish catechism backend.

## 15. Application Bootstrap Structure

`configureApplication(app)` centralizes:

1. Global prefix `api/v1`
2. Global validation pipe
3. Global exception filter (from DI)
4. Conditional Swagger setup

Used by:

- `src/main.ts` (production/dev startup)
- `test/create-test-application.ts` (e2e parity)

This prevents e2e tests from exercising a different application configuration than production.

## 16. Health Endpoint Regression

`GET /api/v1/health` remains unchanged:

- HTTP 200
- Body `{ "status": "ok" }`
- Unit, e2e, and local smoke tests pass with new config/logging/filter/swagger bootstrap

## 17. Tests Added / Updated

| Test | Proves |
| --- | --- |
| `env.validation.spec.ts` | Joi accepts valid defaults; rejects bad `NODE_ENV`/`PORT` |
| `app.configuration.spec.ts` | Typed parsing, production Swagger default, invalid input throws |
| `request-id.util.spec.ts` | UUID generation, valid header acceptance, invalid header replacement |
| `create-validation-pipe.spec.ts` | Strict whitelist/forbid behavior without fake endpoints |
| `global-exception.filter.spec.ts` | Safe error contract, request ID, no stack traces, validation messages preserved |
| `health.e2e-spec.ts` (updated) | Health still works through full bootstrap |
| `infrastructure.e2e-spec.ts` | 404 error contract + request ID header; Swagger JSON when enabled |

All tests are deterministic (no MSSQL, Docker, or external network).

## 18. Commands Executed

- `node --version` → `v22.23.1`
- `npm --version` → `10.9.8`
- `npm install`
- `npm run format` / `npm run format:check`
- `npm run lint` / `npm run lint:fix`
- `npm run typecheck`
- `npm test` (7 suites, 19 tests)
- `npm run test:e2e` (2 suites, 5 tests)
- `npm run test:cov`
- `npm run build`
- Local smoke: `npm run start:prod` + HTTP checks

No `git add`, `git commit`, or `git push`.

## 19. Validation Results

| Check | Result |
| --- | --- |
| Node runtime `v22.23.1` | PASS |
| npm `10.9.8` | PASS |
| Dependency installation | PASS (0 vulnerabilities) |
| format / format:check | PASS |
| lint | PASS |
| typecheck | PASS |
| unit tests | PASS (19 tests) |
| e2e tests | PASS (5 tests) |
| coverage | PASS |
| build | PASS |
| health smoke `GET /api/v1/health` | PASS (200, `{"status":"ok"}`, `X-Request-Id` present) |
| Swagger smoke `GET /api/docs-json` | PASS (200, title `Catechism API`) with `SWAGGER_ENABLED=true` |
| error contract smoke (404) | PASS header/request ID via smoke; full JSON body verified by e2e |
| request ID smoke | PASS (`X-Request-Id` returned on health response) |

## 20. Security / Privacy Review

- No secrets committed; `.env` remains gitignored
- `.env.example` contains no credentials
- Logger redacts Authorization/Cookie/token/password fields
- API responses do not include stack traces or internal error details
- Request IDs reject unsafe unbounded/non-UUID input
- Swagger exposure is environment-controlled (off by default outside development)
- Full request/response bodies are not globally logged

## 21. Git Status / Scope Summary

Repository still has no initial commit. All Prompt #001–#003 files appear as untracked. `docs/` reports remain gitignored.

Scope limited to application bootstrap infrastructure. No business modules, database, Docker, or auth code.

## 22. Rules Compliance Review

- Read `PROJECT_RULES.md`, `AGENTS.md`, `.cursor/rules/`, and Prompt #001/#002 reports before changes
- TypeScript strict; no `any` shortcuts in application code
- English source, kebab-case files, thin controllers, feature-oriented modules
- `/api/v1` prefix preserved
- Prettier/ESLint baselines preserved
- Local handoff report written under `docs/`
- No commit performed

## 23. Known Issues / Assumptions

- **Node PATH:** validation used official Node `v22.23.1` at `%LOCALAPPDATA%\nodejs\node-v22.23.1-win-x64`. Ensure future shells use matching `node`/`npm`.
- **Request ID mechanism:** implemented via `nestjs-pino` `genReqId` rather than separate Nest middleware to avoid duplicate IDs and NestJS 11 wildcard route warnings.
- **`pino-pretty`:** dev-only dependency for readable local logs; production/test output stays structured JSON.
- **Joi + factory parsing:** both Joi (startup) and explicit parsers in `app.configuration.ts` validate config; factory provides typed runtime config beyond Joi defaults.
- **Swagger in test env:** disabled by default when `NODE_ENV=test`; Swagger e2e explicitly sets `SWAGGER_ENABLED=true`.

## 24. Out-of-Scope Confirmation

This prompt did **not** implement:

- MSSQL / database drivers
- ORM / repositories / entities
- migrations
- Docker / Docker Compose
- Bitbucket Pipelines
- authentication / JWT / RBAC
- any catechism business modules

## 25. Recommended Next Step

**Prompt #004 — MSSQL + ORM/Data Access + Migration Architecture**

Choose and bootstrap the data-access layer deliberately (driver, ORM, migration tooling, connection config). Do **not** implement Prompt #004 in this prompt.
