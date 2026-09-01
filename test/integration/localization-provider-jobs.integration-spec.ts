import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { DatabaseModule } from '../../src/database/database.module';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { TranslationResourceType } from '../../src/modules/localization/enums/translation-resource-type.enum';
import { TranslationRevisionStatus } from '../../src/modules/localization/enums/translation-revision-status.enum';
import { TranslationJobStatus } from '../../src/modules/localization/enums/translation-job-status.enum';
import { LocalizationModule } from '../../src/modules/localization/localization.module';
import { LocalizationService } from '../../src/modules/localization/services/localization.service';
import { CatholicGlossaryService } from '../../src/modules/localization/services/catholic-glossary.service';
import { TranslationSourceRegistryService } from '../../src/modules/localization/services/translation-source-registry.service';
import type { TranslationSourceAdapter } from '../../src/modules/localization/interfaces/translation-source-adapter.interface';

describe('Localization provider jobs integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let localizationService: LocalizationService;
  let catholicGlossaryService: CatholicGlossaryService;
  let translationSourceRegistryService: TranslationSourceRegistryService;

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

    localizationService = moduleRef.get(LocalizationService);
    catholicGlossaryService = moduleRef.get(CatholicGlossaryService);
    translationSourceRegistryService = moduleRef.get(TranslationSourceRegistryService);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creates provider/jobs/glossary tables without extra localization tables', async () => {
    const tables = await AppDataSource.query<Array<{ TABLE_NAME: string }>>(
      `
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME IN (
          'translation_jobs',
          'catholic_glossary_versions',
          'catholic_glossary_terms'
        )
      `,
    );

    expect(tables).toHaveLength(3);
  });

  it('publishes glossary versions and archives the previous published version', async () => {
    const firstDraft = await catholicGlossaryService.createDraft({
      sourceLocale: 'vi-VN',
      targetLocale: 'en-US',
    });

    await catholicGlossaryService.addTerm({
      glossaryVersionId: firstDraft.id,
      sourceTerm: 'Thánh',
      targetTerm: 'Saint',
    });

    const published = await catholicGlossaryService.publish({
      glossaryVersionId: firstDraft.id,
    });

    const secondDraft = await catholicGlossaryService.createDraft({
      sourceLocale: 'vi-VN',
      targetLocale: 'en-US',
    });
    const secondPublished = await catholicGlossaryService.publish({
      glossaryVersionId: secondDraft.id,
    });

    const lookup = await catholicGlossaryService.getPublishedForPair({
      sourceLocale: 'vi-VN',
      targetLocale: 'en-US',
    });

    expect(lookup?.id).toBe(secondPublished.id);
    expect(secondPublished.versionNumber).toBeGreaterThan(published.versionNumber);
  });

  it('queues, processes, and deduplicates translation jobs with a fake adapter', async () => {
    const resourceId = generateUuidV4();
    const sourceHash = 'c'.repeat(64);
    const fakeAdapter: TranslationSourceAdapter = {
      resourceType: TranslationResourceType.LearningContentDocument,
      resolveSource: () =>
        Promise.resolve({
          resourceType: TranslationResourceType.LearningContentDocument,
          resourceId,
          sourceLocale: 'vi-VN',
          sourceContentHash: sourceHash,
          sourceVersionKey: 'v1',
          payload: { blocks: [{ blockIndex: 0, type: 'paragraph', text: 'Xin chào' }] },
        }),
      extractTranslatableUnits: (snapshot) => {
        const blocks = snapshot.payload['blocks'] as Array<{ text: string }>;

        return [
          {
            id: 'block-0',
            text: String(blocks[0]?.text),
          },
        ];
      },
      buildPayload: (_snapshot, translatedUnits) => ({
        blocks: translatedUnits.map((unit) => ({
          blockIndex: 0,
          type: 'paragraph',
          text: unit.text,
        })),
      }),
    };

    translationSourceRegistryService.registerAdapter(fakeAdapter);

    const resource = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.LearningContentDocument,
      resourceId,
      parishId: null,
      sourceLocale: 'vi-VN',
    });

    const glossaryDraft = await catholicGlossaryService.createDraft({
      sourceLocale: 'vi-VN',
      targetLocale: 'en-US',
    });
    await catholicGlossaryService.publish({ glossaryVersionId: glossaryDraft.id });

    const queued = await localizationService.queueTranslationJob({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      sourceContentHash: sourceHash,
      sourceVersionKey: 'v1',
    });

    expect(queued.kind).toBe('queued');

    const summary = await localizationService.processTranslationJobs(5);

    expect(summary.succeededCount).toBe(1);

    const latestRevision = await localizationService.getLatestTranslationRevision(
      resource.id,
      'en-US',
    );

    expect(latestRevision?.status).toBe(TranslationRevisionStatus.MachineTranslated);
    expect(latestRevision?.glossaryVersionId).toBe(glossaryDraft.id);

    const duplicateQueue = await localizationService.queueTranslationJob({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      sourceContentHash: sourceHash,
    });

    expect(duplicateQueue.kind).toBe('short_circuit_revision');

    const jobs = await AppDataSource.query<Array<{ status: string }>>(
      `SELECT status FROM translation_jobs WHERE translation_resource_id = @0`,
      [resource.id],
    );

    expect(jobs.some((job) => job.status === 'SUCCEEDED')).toBe(true);
  });

  it('marks jobs dead when source hash changed before processing', async () => {
    const resourceId = generateUuidV4();
    const queuedHash = 'd'.repeat(64);
    const currentHash = 'e'.repeat(64);

    const fakeAdapter: TranslationSourceAdapter = {
      resourceType: TranslationResourceType.QuestionBankVersion,
      resolveSource: () =>
        Promise.resolve({
          resourceType: TranslationResourceType.QuestionBankVersion,
          resourceId,
          sourceLocale: 'vi-VN',
          sourceContentHash: currentHash,
          sourceVersionKey: null,
          payload: { prompt: 'Cau hoi' },
        }),
      extractTranslatableUnits: () => [{ id: 'prompt', text: 'Cau hoi' }],
      buildPayload: (_snapshot, translatedUnits) => ({
        prompt: translatedUnits[0]?.text,
      }),
    };

    translationSourceRegistryService.registerAdapter(fakeAdapter);

    const resource = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.QuestionBankVersion,
      resourceId,
      parishId: null,
      sourceLocale: 'vi-VN',
    });

    await localizationService.queueTranslationJob({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      sourceContentHash: queuedHash,
    });

    const summary = await localizationService.processTranslationJobs(5);

    expect(summary.deadCount).toBe(1);

    const deadJob = await AppDataSource.query<Array<{ last_error_code: string; status: string }>>(
      `
        SELECT last_error_code, status
        FROM translation_jobs
        WHERE translation_resource_id = @0
      `,
      [resource.id],
    );

    expect(deadJob[0]?.status).toBe(TranslationJobStatus.Dead);
    expect(deadJob[0]?.last_error_code).toBe('SOURCE_CHANGED');
  });
});
