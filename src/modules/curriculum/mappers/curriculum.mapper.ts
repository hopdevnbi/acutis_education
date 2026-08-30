import type { CurriculumEntity } from '../entities/curriculum.entity';
import type { CurriculumVersionEntity } from '../entities/curriculum-version.entity';
import type { TopicEntity } from '../entities/topic.entity';
import type {
  CurriculumSnapshot,
  CurriculumVersionSnapshot,
} from '../interfaces/curriculum.interface';
import type { TopicSnapshot } from '../interfaces/topic.interface';

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
