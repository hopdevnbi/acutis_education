import type {
  ExamAssignmentSnapshot,
  ExamSnapshot,
  ExamVersionQuestionSnapshot,
  ExamVersionSnapshot,
  ListExamAssignmentsResult,
  ListExamsResult,
} from '../interfaces/exam.interface';
import { toExamReviewPolicyDto } from './exam.mapper';
import type {
  ExamAssignmentListResponseDto,
  ExamAssignmentResponseDto,
} from '../dto/exam-assignment.dto';
import type { ExamListResponseDto, ExamResponseDto } from '../dto/exam-response.dto';
import type {
  ExamVersionQuestionListResponseDto,
  ExamVersionQuestionResponseDto,
} from '../dto/exam-version-question.dto';
import type {
  ExamVersionListResponseDto,
  ExamVersionResponseDto,
} from '../dto/exam-version-response.dto';

export function toExamResponseDto(snapshot: ExamSnapshot): ExamResponseDto {
  return {
    id: snapshot.id,
    parishId: snapshot.parishId,
    code: snapshot.code,
    status: snapshot.status,
    currentPublishedVersionId: snapshot.currentPublishedVersionId,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toExamListResponseDto(result: ListExamsResult): ExamListResponseDto {
  return {
    items: result.items.map(toExamResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}

export function toExamVersionResponseDto(snapshot: ExamVersionSnapshot): ExamVersionResponseDto {
  return {
    id: snapshot.id,
    examId: snapshot.examId,
    versionNumber: snapshot.versionNumber,
    title: snapshot.title,
    description: snapshot.description,
    instructions: snapshot.instructions,
    sourceLocale: snapshot.sourceLocale,
    durationMinutes: snapshot.durationMinutes,
    maxAttempts: snapshot.maxAttempts,
    passingScorePercent: snapshot.passingScorePercent,
    shuffleQuestions: snapshot.shuffleQuestions,
    shuffleOptions: snapshot.shuffleOptions,
    reviewPolicy: toExamReviewPolicyDto(snapshot.reviewPolicy),
    status: snapshot.status,
    publishedAt: snapshot.publishedAt?.toISOString() ?? null,
    publishedByUserId: snapshot.publishedByUserId,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toExamVersionListResponseDto(
  snapshots: ExamVersionSnapshot[],
): ExamVersionListResponseDto {
  return {
    items: snapshots.map(toExamVersionResponseDto),
  };
}

export function toExamVersionQuestionResponseDto(
  snapshot: ExamVersionQuestionSnapshot,
): ExamVersionQuestionResponseDto {
  return {
    id: snapshot.id,
    examVersionId: snapshot.examVersionId,
    questionId: snapshot.questionId,
    questionVersionId: snapshot.questionVersionId,
    sortOrder: snapshot.sortOrder,
    createdAt: snapshot.createdAt.toISOString(),
  };
}

export function toExamVersionQuestionListResponseDto(
  snapshots: ExamVersionQuestionSnapshot[],
): ExamVersionQuestionListResponseDto {
  return {
    items: snapshots.map(toExamVersionQuestionResponseDto),
  };
}

export function toExamAssignmentResponseDto(
  snapshot: ExamAssignmentSnapshot,
): ExamAssignmentResponseDto {
  return {
    id: snapshot.id,
    examVersionId: snapshot.examVersionId,
    classId: snapshot.classId,
    opensAt: snapshot.opensAt.toISOString(),
    closesAt: snapshot.closesAt.toISOString(),
    status: snapshot.status,
    effectiveStatus: snapshot.effectiveStatus,
    createdByUserId: snapshot.createdByUserId,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toExamAssignmentListResponseDto(
  result: ListExamAssignmentsResult,
): ExamAssignmentListResponseDto {
  return {
    items: result.items.map(toExamAssignmentResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}
