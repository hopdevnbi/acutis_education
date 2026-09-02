import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { LOCALIZATION_BULK_MAX_RESOURCES } from '../../src/modules/localization/constants/localization-admin.constants';
import { TranslationResourceType } from '../../src/modules/localization/enums/translation-resource-type.enum';
import { TranslationRevisionStatus } from '../../src/modules/localization/enums/translation-revision-status.enum';
import { AdminTranslationEffectiveStatus } from '../../src/modules/localization/enums/admin-translation-effective-status.enum';
import { LocalizationBulkLimitExceededError } from '../../src/modules/localization/errors/localization-admin.errors';
import { LocalizationRevisionStaleError } from '../../src/modules/localization/errors/localization-admin.errors';
import { LocalizationModule } from '../../src/modules/localization/localization.module';
import { LocalizationAdminService } from '../../src/modules/localization/services/localization-admin.service';
import { LocalizationService } from '../../src/modules/localization/services/localization.service';
import { TranslationJobService } from '../../src/modules/localization/services/translation-job.service';
import { TranslationResourceService } from '../../src/modules/localization/services/translation-resource.service';
import { TranslationRevisionService } from '../../src/modules/localization/services/translation-revision.service';
import { TranslationSourceRegistryService } from '../../src/modules/localization/services/translation-source-registry.service';
import type { TranslationSourceAdapter } from '../../src/modules/localization/interfaces/translation-source-adapter.interface';

