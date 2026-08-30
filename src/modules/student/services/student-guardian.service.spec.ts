import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, type Repository } from 'typeorm';
import { UserAccountService } from '../../users/services/user-account.service';
import { StudentGuardianEntity } from '../entities/student-guardian.entity';
import { GuardianLinkStatus } from '../enums/guardian-link-status.enum';
import { GuardianRelationshipType } from '../enums/guardian-relationship-type.enum';
import {
  GuardianLinkAlreadyActiveError,
  InvalidGuardianLinkStatusTransitionError,
} from '../errors/student-guardian.errors';
import { StudentService } from './student.service';
import { StudentGuardianService } from './student-guardian.service';

describe('StudentGuardianService', () => {
  let studentGuardianService: StudentGuardianService;
  let studentGuardianRepository: jest.Mocked<
    Pick<Repository<StudentGuardianEntity>, 'create' | 'save' | 'findOne' | 'createQueryBuilder'>
  >;
  let studentService: jest.Mocked<Pick<StudentService, 'getStudentById'>>;
  let userAccountService: jest.Mocked<Pick<UserAccountService, 'getAccountSnapshotById'>>;

  const studentId = '44444444-4444-4444-8444-444444444444';
  const guardianUserId = '55555555-5555-4555-8555-555555555555';
  const linkId = '66666666-6666-4666-8666-666666666666';

  beforeEach(async () => {
    studentGuardianRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    studentService = {
      getStudentById: jest.fn().mockResolvedValue({
        id: studentId,
        userId: null,
        fullName: 'Student',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    userAccountService = {
      getAccountSnapshotById: jest.fn().mockResolvedValue({
        id: guardianUserId,
        email: 'parent@example.com',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StudentGuardianService,
        {
          provide: getRepositoryToken(StudentGuardianEntity),
          useValue: studentGuardianRepository,
        },
        { provide: StudentService, useValue: studentService },
        { provide: UserAccountService, useValue: userAccountService },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(
              async (
                callback: (manager: {
                  getRepository: () => typeof studentGuardianRepository;
                }) => Promise<unknown>,
              ) =>
                callback({
                  getRepository: () => studentGuardianRepository,
                }),
            ),
          },
        },
      ],
    }).compile();

    studentGuardianService = moduleRef.get(StudentGuardianService);
  });

  it('links a guardian to a student', async () => {
    const entity = {
      id: linkId,
      studentId,
      guardianUserId,
      relationshipType: GuardianRelationshipType.Parent,
      isPrimary: false,
      status: GuardianLinkStatus.Active,
      startsAt: new Date(),
      endsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies StudentGuardianEntity;

    studentGuardianRepository.findOne.mockResolvedValue(null);
    studentGuardianRepository.create.mockReturnValue(entity);
    studentGuardianRepository.save.mockResolvedValue(entity);

    const snapshot = await studentGuardianService.linkGuardian(studentId, {
      guardianUserId,
      relationshipType: GuardianRelationshipType.Parent,
      isPrimary: false,
    });

    expect(snapshot.guardianUserId).toBe(guardianUserId);
    expect(snapshot.status).toBe(GuardianLinkStatus.Active);
  });

  it('maps duplicate active links to GuardianLinkAlreadyActiveError', async () => {
    studentGuardianRepository.findOne.mockResolvedValue(null);
    studentGuardianRepository.create.mockReturnValue({} as StudentGuardianEntity);
    studentGuardianRepository.save.mockRejectedValue(
      new QueryFailedError('', [], { number: 2627 } as never),
    );

    await expect(
      studentGuardianService.linkGuardian(studentId, {
        guardianUserId,
        relationshipType: GuardianRelationshipType.Parent,
        isPrimary: false,
      }),
    ).rejects.toBeInstanceOf(GuardianLinkAlreadyActiveError);
  });

  it('only allows ending active guardian links', async () => {
    studentGuardianRepository.findOne.mockResolvedValue({
      id: linkId,
      studentId,
      guardianUserId,
      relationshipType: GuardianRelationshipType.Parent,
      isPrimary: true,
      status: GuardianLinkStatus.Ended,
      startsAt: new Date(),
      endsAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies StudentGuardianEntity);

    await expect(
      studentGuardianService.updateGuardianLinkStatus(linkId, GuardianLinkStatus.Ended),
    ).rejects.toBeInstanceOf(InvalidGuardianLinkStatusTransitionError);
  });
});
