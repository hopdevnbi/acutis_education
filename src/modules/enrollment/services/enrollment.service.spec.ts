import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, type Repository } from 'typeorm';
import { ClassService } from '../../class/services/class.service';
import { StudentService } from '../../student/services/student.service';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import {
  InvalidEnrollmentStatusTransitionError,
  StudentAlreadyEnrolledInParishYearError,
} from '../errors/enrollment.errors';
import { EnrollmentService } from './enrollment.service';

describe('EnrollmentService', () => {
  let enrollmentService: EnrollmentService;
  let enrollmentRepository: jest.Mocked<
    Pick<Repository<EnrollmentEntity>, 'create' | 'save' | 'findOne' | 'createQueryBuilder'>
  >;
  let studentService: jest.Mocked<Pick<StudentService, 'assertStudentActive'>>;
  let classService: jest.Mocked<
    Pick<ClassService, 'assertClassAcceptsEnrollment' | 'getClassById'>
  >;

  const classId = '11111111-1111-4111-8111-111111111111';
  const studentId = '22222222-2222-4222-8222-222222222222';
  const enrollmentId = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    enrollmentRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    studentService = {
      assertStudentActive: jest.fn().mockResolvedValue({
        id: studentId,
        userId: null,
        fullName: 'Student',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    classService = {
      assertClassAcceptsEnrollment: jest.fn().mockResolvedValue({
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
      getClassById: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        { provide: getRepositoryToken(EnrollmentEntity), useValue: enrollmentRepository },
        { provide: StudentService, useValue: studentService },
        { provide: ClassService, useValue: classService },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    enrollmentService = moduleRef.get(EnrollmentService);
  });

  it('creates an active enrollment', async () => {
    const entity = {
      id: enrollmentId,
      studentId,
      classId,
      parishId: '44444444-4444-4444-8444-444444444444',
      academicYearId: '55555555-5555-4555-8555-555555555555',
      status: EnrollmentStatus.Active,
      enrolledAt: new Date(),
      leftAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies EnrollmentEntity;

    enrollmentRepository.create.mockReturnValue(entity);
    enrollmentRepository.save.mockResolvedValue(entity);

    const snapshot = await enrollmentService.enrollStudent(classId, studentId);

    expect(snapshot.status).toBe(EnrollmentStatus.Active);
  });

  it('maps duplicate active enrollments to StudentAlreadyEnrolledInParishYearError', async () => {
    enrollmentRepository.create.mockReturnValue({} as EnrollmentEntity);
    enrollmentRepository.save.mockRejectedValue(
      new QueryFailedError('', [], { number: 2627 } as never),
    );

    await expect(enrollmentService.enrollStudent(classId, studentId)).rejects.toBeInstanceOf(
      StudentAlreadyEnrolledInParishYearError,
    );
  });

  it('rejects unsupported enrollment status transitions', async () => {
    await expect(
      enrollmentService.updateEnrollmentStatus(enrollmentId, EnrollmentStatus.Transferred),
    ).rejects.toBeInstanceOf(InvalidEnrollmentStatusTransitionError);
  });
});
