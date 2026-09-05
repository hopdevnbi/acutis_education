import { CmsEntryStatus, CmsEntryType, CmsScopeType } from '../enums/cms.enums';
import type { CmsEntrySnapshot } from '../interfaces/cms.interfaces';
import {
  toCmsEntryAdminResponseDto,
  toCmsEntryDetailDto,
  toCmsEntryListItemDto,
} from './cms-http.mapper';

describe('CmsHttpMapper', () => {
  const sampleSnapshot: CmsEntrySnapshot = {
    id: '11111111-1111-4111-8111-111111111111',
    type: CmsEntryType.Article,
    scopeType: CmsScopeType.Global,
    scopeKey: 'GLOBAL',
    parishId: null,
    slug: 'parish-anniversary',
    title: 'Parish Anniversary',
    summary: 'A short summary',
    body: 'Full long article body content',
    locale: 'vi-VN',
    status: CmsEntryStatus.Published,
    coverMediaAssetId: '22222222-2222-4222-8222-222222222222',
    isFeatured: true,
    scheduledFor: null,
    publishedAt: new Date('2026-09-01T10:00:00Z'),
    expiresAt: null,
    createdByUserId: '33333333-3333-4333-8333-333333333333',
    updatedByUserId: '33333333-3333-4333-8333-333333333333',
    createdAt: new Date('2026-09-01T09:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
  };

  it('toCmsEntryListItemDto excludes full body and admin metadata', () => {
    const dto = toCmsEntryListItemDto(sampleSnapshot);
    expect(dto.id).toBe(sampleSnapshot.id);
    expect(dto.slug).toBe(sampleSnapshot.slug);
    expect(dto.title).toBe(sampleSnapshot.title);
    expect(dto.summary).toBe(sampleSnapshot.summary);
    expect(dto.isFeatured).toBe(true);
    expect((dto as Record<string, unknown>)['body']).toBeUndefined();
    expect((dto as Record<string, unknown>)['createdByUserId']).toBeUndefined();
    expect((dto as Record<string, unknown>)['scopeKey']).toBeUndefined();
  });

  it('toCmsEntryDetailDto includes body but excludes admin audit fields', () => {
    const dto = toCmsEntryDetailDto(sampleSnapshot);
    expect(dto.body).toBe(sampleSnapshot.body);
    expect(dto.slug).toBe(sampleSnapshot.slug);
    expect((dto as Record<string, unknown>)['createdByUserId']).toBeUndefined();
    expect((dto as Record<string, unknown>)['scopeKey']).toBeUndefined();
  });

  it('toCmsEntryAdminResponseDto includes complete administrative and audit fields', () => {
    const dto = toCmsEntryAdminResponseDto(sampleSnapshot);
    expect(dto.id).toBe(sampleSnapshot.id);
    expect(dto.body).toBe(sampleSnapshot.body);
    expect(dto.scopeKey).toBe('GLOBAL');
    expect(dto.status).toBe(CmsEntryStatus.Published);
    expect(dto.createdByUserId).toBe(sampleSnapshot.createdByUserId);
    expect(dto.createdAt).toBe('2026-09-01T09:00:00.000Z');
  });
});
