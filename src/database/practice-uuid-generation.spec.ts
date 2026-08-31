import { isUuidV4 } from '../database/uuid-v4.util';
import { PracticeAnswerAttemptEntity } from '../modules/practice/entities/practice-answer-attempt.entity';
import { PracticeSessionQuestionEntity } from '../modules/practice/entities/practice-session-question.entity';
import { PracticeSessionEntity } from '../modules/practice/entities/practice-session.entity';
import { PracticeSessionStatus } from '../modules/practice/enums/practice-session-status.enum';
import { PracticeSessionType } from '../modules/practice/enums/practice-session-type.enum';

describe('Practice entity UUID generation', () => {
  it.each([
    ['PracticeSessionEntity', () => new PracticeSessionEntity()],
    ['PracticeSessionQuestionEntity', () => new PracticeSessionQuestionEntity()],
    ['PracticeAnswerAttemptEntity', () => new PracticeAnswerAttemptEntity()],
  ])('assigns RFC UUID v4 ids to new %s instances', (_label, createEntity) => {
    const firstEntity = createEntity() as { id: string };
    const secondEntity = createEntity() as { id: string };

    expect(isUuidV4(firstEntity.id)).toBe(true);
    expect(isUuidV4(secondEntity.id)).toBe(true);
    expect(firstEntity.id).not.toBe(secondEntity.id);
  });

  it('does not regenerate id when PracticeSessionEntity is constructed with explicit values', () => {
    const explicitId = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const session = new PracticeSessionEntity();
    session.id = explicitId;
    session.enrollmentId = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
    session.sessionType = PracticeSessionType.Standard;
    session.sourceSessionId = null;
    session.status = PracticeSessionStatus.InProgress;
    session.locale = 'vi-VN';
    session.curriculumId = null;
    session.canonicalLessonKey = null;
    session.requestedQuestionCount = 5;
    session.maxAttemptsPerQuestion = 3;
    session.randomizeQuestions = true;
    session.randomizeOptions = true;
    session.clientRequestId = null;
    session.createdByUserId = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
    session.startedAt = new Date('2026-08-31T00:00:00.000Z');
    session.completedAt = null;
    session.abandonedAt = null;

    expect(session.id).toBe(explicitId);
  });

  it('allows scalar foreign key assignment without relations on PracticeSessionQuestionEntity', () => {
    const sessionQuestion = new PracticeSessionQuestionEntity();
    sessionQuestion.practiceSessionId = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44';
    sessionQuestion.questionVersionId = 'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';
    sessionQuestion.position = 1;
    sessionQuestion.deliveredOptionOrderJson = '["f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a66"]';

    expect(sessionQuestion.questionVersionId).toBe('e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55');
    expect(sessionQuestion.deliveredOptionOrderJson).toContain('f1eebc99');
  });

  it('allows PracticeAnswerAttemptEntity scalar actor and client idempotency fields', () => {
    const attempt = new PracticeAnswerAttemptEntity();
    attempt.practiceSessionQuestionId = 'a2eebc99-9c0b-4ef8-bb6d-6bb9bd380a77';
    attempt.attemptNumber = 1;
    attempt.clientAnswerId = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a88';
    attempt.selectedOptionIdsJson = '["c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a99"]';
    attempt.isCorrect = true;
    attempt.score = 1;
    attempt.submittedByUserId = 'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380aaa';
    attempt.submittedAt = new Date('2026-08-31T12:00:00.000Z');

    expect(attempt.clientAnswerId).toBe('b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a88');
    expect(attempt.score).toBe(1);
  });
});
