import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';
import { UserAccountService } from '../../users/services/user-account.service';
import { ClassCatechistAssignmentEntity } from '../entities/class-catechist-assignment.entity';
import { CatechistAssignmentRole } from '../enums/catechist-assignment-role.enum';
import { CatechistAssignmentStatus } from '../enums/catechist-assignment-status.enum';
import {
  CatechistAssignmentAlreadyActiveError,
  InvalidCatechistAssignmentRoleError,
  InvalidCatechistAssignmentStatusTransitionError,
} from '../errors/class-catechist-assignment.errors';
import { ClassService } from './class.service';
import { ClassCatechistAssignmentService } from './class-catechist-assignment.service';

describe('ClassCatechistAssignmentService', () => {
  let classCatechistAssignmentService: ClassCatechistAssignmentService;
  let assignmentRepository: jest.Mocked<
    Pick<Repository<ClassCatechistAssignmentEntity>, 'create' | 'save' | 'findOne' | 'createQueryBuilder'>
  >;
  let classService: jest.Mocked<Pick<ClassService, 'getClassById'>>;
  let userAccountService: jest.Mocked<Pick<UserAccountService, 'getAccountSnapshotById'>>;

  const classId = '11111111-1111-4111-8111-111111111111';
  const catechistUserId = '22222222-2222-4222-8222-222222222222';
  const assignmentId = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    assignmentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    classService = {
      getClassById: jest.fn().mockResolvedValue({
        id: classId,
        parishId: '44444444-4444-4444-8444-444444444444',
        academicYearId: '55555555-5555-4555-8555-555555555555',
        catechismLevelId: '66666666-6666-4666-8666-666666666666',
        code: 'class-a',
        name: 'Class A',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    userAccountService = {
      getAccountSnapshotById: jest.fn().mockResolvedValue({
        id: catechistUserId,
        email: 'catechist@example.com',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ClassCatechistAssignmentService,
        {
          provide: getRepositoryToken(ClassCatechistAssignmentEntity),
          useValue: assignmentRepository,
        },
        { provide: ClassService, useValue: classService },
        { provide: UserAccountService, useValue: userAccountService },
      ],
    }).compile();

    classCatechistAssignmentService = moduleRef.get(ClassCatechistAssignmentService);
  });

  it('assigns an active lead catechist', async () => {
    const entity = {
      id: assignmentId,
      classId,
      catechistUserId,
      assignmentRole: CatechistAssignmentRole.Lead,
      status: CatechistAssignmentStatus.Active,
      assignedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies ClassCatechistAssignmentEntity;

    assignmentRepository.create.mockReturnValue(entity);
    assignmentRepository.save.mockResolvedValue(entity);

    const snapshot = await classCatechistAssignmentService.assignCatechist(classId, {
      catechistUserId,
      assignmentRole: CatechistAssignmentRole.Lead,
    });

    expect(snapshot.status).toBe(CatechistAssignmentStatus.Active);
  });

  it('rejects unsupported assignment roles', async () => {
    await expect(
      classCatechistAssignmentService.assignCatechist(classId, {
        catechistUserId,
        assignmentRole: 'ASSISTANT' as CatechistAssignmentRole,
      }),
    ).rejects.toBeInstanceOf(InvalidCatechistAssignmentRoleError);
  });

  it('maps duplicate active assignments to CatechistAssignmentAlreadyActiveError', async () => {
    assignmentRepository.create.mockReturnValue({} as ClassCatechistAssignmentEntity);
    assignmentRepository.save.mockRejectedValue(
      new QueryFailedError('', [], { number: 2627 } as never),
    );

    await expect(
      classCatechistAssignmentService.assignCatechist(classId, {
        catechistUserId,
        assignmentRole: CatechistAssignmentRole.Lead,
      }),
    ).rejects.toBeInstanceOf(CatechistAssignmentAlreadyActiveError);
  });

  it('rejects unsupported assignment status transitions', async () => {
    await expect(
      classCatechistAssignmentService.updateAssignmentStatus(
        assignmentId,
        CatechistAssignmentStatus.Active,
      ),
    ).rejects.toBeInstanceOf(InvalidCatechistAssignmentStatusTransitionError);
  });
});
