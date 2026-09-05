# Fast Implementation Mode — Rule Update Report

**Date:** 2026-09-05  
**Mode:** PROJECT-WIDE WORKFLOW CHANGE (no business feature)  
**Scope:** Cursor always-applied rule + AGENTS.md pointer

---

## 1. Objective

Encode Fast Implementation Mode so future prompts prioritize complete production code and test/spec files, while deferring expensive validation/execution until the user explicitly requests it or a later FE integration / stabilization phase.

---

## 2. Files created

- `.cursor/rules/04-fast-implementation-mode.mdc`
- `docs/FAST_IMPLEMENTATION_MODE_RULE_UPDATE_REPORT.md` (this report)

---

## 3. Files modified

- `AGENTS.md` — concise Fast Implementation Mode section pointing at the new rule

---

## 4. New rule filename

`.cursor/rules/04-fast-implementation-mode.mdc`

(Next free number after `00`–`03`; meaning preserved.)

---

## 5. alwaysApply status

`alwaysApply: true` in frontmatter.

---

## 6. Code-first policy

Normal implementation prompts complete services/controllers/DTOs/entities/migrations/module wiring/seeds/Postman (when requested)/test files/docs first; do not spend significant time executing validation.

---

## 7. Test-writing policy

Tests/specs remain mandatory deliverables (unit, integration, DB e2e, denial, boundaries).

---

## 8. Test-execution policy

By default: write tests, **do not execute** them. Unexecuted tests are not failures.

---

## 9. Docker policy

By default: do not start/stop/build Docker, wait on MSSQL health, or create path workarounds solely for testing.

---

## 10. DB/migration execution policy

Write migrations/entities/tests; do not execute migrations or DB prepare/reset by default. Do not edit landed migrations when a new migration is required.

---

## 11. Validation command policy

By default do not run `npm test` / `test:*` / quality / lint / typecheck / build / format / audit / seed / Newman, unless the user explicitly requests validation.

---

## 12. Reporting semantics

Reports distinguish IMPLEMENTATION vs VALIDATION (`IMPLEMENTED`, `TESTS WRITTEN`, `TESTS EXECUTED: NO — deferred…`, `NOT RUN — deferred`). Never `FAIL` solely for intentional non-execution.

---

## 13. Prompt-gate semantics

Next-prompt readiness is based on code/contracts/security/tests-written + inspection (no BLOCKER/HIGH from review). Runtime execution is not required to advance.

---

## 14. Architecture/security exceptions

Fast mode does **not** defer architecture or security. Module ownership, public APIs, no foreign repos/entities, no unnecessary `forwardRef`, RBAC/scope/`/me`, minor privacy, PII, contracts, N+1 design, secrets remain mandatory code-review gates.

---

## 15. User override behavior

Explicit user requests to run tests/validate/Docker/migrations/quality/regression/audit → execute exactly that scope; otherwise stay in Fast Mode.

---

## 16. Future stabilization phase

Documented: after broad endpoint completion, a separate **FE INTEGRATION / STABILIZATION / VALIDATION PHASE** runs incremental compile/unit/integration/DB e2e/migrations/Docker/Postman/FE contract/regression. Not performed early by default.

---

## 17. AGENTS.md impact

Added short **Fast Implementation Mode** section with pointer to `.cursor/rules/04-fast-implementation-mode.mdc`. Rule body not duplicated.

---

## 18. PROJECT_RULES.md impact

**Not modified.** No genuine contradiction requiring an edit: `PROJECT_RULES.md` remains authoritative for architecture/security/DoD; Fast Mode scopes **agent workflow default** for when expensive validation runs. Stabilization phase still covers full validation. Cursor rules must not weaken `PROJECT_RULES.md` substance.

---

## 19. Git diff inspection

Inspected via `git diff` / `git status` on rule and AGENTS paths only (no format/lint/test/Docker). Expected tracked changes:

- `.cursor/rules/04-fast-implementation-mode.mdc` (new)
- `AGENTS.md` (modified)

`docs/` report is local/gitignored handoff (may appear untracked depending on ignore rules).

---

## 20. Risks

- Agents may under-validate if users forget to request a stabilization pass.
- DoD wording in `PROJECT_RULES.md` still expects quality gates for release; Fast Mode defers **when** agents run them, not the eventual requirement.
- Mitigation: user override + explicit future stabilization phase + report language that separates IMPLEMENTATION vs VALIDATION.

---

## 21. Final verdict

Fast Implementation Mode rule is in place, always applied, preserves architecture/security, requires tests to be written, defers execution/Docker/DB/quality by default, and allows explicit validation overrides.

---

## 22. Commit recommendation

```
git commit -m "chore: add fast implementation workflow rule"
```

Do not run `git add` / commit / push from the agent.

---

## REQUIRED VERDICTS

- FAST IMPLEMENTATION MODE RULE ADDED: **YES**
- ALWAYS APPLY: **YES**
- TESTS STILL REQUIRED TO BE WRITTEN: **YES**
- TEST EXECUTION DEFERRED BY DEFAULT: **YES**
- DOCKER EXECUTION DEFERRED BY DEFAULT: **YES**
- DB VALIDATION DEFERRED BY DEFAULT: **YES**
- QUALITY/LINT/TYPECHECK/BUILD EXECUTION DEFERRED BY DEFAULT: **YES**
- ARCHITECTURE RULES PRESERVED: **YES**
- SECURITY/PRIVACY RULES PRESERVED: **YES**
- USER CAN EXPLICITLY REQUEST VALIDATION: **YES**
- FUTURE PROMPTS MAY ADVANCE WITHOUT RUNNING TESTS: **YES**
