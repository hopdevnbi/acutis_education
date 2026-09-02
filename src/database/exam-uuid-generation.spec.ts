import { isUuidV4 } from '../database/uuid-v4.util';
import { ExamAssignmentEntity } from '../modules/exam/entities/exam-assignment.entity';
import { ExamAttemptAnswerEntity } from '../modules/exam/entities/exam-attempt-answer.entity';
import { ExamAttemptQuestionEntity } from '../modules/exam/entities/exam-attempt-question.entity';
import { ExamAttemptEntity } from '../modules/exam/entities/exam-attempt.entity';
import { ExamVersionQuestionEntity } from '../modules/exam/entities/exam-version-question.entity';
import { ExamVersionEntity } from '../modules/exam/entities/exam-version.entity';
import { ExamEntity } from '../modules/exam/entities/exam.entity';
import { ExamAttemptStatus } from '../modules/exam/enums/exam-attempt-status.enum';
import { ExamStatus } from '../modules/exam/enums/exam-status.enum';

describe('Exam entity UUID generation', () => {
  it.each([
    ['ExamEntity', () => new ExamEntity()],
    ['ExamVersionEntity', () => new ExamVersionEntity()],
    ['ExamVersionQuestionEntity', () => new ExamVersionQuestionEntity()],
    ['ExamAssignmentEntity', () => new ExamAssignmentEntity()],
    ['ExamAttemptEntity', () => new ExamAttemptEntity()],
    ['ExamAttemptQuestionEntity', () => new ExamAttemptQuestionEntity()],
    ['ExamAttemptAnswerEntity', () => new ExamAttemptAnswerEntity()],
  ])('assigns RFC UUID v4 ids to new %s instances', (_label, createEntity) => {
    const firstEntity = createEntity() as { id: string };
    const secondEntity = createEntity() as { id: string };

    expect(isUuidV4(firstEntity.id)).toBe(true);
    expect(isUuidV4(secondEntity.id)).toBe(true);
    expect(firstEntity.id).not.toBe(secondEntity.id);
  });

  it('does not regenerate id when ExamEntity is constructed with explicit values', () => {
    const explicitId = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const exam = new ExamEntity();
    exam.id = explicitId;
    exam.parishId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    exam.code = 'midterm-1';
    exam.status = ExamStatus.Active;
    exam.currentPublishedVersionId = null;

    expect(exam.id).toBe(explicitId);
  });

  it('allows scalar foreign key assignment without relations on ExamAttemptEntity', () => {
    const attempt = new ExamAttemptEntity();
    attempt.examAssignmentId = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    attempt.enrollmentId = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
    attempt.attemptNumber = 1;
    attempt.startedByUserId = 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    attempt.clientRequestId = null;
    attempt.status = ExamAttemptStatus.InProgress;
    attempt.autoSubmitReason = null;
    attempt.examId = 'f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66';
    attempt.examVersionId = '11111111-1111-4111-8111-111111111111';
    attempt.studentId = '22222222-2222-4222-8222-222222222222';
    attempt.classId = '33333333-3333-4333-8333-333333333333';
    attempt.parishId = '44444444-4444-4444-8444-444444444444';
    attempt.academicYearId = '55555555-5555-4555-8555-555555555555';
    attempt.catechismLevelId = '66666666-6666-4666-8666-666666666666';
    attempt.examTitleDelivered = 'Midterm Exam';
    attempt.instructionsDelivered = 'Answer all questions.';
    attempt.examTranslationRevisionId = null;
    attempt.deliveredLocale = 'vi-VN';
    attempt.startedAt = new Date('2026-09-02T00:00:00.000Z');
    attempt.deadlineAt = new Date('2026-09-02T01:00:00.000Z');
    attempt.submittedAt = null;
    attempt.gradedAt = null;
    attempt.questionCount = null;
    attempt.correctCount = null;
    attempt.scorePercent = null;
    attempt.passed = null;

    expect(attempt.enrollmentId).toBe('d1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44');
    expect(attempt.status).toBe(ExamAttemptStatus.InProgress);
  });
});
