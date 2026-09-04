import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, QueryFailedError, type Repository, type SelectQueryBuilder } from 'typeorm';
import { AcademicYearStatus } from '../../academic-structure/enums/academic-year-status.enum';
import { AcademicYearDoesNotBelongToParishError } from '../../academic-structure/errors/academic-year.errors';
import { AcademicYearService } from '../../academic-structure/services/academic-year.service';
import { CatechismLevelStatus } from '../../academic-structure/enums/catechism-level-status.enum';
import { CatechismLevelService } from '../../academic-structure/services/catechism-level.service';
import { ParishService } from '../../parish/services/parish.service';
import { ClassEntity } from '../entities/class.entity';
import { ClassStatus } from '../enums/class-status.enum';
import {
  ClassAcademicYearNotOperationalError,
  ClassCodeAlreadyExistsError,
  ClassImmutableError,
  ClassNotFoundError,
  InvalidClassStatusTransitionError,
} from '../errors/class.errors';
import { ClassService } from './class.service';

describe('ClassService', () => {
  let classService: ClassService;
  let classRepository: jest.Mocked<
    Pick<Repository<ClassEntity>, 'create' | 'save' | 'find' | 'findOne' | 'createQueryBuilder'>
  >;
  let parishService: jest.Mocked<Pick<ParishService, 'assertParishActive' | 'getParishById'>>;
  let academicYearService: jest.Mocked<
    Pick<AcademicYearService, 'assertAcademicYearBelongsToParish'>
  >;
  let catechismLevelService: jest.Mocked<
    Pick<CatechismLevelService, 'assertCatechismLevelBelongsToParish'>
  >;
  let queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<ClassEntity>,
      'andWhere' | 'orderBy' | 'skip' | 'take' | 'getCount' | 'getMany'
    >
  >;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const academicYearId = '22222222-2222-4222-8222-222222222222';
  const catechismLevelId = '33333333-3333-4333-8333-333333333333';
  const classId = '44444444-4444-4444-8444-444444444444';

  const parishSnapshot = {
    id: parishId,
    code: 'parish',
    name: 'Parish',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    };

    classRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    parishService = {
      assertParishActive: jest.fn().mockResolvedValue(parishSnapshot),
      getParishById: jest.fn().mockResolvedValue(parishSnapshot),
    };

    academicYearService = {
      assertAcademicYearBelongsToParish: jest.fn().mockResolvedValue({
        id: academicYearId,
        parishId,
        name: '2026-2027',
        startDate: '2026-09-01',
        endDate: '2027-06-30',
        status: AcademicYearStatus.Planned,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    catechismLevelService = {
      assertCatechismLevelBelongsToParish: jest.fn().mockResolvedValue({
        id: catechismLevelId,
        parishId,
        code: 'level-1',
        name: 'Level 1',
        sortOrder: 1,
        status: CatechismLevelStatus.Active,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        { provide: getRepositoryToken(ClassEntity), useValue: classRepository },
        { provide: ParishService, useValue: parishService },
        { provide: AcademicYearService, useValue: academicYearService },
        { provide: CatechismLevelService, useValue: catechismLevelService },
      ],
    }).compile();

    classService = moduleRef.get(ClassService);
  });

  it('returns no class snapshots without querying for empty input', async () => {
    await expect(classService.getClassSnapshotsByIds([])).resolves.toEqual([]);

    expect(classRepository.find).not.toHaveBeenCalled();
  });

  it('deduplicates class snapshot IDs and preserves first-requested order', async () => {
    const secondClassId = '44444444-4444-4444-8444-444444444443';
    const now = new Date('2026-01-01T00:00:00.000Z');
    const classEntities = [classId, secondClassId].map(
      (id, index) =>
        ({
          id,
          parishId,
          academicYearId,
          catechismLevelId,
          code: `class-${String(index)}`,
          name: `Class ${String(index)}`,
          status: ClassStatus.Active,
          createdAt: now,
          updatedAt: now,
        }) satisfies ClassEntity,
    );
    classRepository.find.mockResolvedValue(classEntities);

    const snapshots = await classService.getClassSnapshotsByIds([
      secondClassId,
      classId,
      secondClassId,
    ]);

    expect(classRepository.find).toHaveBeenCalledWith({
      where: { id: In([secondClassId, classId]) },
    });
    expect(snapshots.map((snapshot) => snapshot.id)).toEqual([secondClassId, classId]);
  });

  it('creates a class as PLANNED with normalized code', async () => {
    const savedClass = {
      id: classId,
      parishId,
      academicYearId,
      catechismLevelId,
      code: 'khai-tam-a',
      name: 'Lớp Khai Tâm A',
      status: ClassStatus.Planned,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies ClassEntity;

    classRepository.create.mockReturnValue(savedClass);
    classRepository.save.mockResolvedValue(savedClass);

    const snapshot = await classService.createClass(parishId, {
      academicYearId,
      catechismLevelId,
      code: '  Khai-Tam-A  ',
      name: '  Lớp Khai Tâm A  ',
    });

    expect(snapshot.status).toBe(ClassStatus.Planned);
    expect(snapshot.code).toBe('khai-tam-a');
    expect(snapshot.name).toBe('Lớp Khai Tâm A');
  });

  it('rejects class creation when academic year is CLOSED', async () => {
    academicYearService.assertAcademicYearBelongsToParish.mockResolvedValue({
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
      classService.createClass(parishId, {
        academicYearId,
        catechismLevelId,
        code: 'class-a',
        name: 'Class A',
      }),
    ).rejects.toBeInstanceOf(ClassAcademicYearNotOperationalError);
  });

  it('maps duplicate class code to ClassCodeAlreadyExistsError', async () => {
    classRepository.create.mockReturnValue({
      id: classId,
      parishId,
      academicYearId,
      catechismLevelId,
      code: 'dup-code',
      name: 'Class',
      status: ClassStatus.Planned,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    classRepository.save.mockRejectedValue(new QueryFailedError('', [], { number: 2627 } as never));

    await expect(
      classService.createClass(parishId, {
        academicYearId,
        catechismLevelId,
        code: 'dup-code',
        name: 'Class',
      }),
    ).rejects.toBeInstanceOf(ClassCodeAlreadyExistsError);
  });

  it('activates a PLANNED class when parish, year, and level are ACTIVE', async () => {
    const plannedClass = {
      id: classId,
      parishId,
      academicYearId,
      catechismLevelId,
      code: 'class-a',
      name: 'Class A',
      status: ClassStatus.Planned,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies ClassEntity;

    classRepository.findOne.mockResolvedValue(plannedClass);
    academicYearService.assertAcademicYearBelongsToParish.mockResolvedValue({
      id: academicYearId,
      parishId,
      name: '2026-2027',
      startDate: '2026-09-01',
      endDate: '2027-06-30',
      status: AcademicYearStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    classRepository.save.mockImplementation((entity) => Promise.resolve(entity as ClassEntity));

    const snapshot = await classService.updateClassStatus(classId, ClassStatus.Active);

    expect(snapshot.status).toBe(ClassStatus.Active);
  });

  it('rejects activation when academic year is not ACTIVE', async () => {
    classRepository.findOne.mockResolvedValue({
      id: classId,
      parishId,
      academicYearId,
      catechismLevelId,
      code: 'class-a',
      name: 'Class A',
      status: ClassStatus.Planned,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      classService.updateClassStatus(classId, ClassStatus.Active),
    ).rejects.toBeInstanceOf(ClassAcademicYearNotOperationalError);
  });

  it('rejects updates for terminal classes', async () => {
    classRepository.findOne.mockResolvedValue({
      id: classId,
      parishId,
      academicYearId,
      catechismLevelId,
      code: 'class-a',
      name: 'Class A',
      status: ClassStatus.Completed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(classService.updateClass(classId, { name: 'New Name' })).rejects.toBeInstanceOf(
      ClassImmutableError,
    );
  });

  it('throws ClassNotFoundError when class is missing', async () => {
    classRepository.findOne.mockResolvedValue(null);

    await expect(classService.getClassById(classId)).rejects.toBeInstanceOf(ClassNotFoundError);
  });

  it('propagates AcademicYearDoesNotBelongToParishError from academic year service', async () => {
    academicYearService.assertAcademicYearBelongsToParish.mockRejectedValue(
      new AcademicYearDoesNotBelongToParishError(),
    );

    await expect(
      classService.createClass(parishId, {
        academicYearId,
        catechismLevelId,
        code: 'class-a',
        name: 'Class A',
      }),
    ).rejects.toBeInstanceOf(AcademicYearDoesNotBelongToParishError);
  });

  it('rejects invalid status transitions from ACTIVE to PLANNED', async () => {
    classRepository.findOne.mockResolvedValue({
      id: classId,
      parishId,
      academicYearId,
      catechismLevelId,
      code: 'class-a',
      name: 'Class A',
      status: ClassStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      classService.updateClassStatus(classId, ClassStatus.Planned),
    ).rejects.toBeInstanceOf(InvalidClassStatusTransitionError);
  });
});
