import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { DatabaseModule } from '../../src/database/database.module';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { TranslationResourceType } from '../../src/modules/localization/enums/translation-resource-type.enum';
import {
  DerivedTranslationReadStatus,
  TranslationRevisionStatus,
} from '../../src/modules/localization/enums/translation-revision-status.enum';
import { TranslationResourceBindingConflictError } from '../../src/modules/localization/errors/localization.errors';
import { LocalizationModule } from '../../src/modules/localization/localization.module';
import { LocalizationService } from '../../src/modules/localization/services/localization.service';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';
import { UserAccountService } from '../../src/modules/users/services/user-account.service';
import { UsersModule } from '../../src/modules/users/users.module';

const TEST_CODE_PREFIX = 'loc002-';

describe('Localization foundation integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let localizationService: LocalizationService;
  let userAccountService: UserAccountService;
  let parishService: ParishService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [
        ApplicationConfigModule,
        DatabaseModule,
        LocalizationModule,
        UsersModule,
        ParishModule,
      ],
    }).compile();

    localizationService = moduleRef.get(LocalizationService);
    userAccountService = moduleRef.get(UserAccountService);
    parishService = moduleRef.get(ParishService);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creates nullable preferred_locale and default_locale columns', async () => {
    const userColumns = await AppDataSource.query<Array<{ COLUMN_NAME: string }>>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'preferred_locale'`,
    );
    const parishColumns = await AppDataSource.query<Array<{ COLUMN_NAME: string }>>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'parishes' AND COLUMN_NAME = 'default_locale'`,
    );

    expect(userColumns).toHaveLength(1);
    expect(parishColumns).toHaveLength(1);
  });

  it('creates translation resource idempotently and rejects binding conflicts', async () => {
    const resourceId = generateUuidV4();
    const parishId = generateUuidV4();

    const first = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.LearningContentDocument,
      resourceId,
      parishId,
      sourceLocale: 'vi-VN',
    });
    const second = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.LearningContentDocument,
      resourceId,
      parishId,
      sourceLocale: 'vi-VN',
    });

    expect(second.id).toBe(first.id);

    await expect(
      localizationService.getOrCreateTranslationResource({
        resourceType: TranslationResourceType.LearningContentDocument,
        resourceId,
        parishId,
        sourceLocale: 'en-US',
      }),
    ).rejects.toBeInstanceOf(TranslationResourceBindingConflictError);
  });

  it('creates monotonic revisions and derives stale approved lookup', async () => {
    const resourceId = generateUuidV4();
    const resource = await localizationService.getOrCreateTranslationResource({
      resourceType: TranslationResourceType.QuestionBankVersion,
      resourceId,
      parishId: null,
      sourceLocale: 'vi-VN',
    });
    const approverUserId = generateUuidV4();

    await AppDataSource.query(
      `
        INSERT INTO users (id, email, password_hash, status, preferred_locale, created_at, updated_at)
        VALUES (@0, @1, @2, 'ACTIVE', NULL, GETUTCDATE(), GETUTCDATE())
      `,
      [approverUserId, `${TEST_CODE_PREFIX}approver@example.com`, 'hash'],
    );

    const sourceHash = 'a'.repeat(64);
    const approvedAt = new Date('2026-01-01T00:00:00.000Z');

    const revision = await localizationService.createTranslationRevision({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      sourceContentHash: sourceHash,
      status: TranslationRevisionStatus.Approved,
      payload: { prompt: 'Translated prompt' },
      approvedByUserId: approverUserId,
      approvedAt,
    });

    expect(revision.revisionNumber).toBe(1);

    const secondRevision = await localizationService.createTranslationRevision({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      sourceContentHash: sourceHash,
      status: TranslationRevisionStatus.MachineTranslated,
      payload: { prompt: 'Machine draft' },
    });

    expect(secondRevision.revisionNumber).toBe(2);

    const freshLookup = await localizationService.getLatestApprovedTranslationRevision({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      currentSourceContentHash: sourceHash,
    });

    expect(freshLookup.derivedStatus).toBe(DerivedTranslationReadStatus.Approved);
    expect(freshLookup.isStale).toBe(false);

    const staleLookup = await localizationService.getLatestApprovedTranslationRevision({
      translationResourceId: resource.id,
      targetLocale: 'en-US',
      currentSourceContentHash: 'b'.repeat(64),
    });

    expect(staleLookup.derivedStatus).toBe(DerivedTranslationReadStatus.Stale);
    expect(staleLookup.isStale).toBe(true);
  });

  it('updates user preferred locale and parish default locale with normalization', async () => {
    const account = await userAccountService.createAccount({
      email: `${TEST_CODE_PREFIX}user@example.com`,
      password: 'LocalDev!Sample2026',
    });
    const updatedAccount = await userAccountService.updatePreferredLocale(account.id, ' en-us ');

    expect(updatedAccount.preferredLocale).toBe('en-US');

    const parish = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}parish`,
      name: 'Localization Parish',
    });
    const updatedParish = await parishService.updateParish(parish.id, {
      defaultLocale: ' fr-fr ',
    });

    expect(updatedParish.defaultLocale).toBe('fr-FR');
  });
});
