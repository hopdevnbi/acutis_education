# Agent instructions — Catechism API (backend)

This repository is **backend only** (NestJS, TypeScript, Node.js v22.23.1, MSSQL).

The frontend is a **separate ReactJS repository**. It communicates with this API over HTTP only; do not import or modify frontend source from backend tasks.

Before any change:

1. Read and follow `PROJECT_RULES.md` at the repository root. It is the authoritative source of truth.
2. Follow always-applied Cursor rules in `.cursor/rules/`. They must never weaken `PROJECT_RULES.md`.
3. Stay inside the active prompt scope. Do not implement unrelated features or future modules.
4. Write a local handoff report under `docs/` (this directory is gitignored).
5. Do not run `git add`, `git commit`, or `push` unless the active prompt explicitly requests it.
6. Never commit secrets, `.env` files, or credentials.
7. If a request conflicts with `PROJECT_RULES.md`, stop and report the conflict instead of implementing.

## Before a new business module

Confirm module boundaries in the task report (see `PROJECT_RULES.md` §7.6):

- Which tables/entities the module owns
- What it exports publicly for other modules
- Which modules it depends on (and only via public exports)
- Whether the design blocks future microservice extraction

Do not implement auth, users, or RBAC until the active AUTH prompt explicitly allows it.

## Fast Implementation Mode

See always-applied `.cursor/rules/04-fast-implementation-mode.mdc`.

For normal implementation prompts: complete production code **and** write test/spec files first; do **not** run tests, lint, typecheck, build, quality, Docker, DB prepare/migrations, or audit **unless the user explicitly requests validation**. Architecture, security, and module-boundary rules remain mandatory via code inspection. Runtime gates are deferred to a later FE integration / stabilization phase.
