import { isUuidV4 } from '../database/uuid-v4.util';
import { LessonProgressEntity } from '../modules/learning-progress/entities/lesson-progress.entity';
import { LessonProgressPersistedStatus } from '../modules/learning-progress/enums/lesson-progress-status.enum';

describe('Learning progress entity UUID generation', () => {
  it('assigns RFC UUID v4 ids to new LessonProgressEntity instances', () => {
    const firstEntity = new LessonProgressEntity();
    const secondEntity = new LessonProgressEntity();

    expect(isUuidV4(firstEntity.id)).toBe(true);
    expect(isUuidV4(secondEntity.id)).toBe(true);
    expect(firstEntity.id).not.toBe(secondEntity.id);
  });

  it('allows scalar foreign key assignment without relations', () => {
    const row = new LessonProgressEntity();
    row.enrollmentId = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    row.curriculumId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    row.canonicalLessonKey = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    row.assignedCurriculumVersionId = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
    row.status = LessonProgressPersistedStatus.InProgress;
    row.startedAt = new Date('2026-09-01T00:00:00.000Z');
    row.startedByUserId = 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    row.completedAt = null;
    row.completedByUserId = null;

    expect(row.status).toBe(LessonProgressPersistedStatus.InProgress);
    expect(row.completedByUserId).toBeNull();
  });
});
