import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { CmsAccessService } from '../access/cms-access.service';
import { CmsService } from '../cms.service';
import { CmsEntryStatus, CmsEntryType, CmsScopeType } from '../enums/cms.enums';
import type { CmsEntrySnapshot } from '../interfaces/cms.interfaces';
import { CmsAdminEntriesController } from './cms-admin-entries.controller';

describe('CmsAdminEntriesController', () => {
  let controller: CmsAdminEntriesController;
  let cmsService: jest.Mocked<CmsService>;
  let cmsAccessService: jest.Mocked<CmsAccessService>;

  const actor: AuthenticatedUser = {
    userId: '11111111-1111-4111-8111-111111111111',
    sessionId: 'session-1',
  };

  const sampleSnapshot: CmsEntrySnapshot = {
    id: 'entry-admin-1',
    type: CmsEntryType.Article,
    scopeType: CmsScopeType.Global,
    scopeKey: 'GLOBAL',
    parishId: null,
    slug: 'internal-guidelines',
    title: 'Internal Guidelines',
    summary: 'For staff only',
    body: 'Draft body',
    locale: 'vi-VN',
    status: CmsEntryStatus.Draft,
    coverMediaAssetId: null,
    isFeatured: false,
    scheduledFor: null,
    publishedAt: null,
    expiresAt: null,
    createdByUserId: actor.userId,
    updatedByUserId: actor.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    cmsService = {
      findAdminList: jest.fn().mockResolvedValue({
        items: [sampleSnapshot],
        total: 1,
        page: 1,
        limit: 20,
      }),
      getAdminById: jest.fn().mockResolvedValue(sampleSnapshot),
    } as unknown as jest.Mocked<CmsService>;

    cmsAccessService = {
      isSuperAdmin: jest.fn().mockResolvedValue(true),
      listVisibleParishIds: jest.fn().mockResolvedValue(['parish-1']),
    } as unknown as jest.Mocked<CmsAccessService>;

    controller = new CmsAdminEntriesController(cmsService, cmsAccessService);
  });

  describe('listAdmin', () => {
    it('passes isSuperAdmin true and empty parishIds when user is SuperAdmin', async () => {
      cmsAccessService.isSuperAdmin.mockResolvedValue(true);

      const response = await controller.listAdmin(actor, { page: 1, limit: 20 });

      expect(response.items).toHaveLength(1);
      expect(cmsService.findAdminList).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuperAdmin: true,
          adminParishIds: [],
        }),
      );
    });

    it('passes isSuperAdmin false and active parish IDs when user is ParishAdmin', async () => {
      cmsAccessService.isSuperAdmin.mockResolvedValue(false);
      cmsAccessService.listVisibleParishIds.mockResolvedValue(['parish-1']);

      const response = await controller.listAdmin(actor, { page: 1, limit: 20 });

      expect(response.items).toHaveLength(1);
      expect(cmsService.findAdminList).toHaveBeenCalledWith(
        expect.objectContaining({
          isSuperAdmin: false,
          adminParishIds: ['parish-1'],
        }),
      );
    });
  });

  describe('getAdminById', () => {
    it('retrieves entry details for admin caller', async () => {
      const response = await controller.getAdminById(actor, 'entry-admin-1');
      expect(response.id).toBe('entry-admin-1');
      expect(response.status).toBe(CmsEntryStatus.Draft);
      expect(cmsService.getAdminById).toHaveBeenCalledWith(
        'entry-admin-1',
        expect.objectContaining({ isSuperAdmin: true }),
      );
    });
  });
});
