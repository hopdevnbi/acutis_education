import {
  InvalidTranslationPayloadError,
  InvalidTranslationSourceContentHashError,
  InvalidTranslationTargetLocaleError,
  TranslationRevisionApprovalIntegrityError,
} from '../errors/localization.errors';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';
import {
  assertApprovedRevisionMetadata,
  assertSourceContentHash,
  assertTargetLocale,
  assertTranslationPayload,
} from './localization-validation.util';

describe('localization-validation.util', () => {
  it('validates source content hash format', () => {
    expect(assertSourceContentHash(`a${'b'.repeat(63)}`)).toHaveLength(64);
    expect(() => assertSourceContentHash('abc')).toThrow(InvalidTranslationSourceContentHashError);
  });

  it('validates bounded JSON object payloads', () => {
    expect(assertTranslationPayload({ title: 'Hello' })).toContain('"title"');
    expect(() => assertTranslationPayload([] as unknown as Record<string, unknown>)).toThrow(
      InvalidTranslationPayloadError,
    );
  });

  it('rejects target locale equal to source locale', () => {
    expect(() => assertTargetLocale('vi-VN', 'vi-VN')).toThrow(InvalidTranslationTargetLocaleError);
    expect(assertTargetLocale('en-US', 'vi-VN')).toBe('en-US');
  });

  it('requires approval metadata for APPROVED revisions', () => {
    expect(() =>
      assertApprovedRevisionMetadata({
        status: TranslationRevisionStatus.Approved,
        approvedByUserId: null,
        approvedAt: null,
      }),
    ).toThrow(TranslationRevisionApprovalIntegrityError);
  });
});
