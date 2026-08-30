# Agent instructions — Catechism API (backend)

This repository is **backend only** (NestJS, TypeScript, Node.js v22.23.1, MSSQL).

Before any change:

1. Read and follow `PROJECT_RULES.md` at the repository root. It is the authoritative source of truth.
2. Follow always-applied Cursor rules in `.cursor/rules/`. They must never weaken `PROJECT_RULES.md`.
3. Stay inside the active prompt scope. Do not implement unrelated features or future modules.
4. Write a local handoff report under `docs/` (this directory is gitignored).
5. Do not run `git add`, `git commit`, or `push` unless the active prompt explicitly requests it.
6. Never commit secrets, `.env` files, or credentials.
7. If a request conflicts with `PROJECT_RULES.md`, stop and report the conflict instead of implementing.
