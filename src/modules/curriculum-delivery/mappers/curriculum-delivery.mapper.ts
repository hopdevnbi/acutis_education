import type {
  CurriculumSnapshot,
  CurriculumVersionSnapshot,
  VersionTreeSnapshot,
} from '../../curriculum/interfaces/curriculum.interface';
import type { LearningContentSnapshot } from '../../learning-content/interfaces/learning-content.interface';
import type { ContentDocumentV1 } from '../../learning-content/interfaces/learning-content.interface';
import type { LocalizedResourceResolution } from '../../localization/interfaces/localization.interface';
import { TranslationResourceType } from '../../localization/enums/translation-resource-type.enum';
import { LearnerTranslationReadStatus } from '../../localization/enums/learner-translation-read-status.enum';
import { PublishedLessonContentNotFoundError } from '../errors/curriculum-delivery.errors';
import type {
  LearnerCurriculumTree,
  LearnerLessonContent,
  LearnerTranslationStatus,
} from '../interfaces/curriculum-delivery.interface';

function readString(payload: Record<string, unknown>, key: string, fallback: string): string {
  const value = payload[key];

  return typeof value === 'string' ? value : fallback;
}

function readNullableString(
  payload: Record<string, unknown>,
  key: string,
  fallback: string | null,
): string | null {
  const value = payload[key];

  if (value === null) {
    return null;
  }

  return typeof value === 'string' ? value : fallback;
}

function aggregateTranslationStatus(
  resolutions: readonly LocalizedResourceResolution[],
): LearnerTranslationStatus {
  if (resolutions.length === 0) {
    return 'SOURCE';
  }

  if (
    resolutions.every(
      (resolution) => resolution.translationStatus === LearnerTranslationReadStatus.Source,
    )
  ) {
    return 'SOURCE';
  }

  if (
    resolutions.every(
      (resolution) =>
        resolution.translationStatus === LearnerTranslationReadStatus.Approved &&
        resolution.isFallback === false,
    )
  ) {
    return 'APPROVED';
  }

  if (
    resolutions.some(
      (resolution) => resolution.translationStatus === LearnerTranslationReadStatus.Stale,
    )
  ) {
    return 'STALE';
  }

  return 'MISSING';
}

export function buildCurriculumTreeLocalizationInputs(input: {
  readonly curriculumId: string;
  readonly versionId: string;
  readonly versionTree: VersionTreeSnapshot;
  readonly targetLocale: string;
  readonly requestedLocale: string | null;
  readonly parishId: string | null;
}): Array<{
  resourceType: TranslationResourceType;
  resourceId: string;
  targetLocale: string;
  requestedLocale: string | null;
  parishId: string | null;
}> {
  const refs: Array<{
    resourceType: TranslationResourceType;
    resourceId: string;
    targetLocale: string;
    requestedLocale: string | null;
    parishId: string | null;
  }> = [
    {
      resourceType: TranslationResourceType.CurriculumMetadata,
      resourceId: input.curriculumId,
      targetLocale: input.targetLocale,
      requestedLocale: input.requestedLocale,
      parishId: input.parishId,
    },
    {
      resourceType: TranslationResourceType.CurriculumVersion,
      resourceId: input.versionId,
      targetLocale: input.targetLocale,
      requestedLocale: input.requestedLocale,
      parishId: input.parishId,
    },
  ];

  for (const topic of input.versionTree.topics) {
    refs.push({
      resourceType: TranslationResourceType.CurriculumTopic,
      resourceId: topic.id,
      targetLocale: input.targetLocale,
      requestedLocale: input.requestedLocale,
      parishId: input.parishId,
    });

    for (const lesson of topic.lessons) {
      refs.push({
        resourceType: TranslationResourceType.CurriculumLesson,
        resourceId: lesson.id,
        targetLocale: input.targetLocale,
        requestedLocale: input.requestedLocale,
        parishId: input.parishId,
      });
    }
  }

  return refs;
}

