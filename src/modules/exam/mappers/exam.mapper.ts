import type { ExamReviewPolicy } from '../constants/exam-review-policy.constants';
import { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import { ExamVersionQuestionEntity } from '../entities/exam-version-question.entity';
import { ExamVersionEntity } from '../entities/exam-version.entity';
import { ExamEntity } from '../entities/exam.entity';
import type {
  ExamAssignmentSnapshot,
  ExamSnapshot,
  ExamVersionQuestionSnapshot,
  ExamVersionSnapshot,
} from '../interfaces/exam.interface';
import { parseExamReviewPolicyJson } from '../utils/exam-review-policy.util';
import { resolveExamAssignmentEffectiveStatus } from '../utils/exam-assignment-status.util';

export function toExamSnapshot(entity: ExamEntity): ExamSnapshot {
  return {
    id: entity.id,
    parishId: entity.parishId,
    code: entity.code,
    status: entity.status,
    currentPublishedVersionId: entity.currentPublishedVersionId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toExamVersionSnapshot(entity: ExamVersionEntity): ExamVersionSnapshot {
  return {
    id: entity.id,
    examId: entity.examId,
    versionNumber: entity.versionNumber,
    title: entity.title,
    description: entity.description,
    instructions: entity.instructions,
    sourceLocale: entity.sourceLocale,
    durationMinutes: entity.durationMinutes,
    maxAttempts: entity.maxAttempts,
    passingScorePercent: entity.passingScorePercent,
    shuffleQuestions: entity.shuffleQuestions,
    shuffleOptions: entity.shuffleOptions,
    reviewPolicy: parseExamReviewPolicyJson(entity.reviewPolicyJson),
    status: entity.status,
    publishedAt: entity.publishedAt,
    publishedByUserId: entity.publishedByUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toExamVersionQuestionSnapshot(
  entity: ExamVersionQuestionEntity,
): ExamVersionQuestionSnapshot {
  return {
    id: entity.id,
    examVersionId: entity.examVersionId,
    questionId: entity.questionId,
    questionVersionId: entity.questionVersionId,
    sortOrder: entity.sortOrder,
    createdAt: entity.createdAt,
  };
}

export function toExamAssignmentSnapshot(
  entity: ExamAssignmentEntity,
  now: Date = new Date(),
): ExamAssignmentSnapshot {
  return {
    id: entity.id,
    examVersionId: entity.examVersionId,
    classId: entity.classId,
    opensAt: entity.opensAt,
    closesAt: entity.closesAt,
    status: entity.status,
    effectiveStatus: resolveExamAssignmentEffectiveStatus(
      entity.status,
      entity.opensAt,
      entity.closesAt,
      now,
    ),
    createdByUserId: entity.createdByUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toExamReviewPolicyDto(policy: ExamReviewPolicy): ExamReviewPolicy {
  return {
    scoreVisibility: policy.scoreVisibility,
    correctAnswerVisibility: policy.correctAnswerVisibility,
    explanationVisibility: policy.explanationVisibility,
  };
}
