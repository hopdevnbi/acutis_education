import { NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CmsAccessService } from '../access/cms-access.service';
import { CmsService } from '../cms.service';
import { CmsEntryStatus, CmsEntryType, CmsScopeType } from '../enums/cms.enums';
import type { CmsEntrySnapshot } from '../interfaces/cms.interfaces';
import { CmsEntriesController } from './cms-entries.controller';

describe('CmsEntriesController', () => {
  let controller: CmsEntriesController;
  let cmsService: jest.Mocked<CmsService>;
  let cmsAccessService: jest.Mocked<CmsAccessService>;

  const actor: AuthenticatedUser = {
    userId: '11111111-1111-4111-8111-111111111111',
    sessionId: 'session-1',
  };

  const sampleSnapshot: CmsEntrySnapshot = {
    id: 'entry-1',
    type: CmsEntryType.Article,
    scopeType: CmsScopeType.Global,
    scopeKey: 'GLOBAL',
    parishId: null,
    slug: 'community-welcome',
    title: 'Community Welcome',
    summary: 'A welcome note',
    body: 'Body text',
    locale: 'vi-VN',
    status: CmsEntryStatus.Published,
    coverMediaAssetId: null,
    isFeatured: false,
    scheduledFor: null,
    publishedAt: new Date('2026-09-01T10:00:00Z'),
    expiresAt: null,
    createdByUserId: actor.userId,
    updatedByUserId: actor.userId,
    createdAt: new Date('2026-09-01T09:00:00Z'),
    updatedAt: new Date('2026-09-01T10:00:00Z'),
  };

  beforeEach(() => {
    cmsService = {
      createEntry: jest.fn().mockResolvedValue(sampleSnapshot),
      getEntryById: jest.fn().mockResolvedValue(sampleSnapshot),
      updateEntry: jest.fn().mockResolvedValue(sampleSnapshot),
      publishEntry: jest.fn().mockResolvedValue(sampleSnapshot),
      archiveEntry: jest.fn().mockResolvedValue(sampleSnapshot),
      findPublicList: jest.fn().mockResolvedValue({
        items: [sampleSnapshot],
        total: 1,
        page: 1,
        limit: 20,
      }),
      findPublicBySlug: jest.fn().mockResolvedValue(sampleSnapshot),
    } as unknown as jest.Mocked<CmsService>;

    cmsAccessService = {
      assertCanManageCmsScope: jest.fn().mockResolvedValue(undefined),
      assertCanManageEntry: jest.fn().mockResolvedValue(undefined),
      listVisibleParishIds: jest.fn().mockResolvedValue(['parish-1']),
      assertCanReadParishCms: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CmsAccessService>;

    controller = new CmsEntriesController(cmsService, cmsAccessService);
  });

  describe('listPublic', () => {
    it('returns empty allowedParishIds for anonymous callers', async () => {
      const response = await controller.listPublic(null, { page: 1, limit: 20 });
      expect(response.items).toHaveLength(1);
      expect(cmsAccessService.listVisibleParishIds).not.toHaveBeenCalled();
      expect(cmsService.findPublicList).toHaveBeenCalledWith(
        expect.objectContaining({ allowedParishIds: [] }),
        undefined,
      );
    });

    it('populates allowedParishIds for authenticated callers', async () => {
      const response = await controller.listPublic(actor, { page: 1, limit: 20 });
      expect(response.items).toHaveLength(1);
      expect(cmsAccessService.listVisibleParishIds).toHaveBeenCalledWith(actor.userId);
      expect(cmsService.findPublicList).toHaveBeenCalledWith(
        expect.objectContaining({ allowedParishIds: ['parish-1'] }),
        undefined,
      );
    });
  });

  describe('getPublicBySlug', () => {
    it('resolves global published entry by slug', async () => {
      const response = await controller.getPublicBySlug(null, 'community-welcome', {});
      expect(response.slug).toBe('community-welcome');
      expect(cmsService.findPublicBySlug).toHaveBeenCalledWith('community-welcome', {
        parishId: undefined,
        allowedParishIds: [],
      });
    });

    it('throws NotFoundException when anonymous caller requests parish-scoped slug', async () => {
      await expect(
        controller.getPublicBySlug(null, 'parish-news', { parishId: 'parish-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when entry is not found', async () => {
      cmsService.findPublicBySlug.mockResolvedValue(null);
      await expect(
        controller.getPublicBySlug(null, 'non-existent-slug', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('asserts management scope and returns created entry DTO', async () => {
      const response = await controller.create(actor, {
        type: CmsEntryType.Article,
        scopeType: CmsScopeType.Global,
        slug: 'community-welcome',
        title: 'Community Welcome',
        body: 'Body text',
      });

      expect(cmsAccessService.assertCanManageCmsScope).toHaveBeenCalled();
      expect(cmsService.createEntry).toHaveBeenCalled();
      expect(response.slug).toBe('community-welcome');
    });
  });

  describe('publish', () => {
    it('asserts management permission and publishes entry', async () => {
      const response = await controller.publish(actor, 'entry-1');
      expect(cmsAccessService.assertCanManageEntry).toHaveBeenCalled();
      expect(cmsService.publishEntry).toHaveBeenCalledWith('entry-1', actor.userId);
      expect(response.id).toBe('entry-1');
    });
  });

  describe('archive', () => {
    it('asserts management permission and archives entry', async () => {
      const response = await controller.archive(actor, 'entry-1');
      expect(cmsAccessService.assertCanManageEntry).toHaveBeenCalled();
      expect(cmsService.archiveEntry).toHaveBeenCalledWith('entry-1', actor.userId);
      expect(response.id).toBe('entry-1');
    });
  });
});
