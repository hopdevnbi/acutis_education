import type { LessonContentEntity } from '../entities/lesson-content.entity';
import {
  InvalidContentDocumentError,
  LessonContentNotFoundError,
} from '../errors/learning-content.errors';
import type {
  ContentDocumentV1,
  LearningContentSnapshot,
} from '../interfaces/learning-content.interface';
import { validateContentDocumentV1 } from '../utils/content-document-v1.validator';

import type { LessonContentResponseDto } from '../dto/content-document-v1.dto';

export function toLearningContentResponseDto(
  snapshot: LearningContentSnapshot,
): LessonContentResponseDto {
  return {
    id: snapshot.id,
    lessonId: snapshot.lessonId,
    contentSchemaVersion: snapshot.contentSchemaVersion,
    document: {
      schemaVersion: snapshot.document.schemaVersion,
      blocks: snapshot.document.blocks.map((block) => ({ ...block })),
    },
    contentHash: snapshot.contentHash,
    createdAt: snapshot.createdAt.toISOString(),
    updatedAt: snapshot.updatedAt.toISOString(),
  };
}

export function parseContentDocumentFromJson(contentJson: string): ContentDocumentV1 {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contentJson) as unknown;
  } catch {
    throw new InvalidContentDocumentError('Stored lesson content is not valid JSON.');
  }

  return validateContentDocumentV1(parsed);
}

export function toLearningContentSnapshot(entity: LessonContentEntity): LearningContentSnapshot {
  let document: ContentDocumentV1;

  try {
    document = parseContentDocumentFromJson(entity.contentJson);
  } catch (error: unknown) {
    if (error instanceof InvalidContentDocumentError) {
      throw error;
    }

    throw new LessonContentNotFoundError();
  }

  return {
    id: entity.id,
    lessonId: entity.lessonId,
    contentSchemaVersion: entity.contentSchemaVersion,
    document,
    contentHash: entity.contentHash,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}
