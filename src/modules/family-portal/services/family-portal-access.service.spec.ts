import { Test, type TestingModule } from '@nestjs/testing';
import {
  CATECHIST_ROLE_CODE,
  PARENT_ROLE_CODE,
} from '../../access-control/constants/role-codes.constants';
import { AccessControlService } from '../../access-control/services/access-control.service';
import { ClassCatechistAssignmentService } from '../../class/services/class-catechist-assignment.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
import { ActorNotCatechistError, ActorNotParentError } from '../errors/family-portal.errors';
import { FamilyPortalAccessService } from './family-portal-access.service';

describe('FamilyPortalAccessService', () => {
  let familyPortalAccessService: FamilyPortalAccessService;
  let accessControlService: jest.Mocked<Pick<AccessControlService, 'getRolesForUser'>>;
  let classCatechistAssignmentService: jest.Mocked<
    Pick<ClassCatechistAssignmentService, 'assertCatechistAssigned'>
  >;
  let studentGuardianService: jest.Mocked<Pick<StudentGuardianService, 'assertGuardianLinked'>>;

  const actorUserId = '11111111-1111-4111-8111-111111111111';
  const classId = '22222222-2222-4222-8222-222222222222';
  const studentId = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    accessControlService = {
      getRolesForUser: jest.fn(),
    };
    classCatechistAssignmentService = {
      assertCatechistAssigned: jest.fn(),
    };
    studentGuardianService = {
      assertGuardianLinked: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyPortalAccessService,
        { provide: AccessControlService, useValue: accessControlService },
        {
          provide: ClassCatechistAssignmentService,
          useValue: classCatechistAssignmentService,
        },
        { provide: StudentGuardianService, useValue: studentGuardianService },
      ],
    }).compile();

    familyPortalAccessService = moduleRef.get(FamilyPortalAccessService);
  });

  it('rejects non-catechist actors', async () => {
    accessControlService.getRolesForUser.mockResolvedValue([
      {
        id: '44444444-4444-4444-8444-444444444444',
        code: PARENT_ROLE_CODE,
        name: 'Parent',
        description: null,
      },
    ]);

    await expect(
      familyPortalAccessService.assertCatechistActor(actorUserId),
    ).rejects.toBeInstanceOf(ActorNotCatechistError);
  });

  it('allows catechist actors', async () => {
    accessControlService.getRolesForUser.mockResolvedValue([
      {
        id: '44444444-4444-4444-8444-444444444444',
        code: CATECHIST_ROLE_CODE,
        name: 'Catechist',
        description: null,
      },
    ]);

    await expect(
      familyPortalAccessService.assertCatechistActor(actorUserId),
    ).resolves.toBeUndefined();
  });

  it('rejects non-parent actors', async () => {
    accessControlService.getRolesForUser.mockResolvedValue([
      {
        id: '44444444-4444-4444-8444-444444444444',
        code: CATECHIST_ROLE_CODE,
        name: 'Catechist',
        description: null,
      },
    ]);

    await expect(familyPortalAccessService.assertParentActor(actorUserId)).rejects.toBeInstanceOf(
      ActorNotParentError,
    );
  });

  it('asserts class assignment after catechist actor check', async () => {
    accessControlService.getRolesForUser.mockResolvedValue([
      {
        id: '44444444-4444-4444-8444-444444444444',
        code: CATECHIST_ROLE_CODE,
        name: 'Catechist',
        description: null,
      },
    ]);

    await familyPortalAccessService.assertCatechistAssignedToClass(actorUserId, classId);

    expect(classCatechistAssignmentService.assertCatechistAssigned).toHaveBeenCalledWith(
      actorUserId,
      classId,
    );
  });

  it('asserts guardian link after parent actor check', async () => {
    accessControlService.getRolesForUser.mockResolvedValue([
      {
        id: '55555555-5555-4555-8555-555555555555',
        code: PARENT_ROLE_CODE,
        name: 'Parent',
        description: null,
      },
    ]);

    await familyPortalAccessService.assertGuardianLinkedToStudent(actorUserId, studentId);

    expect(studentGuardianService.assertGuardianLinked).toHaveBeenCalledWith(
      actorUserId,
      studentId,
    );
  });
});
