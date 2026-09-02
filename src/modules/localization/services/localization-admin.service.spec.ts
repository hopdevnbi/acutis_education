import { Test, type TestingModule } from '@nestjs/testing';
import { CurriculumService } from '../../curriculum/services/curriculum.service';
import { LessonService } from '../../curriculum/services/lesson.service';
import { TopicService } from '../../curriculum/services/topic.service';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { LOCALIZATION_BULK_MAX_RESOURCES } from '../constants/localization-admin.constants';
import { LocalizationBulkLimitExceededError } from '../errors/localization-admin.errors';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import { TranslationJobStatus } from '../enums/translation-job-status.enum';
import { TranslationRevisionStatus } from '../enums/translation-revision-status.enum';
import type { TranslationResourceSnapshot } from '../interfaces/localization.interface';
import { LocalizedResourceResolutionService } from './localized-resource-resolution.service';
import { LocalizationAccessService } from './localization-access.service';
import { LocalizationAdminService } from './localization-admin.service';
import { TranslationJobService } from './translation-job.service';
import { TranslationResourceService } from './translation-resource.service';
import { TranslationRevisionService } from './translation-revision.service';
import { TranslationSourceRegistryService } from './translation-source-registry.service';

describe('LocalizationAdminService', () => {
  let service: LocalizationAdminService;
  let localizationAccessService: jest.Mocked<
    Pick<
      LocalizationAccessService,
      | 'assertCanManageResource'
      | 'assertCanReadResource'
      | 'assertCanApproveResource'
      | 'parseTargetLocale'
      | 'resolveListParishScope'
    >
  >;
  let translationResourceService: jest.Mocked<
    Pick<TranslationResourceService, 'getResourceById' | 'getOrCreateResource' | 'listResources'>
  >;
  let translationRevisionService: jest.Mocked<
    Pick<
      TranslationRevisionService,
      'getRevisionDetail' | 'createReviewedRevisionFromRevision' | 'approveRevision'
    >
  >;
  let translationJobService: jest.Mocked<Pick<TranslationJobService, 'queueTranslation'>>;

  const userId = '11111111-1111-4111-8111-111111111111';
  const resource: TranslationResourceSnapshot = {
    id: '33333333-3333-4333-8333-333333333333',
    resourceType: TranslationResourceType.LearningContentDocument,
    resourceId: '44444444-4444-4444-8444-444444444444',
    parishId: '22222222-2222-4222-8222-222222222222',
    sourceLocale: 'vi-VN',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    localizationAccessService = {
      assertCanManageResource: jest.fn().mockResolvedValue(undefined),
      assertCanReadResource: jest.fn().mockResolvedValue(undefined),
      assertCanApproveResource: jest.fn().mockResolvedValue(undefined),
      parseTargetLocale: jest.fn().mockReturnValue('en-US'),
      resolveListParishScope: jest.fn().mockResolvedValue([resource.parishId as string]),
    };

    translationResourceService = {
      getResourceById: jest.fn().mockResolvedValue(resource),
      getOrCreateResource: jest.fn(),
      listResources: jest.fn(),
    };

    translationRevisionService = {
      getRevisionDetail: jest.fn(),
      createReviewedRevisionFromRevision: jest.fn(),
      approveRevision: jest.fn(),
    };

    translationJobService = {
      queueTranslation: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LocalizationAdminService,
        { provide: LocalizationAccessService, useValue: localizationAccessService },
        { provide: TranslationResourceService, useValue: translationResourceService },
        { provide: TranslationRevisionService, useValue: translationRevisionService },
        { provide: TranslationJobService, useValue: translationJobService },
        {
          provide: TranslationSourceRegistryService,
          useValue: {
            resolveSource: jest.fn().mockResolvedValue({
              resourceType: resource.resourceType,
              resourceId: resource.resourceId,
              sourceLocale: resource.sourceLocale,
              sourceContentHash: 'a'.repeat(64),
              sourceVersionKey: 'v1',
              payload: {},
            }),
          },
        },
        { provide: LocalizedResourceResolutionService, useValue: {} },
        { provide: CurriculumService, useValue: {} },
        { provide: LessonService, useValue: {} },
        { provide: TopicService, useValue: {} },
        { provide: QuestionBankService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(LocalizationAdminService);
  });

  it('returns 201 when a new translation job is queued', async () => {
    translationJobService.queueTranslation.mockResolvedValue({
      kind: 'queued',
      job: {
        id: '55555555-5555-4555-8555-555555555555',
        translationResourceId: resource.id,
        targetLocale: 'en-US',
        sourceContentHash: 'a'.repeat(64),
        sourceVersionKey: null,
        status: TranslationJobStatus.Queued,
        attemptCount: 0,
        maxAttempts: 3,
        requestedByUserId: userId,
        providerId: 'mock',
        lastErrorCode: null,
        lastErrorMessage: null,
        nextAttemptAt: null,
        lockedAt: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const result = await service.requestTranslation({
      userId,
      translationResourceId: resource.id,
      targetLocale: 'en-US',
    });

    expect(result.httpStatus).toBe(201);
    expect(result.kind).toBe('queued');
  });

  it('returns 200 when queue short-circuits to an existing revision', async () => {
    translationJobService.queueTranslation.mockResolvedValue({
      kind: 'short_circuit_revision',
      revision: {
        id: '66666666-6666-4666-8666-666666666666',
        translationResourceId: resource.id,
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
        approvedByUserId: userId,
        createdAt: new Date(),
        approvedAt: new Date(),
      },
    });

    const result = await service.requestTranslation({
      userId,
      translationResourceId: resource.id,
      targetLocale: 'en-US',
    });

    expect(result.httpStatus).toBe(200);
    expect(result.kind).toBe('short_circuit_revision');
  });

  it('rejects bulk requests above the configured limit', async () => {
    const ids = Array.from(
      { length: LOCALIZATION_BULK_MAX_RESOURCES + 1 },
      (_value, index) => `77777777-7777-4777-8777-${String(index).padStart(12, '0')}`,
    );

    await expect(
      service.bulkRequestTranslation({
        userId,
        translationResourceIds: ids,
        targetLocale: 'en-US',
      }),
    ).rejects.toBeInstanceOf(LocalizationBulkLimitExceededError);
  });
});
