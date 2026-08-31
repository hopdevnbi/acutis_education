import type { ContentDocumentV1 } from '../../learning-content/interfaces/learning-content.interface';
import type {
  LearnerCurriculumTree,
  LearnerLessonContent,
} from '../interfaces/curriculum-delivery.interface';
import type {
  LearnerDeliveryContentBlock,
  LearnerDeliveryContentDocument,
} from '../interfaces/learner-delivery-content.interface';
import type {
  LearnerCurriculumTreeResponseDto,
  LearnerLessonContentResponseDto,
} from '../dto/learner-curriculum-delivery-response.dto';

export interface LearnerLessonContentResponseContext {
  readonly buildMediaContentPath: (assetId: string) => string;
}

function enrichDocumentWithMediaContentPaths(
  document: ContentDocumentV1,
  buildMediaContentPath: (assetId: string) => string,
): LearnerDeliveryContentDocument {
  const blocks: LearnerDeliveryContentBlock[] = document.blocks.map((block) => {
    if (block.type === 'image_ref' || block.type === 'video_ref') {
      return {
        ...block,
        mediaContentPath: buildMediaContentPath(block.assetId),
      };
    }

    return block;
  });

  return {
    schemaVersion: document.schemaVersion,
    blocks,
  };
}

export function toLearnerCurriculumTreeResponseDto(
  tree: LearnerCurriculumTree,
): LearnerCurriculumTreeResponseDto {
  return {
    curriculum: { ...tree.curriculum },
    version: { ...tree.version },
    topics: tree.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      sortOrder: topic.sortOrder,
      lessons: topic.lessons.map((lesson) => ({ ...lesson })),
    })),
  };
}

export function toLearnerLessonContentResponseDto(
  content: LearnerLessonContent,
  responseContext?: LearnerLessonContentResponseContext,
): LearnerLessonContentResponseDto {
  const document =
    responseContext === undefined
      ? content.document
      : enrichDocumentWithMediaContentPaths(
          content.document,
          responseContext.buildMediaContentPath,
        );

  return {
    ...content,
    document,
  };
}

export function parseRequestedLocale(rawAcceptLanguage: string | undefined): string | null {
  if (rawAcceptLanguage === undefined || rawAcceptLanguage.trim().length === 0) {
    return null;
  }

  const firstTag = rawAcceptLanguage.split(',')[0]?.trim();

  if (firstTag === undefined || firstTag.length === 0) {
    return null;
  }

  return firstTag;
}
