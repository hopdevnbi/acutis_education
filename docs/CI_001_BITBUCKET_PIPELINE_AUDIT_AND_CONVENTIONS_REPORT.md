# CI/CD BE #001 — Bitbucket Pipeline Audit + Conventions

## 1. Objective

Audit the post-foundation backend for CI readiness and define the exact Bitbucket Pipelines strategy for Prompts CI_002–CI_004. This prompt is **audit + design only** — no `bitbucket-pipelines.yml` created.

## 2. Repository / Git Baseline

| Item | Value |
|------|-------|
| Branch | `master` |
| Working tree | **Clean** |
| Foundation commit | `06aac75 chore: finalize backend foundation` |
| Prior commit | `3f6eaca Init base Acutis Education` |
| Remote | `origin` → `git@github.com:hopdevnbi/acutis_education.git` |

**Note:** Remote is currently **GitHub**, not Bitbucket. Pipeline YAML can be authored in CI_002, but activation requires a Bitbucket repository (mirror or migration). Not a code blocker for CI_002 design.

## 3. Current CI-Relevant Architecture

| Layer | Tooling |
|-------|---------|
| Runtime | Node.js **22.23.1**, npm **>=10** |
| Quality gate (fast) | `npm run quality` — format, lint, typecheck, unit, DB-free e2e, build |
| Quality gate (full) | `npm run quality:full` — above + MSSQL integration/e2e |
| Test DB | `catechism_api_test` with `_test` guard |
| Docker (local) | Compose: MSSQL + API; production target in Dockerfile |
| Lockfile | `package-lock.json` only |
| CI platform (planned) | Bitbucket Pipelines per `PROJECT_RULES.md` §25 |

## 4. Existing npm Script Classification

| Script | Class | CI use | Notes |
|--------|-------|--------|-------|
| `format:check` | **A** — CI-fast | PR + main | Non-interactive |
| `format` | **D** — developer | No | Mutates files |
| `lint` | **A** | PR + main | |
| `lint:fix` | **D** | No | Mutates files |
| `typecheck` | **A** | PR + main | |
| `test` | **A** | PR + main | DB-free unit tests |
| `test:watch` | **D** | No | Interactive |
| `test:cov` | **A** | Optional PR/main | Coverage; no external services |
| `test:e2e` | **A** | PR + main | DB-free infrastructure e2e |
| `test:db:prepare` | **B** — MSSQL | Full pipeline | Creates test DB on live MSSQL |
| `test:db:migrations` | **B** | Full pipeline | Requires `.env` (see §7) |
| `test:integration` | **B** | Full pipeline | prepare + Jest integration |
| `test:e2e:db` | **B** | Full pipeline | prepare + AppModule DB e2e |
| `quality` | **A** | **Primary PR gate** | Chained; stops on first failure |
| `quality:full` | **B** | Main / custom | Requires MSSQL + env |
| `build` | **A** | PR + main | Included in `quality` |
| `start` / `start:dev` / `start:debug` | **D** | No | Long-running dev servers |
| `start:prod` | **E** — operational | No | Runtime, not CI validation |
| `migration:create` | **D** | No | Developer scaffolding |
| `migration:generate` | **D** | No | Requires local dev DB + entities |
| `migration:show` | **B** | Optional full | Requires `.env` + MSSQL |
| `migration:run` | **E** | No in CI | Dev/ops only; never auto in CI |
| `migration:revert` | **E** | No | Destructive; manual only |
| `migration:run:prod` | **E** | No | Production deployment only |

**Docker-required (class C):** No npm script invokes Docker directly. Docker build is a **separate CI step** using Bitbucket `docker` service (CI_003).

## 5. npm ci Validation

| Check | Result |
|-------|--------|
| `npm ci` from lockfile | **PASS** |
| Reproducible install | **PASS** (818 packages audited) |
| Non-interactive | **PASS** |
| Engine | Node 22.23.1 / npm 10.9.8 |

## 6. quality Validation

| Check | Result |
|-------|--------|
| `npm run quality` after `npm ci` | **PASS** |
| Exit code on success | 0 |
| WSL dependency | **None** in npm scripts |
| Local `.env` required | **No** for `quality` |
| Duration (observed) | ~2–3 min |

Steps executed: `format:check` → `lint` → `typecheck` → `test` (38) → `test:e2e` (5) → `build`.

