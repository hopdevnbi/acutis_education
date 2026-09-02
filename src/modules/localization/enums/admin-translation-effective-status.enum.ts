import { TranslationRevisionStatus } from './translation-revision-status.enum';
import type { TranslationRevisionSnapshot } from '../interfaces/localization.interface';

export enum AdminTranslationEffectiveStatus {
  Missing = 'MISSING',
  MachineTranslated = 'MACHINE_TRANSLATED',
  Reviewed = 'REVIEWED',
  Approved = 'APPROVED',
  Stale = 'STALE',
}

const ADMIN_TRANSLATION_EFFECTIVE_STATUSES = new Set<string>(
  Object.values(AdminTranslationEffectiveStatus),
);

export function isAdminTranslationEffectiveStatus(
  value: string,
): value is AdminTranslationEffectiveStatus {
  return ADMIN_TRANSLATION_EFFECTIVE_STATUSES.has(value);
}

export function deriveAdminTranslationEffectiveStatus(input: {
  readonly revision: TranslationRevisionSnapshot | null;
  readonly currentSourceContentHash: string;
}): AdminTranslationEffectiveStatus {
  if (input.revision === null) {
    return AdminTranslationEffectiveStatus.Missing;
  }

  if (input.revision.sourceContentHash !== input.currentSourceContentHash) {
    return AdminTranslationEffectiveStatus.Stale;
  }

  switch (input.revision.status) {
    case TranslationRevisionStatus.Approved:
      return AdminTranslationEffectiveStatus.Approved;
    case TranslationRevisionStatus.Reviewed:
      return AdminTranslationEffectiveStatus.Reviewed;
    case TranslationRevisionStatus.MachineTranslated:
      return AdminTranslationEffectiveStatus.MachineTranslated;
    default:
      return AdminTranslationEffectiveStatus.Missing;
  }
}
