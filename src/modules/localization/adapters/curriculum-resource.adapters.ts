import { Injectable } from '@nestjs/common';
import { parseLocale } from '../../../common/locale';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { LessonService } from '../../curriculum/services/lesson.service';
import { TopicService } from '../../curriculum/services/topic.service';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import type {
  TranslationSourceAdapter,
  TranslationSourceSnapshot,
} from '../interfaces/translation-source-adapter.interface';
import type { TranslatableUnit, TranslatedUnit } from '../providers/translation-provider.interface';
import {
  computeCurriculumLessonContentHash,
  computeCurriculumMetadataContentHash,
  computeCurriculumTopicContentHash,
  computeCurriculumVersionContentHash,
} from '../utils/curriculum-translation-hash.util';

function readSnapshotString(payload: Record<string, unknown>, key: string, fallback = ''): string {
  const value = payload[key];

  return typeof value === 'string' ? value : fallback;
}

function readStringField(payload: Record<string, unknown>, key: string): string | null {
  const value = payload[key];

  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`Expected string field "${key}" in translation payload.`);
  }

  return value;
}

function buildTranslatedMap(units: readonly TranslatedUnit[]): Map<string, string> {
  return new Map(units.map((unit) => [unit.id, unit.text]));
}

@Injectable()
export class CurriculumMetadataTranslationAdapter implements TranslationSourceAdapter {
  readonly resourceType = TranslationResourceType.CurriculumMetadata;

  constructor(private readonly curriculumService: CurriculumService) {}

  async resolveSource(resourceId: string): Promise<TranslationSourceSnapshot | null> {
    try {
      const curriculum = await this.curriculumService.getCurriculumById(resourceId);

      return {
        resourceType: this.resourceType,
        resourceId: curriculum.id,
        sourceLocale: curriculum.sourceLocale,
        sourceContentHash: computeCurriculumMetadataContentHash({
          name: curriculum.name,
          description: curriculum.description,
        }),
        sourceVersionKey: null,
        payload: {
          name: curriculum.name,
          description: curriculum.description,
        },
      };
    } catch {
      return null;
    }
  }

  extractTranslatableUnits(snapshot: TranslationSourceSnapshot): TranslatableUnit[] {
    const units: TranslatableUnit[] = [
      { id: 'curriculum.name', text: readSnapshotString(snapshot.payload, 'name') },
    ];
    const description = snapshot.payload['description'];

    if (typeof description === 'string' && description.trim().length > 0) {
      units.push({ id: 'curriculum.description', text: description });
    }

    return units;
  }

  buildPayload(
    snapshot: TranslationSourceSnapshot,
    translatedUnits: readonly TranslatedUnit[],
  ): Record<string, unknown> {
    const translated = buildTranslatedMap(translatedUnits);

    return {
      name: translated.get('curriculum.name') ?? snapshot.payload['name'],
      description:
        translated.get('curriculum.description') ?? snapshot.payload['description'] ?? null,
    };
  }

  applyTranslation(
    snapshot: TranslationSourceSnapshot,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      name: readStringField(payload, 'name') ?? snapshot.payload['name'],
      description:
        payload['description'] === undefined
          ? snapshot.payload['description']
          : readStringField(payload, 'description'),
    };
  }
}

@Injectable()
export class CurriculumVersionTranslationAdapter implements TranslationSourceAdapter {
  readonly resourceType = TranslationResourceType.CurriculumVersion;

  constructor(private readonly curriculumService: CurriculumService) {}

  async resolveSource(resourceId: string): Promise<TranslationSourceSnapshot | null> {
    try {
      const version = await this.curriculumService.getVersionById(resourceId);
      const curriculum = await this.curriculumService.getCurriculumById(version.curriculumId);

      return {
        resourceType: this.resourceType,
        resourceId: version.id,
        sourceLocale: curriculum.sourceLocale,
        sourceContentHash: computeCurriculumVersionContentHash({ label: version.label }),
        sourceVersionKey: String(version.versionNumber),
        payload: {
          label: version.label,
        },
      };
    } catch {
      return null;
    }
  }

  extractTranslatableUnits(snapshot: TranslationSourceSnapshot): TranslatableUnit[] {
    const label = snapshot.payload['label'];

    if (typeof label !== 'string' || label.trim().length === 0) {
      return [];
    }

    return [{ id: 'version.label', text: label }];
  }

  buildPayload(
    snapshot: TranslationSourceSnapshot,
    translatedUnits: readonly TranslatedUnit[],
  ): Record<string, unknown> {
    const translated = buildTranslatedMap(translatedUnits);

    return {
      label: translated.get('version.label') ?? snapshot.payload['label'],
    };
  }

  applyTranslation(
    snapshot: TranslationSourceSnapshot,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      label:
        payload['label'] === undefined
          ? snapshot.payload['label']
          : readStringField(payload, 'label'),
    };
  }
}

@Injectable()
export class CurriculumTopicTranslationAdapter implements TranslationSourceAdapter {
  readonly resourceType = TranslationResourceType.CurriculumTopic;

