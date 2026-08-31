import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { QuestionCurriculumLinkEntity } from '../entities/question-curriculum-link.entity';
import { QuestionTagLinkEntity } from '../entities/question-tag-link.entity';
import { QuestionTagEntity } from '../entities/question-tag.entity';
import { QuestionVersionEntity } from '../entities/question-version.entity';
import { QuestionEntity } from '../entities/question.entity';
import { QuestionStatus } from '../enums/question-status.enum';
import { QuestionType } from '../enums/question-type.enum';
import { QuestionVersionStatus } from '../enums/question-version-status.enum';
import { QUESTION_PRACTICE_SELECTION_CANDIDATE_POOL_LIMIT } from '../constants/question-practice-selection.constants';
import type {
  PublishedQuestionSelectionSnapshot,
  SelectCurrentPublishedQuestionsForPracticeInput,
} from '../interfaces/question-bank.interface';
import { parseQuestionTagCode } from '../utils/question-tag-code.util';

const MVP_PRACTICE_QUESTION_TYPES: readonly QuestionType[] = [
  QuestionType.SingleChoice,
  QuestionType.MultipleChoice,
  QuestionType.TrueFalse,
];

@Injectable()
export class QuestionPracticeSelectionService {
  constructor(
    @InjectRepository(QuestionEntity)
    private readonly questionRepository: Repository<QuestionEntity>,
  ) {}

  async selectCurrentPublishedQuestionsForPractice(
    input: SelectCurrentPublishedQuestionsForPracticeInput,
  ): Promise<readonly PublishedQuestionSelectionSnapshot[]> {
    const parishId = normalizeUuid(input.parishId);
    const questionTypes =
      input.questionTypes !== undefined && input.questionTypes.length > 0
        ? input.questionTypes
        : MVP_PRACTICE_QUESTION_TYPES;

    const queryBuilder = this.questionRepository
      .createQueryBuilder('question')
      .innerJoin(
        QuestionVersionEntity,
        'publishedVersion',
        'publishedVersion.id = question.currentPublishedVersionId AND publishedVersion.status = :publishedStatus',
        { publishedStatus: QuestionVersionStatus.Published },
      )
      .where('question.parishId = :parishId', { parishId })
      .andWhere('question.status = :activeStatus', { activeStatus: QuestionStatus.Active })
      .andWhere('question.currentPublishedVersionId IS NOT NULL')
      .andWhere('publishedVersion.questionType IN (:...questionTypes)', { questionTypes });

    if (input.difficulty !== undefined) {
      queryBuilder.andWhere('publishedVersion.difficulty = :difficulty', {
        difficulty: input.difficulty,
      });
    }

    if (
      input.excludeQuestionVersionIds !== undefined &&
      input.excludeQuestionVersionIds.length > 0
    ) {
      queryBuilder.andWhere('publishedVersion.id NOT IN (:...excludeQuestionVersionIds)', {
        excludeQuestionVersionIds: input.excludeQuestionVersionIds.map((id) => normalizeUuid(id)),
      });
    }

    if (input.curriculumId !== undefined) {
      queryBuilder.innerJoin(
        QuestionCurriculumLinkEntity,
        'curriculumLink',
        'curriculumLink.questionId = question.id',
      );
      queryBuilder.andWhere('curriculumLink.curriculumId = :curriculumId', {
        curriculumId: normalizeUuid(input.curriculumId),
      });

      if (input.canonicalLessonKey !== undefined) {
        queryBuilder.andWhere('curriculumLink.canonicalLessonKey = :canonicalLessonKey', {
          canonicalLessonKey: normalizeUuid(input.canonicalLessonKey),
        });
      }
    }

    if (
      (input.tagIds !== undefined && input.tagIds.length > 0) ||
      (input.tagCodes !== undefined && input.tagCodes.length > 0)
    ) {
      queryBuilder.innerJoin(QuestionTagLinkEntity, 'tagLink', 'tagLink.questionId = question.id');
      queryBuilder.innerJoin(
        QuestionTagEntity,
        'tag',
        'tag.id = tagLink.tagId AND tag.parishId = :tagParishId',
        { tagParishId: parishId },
      );

      if (input.tagIds !== undefined && input.tagIds.length > 0) {
        queryBuilder.andWhere('tagLink.tagId IN (:...tagIds)', {
          tagIds: input.tagIds.map((tagId) => normalizeUuid(tagId)),
        });
      }

      if (input.tagCodes !== undefined && input.tagCodes.length > 0) {
        queryBuilder.andWhere(
          new Brackets((expressionBuilder) => {
            input.tagCodes?.forEach((tagCode, index) => {
              expressionBuilder.orWhere(`tag.code = :tagCode${index}`, {
                [`tagCode${index}`]: parseQuestionTagCode(tagCode),
              });
            });
          }),
        );
      }
    }

    queryBuilder
      .select([
        'question.id AS questionId',
        'question.code AS questionCode',
        'publishedVersion.id AS questionVersionId',
        'publishedVersion.questionType AS questionType',
        'question.sourceLocale AS sourceLocale',
        'publishedVersion.sourceContentHash AS sourceContentHash',
      ])
      .distinct(true)
      .orderBy('question.code', 'ASC')
      .addOrderBy('question.id', 'ASC')
      .take(QUESTION_PRACTICE_SELECTION_CANDIDATE_POOL_LIMIT);

    const rows = await queryBuilder.getRawMany<{
      questionId: string;
      questionVersionId: string;
      questionType: QuestionType;
      sourceLocale: string;
      sourceContentHash: string | null;
    }>();

    return rows.map((row) => ({
      questionId: normalizeUuid(row.questionId),
      questionVersionId: normalizeUuid(row.questionVersionId),
      questionType: row.questionType,
      sourceLocale: row.sourceLocale,
      sourceContentHash: row.sourceContentHash,
    }));
  }
}
