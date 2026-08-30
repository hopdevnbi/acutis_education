import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ParishMembershipEntity } from '../entities/parish-membership.entity';
import { ParishMembershipStatus } from '../enums/parish-membership-status.enum';
import { ParishScopeAccessDeniedError } from '../errors/parish-scope.errors';
import { ParishScopeService } from './parish-scope.service';

describe('ParishScopeService', () => {
  let parishScopeService: ParishScopeService;
  let parishMembershipRepository: jest.Mocked<
    Pick<Repository<ParishMembershipEntity>, 'findOne' | 'find' | 'count'>
  >;
  let accessControlService: jest.Mocked<Pick<AccessControlService, 'getRolesForUser'>>;

  const userId = '11111111-1111-4111-8111-111111111111';
  const parishId = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    parishMembershipRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    accessControlService = {
      getRolesForUser: jest.fn().mockResolvedValue([]),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ParishScopeService,
        {
          provide: getRepositoryToken(ParishMembershipEntity),
          useValue: parishMembershipRepository,
        },
        { provide: AccessControlService, useValue: accessControlService },
      ],
    }).compile();

    parishScopeService = moduleRef.get(ParishScopeService);
  });

  it('allows super admins to manage any parish', async () => {
    accessControlService.getRolesForUser.mockResolvedValue([
      {
        id: '33333333-3333-4333-8333-333333333333',
        code: 'SUPER_ADMIN',
        name: 'Super Admin',
        description: null,
      },
    ]);

    await expect(
      parishScopeService.assertCanManageParish(userId, parishId),
    ).resolves.toBeUndefined();
  });

  it('allows parish members to manage their parish', async () => {
    parishMembershipRepository.findOne.mockResolvedValue({
      id: '44444444-4444-4444-8444-444444444444',
      parishId,
      userId,
      status: ParishMembershipStatus.Active,
      joinedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      parishScopeService.assertCanManageParish(userId, parishId),
    ).resolves.toBeUndefined();
  });

  it('denies parish management without membership evidence', async () => {
    parishMembershipRepository.findOne.mockResolvedValue(null);

    await expect(parishScopeService.assertCanManageParish(userId, parishId)).rejects.toBeInstanceOf(
      ParishScopeAccessDeniedError,
    );
  });
});
