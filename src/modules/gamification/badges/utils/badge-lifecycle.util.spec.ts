import { BadgeDefinitionStatus } from '../../enums/gamification.enums';
import { InvalidBadgeRuleConfigError } from '../../errors/gamification.errors';
import { assertBadgeLifecycleTransition } from './badge-lifecycle.util';

describe('assertBadgeLifecycleTransition', () => {
  it('allows DRAFT -> ACTIVE and DRAFT -> ARCHIVED', () => {
    expect(() =>
      assertBadgeLifecycleTransition(BadgeDefinitionStatus.Draft, BadgeDefinitionStatus.Active),
    ).not.toThrow();
    expect(() =>
      assertBadgeLifecycleTransition(BadgeDefinitionStatus.Draft, BadgeDefinitionStatus.Archived),
    ).not.toThrow();
  });

  it('allows ACTIVE -> ARCHIVED', () => {
    expect(() =>
      assertBadgeLifecycleTransition(BadgeDefinitionStatus.Active, BadgeDefinitionStatus.Archived),
    ).not.toThrow();
  });

  it('allows no-op same-status transitions', () => {
    expect(() =>
      assertBadgeLifecycleTransition(BadgeDefinitionStatus.Draft, BadgeDefinitionStatus.Draft),
    ).not.toThrow();
    expect(() =>
      assertBadgeLifecycleTransition(BadgeDefinitionStatus.Active, BadgeDefinitionStatus.Active),
    ).not.toThrow();
    expect(() =>
      assertBadgeLifecycleTransition(
        BadgeDefinitionStatus.Archived,
        BadgeDefinitionStatus.Archived,
      ),
    ).not.toThrow();
  });

  it('rejects ARCHIVED -> ACTIVE and ARCHIVED -> DRAFT', () => {
    expect(() =>
      assertBadgeLifecycleTransition(BadgeDefinitionStatus.Archived, BadgeDefinitionStatus.Active),
    ).toThrow(InvalidBadgeRuleConfigError);
    expect(() =>
      assertBadgeLifecycleTransition(BadgeDefinitionStatus.Archived, BadgeDefinitionStatus.Draft),
    ).toThrow(/Invalid badge lifecycle transition: ARCHIVED -> DRAFT/);
  });

  it('rejects ACTIVE -> DRAFT', () => {
    expect(() =>
      assertBadgeLifecycleTransition(BadgeDefinitionStatus.Active, BadgeDefinitionStatus.Draft),
    ).toThrow(/Invalid badge lifecycle transition: ACTIVE -> DRAFT/);
  });
});
