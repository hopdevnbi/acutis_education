import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { PracticeAnswerAttemptEntity } from '../modules/practice/entities/practice-answer-attempt.entity';
import { PracticeSessionQuestionEntity } from '../modules/practice/entities/practice-session-question.entity';
import { PracticeSessionEntity } from '../modules/practice/entities/practice-session.entity';

function resolveTableName(entityTarget: EntityTarget<object>): string | undefined {
  const tableMetadata = getMetadataArgsStorage().tables.find(
    (table) => table.target === entityTarget,
  );

  return tableMetadata?.name;
}

function resolveRelationCount(entityTarget: EntityTarget<object>): number {
  return getMetadataArgsStorage().relations.filter((relation) => relation.target === entityTarget)
    .length;
}

function resolveColumnNames(entityTarget: EntityTarget<object>): string[] {
  return getMetadataArgsStorage()
    .columns.filter((column) => column.target === entityTarget)
    .map((column) => column.options.name ?? column.propertyName);
}

describe('Practice foundation entities', () => {
  it('maps PracticeSessionEntity with enrollment scope and lifecycle fields', () => {
    expect(resolveTableName(PracticeSessionEntity)).toBe('practice_sessions');
    expect(resolveRelationCount(PracticeSessionEntity)).toBe(0);

    expect(resolveColumnNames(PracticeSessionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'enrollmentId',
        'sessionType',
        'sourceSessionId',
        'status',
        'locale',
        'curriculumId',
        'canonicalLessonKey',
        'requestedQuestionCount',
        'maxAttemptsPerQuestion',
        'randomizeQuestions',
        'randomizeOptions',
        'clientRequestId',
        'createdByUserId',
        'startedAt',
        'completedAt',
        'abandonedAt',
        'createdAt',
        'updatedAt',
      ]),
    );

    const localeColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === PracticeSessionEntity && column.propertyName === 'locale',
    );

    expect(localeColumn?.options.type).toBe('varchar');
    expect(localeColumn?.options.length).toBe(32);
    expect(localeColumn?.options.nullable).not.toBe(true);

    const curriculumIdColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === PracticeSessionEntity && column.propertyName === 'curriculumId',
    );

    expect(curriculumIdColumn?.options.nullable).toBe(true);
  });

  it('maps PracticeSessionQuestionEntity with scalar questionVersionId and JSON option order', () => {
    expect(resolveTableName(PracticeSessionQuestionEntity)).toBe('practice_session_questions');
    expect(resolveRelationCount(PracticeSessionQuestionEntity)).toBe(0);

    expect(resolveColumnNames(PracticeSessionQuestionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'practiceSessionId',
        'questionVersionId',
        'position',
        'deliveredOptionOrderJson',
        'createdAt',
      ]),
    );

    const optionOrderColumn = getMetadataArgsStorage().columns.find(
      (column) =>
        column.target === PracticeSessionQuestionEntity &&
        column.propertyName === 'deliveredOptionOrderJson',
    );

    expect(optionOrderColumn?.options.type).toBe('nvarchar');
    expect(optionOrderColumn?.options.nullable).toBe(true);
  });

  it('maps PracticeAnswerAttemptEntity with idempotency and scoring fields', () => {
    expect(resolveTableName(PracticeAnswerAttemptEntity)).toBe('practice_answer_attempts');
    expect(resolveRelationCount(PracticeAnswerAttemptEntity)).toBe(0);

    expect(resolveColumnNames(PracticeAnswerAttemptEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'practiceSessionQuestionId',
        'attemptNumber',
        'clientAnswerId',
        'selectedOptionIdsJson',
        'isCorrect',
        'score',
        'submittedByUserId',
        'submittedAt',
      ]),
    );

    const selectedOptionsColumn = getMetadataArgsStorage().columns.find(
      (column) =>
        column.target === PracticeAnswerAttemptEntity &&
        column.propertyName === 'selectedOptionIdsJson',
    );

    expect(selectedOptionsColumn?.options.type).toBe('nvarchar');
    expect(selectedOptionsColumn?.options.nullable).not.toBe(true);

    const scoreColumn = getMetadataArgsStorage().columns.find(
      (column) => column.target === PracticeAnswerAttemptEntity && column.propertyName === 'score',
    );

    expect(scoreColumn?.options.type).toBe('tinyint');
  });
});