## 7. quality:full Requirements

| Requirement | Detail |
|-------------|--------|
| Live MSSQL | Required |
| Test DB | `catechism_api_test` (created by `test:db:prepare`) |
| Env vars | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_ENCRYPT`, `DB_TRUST_SERVER_CERTIFICATE` |
| Local files | `.env` and/or `.env.test` locally; **not required if all vars set in CI** |
| Docker | **Not required** for DB tests (direct TCP to MSSQL) |

**CI gap (CI_003):** `src/database/data-source.ts` throws if `.env` file is missing. `test:db:migrations` dynamically imports DataSource. **CI must either:**
1. Generate a minimal `.env` from pipeline variables before DB migration validation, or
2. Adjust DataSource CLI bootstrap to accept env-only mode when `CI=true` (small change in CI_003).

**MSSQL_PUBLISH_PORT:** Not needed in CI — MSSQL service listens on **1433** directly; set `DB_HOST=localhost`, `DB_PORT=1433`.

**Can `quality:full` run directly in Bitbucket?** Almost — after MSSQL service is up and env/bootstrap is solved (CI_003). Command: `npm run quality:full`.

Local validation skipped: Docker daemon not running during this audit session.

## 8. Linux Portability Audit

| Area | Status |
|------|--------|
| npm scripts | **Portable** — no PowerShell, no WSL |
| `scripts/docker.ps1` | Windows-only helper; **not used by npm scripts** |
| Path separators | Relative paths only in scripts |
| Shell scripts (`docker/mssql/*.sh`) | LF via `.gitattributes`; used in Compose, not npm |
| `data-source.ts` | Uses `path.resolve(process.cwd(), ...)` — portable |
| Test setup | `test/setup-env.ts` sets placeholder env — portable |
| localhost assumptions | DB tests assume TCP to MSSQL — correct for Bitbucket service containers |

**Verdict:** Core CI commands (`npm ci`, `npm run quality`) are **Linux-ready** without changes.

## 9. Node Runtime Recommendation

```yaml
image: node:22.23.1-bookworm-slim
```

Matches Dockerfile base and `package.json` engines. **Do not use floating tags** (`node:22`, `lts`).

Optional: add `export CI=true` in pipeline steps for future CI-specific behavior.

## 10. npm / Lockfile Strategy

| Decision | Value |
|----------|-------|
| Install command | `npm ci` |
| Lockfile | `package-lock.json` (commit always) |
| `engine-strict` | Not enforced in `.npmrc` today; recommend `engine-strict=true` in CI_002 via pipeline env or `.npmrc` |
| npm version | Bundled with Node 22.23.1 image (acceptable) |

## 11. Cache Strategy

| Cache | Recommendation |
|-------|----------------|
| npm (`~/.npm`) | **Yes** — Bitbucket `caches: [npm]` |
| `node_modules` | **No** — use `npm ci` each run |
| `dist` | **No** |
| Coverage output | Optional artifact only; not cached |
| Secrets / test DB | **Never cache** |

```yaml
definitions:
  caches:
    npm: ~/.npm
```

## 12. Trigger Strategy

| Trigger | Pipeline scope | Rationale |
|---------|----------------|-----------|
| **Pull requests** | `npm ci` + `npm run quality` + `npm audit --audit-level=moderate` | Fast feedback (~3 min); no MSSQL cost |
| **Default branch (`master`)** | Quality + full DB validation + Docker production build | Complete gate before merge baseline |
| **Feature branches (push)** | Same as PR if PR pipelines enabled; otherwise optional | Bitbucket default: PR-focused |
| **Custom: `full-ci`** | `quality:full` + Docker build | Manual/on-demand heavy validation |

**No deployment** on any trigger in CI_002–CI_003.

## 13. Proposed Step Structure (for CI_002)

### PR pipeline

```
Step: "Quality"
  image: node:22.23.1-bookworm-slim
  caches: npm
  script:
    - npm ci
    - npm run quality
    - npm audit --audit-level=moderate
  max-time: 15
```

### Default branch pipeline (baseline — DB/Docker steps added in CI_003)

```
Step 1: "Quality"          (same as PR)
Step 2: "Database tests"   (CI_003 — MSSQL service)
Step 3: "Docker build"     (CI_003 — docker service)
```

### Custom pipeline: `full-ci`

```
Step 1: Quality
Step 2: quality:full (with MSSQL)
Step 3: docker build --target production
```

## 14. MSSQL CI Strategy (for CI_003)

**Recommended:** Bitbucket **service container** (simplest; no compose in CI).

```yaml
definitions:
  services:
    mssql:
      image: mcr.microsoft.com/mssql/server:2022-CU18-ubuntu-22.04
      variables:
        ACCEPT_EULA: 'Y'
        MSSQL_SA_PASSWORD: $DB_PASSWORD
        MSSQL_PID: 'Developer'
```

| Aspect | Value |
|--------|-------|
| Host from step | `localhost` |
| Port | `1433` |
| Startup | Allow 30–60s; MSSQL slow on CI runners |
| Image | Same family as local Compose |
| Readiness | Retry `test:db:prepare` or wait script before DB tests |

**Not recommended for CI_003:** Running full `docker-compose.yml` inside Bitbucket (heavier, slower, harder to debug).

## 15. Test Database CI Strategy

| Rule | CI behavior |
|------|-------------|
| Database name | `catechism_api_test` |
| Guard | `_test` suffix enforced — dev DB never touched |
| Lifecycle | Fresh/disposable MSSQL per pipeline run |
| Prepare | `npm run test:db:prepare` before integration/e2e |
| Reset | Not needed — empty MSSQL each run |

Integration tests assert `DB_NAME() = catechism_api_test` — validates isolation.

## 16. Environment Variables

### Safe constants (pipeline YAML or step env)

| Variable | CI value |
|----------|----------|
| `NODE_ENV` | `test` (DB steps) / unset (quality step) |
| `DB_HOST` | `localhost` |
| `DB_PORT` | `1433` |
| `DB_NAME` | `catechism_api_test` |
| `DB_USER` | `sa` |
| `DB_ENCRYPT` | `true` |
| `DB_TRUST_SERVER_CERTIFICATE` | `true` |
| `SWAGGER_ENABLED` | `false` |

### Secured secrets (Bitbucket repository/deployment variables)

| Variable | Notes |
|----------|-------|
| `DB_PASSWORD` | MSSQL SA password; **secured**, never echo |

**Do not** commit `.env`, `.env.test`, or secrets in YAML.

### CI bootstrap for DataSource CLI (CI_003)

Before `test:db:migrations`:

```bash
# Option A — generate .env from CI variables (no code change)
cat > .env <<EOF
NODE_ENV=test
DB_HOST=localhost
DB_PORT=1433
DB_NAME=catechism_api_test
DB_USER=sa
DB_PASSWORD=${DB_PASSWORD}
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
EOF
```

## 17. Docker Build Gate Strategy

| Aspect | Recommendation |
|--------|----------------|
| Command | `docker build --target production -t catechism-api:prod .` |
| When | Default branch + custom `full-ci` |
| PR | **Defer** initially (saves ~3–5 min); add in CI_003 if team prefers |
| Push to registry | **No** (future deployment phase) |
| Bitbucket requirement | `services: [docker]` + privileged step |

Validates Dockerfile production stage matches `npm run build` output.

## 18. Docker Service / Bitbucket Constraints

| Use case | Bitbucket `docker` service |
|----------|---------------------------|
| Production image build | **Required** |
| MSSQL | **Not required** — use service container instead |
| docker-compose | **Avoid** in CI |

Bitbucket Pipelines runs on Linux (Docker 20.10+). Local `wsl docker compose` workflow is **developer-only** and must not appear in pipeline scripts.

## 19. Coverage / Artifact Strategy

| Artifact | Recommendation |
|----------|----------------|
| `coverage/` | Optional on default branch; upload if Bitbucket artifacts useful |
| `dist/` | **No** — rebuilt in Docker stage |
| Test reports | Jest default stdout sufficient for v1 |
| Coverage threshold | **None** — no arbitrary gate at foundation stage |

Optional CI_002 step: `npm run test:cov` on PR (adds ~20s) — team choice.

## 20. Failure / Fast Feedback Strategy

**Order matters** — fail fast:

1. `npm ci` (install failure = immediate stop)
2. `format:check` (seconds)
3. `lint` (~10s)
4. `typecheck` (~5s)
5. `test` (~10s)
6. `test:e2e` (~10s)
7. `build` (~5s)

Use single `npm run quality` step for simplicity (already ordered). Split into parallel steps only if pipeline time becomes a problem — **not needed for v1**.

DB and Docker steps run **after** quality passes on default branch.

## 21. Resource / Timeout Considerations

| Step | Suggested `max-time` (minutes) |
|------|-------------------------------|
| Quality (PR) | 15 |
| MSSQL startup + quality:full | 20 |
| Docker production build | 15 |
| Full default-branch pipeline | 30 |

MSSQL Developer edition on CI runners: allocate service container memory if Bitbucket plan allows (2 GB minimum recommended for SQL Server).

## 22. Future Staging / Deployment Extension Points

Document only — **not implemented**:

| Future capability | Extension |
|-------------------|-----------|
| Staging deploy | Custom pipeline + deployment environment |
| Image push | ECR/ACR/Docker Hub step after build |
| Production deploy | Manual trigger only; no auto on push |
| Production migrations | Explicit `migration:run:prod` job; never in PR |
| Secrets | Bitbucket deployment variables per environment |
| Health/readiness | Orchestrator probes after deploy |

## 23. Security Review

| Rule | Status |
|------|--------|
| No secrets in YAML | Planned — use `$DB_PASSWORD` secured variable |
| No `.env` in Git | `.gitignore` enforced |
| No production DB in CI | Test DB only; guard active |
| No auto migrations in CI | `migration:run` excluded from pipelines |
| No registry credentials | Not in scope |
| No env dump in scripts | Test tooling never logs passwords |

## 24. Files Changed

**None.** Audit-only prompt; no code, config, or permanent documentation modified.

## 25. Commands Executed

```text
git status --short                    → clean
git log -5 --oneline                  → foundation commit present
git branch --show-current             → master
git remote -v                         → GitHub origin

node --version                        → v22.23.1
npm --version                         → 10.9.8
npm ci                                → PASS
npm run quality                       → PASS
npm run test:cov                      → PASS (38 tests)
npm audit --audit-level=moderate      → 0 vulnerabilities

npm run quality:full                  → SKIPPED (Docker/MSSQL not running locally)
wsl docker compose ps                 → SKIPPED (Docker daemon unavailable)
```

## 26. Validation Results

| Check | Result |
|-------|--------|
| Git baseline clean | **PASS** |
| Foundation commit exists | **PASS** |
| `npm ci` | **PASS** |
| `npm run quality` | **PASS** |
| `npm run test:cov` | **PASS** |
| `npm audit --audit-level=moderate` | **PASS** |
| Linux portability (npm scripts) | **PASS** |
| `quality:full` local | **SKIPPED** (no MSSQL) |
| Bitbucket remote configured | **N/A** (GitHub remote) |

## 27. Known Issues / Assumptions

1. **Remote is GitHub**, not Bitbucket — pipeline file can be committed but won't run until Bitbucket repo exists.
2. **`data-source.ts` requires `.env` file** — CI_003 must bootstrap env file or adjust CLI loader.
3. **`quality:full` not re-validated locally** — Docker daemon was stopped; design based on Prompt #006 validation and script analysis.
4. **No `engine-strict` in `.npmrc`** — optional hardening for CI_002.
5. **MSSQL CI startup time** — may need wait/retry logic in CI_003 first pipeline iteration.

## 28. Recommended Prompt #002 Implementation Plan

CI_002 should create `bitbucket-pipelines.yml` with:

1. **Image:** `node:22.23.1-bookworm-slim`
2. **Cache:** npm (`~/.npm`)
3. **PR pipeline:** single Quality step (`npm ci`, `npm run quality`, `npm audit`)
4. **Default branch:** Quality step (identical to PR)
5. **Placeholder comment** for CI_003 DB + Docker steps
6. **Optional custom pipeline:** `full-ci` stub
7. **Document** required Bitbucket secured variable: `DB_PASSWORD`
8. **Do not** add MSSQL or Docker services yet (CI_003)

Optional tiny change in CI_002: add `.npmrc` with `engine-strict=true` if team agrees.

## 29. Out-of-Scope Confirmation

Not implemented (as required):

- `bitbucket-pipelines.yml`
- Deployment / staging / registry push
- Auth / business modules
- MSSQL service container (CI_003)
- Docker build gate (CI_003)
- Git commit/push

## 30. Commit Message Recommendation

No code/config changes; no commit message required.
