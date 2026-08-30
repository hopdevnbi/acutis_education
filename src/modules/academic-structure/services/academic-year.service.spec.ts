import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Brackets,
  DataSource,
  QueryFailedError,
  type Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import { ParishService } from '../../parish/services/parish.service';
import { AcademicYearEntity } from '../entities/academic-year.entity';
import { AcademicYearStatus } from '../enums/academic-year-status.enum';
import {
  AcademicYearClosedImmutableError,
  AcademicYearNotFoundError,
  InvalidAcademicYearStatusTransitionError,
} from '../errors/academic-year.errors';
import { AcademicYearService } from './academic-year.service';

describe('AcademicYearService', () => {
  let academicYearService: AcademicYearService;
  let academicYearRepository: jest.Mocked<
    Pick<Repository<AcademicYearEntity>, 'create' | 'save' | 'findOne' | 'createQueryBuilder'>
  >;
  let parishService: jest.Mocked<Pick<ParishService, 'assertParishActive' | 'getParishById'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<AcademicYearEntity>,
      'andWhere' | 'orderBy' | 'skip' | 'take' | 'getCount' | 'getMany'
    >
  >;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const academicYearId = '22222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    };

    academicYearRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    parishService = {
      assertParishActive: jest.fn().mockResolvedValue({
        id: parishId,
        code: 'parish',
        name: 'Parish',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      getParishById: jest.fn().mockResolvedValue({
        id: parishId,
        code: 'parish',
        name: 'Parish',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    dataSource = {
      transaction: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicYearService,
        {
          provide: getRepositoryToken(AcademicYearEntity),
          useValue: academicYearRepository,
        },
        {
          provide: ParishService,
          useValue: parishService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    academicYearService = moduleRef.get(AcademicYearService);
  });

  it('creates a planned academic year for an active parish', async () => {
    const savedAcademicYear = {
      id: academicYearId,
      parishId,
      name: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      status: AcademicYearStatus.Planned,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies AcademicYearEntity;

    academicYearRepository.create.mockReturnValue(savedAcademicYear);
    academicYearRepository.save.mockResolvedValue(savedAcademicYear);

    const snapshot = await academicYearService.createAcademicYear(parishId, {
      name: '  2026-2027  ',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
    });

    expect(parishService.assertParishActive).toHaveBeenCalledWith(parishId);
    expect(snapshot.status).toBe(AcademicYearStatus.Planned);
    expect(snapshot.name).toBe('2026-2027');
  });

  it('throws when updating a closed academic year', async () => {
    academicYearRepository.findOne.mockResolvedValue({
      id: academicYearId,
      parishId,
      name: '2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-06-30',
      status: AcademicYearStatus.Closed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      academicYearService.updateAcademicYear(academicYearId, { name: 'Updated' }),
    ).rejects.toBeInstanceOf(AcademicYearClosedImmutableError);
  });

  it('rejects invalid status transitions', async () => {
    academicYearRepository.findOne.mockResolvedValue({
      id: academicYearId,
      parishId,
      name: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      status: AcademicYearStatus.Planned,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      academicYearService.updateAcademicYearStatus(academicYearId, AcademicYearStatus.Closed),
    ).rejects.toBeInstanceOf(InvalidAcademicYearStatusTransitionError);
  });

  it('throws when academic year is missing', async () => {
    academicYearRepository.findOne.mockResolvedValue(null);

    await expect(academicYearService.getAcademicYearById(academicYearId)).rejects.toBeInstanceOf(
      AcademicYearNotFoundError,
    );
  });

  it('maps duplicate academic year names to AcademicYearAlreadyExistsError', async () => {
    const savedAcademicYear = {
      id: academicYearId,
      parishId,
      name: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      status: AcademicYearStatus.Planned,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies AcademicYearEntity;

    academicYearRepository.create.mockReturnValue(savedAcademicYear);
    academicYearRepository.save.mockRejectedValue(
      new QueryFailedError('', [], { number: 2627 } as never),
    );

    await expect(
      academicYearService.createAcademicYear(parishId, {
        name: '2026-2027',
        startDate: '2026-09-01',
        endDate: '2027-06-30',
      }),
    ).rejects.toMatchObject({ name: 'AcademicYearAlreadyExistsError' });
  });

  it('applies search filters when listing academic years', async () => {
    await academicYearService.listAcademicYearsByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'startDate',
      sort: 'DESC',
      search: '2026',
    });

    expect(queryBuilder.andWhere).toHaveBeenCalled();
    expect(queryBuilder.andWhere.mock.calls.some((call) => call[0] instanceof Brackets)).toBe(true);
  });
});
