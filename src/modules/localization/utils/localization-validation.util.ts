import {
  MAX_TRANSLATION_PAYLOAD_BYTES,
  SOURCE_CONTENT_HASH_PATTERN,
  parseLocale,
} from '../../../common/locale';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';
import {
  InvalidTranslationPayloadError,
  InvalidTranslationRevisionStatusError,
  InvalidTranslationSourceContentHashError,
  InvalidTranslationTargetLocaleError,
  TranslationRevisionApprovalIntegrityError,
} from '../errors/localization.errors';

export function assertSourceContentHash(sourceContentHash: string): string {
  const normalized = sourceContentHash.trim().toLowerCase();

  if (!SOURCE_CONTENT_HASH_PATTERN.test(normalized)) {
    throw new InvalidTranslationSourceContentHashError();
  }

  return normalized;
}

export function assertTranslationPayload(payload: Record<string, unknown>): string {
  if (Array.isArray(payload)) {
    throw new InvalidTranslationPayloadError();
  }

  const serialized = JSON.stringify(payload);

  if (serialized.length === 0 || serialized.length > MAX_TRANSLATION_PAYLOAD_BYTES) {
    throw new InvalidTranslationPayloadError();
  }

  const parsed: unknown = JSON.parse(serialized);

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new InvalidTranslationPayloadError();
  }

  return serialized;
}

export function assertTargetLocale(targetLocale: string, sourceLocale: string): string {
  const normalizedTargetLocale = parseLocale(targetLocale);
  const normalizedSourceLocale = parseLocale(sourceLocale);

  if (normalizedTargetLocale === normalizedSourceLocale) {
    throw new InvalidTranslationTargetLocaleError();
  }

  return normalizedTargetLocale;
}

export function assertApprovedRevisionMetadata(input: {
  readonly status: TranslationRevisionStatus;
  readonly approvedByUserId: string | null | undefined;
  readonly approvedAt: Date | null | undefined;
}): void {
  if (input.status !== TranslationRevisionStatus.Approved) {
    return;
  }

  if (
    input.approvedByUserId === null ||
    input.approvedByUserId === undefined ||
    !isUuidV4(input.approvedByUserId) ||
    input.approvedAt === null ||
    input.approvedAt === undefined
  ) {
    throw new TranslationRevisionApprovalIntegrityError();
  }
}

export function assertPersistedRevisionStatus(status: TranslationRevisionStatus): void {
  if (!Object.values(TranslationRevisionStatus).includes(status)) {
    throw new InvalidTranslationRevisionStatusError();
  }
}

export function normalizeOptionalUuid(rawValue: string | null | undefined): string | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  if (!isUuidV4(rawValue)) {
    return null;
  }

  return normalizeUuid(rawValue);
}
