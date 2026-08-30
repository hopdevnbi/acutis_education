import { CurriculumListResponseDto } from '../dto/curriculum-list-response.dto';
import { CurriculumResponseDto } from '../dto/curriculum-response.dto';
import { CurriculumVersionListResponseDto } from '../dto/curriculum-version-list-response.dto';
import { CurriculumVersionResponseDto } from '../dto/curriculum-version-response.dto';
import { TopicListResponseDto } from '../dto/topic-list-response.dto';
import { TopicResponseDto } from '../dto/topic-response.dto';
import type {
  CurriculumSnapshot,
  CurriculumVersionSnapshot,
  ListCurriculaResult,
} from '../interfaces/curriculum.interface';
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
