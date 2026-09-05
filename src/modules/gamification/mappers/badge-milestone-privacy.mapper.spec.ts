import {
  toLearnerBadgeListResponseDto,
  toLearnerMilestoneListResponseDto,
} from '../mappers/gamification-http.mapper';
import type { LearnerBadgeView, LearnerMilestoneView } from '../gamification.service';

describe('learner badge/milestone mapper privacy', () => {
  const badgeView: LearnerBadgeView = {
    id: 'badge-def-1',
    code: 'FIRST_LESSON',
    name: 'First Lesson',
    description: 'Completed first lesson',
    category: 'LEARNING',
    iconMediaAssetId: null,
    awardedAt: new Date('2026-09-01T00:00:00.000Z'),
    pointsBonus: 5,
  };

  const milestoneView: LearnerMilestoneView = {
    id: 'ms-def-1',
    code: 'MS_FIRST_LESSON',
    name: 'First Lesson Milestone',
    description: null,
    sortOrder: 1,
    achievedAt: new Date('2026-09-01T00:00:00.000Z'),
  };

  it('learner badge DTO never includes awardedByUserId, ruleConfig, staffNote, or sourceId', () => {
    const dto = toLearnerBadgeListResponseDto([badgeView]);
    const item = dto.items[0];
    expect(item).toBeDefined();
    expect(item).not.toHaveProperty('awardedByUserId');
    expect(item).not.toHaveProperty('ruleConfig');
    expect(item).not.toHaveProperty('ruleConfigJson');
    expect(item).not.toHaveProperty('staffNote');
    expect(item).not.toHaveProperty('sourceId');
    expect(item).not.toHaveProperty('sourceType');
    expect(item.code).toBe('FIRST_LESSON');
    expect(item.pointsBonus).toBe(5);
  });

  it('learner milestone DTO never includes awardedByUserId, ruleConfig, staffNote, or sourceId', () => {
    const dto = toLearnerMilestoneListResponseDto([milestoneView]);
    const item = dto.items[0];
    expect(item).toBeDefined();
    expect(item).not.toHaveProperty('awardedByUserId');
    expect(item).not.toHaveProperty('ruleConfig');
    expect(item).not.toHaveProperty('triggerConfigJson');
    expect(item).not.toHaveProperty('staffNote');
    expect(item).not.toHaveProperty('sourceId');
    expect(item).not.toHaveProperty('sourceType');
    expect(item.code).toBe('MS_FIRST_LESSON');
    expect(item.sortOrder).toBe(1);
  });
});
