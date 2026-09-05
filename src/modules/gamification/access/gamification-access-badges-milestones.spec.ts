import { GamificationAccessService } from './gamification-access.service';

/**
 * Capability shells for #004 badge/milestone access helpers.
 * Behavioral denial matrices remain in gamification-access.service.spec.ts / DB e2e.
 */
describe('GamificationAccessService badge/milestone capabilities', () => {
  it('exposes assertCanManageBadgeDefinitions on the prototype', () => {
    expect(typeof GamificationAccessService.prototype.assertCanManageBadgeDefinitions).toBe(
      'function',
    );
  });

  it('exposes assertCanManageMilestoneDefinitions on the prototype', () => {
    expect(typeof GamificationAccessService.prototype.assertCanManageMilestoneDefinitions).toBe(
      'function',
    );
  });

  it('exposes assertStaffCanAwardBadge on the prototype', () => {
    expect(typeof GamificationAccessService.prototype.assertStaffCanAwardBadge).toBe('function');
  });

  it('keeps badge read helper for admin listing', () => {
    expect(typeof GamificationAccessService.prototype.assertCanReadBadgeDefinitions).toBe(
      'function',
    );
  });
});
