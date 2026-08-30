import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError, type Repository } from 'typeorm';
import { UserAccountService } from '../../users/services/user-account.service';
import { StudentEntity } from '../entities/student.entity';
import { StudentStatus } from '../enums/student-status.enum';
import {
  StudentNotFoundError,
  StudentUpdateRequiresFieldsError,
  StudentUserAlreadyLinkedError,
} from '../errors/student.errors';
import { StudentService } from './student.service';

describe('StudentService', () => {
  let studentService: StudentService;
  let studentRepository: jest.Mocked<
    Pick<Repository<StudentEntity>, 'create' | 'save' | 'findOne' | 'find' | 'createQueryBuilder'>
  >;
  let userAccountService: jest.Mocked<Pick<UserAccountService, 'getAccountSnapshotById'>>;

  const studentId = '44444444-4444-4444-8444-444444444444';

  beforeEach(async () => {
    studentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    userAccountService = {
      getAccountSnapshotById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        StudentService,
        { provide: getRepositoryToken(StudentEntity), useValue: studentRepository },
        { provide: UserAccountService, useValue: userAccountService },
      ],
    }).compile();

    studentService = moduleRef.get(StudentService);
  });

  it('creates an active student profile', async () => {
    const entity = {
      id: studentId,
      userId: null,
      fullName: 'Nguyễn Văn An',
      status: StudentStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies StudentEntity;

    studentRepository.create.mockReturnValue(entity);
    studentRepository.save.mockResolvedValue(entity);

    const snapshot = await studentService.createStudent({ fullName: 'Nguyễn Văn An' });

    expect(snapshot.status).toBe(StudentStatus.Active);
    expect(snapshot.fullName).toBe('Nguyễn Văn An');
  });

  it('requires at least one field for update', async () => {
    await expect(studentService.updateStudent(studentId, {})).rejects.toBeInstanceOf(
      StudentUpdateRequiresFieldsError,
    );
  });

  it('maps duplicate user links to StudentUserAlreadyLinkedError', async () => {
    studentRepository.findOne.mockResolvedValue({
      id: studentId,
      userId: null,
      fullName: 'Student',
      status: StudentStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies StudentEntity);
    studentRepository.save.mockRejectedValue(
      new QueryFailedError('', [], { number: 2627 } as never),
    );

    await expect(
      studentService.updateStudent(studentId, { fullName: 'Updated Name' }),
    ).rejects.toBeInstanceOf(StudentUserAlreadyLinkedError);
  });

  it('throws when student is not found', async () => {
    studentRepository.findOne.mockResolvedValue(null);

    await expect(studentService.getStudentById(studentId)).rejects.toBeInstanceOf(
      StudentNotFoundError,
    );
  });
});
