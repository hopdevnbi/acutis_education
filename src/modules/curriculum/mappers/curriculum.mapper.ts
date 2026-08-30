import type { CurriculumAssignmentEntity } from '../entities/curriculum-assignment.entity';
import type { CurriculumEntity } from '../entities/curriculum.entity';
import type { CurriculumVersionEntity } from '../entities/curriculum-version.entity';
import type { LessonEntity } from '../entities/lesson.entity';
import type { TopicEntity } from '../entities/topic.entity';
import type {
  CurriculumAssignmentSnapshot,
  CurriculumSnapshot,
  CurriculumVersionSnapshot,
  VersionTreeLessonSnapshot,
} from '../interfaces/curriculum.interface';
import type { LessonSnapshot } from '../interfaces/lesson.interface';
import type { TopicSnapshot } from '../interfaces/topic.interface';

export function toCurriculumAssignmentSnapshot(
  entity: CurriculumAssignmentEntity,
): CurriculumAssignmentSnapshot {
  return {
    id: entity.id,
    parishId: entity.parishId,
    academicYearId: entity.academicYearId,
    catechismLevelId: entity.catechismLevelId,
    curriculumVersionId: entity.curriculumVersionId,
    assignedByUserId: entity.assignedByUserId,
    assignedAt: entity.assignedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toCurriculumSnapshot(entity: CurriculumEntity): CurriculumSnapshot {
  return {
    id: entity.id,
    parishId: entity.parishId,
    catechismLevelId: entity.catechismLevelId,
    code: entity.code,
    name: entity.name,
    description: entity.description,
    status: entity.status,
    sourceLocale: entity.sourceLocale,
    currentPublishedVersionId: entity.currentPublishedVersionId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toCurriculumVersionSnapshot(
  entity: CurriculumVersionEntity,
): CurriculumVersionSnapshot {
  return {
    id: entity.id,
    curriculumId: entity.curriculumId,
    versionNumber: entity.versionNumber,
    status: entity.status,
    label: entity.label,
    publishedAt: entity.publishedAt,
    publishedByUserId: entity.publishedByUserId,
    createdByUserId: entity.createdByUserId,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toTopicSnapshot(entity: TopicEntity): TopicSnapshot {
  return {
    id: entity.id,
    curriculumVersionId: entity.curriculumVersionId,
    code: entity.code,
    title: entity.title,
    description: entity.description,
    sortOrder: entity.sortOrder,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toLessonSnapshot(entity: LessonEntity): LessonSnapshot {
  return {
    id: entity.id,
    curriculumVersionId: entity.curriculumVersionId,
    topicId: entity.topicId,
    canonicalLessonKey: entity.canonicalLessonKey,
    code: entity.code,
    title: entity.title,
    summary: entity.summary,
    sortOrder: entity.sortOrder,
    estimatedDurationMinutes: entity.estimatedDurationMinutes,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function toVersionTreeLessonSnapshot(entity: LessonEntity): VersionTreeLessonSnapshot {
  return {
    id: entity.id,
    canonicalLessonKey: entity.canonicalLessonKey,
    code: entity.code,
    title: entity.title,
    summary: entity.summary,
    sortOrder: entity.sortOrder,
    estimatedDurationMinutes: entity.estimatedDurationMinutes,
  };
}
