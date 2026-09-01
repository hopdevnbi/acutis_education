# PROMPT 001 — Project Rules Report

## 1. Objective

Establish mandatory backend engineering rules and repository hygiene for the parish catechism API **before** any NestJS business implementation.

This prompt is backend-only. It does not bootstrap the application, database, Docker services, auth, Swagger, or catechism modules.

An additional user requirement: place Cursor rules in a project folder so **every future prompt automatically reads and follows** the project rules.

## 2. Initial repository state

- Workspace folder `Acutis Education` existed but was empty.
- Not a Git repository (`fatal: not a git repository`).
- No `PROJECT_RULES.md`, `.gitignore`, source tree, or application modules.

## 3. Files created

| Path | Purpose |
| --- | --- |
| `PROJECT_RULES.md` | Authoritative backend engineering rules (tracked). |
| `.gitignore` | Repository hygiene, including ignored `docs/`. |
| `AGENTS.md` | Short agent pointer so Cursor always loads the same rules. |
| `.cursor/rules/00-mandatory-project-rules.mdc` | Always-apply Cursor rule: read and obey `PROJECT_RULES.md`. |
| `.cursor/rules/01-security-privacy-minors.mdc` | Always-apply security/privacy rules (platform includes minors). |
| `.cursor/rules/02-engineering-baseline.mdc` | Always-apply TypeScript/NestJS/API/quality baseline. |
| `docs/PROMPT_001_PROJECT_RULES_REPORT.md` | This local handoff report (gitignored). |

Git was initialized (`git init` only). No files were staged or committed.

## 4. Files modified

None. The repository had no pre-existing tracked files.

Tiny wording was added to the copied `PROJECT_RULES.md` §27 to document `.cursor/rules/` and `AGENTS.md`. Intent and strictness of all engineering, security, testing, privacy, Docker, CI/CD, TypeScript, lint, Prettier, and Cursor workflow rules were preserved.

## 5. Summary of important rules established

- **Priority:** Read `PROJECT_RULES.md` before any change. Never silently override it. Stop and report conflicts.
- **Stack:** Node.js `v22.23.1`, NestJS, TypeScript strict, MSSQL, Docker, Bitbucket Pipelines. Backend and frontend remain separate repositories.
- **TypeScript:** No implicit/`any` shortcuts; DTOs, persistence models, and domain types stay separate.
- **NestJS:** Thin controllers, validated input, feature modules only when the active phase needs them.
- **API:** `/api/v1`, consistent errors, no leaked internals.
- **Security / children:** Least privilege, server-side authz, no plaintext passwords, no public child profiles by default, no pastoral/confessional data in ordinary records.
- **Quality:** Prettier + ESLint, deterministic tests, definition of done.
- **Git:** Do not commit `.env`, secrets, or `docs/` reports. Do not commit unless the active prompt allows it.
- **Cursor:** Every task writes `docs/<TASK_NAME>_REPORT.md`. Always-apply rules in `.cursor/rules/` inject these conventions into every session.

## 6. `.gitignore` changes

Created root `.gitignore`. Relevant entries:

```gitignore
docs/
```

Also included standard NestJS/Node hygiene that `PROJECT_RULES.md` already requires (not application code):

- `node_modules/`, `dist/`, `coverage/`
- `.env` (with `!.env.example` exception)
- logs, OS junk, local temp/test artifacts

`.cursor/rules/` is **not** ignored so always-apply rules stay in Git.

## 7. Validation performed

| Check | Result |
| --- | --- |
| `PROJECT_RULES.md` exists at repository root | Pass |
| Root `.gitignore` contains `docs/` | Pass |
| No NestJS business code, auth, entities, Docker services, Swagger, migrations, or catechism modules | Pass |
| No speculative `src/` application folders | Pass |
| `docs/` is gitignored (`git check-ignore docs/PROMPT_001_PROJECT_RULES_REPORT.md`) | Pass |
| `.cursor/rules/*.mdc` use `alwaysApply: true` | Pass |
| No `git add` / `git commit` / push | Pass |

## 8. `git diff` summary

`git diff` and `git diff --stat` are empty because nothing is staged. All work is **untracked**, which is expected (prompt forbids `git add` / commit).

`git status --short --untracked-files=all`:

```text
?? .cursor/rules/00-mandatory-project-rules.mdc
?? .cursor/rules/01-security-privacy-minors.mdc
?? .cursor/rules/02-engineering-baseline.mdc
?? .gitignore
?? AGENTS.md
?? PROJECT_RULES.md
```

`docs/PROMPT_001_PROJECT_RULES_REPORT.md` does not appear because `docs/` is ignored.

Scope is limited to rules, hygiene, and Cursor always-apply wiring. No application implementation.

## 9. Any issues or assumptions

- **Git init:** The folder was not a Git repo. `git init` was run so status/diff could be inspected. No commit was made.
- **Cursor always-apply (user request beyond Prompt #001):** Rules were placed in `.cursor/rules/` with `alwaysApply: true`, plus a short `AGENTS.md`. This is the Cursor mechanism that injects rules into every prompt. Full detail remains in `PROJECT_RULES.md`.
- **`.gitignore` extras:** Standard Node/NestJS ignore patterns were added alongside required `docs/` so secrets and build output are not committed later. No source modules were created.
- **Report location:** This file lives under ignored `docs/` as specified. It will not be versioned.
- **Package manager / Node pin files:** Not created. `.nvmrc` and `package.json` `engines` belong to backend bootstrap (next prompts).

## 10. Recommended next step

Prepare **Backend Phase 0/1 architecture/bootstrap** (Prompt #002 and following): repository skeleton, Node version pin, package manager choice, NestJS app bootstrap, TypeScript/ESLint/Prettier, config validation, logging, global validation/exception filters, Swagger baseline, MSSQL + Docker Compose local stack, and migration conventions.

Do **not** implement that work in this prompt.
