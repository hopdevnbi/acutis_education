import { Injectable } from '@nestjs/common';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import type {
  TranslationSourceAdapter,
  TranslationSourceSnapshot,
} from '../interfaces/translation-source-adapter.interface';
import type { TranslatableUnit, TranslatedUnit } from '../providers/translation-provider.interface';
import {
  applyQuestionBankTranslation,
  buildQuestionBankTranslationPayload,
  extractQuestionBankTranslatableUnits,
} from '../utils/question-bank-translation.util';

function readSnapshotString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];

  if (typeof value !== 'string') {
    throw new Error(`Expected string field "${key}" in question translation payload.`);
  }

  return value;
}

@Injectable()
export class QuestionBankVersionTranslationAdapter implements TranslationSourceAdapter {
  readonly resourceType = TranslationResourceType.QuestionBankVersion;

  constructor(private readonly questionBankService: QuestionBankService) {}

  async resolveSource(resourceId: string): Promise<TranslationSourceSnapshot | null> {
    try {
      const snapshot = await this.questionBankService.getImmutableAssessmentSnapshot(resourceId);
      const authoringSnapshot = await this.questionBankService.getAuthoringSnapshot(resourceId);

      if (snapshot.sourceContentHash === null) {
        return null;
      }

      return {
        resourceType: this.resourceType,
        resourceId: snapshot.questionVersionId,
        sourceLocale: snapshot.sourceLocale,
        sourceContentHash: snapshot.sourceContentHash,
        sourceVersionKey: String(authoringSnapshot.version.versionNumber),
        payload: {
          assessment: snapshot,
          explanation: authoringSnapshot.version.explanation,
        },
      };
    } catch {
      return null;
    }
  }

  extractTranslatableUnits(snapshot: TranslationSourceSnapshot): TranslatableUnit[] {
    const assessment = snapshot.payload['assessment'];
    const explanation = snapshot.payload['explanation'];

    const units = extractQuestionBankTranslatableUnits(
      assessment as Parameters<typeof extractQuestionBankTranslatableUnits>[0],
    );

    if (typeof explanation === 'string' && explanation.trim().length > 0) {
      units.push({ id: 'question.explanation', text: explanation });
    }

    return units;
  }

  buildPayload(
    snapshot: TranslationSourceSnapshot,
    translatedUnits: readonly TranslatedUnit[],
  ): Record<string, unknown> {
    const assessment = snapshot.payload['assessment'] as Parameters<
      typeof buildQuestionBankTranslationPayload
    >[0];
    const payload = buildQuestionBankTranslationPayload(assessment, translatedUnits);
    const explanationTranslation = translatedUnits.find(
      (unit) => unit.id === 'question.explanation',
    );

    return {
      ...payload,
      explanation: explanationTranslation?.text ?? snapshot.payload['explanation'] ?? null,
    };
  }

  applyTranslation(
    snapshot: TranslationSourceSnapshot,
    payload: Record<string, unknown>,
  ): Record<string, unknown> {
    const assessment = snapshot.payload['assessment'] as Parameters<
      typeof applyQuestionBankTranslation
    >[0];
    const explanation =
      payload['explanation'] === undefined
        ? (snapshot.payload['explanation'] as string | null)
        : payload['explanation'] === null
          ? null
          : readSnapshotString(payload, 'explanation');

    return {
      display: applyQuestionBankTranslation(assessment, payload, explanation),
    };
  }
}
