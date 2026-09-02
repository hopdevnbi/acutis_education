import type { EntityTarget } from 'typeorm';
import { getMetadataArgsStorage } from 'typeorm';
import { ExamAssignmentEntity } from '../modules/exam/entities/exam-assignment.entity';
import { ExamAttemptAnswerEntity } from '../modules/exam/entities/exam-attempt-answer.entity';
import { ExamAttemptQuestionEntity } from '../modules/exam/entities/exam-attempt-question.entity';
import { ExamAttemptEntity } from '../modules/exam/entities/exam-attempt.entity';
import { ExamVersionQuestionEntity } from '../modules/exam/entities/exam-version-question.entity';
import { ExamVersionEntity } from '../modules/exam/entities/exam-version.entity';
import { ExamEntity } from '../modules/exam/entities/exam.entity';

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

describe('Exam foundation entities', () => {
  it('maps ExamEntity with parish scope and optional published version pointer', () => {
    expect(resolveTableName(ExamEntity)).toBe('exams');
    expect(resolveRelationCount(ExamEntity)).toBe(0);

    expect(resolveColumnNames(ExamEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'parishId',
        'code',
        'status',
        'currentPublishedVersionId',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps ExamVersionEntity with authoring and publish metadata', () => {
    expect(resolveTableName(ExamVersionEntity)).toBe('exam_versions');
    expect(resolveRelationCount(ExamVersionEntity)).toBe(0);

    expect(resolveColumnNames(ExamVersionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'examId',
        'versionNumber',
        'title',
        'description',
        'instructions',
        'sourceLocale',
        'durationMinutes',
        'maxAttempts',
        'passingScorePercent',
        'shuffleQuestions',
        'shuffleOptions',
        'reviewPolicyJson',
        'status',
        'publishedAt',
        'publishedByUserId',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps ExamVersionQuestionEntity with scalar question references only', () => {
    expect(resolveTableName(ExamVersionQuestionEntity)).toBe('exam_version_questions');
    expect(resolveRelationCount(ExamVersionQuestionEntity)).toBe(0);

    expect(resolveColumnNames(ExamVersionQuestionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'examVersionId',
        'questionId',
        'questionVersionId',
        'sortOrder',
        'createdAt',
      ]),
    );
  });

  it('maps ExamAssignmentEntity with class window fields', () => {
    expect(resolveTableName(ExamAssignmentEntity)).toBe('exam_assignments');
    expect(resolveRelationCount(ExamAssignmentEntity)).toBe(0);

    expect(resolveColumnNames(ExamAssignmentEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'examVersionId',
        'classId',
        'opensAt',
        'closesAt',
        'status',
        'createdByUserId',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps ExamAttemptEntity with denormalized audit and result fields', () => {
    expect(resolveTableName(ExamAttemptEntity)).toBe('exam_attempts');
    expect(resolveRelationCount(ExamAttemptEntity)).toBe(0);

    expect(resolveColumnNames(ExamAttemptEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'examAssignmentId',
        'enrollmentId',
        'attemptNumber',
        'startedByUserId',
        'clientRequestId',
        'status',
        'autoSubmitReason',
        'examId',
        'examVersionId',
        'studentId',
        'classId',
        'parishId',
        'academicYearId',
        'catechismLevelId',
        'examTitleDelivered',
        'instructionsDelivered',
        'examTranslationRevisionId',
        'deliveredLocale',
        'startedAt',
        'deadlineAt',
        'submittedAt',
        'gradedAt',
        'questionCount',
        'correctCount',
        'scorePercent',
        'passed',
        'createdAt',
        'updatedAt',
      ]),
    );
  });

  it('maps ExamAttemptQuestionEntity with pinned delivery snapshots', () => {
    expect(resolveTableName(ExamAttemptQuestionEntity)).toBe('exam_attempt_questions');
    expect(resolveRelationCount(ExamAttemptQuestionEntity)).toBe(0);

    expect(resolveColumnNames(ExamAttemptQuestionEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'examAttemptId',
        'questionId',
        'questionVersionId',
        'sortOrder',
        'deliveredOptionOrderJson',
        'translationRevisionId',
        'deliveredLocale',
        'sourceContentHash',
        'createdAt',
      ]),
    );
  });

  it('maps ExamAttemptAnswerEntity with one current answer per question', () => {
    expect(resolveTableName(ExamAttemptAnswerEntity)).toBe('exam_attempt_answers');
    expect(resolveRelationCount(ExamAttemptAnswerEntity)).toBe(0);

    expect(resolveColumnNames(ExamAttemptAnswerEntity)).toEqual(
      expect.arrayContaining([
        'id',
        'examAttemptQuestionId',
        'selectedOptionIdsJson',
        'savedAt',
        'savedByUserId',
        'clientAnswerId',
      ]),
    );
  });
});
