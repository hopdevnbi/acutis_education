import { CurriculumListResponseDto } from '../dto/curriculum-list-response.dto';
import { CurriculumResponseDto } from '../dto/curriculum-response.dto';
import { CurriculumAssignmentResponseDto } from '../dto/curriculum-assignment-response.dto';
import { CurriculumVersionListResponseDto } from '../dto/curriculum-version-list-response.dto';
import { CurriculumVersionResponseDto } from '../dto/curriculum-version-response.dto';
import { VersionTreeResponseDto } from '../dto/version-tree-response.dto';
import { LessonListResponseDto } from '../dto/lesson-list-response.dto';
import { LessonResponseDto } from '../dto/lesson-response.dto';
import { TopicListResponseDto } from '../dto/topic-list-response.dto';
import { TopicResponseDto } from '../dto/topic-response.dto';
import type {
  CurriculumAssignmentSnapshot,
  CurriculumSnapshot,
  CurriculumVersionSnapshot,
  ListCurriculaResult,
  VersionTreeSnapshot,
} from '../interfaces/curriculum.interface';
import type { LessonSnapshot } from '../interfaces/lesson.interface';
import type { TopicSnapshot } from '../interfaces/topic.interface';

export function toCurriculumResponseDto(snapshot: CurriculumSnapshot): CurriculumResponseDto {
  return {
    id: snapshot.id,
    parishId: snapshot.parishId,
    catechismLevelId: snapshot.catechismLevelId,
    code: snapshot.code,
    name: snapshot.name,
    description: snapshot.description,
    status: snapshot.status,
    sourceLocale: snapshot.sourceLocale,
    currentPublishedVersionId: snapshot.currentPublishedVersionId,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toCurriculumListResponseDto(
  result: ListCurriculaResult,
): CurriculumListResponseDto {
  return {
    items: result.items.map(toCurriculumResponseDto),
    page: result.page,
    limit: result.limit,
    total: result.total,
    totalPages: result.totalPages,
  };
}

export function toCurriculumVersionResponseDto(
  snapshot: CurriculumVersionSnapshot,
): CurriculumVersionResponseDto {
  return {
    id: snapshot.id,
    curriculumId: snapshot.curriculumId,
    versionNumber: snapshot.versionNumber,
    status: snapshot.status,
    label: snapshot.label,
    publishedAt: snapshot.publishedAt?.toISOString() ?? null,
    publishedByUserId: snapshot.publishedByUserId,
    createdByUserId: snapshot.createdByUserId,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toCurriculumVersionListResponseDto(
  snapshots: CurriculumVersionSnapshot[],
): CurriculumVersionListResponseDto {
  return {
    items: snapshots.map(toCurriculumVersionResponseDto),
  };
}

export function toTopicResponseDto(snapshot: TopicSnapshot): TopicResponseDto {
  return {
    id: snapshot.id,
    curriculumVersionId: snapshot.curriculumVersionId,
    code: snapshot.code,
    title: snapshot.title,
    description: snapshot.description,
    sortOrder: snapshot.sortOrder,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toTopicListResponseDto(snapshots: TopicSnapshot[]): TopicListResponseDto {
  return {
    items: snapshots.map(toTopicResponseDto),
  };
}

export function toLessonResponseDto(snapshot: LessonSnapshot): LessonResponseDto {
  return {
    id: snapshot.id,
    curriculumVersionId: snapshot.curriculumVersionId,
    topicId: snapshot.topicId,
    canonicalLessonKey: snapshot.canonicalLessonKey,
    code: snapshot.code,
    title: snapshot.title,
    summary: snapshot.summary,
    sortOrder: snapshot.sortOrder,
    estimatedDurationMinutes: snapshot.estimatedDurationMinutes,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function toLessonListResponseDto(snapshots: LessonSnapshot[]): LessonListResponseDto {
  return {
    items: snapshots.map(toLessonResponseDto),
  };
}

export function toVersionTreeResponseDto(snapshot: VersionTreeSnapshot): VersionTreeResponseDto {
  return {
    version: toCurriculumVersionResponseDto(snapshot.version),
    topics: snapshot.topics.map((topic) => ({
      id: topic.id,
      code: topic.code,
      title: topic.title,
      description: topic.description,
      sortOrder: topic.sortOrder,
      lessons: topic.lessons.map((lesson) => ({
        id: lesson.id,
        canonicalLessonKey: lesson.canonicalLessonKey,
        code: lesson.code,
        title: lesson.title,
        summary: lesson.summary,
        sortOrder: lesson.sortOrder,
        estimatedDurationMinutes: lesson.estimatedDurationMinutes,
      })),
    })),
  };
}

export function toCurriculumAssignmentResponseDto(
  snapshot: CurriculumAssignmentSnapshot,
): CurriculumAssignmentResponseDto {
  return {
    id: snapshot.id,
    parishId: snapshot.parishId,
    academicYearId: snapshot.academicYearId,
    catechismLevelId: snapshot.catechismLevelId,
    curriculumVersionId: snapshot.curriculumVersionId,
    assignedByUserId: snapshot.assignedByUserId,
    assignedAt: snapshot.assignedAt.toISOString(),
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}
