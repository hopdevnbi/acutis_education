import { parseLocale } from '../../../common/locale';
import {
  DerivedTranslationReadStatus,
  TranslationRevisionStatus,
} from '../enums/translation-revision-status.enum';
import type {
  LatestApprovedTranslationRevisionResult,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import { assertSourceContentHash } from './localization-validation.util';

export function deriveTranslationReadStatus(input: {
  readonly revision: TranslationRevisionSnapshot | null;
  readonly currentSourceContentHash: string;
  readonly sourceLocale: string;
  readonly targetLocale: string;
}): LatestApprovedTranslationRevisionResult {
  if (parseLocale(input.sourceLocale) === parseLocale(input.targetLocale)) {
    return {
      revision: null,
      derivedStatus: DerivedTranslationReadStatus.Source,
      isStale: false,
    };
  }

  if (input.revision === null) {
    return {
      revision: null,
      derivedStatus: DerivedTranslationReadStatus.Missing,
      isStale: false,
    };
  }

  const isStale =
    input.revision.sourceContentHash !== assertSourceContentHash(input.currentSourceContentHash);

  if (input.revision.status === TranslationRevisionStatus.Approved) {
    return {
      revision: input.revision,
      derivedStatus: isStale
        ? DerivedTranslationReadStatus.Stale
        : DerivedTranslationReadStatus.Approved,
      isStale,
    };
  }

  if (input.revision.status === TranslationRevisionStatus.MachineTranslated) {
    return {
      revision: input.revision,
      derivedStatus: DerivedTranslationReadStatus.MachineTranslated,
      isStale,
    };
  }

  return {
    revision: null,
    derivedStatus: DerivedTranslationReadStatus.Missing,
    isStale,
  };
}
