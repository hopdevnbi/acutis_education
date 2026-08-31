import type { QuestionCurriculumLinkEntity } from '../entities/question-curriculum-link.entity';
import type { QuestionTagLinkEntity } from '../entities/question-tag-link.entity';
import type { QuestionTagEntity } from '../entities/question-tag.entity';
import type { QuestionVersionEntity } from '../entities/question-version.entity';
import type { QuestionEntity } from '../entities/question.entity';
import type {
  QuestionCurriculumLinkSnapshot,
  QuestionSnapshot,
  QuestionTagLinkSnapshot,
  QuestionTagSnapshot,
  QuestionVersionSnapshot,
} from '../interfaces/question-bank.interface';

export function toQuestionSnapshot(entity: QuestionEntity): QuestionSnapshot {
  return {
    id: entity.id,
    parishId: entity.parishId,
    code: entity.code,
    status: entity.status,
    sourceLocale: entity.sourceLocale,
    currentPublishedVersionId: entity.currentPublishedVersionId,
    createdByUserId: entity.createdByUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toQuestionVersionSnapshot(entity: QuestionVersionEntity): QuestionVersionSnapshot {
  return {
    id: entity.id,
    questionId: entity.questionId,
    versionNumber: entity.versionNumber,
    status: entity.status,
    questionType: entity.questionType,
    prompt: entity.prompt,
    instruction: entity.instruction,
    explanation: entity.explanation,
    promptMediaJson: entity.promptMediaJson,
    explanationMediaJson: entity.explanationMediaJson,
    answerDefinitionJson: entity.answerDefinitionJson,
    difficulty: entity.difficulty,
    sourceContentHash: entity.sourceContentHash,
    createdByUserId: entity.createdByUserId,
    publishedByUserId: entity.publishedByUserId,
    publishedAt: entity.publishedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toQuestionTagSnapshot(entity: QuestionTagEntity): QuestionTagSnapshot {
  return {
    id: entity.id,
    parishId: entity.parishId,
    code: entity.code,
    name: entity.name,
    status: entity.status,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toQuestionTagLinkSnapshot(entity: QuestionTagLinkEntity): QuestionTagLinkSnapshot {
  return {
    questionId: entity.questionId,
    tagId: entity.tagId,
  };
}

export function toQuestionCurriculumLinkSnapshot(
  entity: QuestionCurriculumLinkEntity,
): QuestionCurriculumLinkSnapshot {
  return {
    id: entity.id,
    questionId: entity.questionId,
    parishId: entity.parishId,
    curriculumId: entity.curriculumId,
    canonicalLessonKey: entity.canonicalLessonKey,
    authoringCurriculumVersionId: entity.authoringCurriculumVersionId,
    createdAt: entity.createdAt,
  };
}
