import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  DataSource,
  QueryFailedError,
  type EntityManager,
  type Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import { CatechismLevelStatus } from '../../academic-structure/enums/catechism-level-status.enum';
import { CatechismLevelService } from '../../academic-structure/services/catechism-level.service';
import { ParishService } from '../../parish/services/parish.service';
import { CurriculumVersionEntity } from '../entities/curriculum-version.entity';
import { CurriculumEntity } from '../entities/curriculum.entity';
import { CurriculumStatus } from '../enums/curriculum-status.enum';
import { CurriculumVersionStatus } from '../enums/curriculum-version-status.enum';
import {
  CurriculumCodeAlreadyExistsError,
  CurriculumDraftAlreadyExistsError,
  CurriculumInactiveError,
  CurriculumNotFoundError,
  CurriculumSourceLocaleImmutableError,
  InvalidCurriculumSourceLocaleError,
} from '../errors/curriculum.errors';
import { CurriculumService } from './curriculum.service';

function mockDataSourceTransaction(
  dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>,
  entityManager: EntityManager,
): void {
  dataSource.transaction.mockImplementation(async (...args: unknown[]) => {
    const runInTransaction = args.find(
      (arg): arg is (manager: EntityManager) => Promise<unknown> => typeof arg === 'function',
    );

    if (runInTransaction === undefined) {
      throw new Error('Transaction callback missing');
    }

    return runInTransaction(entityManager);
  });
}

