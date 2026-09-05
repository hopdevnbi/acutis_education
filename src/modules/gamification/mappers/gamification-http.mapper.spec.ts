import { toLearnerPointLedgerItemDto, toStaffPointLedgerItemDto } from '../mappers/gamification-http.mapper';
import type { PointLedgerEntrySnapshot } from '../interfaces/gamification.interfaces';

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
});
