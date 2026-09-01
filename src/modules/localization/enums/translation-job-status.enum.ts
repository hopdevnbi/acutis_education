export enum TranslationJobStatus {
  Queued = 'QUEUED',
  Processing = 'PROCESSING',
  Succeeded = 'SUCCEEDED',
  Failed = 'FAILED',
  Dead = 'DEAD',
}

const TRANSLATION_JOB_STATUSES = new Set<string>(Object.values(TranslationJobStatus));

export function isTranslationJobStatus(value: string): value is TranslationJobStatus {
  return TRANSLATION_JOB_STATUSES.has(value);
}

export function isActiveTranslationJobStatus(status: TranslationJobStatus): boolean {
  return status === TranslationJobStatus.Queued || status === TranslationJobStatus.Processing;
}
