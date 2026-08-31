import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { CurriculumVersionStatus } from '../../curriculum/enums/curriculum-version-status.enum';
import {
  MediaAssetCategoryMismatchError,
  MediaAssetNotFoundError,
  MediaAssetNotReadyError,
} from '../../media/errors/media-asset.errors';
import { MediaAssetService } from '../../media/services/media-asset.service';
import { LessonContentEntity } from '../entities/lesson-content.entity';
import {
  ContentAssetValidationError,
  ContentNotFoundForPublishError,
  LessonContentDraftOnlyError,
  LessonContentNotFoundError,
} from '../errors/learning-content.errors';
import {
  CONTENT_DOCUMENT_SCHEMA_VERSION,
  type ContentPublishValidationIssue,
  type LearningContentSnapshot,
  type UpsertLessonContentInput,
} from '../interfaces/learning-content.interface';
import { toLearningContentSnapshot } from '../mappers/learning-content.mapper';
import {
  isNonEmptyContentDocument,
  validateContentDocumentV1,
} from '../utils/content-document-v1.validator';
import {
  collectDocumentMediaValidationIssues,
  validateDocumentMediaReferences,
} from '../utils/content-media-reference.util';
import { computeContentHash } from '../utils/content-hash.util';

@Injectable()
export class LearningContentService {
  constructor(
    @InjectRepository(LessonContentEntity)
    private readonly lessonContentRepository: Repository<LessonContentEntity>,
    private readonly curriculumService: CurriculumService,
    private readonly mediaAssetService: MediaAssetService,
  ) {}

  async upsertLessonContent(
    lessonId: string,
    input: UpsertLessonContentInput,
  ): Promise<LearningContentSnapshot> {
    const context = await this.curriculumService.getLessonCurriculumContext(lessonId);

    if (context.versionStatus !== CurriculumVersionStatus.Draft) {
      throw new LessonContentDraftOnlyError();
    }

    const document = validateContentDocumentV1(input.document);

    try {
      await validateDocumentMediaReferences(document, this.mediaAssetService);
    } catch (error: unknown) {
      if (
        error instanceof MediaAssetNotFoundError ||
        error instanceof MediaAssetNotReadyError ||
        error instanceof MediaAssetCategoryMismatchError
      ) {
        throw new ContentAssetValidationError(error.message);
      }

      throw error;
    }

    const contentHash = computeContentHash(document);
    const contentJson = JSON.stringify(document);
    const normalizedLessonId = normalizeUuid(lessonId);

    const existingContent = await this.lessonContentRepository.findOne({
      where: { lessonId: normalizedLessonId },
    });

    if (existingContent === null) {
      const createdContent = this.lessonContentRepository.create({
        lessonId: normalizedLessonId,
        contentSchemaVersion: CONTENT_DOCUMENT_SCHEMA_VERSION,
        contentJson,
        contentHash,
      });
      const savedContent = await this.lessonContentRepository.save(createdContent);

      return toLearningContentSnapshot(savedContent);
    }

    existingContent.contentSchemaVersion = CONTENT_DOCUMENT_SCHEMA_VERSION;
    existingContent.contentJson = contentJson;
    existingContent.contentHash = contentHash;

    const savedContent = await this.lessonContentRepository.save(existingContent);

    return toLearningContentSnapshot(savedContent);
  }

  async getLessonContent(lessonId: string): Promise<LearningContentSnapshot> {
    await this.curriculumService.getLessonById(lessonId);

    const content = await this.lessonContentRepository.findOne({
      where: { lessonId: normalizeUuid(lessonId) },
    });

    if (content === null) {
      throw new LessonContentNotFoundError();
    }

    return toLearningContentSnapshot(content);
  }

  async deleteByLessonId(lessonId: string, entityManager?: EntityManager): Promise<void> {
    const normalizedLessonId = normalizeUuid(lessonId);
    const repository = this.resolveRepository(entityManager);

    await repository.delete({ lessonId: normalizedLessonId });
  }

  async validateLessonHasNonEmptyContent(lessonId: string): Promise<void> {
    const content = await this.lessonContentRepository.findOne({
      where: { lessonId: normalizeUuid(lessonId) },
    });

    if (content === null) {
      throw new ContentNotFoundForPublishError(normalizeUuid(lessonId));
    }

    const document = validateContentDocumentV1(JSON.parse(content.contentJson) as unknown);

    if (!isNonEmptyContentDocument(document)) {
      throw new ContentNotFoundForPublishError(normalizeUuid(lessonId));
    }
  }

  async collectPublishValidationIssues(
    versionId: string,
    entityManager?: EntityManager,
  ): Promise<ContentPublishValidationIssue[]> {
    const versionTree = await this.curriculumService.getVersionTree(versionId);
    const repository = this.resolveRepository(entityManager);
    const lessonIds = versionTree.topics.flatMap((topic) =>
      topic.lessons.map((lesson) => lesson.id),
    );

    if (lessonIds.length === 0) {
      return [];
    }

    const contents = await repository.find({
      where: { lessonId: In(lessonIds) },
    });
    const contentByLessonId = new Map(contents.map((content) => [content.lessonId, content]));
    const issues: ContentPublishValidationIssue[] = [];

    for (const topic of versionTree.topics) {
      for (const lesson of topic.lessons) {
        const content = contentByLessonId.get(lesson.id);

        if (content === undefined) {
          issues.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            code: 'CONTENT_MISSING',
            message: 'Lesson content is missing.',
          });
          continue;
        }

        let document;

        try {
          document = validateContentDocumentV1(JSON.parse(content.contentJson) as unknown);
        } catch {
          issues.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            code: 'CONTENT_EMPTY',
            message: 'Lesson content is invalid or empty.',
          });
          continue;
        }

        if (!isNonEmptyContentDocument(document)) {
          issues.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            code: 'CONTENT_EMPTY',
            message: 'Lesson content is empty.',
          });
          continue;
        }

        const mediaIssues = await collectDocumentMediaValidationIssues(
          document,
          this.mediaAssetService,
        );

        for (const mediaIssue of mediaIssues) {
          issues.push({
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            code: mediaIssue.code,
            message: mediaIssue.message,
            assetId: mediaIssue.assetId,
          });
        }
      }
    }

    return issues;
  }

  async cloneContentForLessons(
    lessonIdMap: Map<string, string>,
    entityManager: EntityManager,
  ): Promise<void> {
    if (lessonIdMap.size === 0) {
      return;
    }

    const sourceLessonIds = [...lessonIdMap.keys()];
    const repository = entityManager.getRepository(LessonContentEntity);
    const sourceContents = await repository.find({
      where: { lessonId: In(sourceLessonIds) },
    });

    for (const sourceContent of sourceContents) {
      const targetLessonId = lessonIdMap.get(normalizeUuid(sourceContent.lessonId));

      if (targetLessonId === undefined) {
        continue;
      }

      const clonedContent = repository.create({
        lessonId: normalizeUuid(targetLessonId),
        contentSchemaVersion: sourceContent.contentSchemaVersion,
        contentJson: sourceContent.contentJson,
        contentHash: sourceContent.contentHash,
      });

      await repository.save(clonedContent);
    }
  }

  private resolveRepository(entityManager?: EntityManager): Repository<LessonContentEntity> {
    if (entityManager === undefined) {
      return this.lessonContentRepository;
    }

    return entityManager.getRepository(LessonContentEntity);
  }
}
