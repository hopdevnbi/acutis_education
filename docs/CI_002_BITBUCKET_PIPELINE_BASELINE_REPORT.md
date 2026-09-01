# CI/CD BE #002 — Bitbucket Pipeline Baseline

## 1. Objective

Implement the first `bitbucket-pipelines.yml` baseline: Node 22.23.1, npm cache, deterministic `npm ci`, fast PR and default-branch quality gates, and npm audit — without MSSQL, Docker, deployment, or secrets.

## 2. State Inherited From CI #001

| Item | Value |
|------|-------|
| Fast CI gate | `npm run quality` |
| Node image | `node:22.23.1-bookworm-slim` |
| PR strategy | quality + audit only |
| Default branch | `master` — same gate in CI_002; extended in CI_003 |
| Remote | GitHub (pipeline inactive until Bitbucket host) |
| `.npmrc` | `engine-strict=true` already present |

## 3. Files Created

| File | Purpose |
|------|---------|
| `bitbucket-pipelines.yml` | Bitbucket Pipelines baseline configuration |
| `docs/CI_002_BITBUCKET_PIPELINE_BASELINE_REPORT.md` | This report |

## 4. Files Modified

| File | Change |
|------|--------|
| `README.md` | Short CI section describing baseline gate and Bitbucket activation note |

## 5. Bitbucket Pipeline Architecture

```
image: node:22.23.1-bookworm-slim
        │
        ▼
definitions.caches.npm (~/.npm)
        │
        ▼
definitions.steps.quality-step (YAML anchor)
        │
        ├── pull-requests: '**'  → Quality step
        └── branches: master     → Quality step
```

Single reusable step — no MSSQL, Docker, deployment, or custom pipelines.

## 6. Node Runtime

```yaml
image: node:22.23.1-bookworm-slim
```

Matches Dockerfile base and `package.json` engines. No floating tags.

## 7. Cache Strategy

```yaml
definitions:
  caches:
    npm: ~/.npm
```

Each step runs `npm ci` (does not cache `node_modules`, `dist`, or secrets).

## 8. PR Pipeline

| Trigger | `pull-requests: '**'` |
|---------|------------------------|
| Step | Quality |
| max-time | 15 minutes |

Commands (in order):

1. `npm ci`
2. `npm run quality`
3. `npm audit --audit-level=moderate`

## 9. Default Branch Pipeline

| Branch | `master` |
|--------|----------|
| Step | Same Quality step as PR (via YAML anchor) |

CI_003 will append MSSQL and Docker steps to `master` only.

## 10. Custom Pipeline Decision

**Deferred.** No `full-ci` custom pipeline in CI_002 — it would be a placeholder without MSSQL/Docker. CI_003 will add a real `full-ci` when `quality:full` and production Docker build can run.

## 11. engine-strict Decision

| File | Status |
|------|--------|
| `.npmrc` | Already contains `engine-strict=true` |
| Change | **None** |

## 12. npm / Lockfile Behavior

- Install: `npm ci` (lockfile-driven)
- npm version: Bundled with Node 22.23.1 image (local validation: 10.9.8)
- No global npm pin added

## 13. Coverage Decision

**Not included** in pipeline. `npm run quality` already runs unit tests; adding `test:cov` would duplicate work. Coverage artifacts can be added later if needed.

## 14. Secret / Environment Review

| Check | Result |
|-------|--------|
| Passwords in YAML | **None** |
| DB variables | **None** |
| `.env` generation | **None** |
| Registry credentials | **None** |
| Bitbucket secured variables required | **None** for CI_002 |

Pipeline is entirely secret-free.

## 15. Remote / Activation Note

| Item | Value |
|------|-------|
| Current remote | `git@github.com:hopdevnbi/acutis_education.git` |
| Pipeline execution | Requires repository on Bitbucket (host or mirror) |
| Blocker for authoring | **No** — YAML is ready to commit |

## 16. YAML Validation

Parsed `bitbucket-pipelines.yml` with `npx js-yaml` — valid YAML structure, anchors resolved.

Bitbucket-hosted pipeline run: **Not executed** (no Bitbucket repo connected).

## 17. Local Command Validation

Executed the exact pipeline script commands locally (no `.env`, no MSSQL, no Docker):

```text
node --version   → v22.23.1
npm --version    → 10.9.8
npm ci           → PASS
npm run quality  → PASS
npm audit --audit-level=moderate → PASS (0 vulnerabilities)
```

## 18. Validation Results

| Check | Result |
|-------|--------|
| Node | **PASS** |
| npm | **PASS** |
| npm ci | **PASS** |
| quality | **PASS** |
| npm audit | **PASS** |
| YAML syntax | **PASS** (js-yaml parse) |
| No DB service | **PASS** |
| No Docker service | **PASS** |
| No deployment | **PASS** |
| No secrets | **PASS** |
| Bitbucket hosted run | **N/A** |

## 19. Git Diff / Scope Summary

| File | Status |
|------|--------|
| `bitbucket-pipelines.yml` | **New** (untracked) |
| `README.md` | +6 lines (CI section) |

No git write operations performed.

## 20. Known Issues / Assumptions

1. Pipeline not verified on Bitbucket Cloud until repo is hosted there.
2. Default branch assumed `master` (matches current git branch).
3. Bitbucket YAML anchor syntax for `definitions.steps` is standard; validate on first Bitbucket run.

## 21. Out-of-Scope Confirmation

Not implemented: MSSQL service, Docker service/build, `quality:full`, deployment, registry push, auth/business modules, custom `full-ci`.

## 22. Recommended CI #003 Plan

**CI #003 — MSSQL Integration + Docker Build Gates** should:

1. Add MSSQL Bitbucket service container (`mcr.microsoft.com/mssql/server:2022-CU18-ubuntu-22.04`)
2. Bootstrap `.env` from secured `DB_PASSWORD` for DataSource CLI
3. Add MSSQL readiness wait before DB tests
4. Run `npm run quality:full` on `master`
5. Add Docker service + `docker build --target production`
6. Add custom `full-ci` pipeline
7. Still no deploy/registry push

## 23. Commit Message Recommendation

```bash
git commit -m "ci: add Bitbucket quality pipeline"
```

Cursor did **not** run `git add`, `git commit`, or `git push`.