describe('Localization admin integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let localizationAdminService: LocalizationAdminService;
  let localizationService: LocalizationService;
  let translationRevisionService: TranslationRevisionService;
  let translationJobService: TranslationJobService;
  let translationResourceService: TranslationResourceService;
  let translationSourceRegistryService: TranslationSourceRegistryService;

  const adminUserId = generateUuidV4();

  async function ensureTestUser(userId: string): Promise<void> {
    await AppDataSource.query(
      `
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = @0)
        INSERT INTO users (id, email, password_hash, status, created_at, updated_at)
        VALUES (@0, @1, 'hash', 'ACTIVE', GETUTCDATE(), GETUTCDATE())
      `,
      [userId, `${userId}@localization-admin.test`],
    );
  }

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [ApplicationConfigModule, DatabaseModule, LocalizationModule],
    }).compile();

    localizationAdminService = moduleRef.get(LocalizationAdminService);
    localizationService = moduleRef.get(LocalizationService);
    translationRevisionService = moduleRef.get(TranslationRevisionService);
    translationJobService = moduleRef.get(TranslationJobService);
    translationResourceService = moduleRef.get(TranslationResourceService);
    translationSourceRegistryService = moduleRef.get(TranslationSourceRegistryService);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  function registerFakeAdapter(resourceId: string, sourceHash: string): void {
    const fakeAdapter: TranslationSourceAdapter = {
      resourceType: TranslationResourceType.LearningContentDocument,
      resolveSource: () =>
        Promise.resolve({
          resourceType: TranslationResourceType.LearningContentDocument,
          resourceId,
          sourceLocale: 'vi-VN',
          sourceContentHash: sourceHash,
          sourceVersionKey: 'lesson-1',
          payload: { blocks: [{ blockIndex: 0, type: 'paragraph', text: 'Xin chào' }] },
        }),
      extractTranslatableUnits: (snapshot) => {
        const blocks = snapshot.payload['blocks'] as Array<{ text: string }>;

        return [{ id: 'block-0', text: String(blocks[0]?.text) }];
      },
      buildPayload: (_snapshot, translatedUnits) => ({
        blocks: translatedUnits.map((unit) => ({
          blockIndex: 0,
          type: 'paragraph',
          text: unit.text,
        })),
      }),
      applyTranslation: (_snapshot, payload) => payload,
    };

    translationSourceRegistryService.registerAdapter(fakeAdapter);
  }

  it('queues machine translation through the worker', async () => {
    const resourceId = generateUuidV4();
    const sourceHash = 'f'.repeat(64);
    registerFakeAdapter(resourceId, sourceHash);

    const resource = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.LearningContentDocument,
      resourceId,
      parishId: generateUuidV4(),
      sourceLocale: 'vi-VN',
    });

    const queued = await localizationService.queueTranslationJob({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      sourceContentHash: sourceHash,
    });

    expect(queued.kind).toBe('queued');

    const summary = await localizationService.processTranslationJobs(5);

    expect(summary.succeededCount).toBe(1);

    const latestRevision = await localizationService.getLatestTranslationRevision(
      resource.id,
      'en-US',
    );

    expect(latestRevision?.status).toBe(TranslationRevisionStatus.MachineTranslated);
  });

  it('creates reviewed and approved revisions without mutating the machine revision', async () => {
    const resourceId = generateUuidV4();
    const sourceHash = 'e'.repeat(64);
    registerFakeAdapter(resourceId, sourceHash);

    const resource = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.LearningContentDocument,
      resourceId,
      parishId: generateUuidV4(),
      sourceLocale: 'vi-VN',
    });

    await localizationService.queueTranslationJob({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      sourceContentHash: sourceHash,
    });
    await localizationService.processTranslationJobs(5);

    const machineRevision = await localizationService.getLatestTranslationRevision(
      resource.id,
      'en-US',
    );

    expect(machineRevision).not.toBeNull();
    await ensureTestUser(adminUserId);

    const reviewed = await translationRevisionService.createReviewedRevisionFromRevision({
      revisionId: machineRevision!.id,
      payload: {
        blocks: [{ blockIndex: 0, type: 'paragraph', text: 'Hello edited' }],
      },
      createdByUserId: adminUserId,
    });

    expect(reviewed.status).toBe(TranslationRevisionStatus.Reviewed);
    expect(reviewed.id).not.toBe(machineRevision!.id);

    const approved = await translationRevisionService.approveRevision({
      revisionId: reviewed.id,
      approvedByUserId: adminUserId,
    });

    expect(approved.status).toBe(TranslationRevisionStatus.Approved);
  });

  it('denies approval when source hash is stale', async () => {
    const resourceId = generateUuidV4();
    const originalHash = 'd'.repeat(64);
    registerFakeAdapter(resourceId, originalHash);

    const resource = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.LearningContentDocument,
      resourceId,
      parishId: generateUuidV4(),
      sourceLocale: 'vi-VN',
    });

    const revision = await localizationService.createTranslationRevision({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      sourceContentHash: originalHash,
      status: TranslationRevisionStatus.MachineTranslated,
      payload: {
        blocks: [{ blockIndex: 0, type: 'paragraph', text: 'Hello' }],
      },
    });

    registerFakeAdapter(resourceId, 'c'.repeat(64));

    await expect(
      translationRevisionService.approveRevision({
        revisionId: revision.id,
        approvedByUserId: adminUserId,
      }),
    ).rejects.toBeInstanceOf(LocalizationRevisionStaleError);
  });

  it('enforces bulk translation bounds', async () => {
    const ids = Array.from({ length: LOCALIZATION_BULK_MAX_RESOURCES + 1 }, () => generateUuidV4());

    await expect(
      localizationAdminService.bulkRequestTranslation({
        userId: adminUserId,
        translationResourceIds: ids,
        targetLocale: 'en-US',
      }),
    ).rejects.toBeInstanceOf(LocalizationBulkLimitExceededError);
  });

  it('isolates jobs by parish scope in listJobs', async () => {
    const parishA = generateUuidV4();
    const parishB = generateUuidV4();
    const resourceAId = generateUuidV4();
    const resourceBId = generateUuidV4();
    registerFakeAdapter(resourceAId, 'b'.repeat(64));
    registerFakeAdapter(resourceBId, 'a'.repeat(64));

    const resourceA = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.LearningContentDocument,
      resourceId: resourceAId,
      parishId: parishA,
      sourceLocale: 'vi-VN',
    });

    await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.LearningContentDocument,
      resourceId: resourceBId,
      parishId: parishB,
      sourceLocale: 'vi-VN',
    });

    await localizationService.queueTranslationJob({
      translationResourceId: resourceA.id,
      targetLocale: 'en-US',
      sourceContentHash: 'b'.repeat(64),
    });

    const scopedJobs = await translationJobService.listJobs({
      page: 1,
      limit: 50,
      parishIds: [parishB],
    });

    expect(scopedJobs.items.some((job) => job.translationResourceId === resourceA.id)).toBe(false);
  });

  it('paginates translationStatus filters across the full candidate set', async () => {
    const parishId = generateUuidV4();
    const sourceHash = '9'.repeat(64);
    const approvedResourceIds: string[] = [];
    const machineResourceIds: string[] = [];

    for (let index = 0; index < 5; index += 1) {
      const resourceId = generateUuidV4();
      registerFakeAdapter(resourceId, sourceHash);
      approvedResourceIds.push(resourceId);

      const resource = await localizationService.getOrCreateTranslationResource({
        resourceType: TranslationResourceType.LearningContentDocument,
        resourceId,
        parishId,
        sourceLocale: 'vi-VN',
      });

      await localizationService.createTranslationRevision({
        translationResourceId: resource.id,
        targetLocale: 'en-US',
        sourceContentHash: sourceHash,
        status: TranslationRevisionStatus.Approved,
        payload: {
          blocks: [{ blockIndex: 0, type: 'paragraph', text: `Approved ${String(index)}` }],
        },
        approvedByUserId: adminUserId,
        approvedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
    }

    for (let index = 0; index < 3; index += 1) {
      const resourceId = generateUuidV4();
      registerFakeAdapter(resourceId, sourceHash);
      machineResourceIds.push(resourceId);

      const resource = await localizationService.getOrCreateTranslationResource({
        resourceType: TranslationResourceType.LearningContentDocument,
        resourceId,
        parishId,
        sourceLocale: 'vi-VN',
      });

      await localizationService.createTranslationRevision({
        translationResourceId: resource.id,
        targetLocale: 'en-US',
        sourceContentHash: sourceHash,
        status: TranslationRevisionStatus.MachineTranslated,
        payload: {
          blocks: [{ blockIndex: 0, type: 'paragraph', text: `Machine ${String(index)}` }],
        },
      });
    }

    const candidates = await translationResourceService.listAllCandidates({
      page: 1,
      limit: 50,
      parishIds: [parishId],
      targetLocale: 'en-US',
    });
    const sourceHashes = new Map(candidates.map((item) => [item.id, sourceHash] as const));
    const pageOne = translationResourceService.paginateStatusFilteredList(
      {
        page: 1,
        limit: 2,
        parishIds: [parishId],
        targetLocale: 'en-US',
        translationStatus: AdminTranslationEffectiveStatus.Approved,
      },
      candidates,
      sourceHashes,
    );
    const pageTwo = translationResourceService.paginateStatusFilteredList(
      {
        page: 2,
        limit: 2,
        parishIds: [parishId],
        targetLocale: 'en-US',
        translationStatus: AdminTranslationEffectiveStatus.Approved,
      },
      candidates,
      sourceHashes,
    );

    expect(pageOne.total).toBe(5);
    expect(pageOne.items).toHaveLength(2);
    expect(pageTwo.total).toBe(5);
    expect(pageTwo.items).toHaveLength(2);

    const pageOneIds = new Set(pageOne.items.map((item) => item.resourceId));
    const pageTwoIds = new Set(pageTwo.items.map((item) => item.resourceId));

    for (const id of pageTwoIds) {
      expect(pageOneIds.has(id)).toBe(false);
    }

    for (const item of [...pageOne.items, ...pageTwo.items]) {
      expect(item.effectiveStatus).toBe(AdminTranslationEffectiveStatus.Approved);
      expect(approvedResourceIds).toContain(item.resourceId);
      expect(machineResourceIds).not.toContain(item.resourceId);
    }
  });
});
