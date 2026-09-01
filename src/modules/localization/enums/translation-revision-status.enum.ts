export enum TranslationRevisionStatus {
  Queued = 'QUEUED',
  Translating = 'TRANSLATING',
  MachineTranslated = 'MACHINE_TRANSLATED',
  Reviewed = 'REVIEWED',
  Approved = 'APPROVED',
  Failed = 'FAILED',
}

export enum DerivedTranslationReadStatus {
  Missing = 'MISSING',
  Source = 'SOURCE',
  Stale = 'STALE',
  Approved = 'APPROVED',
  MachineTranslated = 'MACHINE_TRANSLATED',
}

const TRANSLATION_REVISION_STATUSES = new Set<string>(Object.values(TranslationRevisionStatus));

export function isTranslationRevisionStatus(value: string): value is TranslationRevisionStatus {
  return TRANSLATION_REVISION_STATUSES.has(value);
}
