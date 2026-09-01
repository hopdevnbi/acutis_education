# CURRICULUM #005 — Curriculum Delivery Tests Report

## Scope

Added unit, integration, and HTTP e2e coverage for `CurriculumDeliveryService` and contextual delivery routes.

## Files created

- `src/modules/curriculum-delivery/services/curriculum-delivery.service.spec.ts`
- `test/integration/curriculum-delivery.integration-spec.ts` (`cur005-int-` prefix)
- `test/curriculum-delivery.db.e2e-spec.ts` (`cur005-e2e-` prefix)

## Fixes applied (required for compile/run)

- Corrected broken relative imports in `curriculum-delivery.service.ts` (`../errors`, `../interfaces`, `../mappers`).
- Corrected DTO import in `curriculum-delivery-response.mapper.ts` (`../dto/...`).

## Test results

| Suite | Pass count |
|-------|------------|
| Unit (`npm test -- --testPathPattern=curriculum-delivery.service.spec.ts`) | **12 / 12** |
| Integration (`npm run test:integration -- --testPathPattern=curriculum-delivery.integration-spec.ts`) | **4 / 4** |
| DB e2e (`npm run test:e2e:db -- --testPathPattern=curriculum-delivery.db.e2e-spec.ts`) | **5 / 5** |
| **Total** | **21 / 21** |

## Coverage summary

### Unit

- Catechist assigned / unassigned class tree
- Parish admin class tree
- Linked / unrelated parent enrollment tree
- Missing curriculum assignment propagation
- Draft lesson denied, wrong-version lesson denied
- Learner content metadata fields

### Integration (MSSQL)

- Publish + assign + class tree delivery
- Draft lesson content denied via contextual service route
- `canonicalLessonKey` preserved in learner tree after clone
- Assigned catechist scope + delivery

### DB e2e (HTTP)

- 401 unauthenticated
- CATECHIST assigned 200 / unassigned 403 (class tree)
- PARENT linked 200 / unrelated 403 (enrollment tree)
- Contextual lesson content 200 (assigned) / 403 (draft clone lesson)
- PARISH_ADMIN own parish 200 (tree + content)
