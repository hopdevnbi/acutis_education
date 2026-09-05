import {
  toLearnerBadgeListResponseDto,
  toLearnerMilestoneListResponseDto,
  toLearnerPointLedgerItemDto,
  toStaffPointLedgerItemDto,
  toStaffStudentBadgeListResponseDto,
  toStaffStudentMilestoneListResponseDto,
} from '../mappers/gamification-http.mapper';
import type { PointLedgerEntrySnapshot } from '../interfaces/gamification.interfaces';
import type {
  LearnerBadgeView,
  LearnerMilestoneView,
  StaffStudentBadgeView,
  StaffStudentMilestoneView,
} from '../gamification.service';

describe('gamification HTTP DTO privacy', () => {
  const entry: PointLedgerEntrySnapshot = {
    id: '1',
    studentId: 's',
    enrollmentId: 'e',
    parishId: 'p',
    academicYearId: 'y',
    pointsDelta: 10,
    sourceType: 'LESSON_COMPLETED',
    sourceId: 'src',
    reasonCode: 'RULE_A',
    descriptionKey: 'reward_rule.RULE_A',
    staffNote: 'internal note',
    awardedByUserId: 'staff',
    relatedLedgerEntryId: null,
    createdAt: new Date(),
  };

  it('staff DTO may include staffNote', () => {
    const dto = toStaffPointLedgerItemDto(entry);
    expect(dto.staffNote).toBe('internal note');
    expect(dto).not.toHaveProperty('awardedByUserId');
  });

  it('learner DTO omits staffNote and actor ids', () => {
    const dto = toLearnerPointLedgerItemDto(entry);
    expect(dto).not.toHaveProperty('staffNote');
    expect(dto).not.toHaveProperty('awardedByUserId');
    expect(dto.reasonKey).toBe('reward_rule.RULE_A');
  });

  it('learner badge list omits staff and rule internals', () => {
    const view: LearnerBadgeView = {
      id: 'b1',
      code: 'CODE',
      name: 'Name',
      description: null,
      category: 'LEARNING',
      iconMediaAssetId: null,
      awardedAt: new Date(),
      pointsBonus: null,
    };
    const item = toLearnerBadgeListResponseDto([view]).items[0];
    expect(item).not.toHaveProperty('awardedByUserId');
    expect(item).not.toHaveProperty('ruleConfigJson');
    expect(item).not.toHaveProperty('staffNote');
    expect(item).not.toHaveProperty('sourceId');
  });

  it('staff student badge list still omits awardedByUserId and ruleConfig', () => {
    const view: StaffStudentBadgeView = {
      awardId: 'a1',
      id: 'b1',
      code: 'CODE',
      name: 'Name',
      description: null,
      category: 'LEARNING',
      iconMediaAssetId: null,
      awardedAt: new Date(),
      pointsBonus: 10,
      revokedAt: null,
    };
    const item = toStaffStudentBadgeListResponseDto([view]).items[0];
    expect(item.awardId).toBe('a1');
    expect(item).not.toHaveProperty('awardedByUserId');
    expect(item).not.toHaveProperty('ruleConfigJson');
    expect(item).not.toHaveProperty('staffNote');
    expect(item).not.toHaveProperty('sourceId');
  });

  it('learner milestone list omits source and trigger config', () => {
    const view: LearnerMilestoneView = {
      id: 'm1',
      code: 'MS',
      name: 'Milestone',
      description: null,
      sortOrder: 1,
      achievedAt: new Date(),
    };
    const item = toLearnerMilestoneListResponseDto([view]).items[0];
    expect(item).not.toHaveProperty('awardedByUserId');
    expect(item).not.toHaveProperty('triggerConfigJson');
    expect(item).not.toHaveProperty('staffNote');
    expect(item).not.toHaveProperty('sourceId');
  });

  it('staff student milestone list omits source internals', () => {
    const view: StaffStudentMilestoneView = {
      achievementId: 'ach1',
      id: 'm1',
      code: 'MS',
      name: 'Milestone',
      description: null,
      sortOrder: 1,
      achievedAt: new Date(),
    };
    const item = toStaffStudentMilestoneListResponseDto([view]).items[0];
    expect(item.achievementId).toBe('ach1');
    expect(item).not.toHaveProperty('sourceId');
    expect(item).not.toHaveProperty('sourceType');
    expect(item).not.toHaveProperty('staffNote');
  });
});
