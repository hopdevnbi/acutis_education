import {
  DerivedTranslationReadStatus,
  TranslationRevisionStatus,
} from '../enums/translation-revision-status.enum';
import { deriveTranslationReadStatus } from './derive-translation-read-status.util';

describe('deriveTranslationReadStatus', () => {
  const revision = {
    id: '11111111-1111-4111-8111-111111111111',
    translationResourceId: '22222222-2222-4222-8222-222222222222',
    targetLocale: 'en-US',
    revisionNumber: 1,
    sourceContentHash: 'a'.repeat(64),
    sourceVersionKey: null,
    status: TranslationRevisionStatus.Approved,
    payloadJson: '{}',
    providerId: null,
    providerModel: null,
    glossaryVersionId: null,
    createdByUserId: null,
    approvedByUserId: '33333333-3333-4333-8333-333333333333',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    approvedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  it('returns SOURCE when target equals source locale', () => {
    expect(
      deriveTranslationReadStatus({
        revision,
        currentSourceContentHash: revision.sourceContentHash,
        sourceLocale: 'vi-VN',
        targetLocale: 'vi-VN',
      }),
    ).toEqual({
      revision: null,
      derivedStatus: DerivedTranslationReadStatus.Source,
      isStale: false,
    });
  });

  it('returns STALE when approved revision hash differs from current source hash', () => {
    expect(
      deriveTranslationReadStatus({
        revision,
        currentSourceContentHash: 'b'.repeat(64),
        sourceLocale: 'vi-VN',
        targetLocale: 'en-US',
      }),
    ).toEqual({
      revision,
      derivedStatus: DerivedTranslationReadStatus.Stale,
      isStale: true,
    });
  });

  it('returns APPROVED when hash matches', () => {
    expect(
      deriveTranslationReadStatus({
        revision,
        currentSourceContentHash: revision.sourceContentHash,
        sourceLocale: 'vi-VN',
        targetLocale: 'en-US',
      }),
    ).toEqual({
      revision,
      derivedStatus: DerivedTranslationReadStatus.Approved,
      isStale: false,
    });
  });
});