describe('CurriculumService', () => {
  let curriculumService: CurriculumService;
  let curriculumRepository: jest.Mocked<
    Pick<
      Repository<CurriculumEntity>,
      'create' | 'save' | 'findOne' | 'createQueryBuilder' | 'count'
    >
  >;
  let curriculumVersionRepository: jest.Mocked<
    Pick<Repository<CurriculumVersionEntity>, 'findOne' | 'count'>
  >;
  let parishService: jest.Mocked<Pick<ParishService, 'assertParishActive' | 'getParishById'>>;
  let catechismLevelService: jest.Mocked<
    Pick<CatechismLevelService, 'assertCatechismLevelBelongsToParish'>
  >;
  let dataSource: jest.Mocked<Pick<DataSource, 'transaction'>>;
  let queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<CurriculumEntity>,
      'where' | 'andWhere' | 'orderBy' | 'skip' | 'take' | 'getCount' | 'getMany'
    >
  >;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const catechismLevelId = '22222222-2222-4222-8222-222222222222';
  const curriculumId = '33333333-3333-4333-8333-333333333333';
  const versionId = '44444444-4444-4444-8444-444444444444';
  const userId = '55555555-5555-4555-8555-555555555555';

  const parishSnapshot = {
    id: parishId,
    code: 'parish',
    name: 'Parish',
    status: 'ACTIVE' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const activeCurriculum = {
    id: curriculumId,
    parishId,
    catechismLevelId,
    code: 'khai-tam',
    name: 'Khai Tam',
    description: null,
    status: CurriculumStatus.Active,
    sourceLocale: 'vi-VN',
    currentPublishedVersionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies CurriculumEntity;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    };

    curriculumRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      count: jest.fn().mockResolvedValue(0),
    };

    curriculumVersionRepository = {
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };

    parishService = {
      assertParishActive: jest.fn().mockResolvedValue(parishSnapshot),
      getParishById: jest.fn().mockResolvedValue(parishSnapshot),
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

    dataSource = {
      transaction: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CurriculumService,
        { provide: getRepositoryToken(CurriculumEntity), useValue: curriculumRepository },
        {
          provide: getRepositoryToken(CurriculumVersionEntity),
          useValue: curriculumVersionRepository,
        },
        { provide: ParishService, useValue: parishService },
        { provide: CatechismLevelService, useValue: catechismLevelService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    curriculumService = moduleRef.get(CurriculumService);
  });

  it('creates a curriculum with normalized source locale', async () => {
    const savedCurriculum = {
      ...activeCurriculum,
      code: 'khai-tam',
      name: 'Khai Tam',
      sourceLocale: 'vi-VN',
    } satisfies CurriculumEntity;

    curriculumRepository.create.mockReturnValue(savedCurriculum);
    curriculumRepository.save.mockResolvedValue(savedCurriculum);

    const snapshot = await curriculumService.createCurriculum(parishId, {
      catechismLevelId,
      code: '  Khai-Tam  ',
      name: '  Khai Tam  ',
      sourceLocale: ' vi-vn ',
    });

    expect(snapshot.sourceLocale).toBe('vi-VN');
    expect(snapshot.code).toBe('khai-tam');
    expect(snapshot.status).toBe(CurriculumStatus.Active);
  });

  it('rejects curriculum creation with invalid source locale', async () => {
    await expect(
      curriculumService.createCurriculum(parishId, {
        catechismLevelId,
        code: 'khai-tam',
        name: 'Khai Tam',
        sourceLocale: '123',
      }),
    ).rejects.toBeInstanceOf(InvalidCurriculumSourceLocaleError);
  });

  it('maps duplicate curriculum code to CurriculumCodeAlreadyExistsError', async () => {
    curriculumRepository.create.mockReturnValue({
      ...activeCurriculum,
      code: 'dup-code',
    });
    curriculumRepository.save.mockRejectedValue(
      new QueryFailedError('', [], { number: 2627 } as never),
    );

    await expect(
      curriculumService.createCurriculum(parishId, {
        catechismLevelId,
        code: 'dup-code',
        name: 'Duplicate',
        sourceLocale: 'vi-VN',
      }),
    ).rejects.toBeInstanceOf(CurriculumCodeAlreadyExistsError);
  });

  it('rejects source locale updates after a published version exists', async () => {
    curriculumRepository.findOne.mockResolvedValue({
      ...activeCurriculum,
      currentPublishedVersionId: versionId,
    });

    await expect(
      curriculumService.updateCurriculum(curriculumId, { sourceLocale: 'en-US' }),
    ).rejects.toBeInstanceOf(CurriculumSourceLocaleImmutableError);
  });

  it('creates the first draft version as version 1', async () => {
    const savedVersion = {
      id: versionId,
      curriculumId,
      versionNumber: 1,
      status: CurriculumVersionStatus.Draft,
      label: 'Initial draft',
      publishedAt: null,
      publishedByUserId: null,
      createdByUserId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies CurriculumVersionEntity;

    const versionQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ maxVersionNumber: null }),
    };

    const entityManager = {
      findOne: jest.fn().mockResolvedValueOnce(activeCurriculum).mockResolvedValueOnce(null),
      createQueryBuilder: jest.fn().mockReturnValue(versionQueryBuilder),
      create: jest.fn().mockReturnValue(savedVersion),
      save: jest.fn().mockResolvedValue(savedVersion),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    const snapshot = await curriculumService.createDraftVersion(curriculumId, {
      label: 'Initial draft',
      createdByUserId: userId,
    });

    expect(snapshot.versionNumber).toBe(1);
    expect(snapshot.status).toBe(CurriculumVersionStatus.Draft);
  });

  it('rejects a second draft when one already exists', async () => {
    const existingDraft = {
      id: versionId,
      curriculumId,
      versionNumber: 1,
      status: CurriculumVersionStatus.Draft,
      label: null,
      publishedAt: null,
      publishedByUserId: null,
      createdByUserId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies CurriculumVersionEntity;

    const entityManager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(activeCurriculum)
        .mockResolvedValueOnce(existingDraft),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      curriculumService.createDraftVersion(curriculumId, {
        createdByUserId: userId,
      }),
    ).rejects.toBeInstanceOf(CurriculumDraftAlreadyExistsError);
  });

  it('rejects draft creation for inactive curricula', async () => {
    const entityManager = {
      findOne: jest.fn().mockResolvedValue({
        ...activeCurriculum,
        status: CurriculumStatus.Inactive,
      }),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as EntityManager;

    mockDataSourceTransaction(dataSource, entityManager);

    await expect(
      curriculumService.createDraftVersion(curriculumId, {
        createdByUserId: userId,
      }),
    ).rejects.toBeInstanceOf(CurriculumInactiveError);
  });

  it('returns a curriculum snapshot by id', async () => {
    curriculumRepository.findOne.mockResolvedValue(activeCurriculum);

    const snapshot = await curriculumService.getCurriculumById(curriculumId);

    expect(snapshot.id).toBe(curriculumId);
    expect(snapshot.name).toBe('Khai Tam');
  });

  it('throws CurriculumNotFoundError when curriculum is missing', async () => {
    curriculumRepository.findOne.mockResolvedValue(null);

    await expect(curriculumService.getCurriculumById(curriculumId)).rejects.toBeInstanceOf(
      CurriculumNotFoundError,
    );
  });

  it('lists curricula with pagination metadata', async () => {
    queryBuilder.getCount.mockResolvedValue(1);
    queryBuilder.getMany.mockResolvedValue([activeCurriculum]);

    const result = await curriculumService.listCurriculaByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'name',
      sort: 'ASC',
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(parishService.getParishById).toHaveBeenCalledWith(parishId);
  });
});
