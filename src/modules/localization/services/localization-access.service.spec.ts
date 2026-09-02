import { Test, type TestingModule } from '@nestjs/testing';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ParishScopeService } from '../../parish/services/parish-scope.service';
import {
  LOCALIZATION_MANAGE_PERMISSION,
  LOCALIZATION_READ_PERMISSION,
} from '../constants/localization-permissions.constants';
import { LocalizationAccessDeniedError } from '../errors/localization-admin.errors';
import type { TranslationResourceSnapshot } from '../interfaces/localization.interface';
import { TranslationResourceType } from '../enums/translation-resource-type.enum';
import { LocalizationAccessService } from './localization-access.service';

describe('LocalizationAccessService', () => {
  let service: LocalizationAccessService;
  let parishScopeService: jest.Mocked<
    Pick<
      ParishScopeService,
      'isSuperAdmin' | 'listActiveParishIdsForMember' | 'hasActiveParishMembership'
    >
  >;
  let accessControlService: jest.Mocked<Pick<AccessControlService, 'userHasPermission'>>;

  const userId = '11111111-1111-4111-8111-111111111111';
  const parishId = '22222222-2222-4222-8222-222222222222';
  const resource: TranslationResourceSnapshot = {
    id: '33333333-3333-4333-8333-333333333333',
    resourceType: TranslationResourceType.CurriculumMetadata,
    resourceId: '44444444-4444-4444-8444-444444444444',
    parishId,
    sourceLocale: 'vi-VN',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    parishScopeService = {
      isSuperAdmin: jest.fn().mockResolvedValue(false),
      listActiveParishIdsForMember: jest.fn().mockResolvedValue([parishId]),
      hasActiveParishMembership: jest.fn().mockResolvedValue(true),
    };

    accessControlService = {
      userHasPermission: jest.fn().mockResolvedValue(false),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        LocalizationAccessService,
        { provide: ParishScopeService, useValue: parishScopeService },
        { provide: AccessControlService, useValue: accessControlService },
      ],
    }).compile();

    service = moduleRef.get(LocalizationAccessService);
  });

  it('allows read when user has localization.read and parish membership', async () => {
    accessControlService.userHasPermission.mockImplementation((_userId, permission) => {
      return Promise.resolve(permission === LOCALIZATION_READ_PERMISSION);
    });

    await expect(service.assertCanReadResource(userId, resource)).resolves.toBeUndefined();
  });

  it('denies manage without localization.manage permission', async () => {
    accessControlService.userHasPermission.mockImplementation((_userId, permission) => {
      return Promise.resolve(permission === LOCALIZATION_READ_PERMISSION);
    });

    await expect(service.assertCanManageResource(userId, resource)).rejects.toBeInstanceOf(
      LocalizationAccessDeniedError,
    );
  });

  it('denies approve without localization.approve permission', async () => {
    accessControlService.userHasPermission.mockImplementation((_userId, permission) => {
      return Promise.resolve(permission === LOCALIZATION_MANAGE_PERMISSION);
    });

    await expect(service.assertCanApproveResource(userId, resource)).rejects.toBeInstanceOf(
      LocalizationAccessDeniedError,
    );
  });

  it('forces parish admin scope to own parishes', async () => {
    parishScopeService.listActiveParishIdsForMember.mockResolvedValue([parishId]);

    const parishIds = await service.resolveListParishScope(userId, undefined);

    expect(parishIds).toEqual([parishId]);
  });

  it('denies cross-parish explicit filter for parish admin', async () => {
    await expect(
      service.resolveListParishScope(userId, '99999999-9999-4999-8999-999999999999'),
    ).rejects.toBeInstanceOf(LocalizationAccessDeniedError);
  });
});
