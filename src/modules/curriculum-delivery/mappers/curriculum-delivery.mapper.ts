import type {
  CurriculumSnapshot,
  CurriculumVersionSnapshot,
  VersionTreeSnapshot,
} from '../../curriculum/interfaces/curriculum.interface';
import type { LearningContentSnapshot } from '../../learning-content/interfaces/learning-content.interface';
import { PublishedLessonContentNotFoundError } from '../errors/curriculum-delivery.errors';
import type {
  LearnerCurriculumTree,
  LearnerLessonContent,
  LearnerLessonSummary,
  LearnerTopicTree,
} from '../interfaces/curriculum-delivery.interface';

export function toLearnerCurriculumTree(
  curriculum: CurriculumSnapshot,
  version: CurriculumVersionSnapshot,
  versionTree: VersionTreeSnapshot,
): LearnerCurriculumTree {
  return {
    curriculum: {
      id: curriculum.id,
      name: curriculum.name,
      sourceLocale: curriculum.sourceLocale,
    },
    version: {
      id: version.id,
      versionNumber: version.versionNumber,
    },
    topics: versionTree.topics.map((topic): LearnerTopicTree => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      sortOrder: topic.sortOrder,
      lessons: topic.lessons.map((lesson): LearnerLessonSummary => ({
        id: lesson.id,
        canonicalLessonKey: lesson.canonicalLessonKey,
        title: lesson.title,
        summary: lesson.summary,
        sortOrder: lesson.sortOrder,
        estimatedDurationMinutes: lesson.estimatedDurationMinutes,
      })),
    })),
  };
}

export function toLearnerLessonContent(
  curriculum: CurriculumSnapshot,
  version: CurriculumVersionSnapshot,
  lessonContext: { readonly canonicalLessonKey: string },
  content: LearningContentSnapshot,
  requestedLocale: string | null,
): LearnerLessonContent {
  if (content.contentHash === null) {
    throw new PublishedLessonContentNotFoundError();
  }

  return {
    lessonId: content.lessonId,
    canonicalLessonKey: lessonContext.canonicalLessonKey,
    curriculumVersionId: version.id,
    versionNumber: version.versionNumber,
    sourceLocale: curriculum.sourceLocale,
    resolvedLocale: curriculum.sourceLocale,
    isFallback: false,
    translationStatus: 'SOURCE',
    requestedLocale,
    contentSchemaVersion: content.contentSchemaVersion,
    contentHash: content.contentHash,
    document: content.document,
  };
}
