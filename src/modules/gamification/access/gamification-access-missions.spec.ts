import { GamificationAccessService } from './gamification-access.service';

/**
 * Capability shells for #005 mission access helpers.
 * Behavioral denial matrices remain in gamification-access.service.spec.ts / DB e2e.
 */
describe('GamificationAccessService mission access capabilities', () => {
  it('exposes assertCanManageMissionDefinition on the prototype', () => {
    expect(typeof GamificationAccessService.prototype.assertCanManageMissionDefinition).toBe(
      'function',
    );
  });

  it('exposes assertCanReadMissionProgress on the prototype', () => {
    expect(typeof GamificationAccessService.prototype.assertCanReadMissionProgress).toBe(
      'function',
    );
  });

  it('exposes assertCanReadClassMissions on the prototype', () => {
    expect(typeof GamificationAccessService.prototype.assertCanReadClassMissions).toBe('function');
  });

  it('exposes resolveLearnerEnrollmentContext on the prototype', () => {
    expect(typeof GamificationAccessService.prototype.resolveLearnerEnrollmentContext).toBe(
      'function',
    );
  });
});