export function attachTreeLocalizationKeys(
  curriculumId: string,
  versionId: string,
  versionTree: VersionTreeSnapshot,
  resolutions: readonly LocalizedResourceResolution[],
): Map<string, LocalizedResourceResolution> {
  const keys: string[] = [
    `${TranslationResourceType.CurriculumMetadata}:${curriculumId}`,
    `${TranslationResourceType.CurriculumVersion}:${versionId}`,
  ];

  for (const topic of versionTree.topics) {
    keys.push(`${TranslationResourceType.CurriculumTopic}:${topic.id}`);

    for (const lesson of topic.lessons) {
      keys.push(`${TranslationResourceType.CurriculumLesson}:${lesson.id}`);
    }
  }

  const map = new Map<string, LocalizedResourceResolution>();

  keys.forEach((key, index) => {
    const resolution = resolutions[index];

    if (resolution !== undefined) {
      map.set(key, resolution);
    }
  });

  return map;
}

export function mergeLocalizedCurriculumTree(
  curriculum: CurriculumSnapshot,
  version: CurriculumVersionSnapshot,
  versionTree: VersionTreeSnapshot,
  localization: {
    readonly requestedLocale: string | null;
    readonly resolvedLocale: string;
    readonly resolutionMap: Map<string, LocalizedResourceResolution>;
  },
): LearnerCurriculumTree {
  const resolutions = [...localization.resolutionMap.values()];

  const curriculumResolution = localization.resolutionMap.get(
    `${TranslationResourceType.CurriculumMetadata}:${curriculum.id}`,
  );
  const versionResolution = localization.resolutionMap.get(
    `${TranslationResourceType.CurriculumVersion}:${version.id}`,
  );

  return {
    curriculum: {
      id: curriculum.id,
      name: curriculumResolution
        ? readString(curriculumResolution.payload, 'name', curriculum.name)
        : curriculum.name,
      sourceLocale: curriculum.sourceLocale,
    },
    version: {
      id: version.id,
      versionNumber: version.versionNumber,
      label: versionResolution
        ? readNullableString(versionResolution.payload, 'label', version.label)
        : version.label,
    },
    topics: versionTree.topics.map((topic) => {
      const topicResolution = localization.resolutionMap.get(
        `${TranslationResourceType.CurriculumTopic}:${topic.id}`,
      );

      return {
        id: topic.id,
        title: topicResolution
          ? readString(topicResolution.payload, 'title', topic.title)
          : topic.title,
        description: topicResolution
          ? readNullableString(topicResolution.payload, 'description', topic.description)
          : topic.description,
        sortOrder: topic.sortOrder,
        lessons: topic.lessons.map((lesson) => {
          const lessonResolution = localization.resolutionMap.get(
            `${TranslationResourceType.CurriculumLesson}:${lesson.id}`,
          );

          return {
            id: lesson.id,
            canonicalLessonKey: lesson.canonicalLessonKey,
            title: lessonResolution
              ? readString(lessonResolution.payload, 'title', lesson.title)
              : lesson.title,
            summary: lessonResolution
              ? readNullableString(lessonResolution.payload, 'summary', lesson.summary)
              : lesson.summary,
            sortOrder: lesson.sortOrder,
            estimatedDurationMinutes: lesson.estimatedDurationMinutes,
          };
        }),
      };
    }),
    requestedLocale: localization.requestedLocale,
    resolvedLocale: localization.resolvedLocale,
    sourceLocale: curriculum.sourceLocale,
    translationStatus: aggregateTranslationStatus(resolutions),
    isFallback: resolutions.some((resolution) => resolution.isFallback),
  };
}

export function toLearnerLessonContent(
  curriculum: CurriculumSnapshot,
  version: CurriculumVersionSnapshot,
  lessonContext: { readonly canonicalLessonKey: string },
  content: LearningContentSnapshot,
  resolution: LocalizedResourceResolution,
): LearnerLessonContent {
  if (content.contentHash === null) {
    throw new PublishedLessonContentNotFoundError();
  }

  const document = resolution.payload['document'] as ContentDocumentV1;

  return {
    lessonId: content.lessonId,
    canonicalLessonKey: lessonContext.canonicalLessonKey,
    curriculumVersionId: version.id,
    versionNumber: version.versionNumber,
    sourceLocale: curriculum.sourceLocale,
    resolvedLocale: resolution.resolvedLocale,
    isFallback: resolution.isFallback,
    translationStatus: resolution.translationStatus,
    requestedLocale: resolution.requestedLocale,
    translationRevisionId: resolution.translationRevisionId,
    sourceContentHash: resolution.sourceContentHash,
    contentSchemaVersion: content.contentSchemaVersion,
    contentHash: content.contentHash,
    document,
  };
}
