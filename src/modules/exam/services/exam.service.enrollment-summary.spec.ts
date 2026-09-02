import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { EnrollmentStatus } from '../../enrollment/enums/enrollment-status.enum';
import { ExamAssignmentEntity } from '../entities/exam-assignment.entity';
import { ExamAttemptEntity } from '../entities/exam-attempt.entity';
import { ExamEntity } from '../entities/exam.entity';
import { ExamVersionEntity } from '../entities/exam-version.entity';
import { ExamVersionQuestionEntity } from '../entities/exam-version-question.entity';
import { ExamAttemptStatus } from '../enums/exam-attempt-status.enum';
import { EnrollmentService } from '../../enrollment/services/enrollment.service';
import { ParishService } from '../../parish/services/parish.service';
import { QuestionBankService } from '../../question-bank/services/question-bank.service';
import { ExamService } from './exam.service';

describe('ExamService enrollment summaries', () => {
  let examService: ExamService;
  let examAssignmentRepository: jest.Mocked<
    Pick<Repository<ExamAssignmentEntity>, 'createQueryBuilder'>
  >;
  let examAttemptRepository: jest.Mocked<Pick<Repository<ExamAttemptEntity>, 'find'>>;
  let enrollmentQueryService: jest.Mocked<
    Pick<EnrollmentQueryService, 'getEnrollmentSnapshotsByIds'>
  >;
  let enrollmentService: jest.Mocked<Pick<EnrollmentService, 'getEnrollmentById'>>;

  const enrollmentId = '11111111-1111-4111-8111-111111111111';
  const classId = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    const assignmentQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([{ classId, count: '2' }]),
    };

    examAssignmentRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(assignmentQueryBuilder),
    };
    examAttemptRepository = {
      find: jest.fn().mockResolvedValue([
        {
          enrollmentId,
          scorePercent: '90.00',
          status: ExamAttemptStatus.Graded,
          gradedAt: new Date(),
        },
        {
          enrollmentId,
          scorePercent: '70.00',
          status: ExamAttemptStatus.Graded,
          gradedAt: new Date('2025-01-01T00:00:00.000Z'),
        },
      ]),
    };
    enrollmentQueryService = {
      getEnrollmentSnapshotsByIds: jest.fn().mockResolvedValue([
        {
          id: enrollmentId,
          studentId: '33333333-3333-4333-8333-333333333333',
          classId,
          parishId: '44444444-4444-4444-8444-444444444444',
          academicYearId: '55555555-5555-4555-8555-555555555555',
          status: EnrollmentStatus.Active,
          enrolledAt: new Date(),
          leftAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    };
    enrollmentService = {
      getEnrollmentById: jest.fn().mockResolvedValue({
        id: enrollmentId,
        studentId: '33333333-3333-4333-8333-333333333333',
        classId,
        parishId: '44444444-4444-4444-8444-444444444444',
        academicYearId: '55555555-5555-4555-8555-555555555555',
        status: EnrollmentStatus.Active,
        enrolledAt: new Date(),
        leftAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: getRepositoryToken(ExamEntity), useValue: {} },
        { provide: getRepositoryToken(ExamVersionEntity), useValue: {} },
        { provide: getRepositoryToken(ExamVersionQuestionEntity), useValue: {} },
        { provide: getRepositoryToken(ExamAssignmentEntity), useValue: examAssignmentRepository },
        { provide: getRepositoryToken(ExamAttemptEntity), useValue: examAttemptRepository },
        { provide: ParishService, useValue: {} },
        { provide: EnrollmentService, useValue: enrollmentService },
        { provide: EnrollmentQueryService, useValue: enrollmentQueryService },
        { provide: QuestionBankService, useValue: {} },
      ],
    }).compile();

    examService = moduleRef.get(ExamService);
  });

  it('returns batch enrollment exam summaries without per-enrollment queries', async () => {
    const summaries = await examService.getEnrollmentExamSummariesByEnrollmentIds([enrollmentId]);

    expect(enrollmentQueryService.getEnrollmentSnapshotsByIds).toHaveBeenCalledWith([enrollmentId]);
    expect(examAttemptRepository.find).toHaveBeenCalledWith({
      where: {
        enrollmentId: In([enrollmentId]),
        status: ExamAttemptStatus.Graded,
      },
      order: { gradedAt: 'DESC' },
    });
    expect(summaries.get(enrollmentId)).toEqual({
      assignmentsAvailable: 2,
      attemptsCompleted: 2,
      latestScorePercent: '90.00',
    });
  });

  it('keeps single-enrollment summary behavior via shared builder', async () => {
    const summary = await examService.getEnrollmentExamSummary(enrollmentId);

    expect(summary).toEqual({
      assignmentsAvailable: 2,
      attemptsCompleted: 2,
      latestScorePercent: '90.00',
    });
  });
});