  constructor(
    private readonly topicService: TopicService,
    private readonly curriculumService: CurriculumService,
  ) {}

  async resolveSource(resourceId: string): Promise<TranslationSourceSnapshot | null> {
    try {
      const topic = await this.topicService.getTopicById(resourceId);
      const version = await this.curriculumService.getVersionById(topic.curriculumVersionId);
      const curriculum = await this.curriculumService.getCurriculumById(version.curriculumId);

      return {
        resourceType: this.resourceType,
        resourceId: topic.id,
        sourceLocale: curriculum.sourceLocale,
        sourceContentHash: computeCurriculumTopicContentHash({
          title: topic.title,
          description: topic.description,
        }),
        sourceVersionKey: String(version.versionNumber),
        payload: {
          title: topic.title,
          description: topic.description,
        },
      };
    } catch {
      return null;
    }
  }

  extractTranslatableUnits(snapshot: TranslationSourceSnapshot): TranslatableUnit[] {
    const resourceId = snapshot.resourceId;
    const units: TranslatableUnit[] = [
      { id: `topic:${resourceId}:title`, text: readSnapshotString(snapshot.payload, 'title') },
    ];
    const description = snapshot.payload['description'];

    if (typeof description === 'string' && description.trim().length > 0) {
      units.push({ id: `topic:${resourceId}:description`, text: description });
    }

    return units;
  }

  buildPayload(
    snapshot: TranslationSourceSnapshot,
    translatedUnits: readonly TranslatedUnit[],
  ): Record<string, unknown> {
    const translated = buildTranslatedMap(translatedUnits);
    const resourceId = snapshot.resourceId;

    return {
      title: translated.get(`topic:${resourceId}:title`) ?? snapshot.payload['title'],
      description:
        translated.get(`topic:${resourceId}:description`) ??
        snapshot.payload['description'] ??
        null,
    };
  }

  applyTranslation(
    snapshot: TranslationSourceSnapshot,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      title: readStringField(payload, 'title') ?? snapshot.payload['title'],
      description:
        payload['description'] === undefined
          ? snapshot.payload['description']
          : readStringField(payload, 'description'),
    };
  }
}

@Injectable()
export class CurriculumLessonTranslationAdapter implements TranslationSourceAdapter {
  readonly resourceType = TranslationResourceType.CurriculumLesson;

  constructor(
    private readonly lessonService: LessonService,
    private readonly curriculumService: CurriculumService,
  ) {}

  async resolveSource(resourceId: string): Promise<TranslationSourceSnapshot | null> {
    try {
      const lesson = await this.lessonService.getLessonById(resourceId);
      const version = await this.curriculumService.getVersionById(lesson.curriculumVersionId);
      const curriculum = await this.curriculumService.getCurriculumById(version.curriculumId);

      return {
        resourceType: this.resourceType,
        resourceId: lesson.id,
        sourceLocale: curriculum.sourceLocale,
        sourceContentHash: computeCurriculumLessonContentHash({
          title: lesson.title,
          summary: lesson.summary,
        }),
        sourceVersionKey: lesson.canonicalLessonKey,
        payload: {
          title: lesson.title,
          summary: lesson.summary,
          canonicalLessonKey: lesson.canonicalLessonKey,
        },
      };
    } catch {
      return null;
    }
  }

  extractTranslatableUnits(snapshot: TranslationSourceSnapshot): TranslatableUnit[] {
    const canonicalLessonKey =
      readSnapshotString(snapshot.payload, 'canonicalLessonKey') || snapshot.resourceId;
    const units: TranslatableUnit[] = [
      {
        id: `lesson:${canonicalLessonKey}:title`,
        text: readSnapshotString(snapshot.payload, 'title'),
      },
    ];
    const summary = snapshot.payload['summary'];

    if (typeof summary === 'string' && summary.trim().length > 0) {
      units.push({ id: `lesson:${canonicalLessonKey}:summary`, text: summary });
    }

    return units;
  }

  buildPayload(
    snapshot: TranslationSourceSnapshot,
    translatedUnits: readonly TranslatedUnit[],
  ): Record<string, unknown> {
    const translated = buildTranslatedMap(translatedUnits);
    const canonicalLessonKey =
      readSnapshotString(snapshot.payload, 'canonicalLessonKey') || snapshot.resourceId;

    return {
      title: translated.get(`lesson:${canonicalLessonKey}:title`) ?? snapshot.payload['title'],
      summary:
        translated.get(`lesson:${canonicalLessonKey}:summary`) ??
        snapshot.payload['summary'] ??
        null,
    };
  }

  applyTranslation(
    snapshot: TranslationSourceSnapshot,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      title: readStringField(payload, 'title') ?? snapshot.payload['title'],
      summary:
        payload['summary'] === undefined
          ? snapshot.payload['summary']
          : readStringField(payload, 'summary'),
      canonicalLessonKey: snapshot.payload['canonicalLessonKey'],
    };
  }
}

export function normalizeTargetLocale(rawLocale: string): string {
  return parseLocale(rawLocale);
}
