import {
  MILESTONE_TRIGGER_TYPES,
  MilestoneTriggerType,
} from '../../enums/gamification.enums';

describe('milestone trigger enums', () => {
  it('includes only system/learning trigger types', () => {
    expect(MILESTONE_TRIGGER_TYPES).toEqual(
      expect.arrayContaining([
        MilestoneTriggerType.FirstLessonCompleted,
        MilestoneTriggerType.LessonsCompletedCount,
        MilestoneTriggerType.AttendanceCount,
        MilestoneTriggerType.FirstExamCompleted,
        MilestoneTriggerType.FirstMissionCompleted,
      ]),
    );
  });

  it('excludes sacramental/pastoral trigger types', () => {
    const values = MILESTONE_TRIGGER_TYPES as readonly string[];
    expect(values).not.toContain('BAPTISM');
    expect(values).not.toContain('FIRST_COMMUNION');
    expect(values).not.toContain('CONFIRMATION');
    expect(values).not.toContain('CONFESSION');
    expect(values).not.toContain('SACRAMENTAL');
  });
});
