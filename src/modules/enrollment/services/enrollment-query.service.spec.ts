import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, type Repository } from 'typeorm';
import { EnrollmentEntity } from '../entities/enrollment.entity';
import { EnrollmentStatus } from '../enums/enrollment-status.enum';
import { toEnrollmentSnapshot } from '../mappers/enrollment.mapper';
import { EnrollmentQueryService } from './enrollment-query.service';

describe('EnrollmentQueryService batch helpers', () => {
  let enrollmentQueryService: EnrollmentQueryService;
  let enrollmentRepository: jest.Mocked<Pick<Repository<EnrollmentEntity>, 'find'>>;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const enrollmentId = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    enrollmentRepository = {
      find: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentQueryService,
        { provide: getRepositoryToken(EnrollmentEntity), useValue: enrollmentRepository },
      ],
    }).compile();

    enrollmentQueryService = moduleRef.get(EnrollmentQueryService);
  });

  it('returns empty list for empty student id input', async () => {
    const snapshots = await enrollmentQueryService.listActiveEnrollmentsByStudentIds([]);

    expect(snapshots).toEqual([]);
    expect(enrollmentRepository.find).not.toHaveBeenCalled();
  });

  it('returns no enrollment snapshots without querying for empty input', async () => {
    await expect(enrollmentQueryService.getEnrollmentSnapshotsByIds([])).resolves.toEqual([]);

    expect(enrollmentRepository.find).not.toHaveBeenCalled();
  });

  it('deduplicates enrollment snapshot IDs before querying', async () => {
    enrollmentRepository.find.mockResolvedValue([]);

    await enrollmentQueryService.getEnrollmentSnapshotsByIds([enrollmentId, enrollmentId]);

    expect(enrollmentRepository.find).toHaveBeenCalledWith({
      where: { id: In([enrollmentId]) },
    });
  });

  it('loads active enrollments in one bounded query', async () => {
    const enrolledAt = new Date('2026-01-01T00:00:00.000Z');
    const enrollmentEntity = {
      id: enrollmentId,
      studentId,
      classId: '33333333-3333-4333-8333-333333333333',
      parishId: '44444444-4444-4444-8444-444444444444',
      academicYearId: '55555555-5555-4555-8555-555555555555',
      status: EnrollmentStatus.Active,
      enrolledAt,
      leftAt: null,
      createdAt: enrolledAt,
      updatedAt: enrolledAt,
    } as EnrollmentEntity;

    enrollmentRepository.find.mockResolvedValue([enrollmentEntity]);

    const snapshots = await enrollmentQueryService.listActiveEnrollmentsByStudentIds([
      studentId,
      studentId,
    ]);

    expect(enrollmentRepository.find).toHaveBeenCalledTimes(1);
    expect(enrollmentRepository.find).toHaveBeenCalledWith({
      where: {
        studentId: In([studentId]),
        status: EnrollmentStatus.Active,
      },
      order: { enrolledAt: 'DESC', id: 'ASC' },
    });
    expect(snapshots).toEqual([toEnrollmentSnapshot(enrollmentEntity)]);
  });
});
