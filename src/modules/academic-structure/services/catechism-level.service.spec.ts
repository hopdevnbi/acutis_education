import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, type Repository, type SelectQueryBuilder } from 'typeorm';
import { ParishInactiveError } from '../../parish/errors/parish.errors';
import { ParishService } from '../../parish/services/parish.service';
import { CatechismLevelEntity } from '../entities/catechism-level.entity';
import { CatechismLevelStatus } from '../enums/catechism-level-status.enum';
import { CatechismLevelNotFoundError } from '../errors/catechism-level.errors';
import { CatechismLevelService } from './catechism-level.service';

describe('CatechismLevelService', () => {
  let catechismLevelService: CatechismLevelService;
  let catechismLevelRepository: jest.Mocked<
    Pick<Repository<CatechismLevelEntity>, 'create' | 'save' | 'findOne' | 'createQueryBuilder'>
  >;
  let parishService: jest.Mocked<Pick<ParishService, 'assertParishActive' | 'getParishById'>>;
  let queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<CatechismLevelEntity>,
      'andWhere' | 'orderBy' | 'skip' | 'take' | 'getCount' | 'getMany'
    >
  >;

  const parishId = '11111111-1111-4111-8111-111111111111';
  const catechismLevelId = '33333333-3333-4333-8333-333333333333';

  beforeEach(async () => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    };

    catechismLevelRepository = {
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

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        CatechismLevelService,
        {
          provide: getRepositoryToken(CatechismLevelEntity),
          useValue: catechismLevelRepository,
        },
        {
          provide: ParishService,
          useValue: parishService,
        },
      ],
    }).compile();

    catechismLevelService = moduleRef.get(CatechismLevelService);
  });

  it('creates an active catechism level with normalized code', async () => {
    const savedLevel = {
      id: catechismLevelId,
      parishId,
      code: 'so-cap-1',
      name: 'Sơ Cấp 1',
      sortOrder: 1,
      status: CatechismLevelStatus.Active,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies CatechismLevelEntity;

    catechismLevelRepository.create.mockReturnValue(savedLevel);
    catechismLevelRepository.save.mockResolvedValue(savedLevel);

    const snapshot = await catechismLevelService.createCatechismLevel(parishId, {
      code: '  So-Cap-1  ',
      name: '  Sơ Cấp 1  ',
      sortOrder: 1,
    });

    expect(snapshot.code).toBe('so-cap-1');
    expect(snapshot.status).toBe(CatechismLevelStatus.Active);
  });

  it('allows deactivation when parish is inactive', async () => {
    const existingLevel = {
      id: catechismLevelId,
      parishId,
      code: 'so-cap-1',
      name: 'Sơ Cấp 1',
      sortOrder: 1,
      status: CatechismLevelStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies CatechismLevelEntity;

    catechismLevelRepository.findOne.mockResolvedValue(existingLevel);
    catechismLevelRepository.save.mockResolvedValue({
      ...existingLevel,
      status: CatechismLevelStatus.Inactive,
    });

    const snapshot = await catechismLevelService.updateCatechismLevelStatus(
      catechismLevelId,
      CatechismLevelStatus.Inactive,
    );

    expect(parishService.assertParishActive).not.toHaveBeenCalled();
    expect(snapshot.status).toBe(CatechismLevelStatus.Inactive);
  });

  it('requires an active parish when reactivating a level', async () => {
    const existingLevel = {
      id: catechismLevelId,
      parishId,
      code: 'so-cap-1',
      name: 'Sơ Cấp 1',
      sortOrder: 1,
      status: CatechismLevelStatus.Inactive,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies CatechismLevelEntity;

    catechismLevelRepository.findOne.mockResolvedValue(existingLevel);
    parishService.assertParishActive.mockRejectedValue(new ParishInactiveError());

    await expect(
      catechismLevelService.updateCatechismLevelStatus(
        catechismLevelId,
        CatechismLevelStatus.Active,
      ),
    ).rejects.toBeInstanceOf(ParishInactiveError);
  });

  it('throws when catechism level is missing', async () => {
    catechismLevelRepository.findOne.mockResolvedValue(null);

    await expect(
      catechismLevelService.getCatechismLevelById(catechismLevelId),
    ).rejects.toBeInstanceOf(CatechismLevelNotFoundError);
  });

  it('maps duplicate catechism level codes to CatechismLevelCodeAlreadyExistsError', async () => {
    const savedLevel = {
      id: catechismLevelId,
      parishId,
      code: 'so-cap-1',
      name: 'Sơ Cấp 1',
      sortOrder: 1,
      status: CatechismLevelStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies CatechismLevelEntity;

    catechismLevelRepository.create.mockReturnValue(savedLevel);
    catechismLevelRepository.save.mockRejectedValue(
      new QueryFailedError('', [], { number: 2627 } as never),
    );

    await expect(
      catechismLevelService.createCatechismLevel(parishId, {
        code: 'so-cap-1',
        name: 'Sơ Cấp 1',
        sortOrder: 1,
      }),
    ).rejects.toMatchObject({ name: 'CatechismLevelCodeAlreadyExistsError' });
  });

  it('applies search filters when listing catechism levels', async () => {
    await catechismLevelService.listCatechismLevelsByParish(parishId, {
      page: 1,
      limit: 20,
      sortBy: 'sortOrder',
      sort: 'ASC',
      search: 'cap',
    });

    expect(queryBuilder.andWhere).toHaveBeenCalled();
    expect(queryBuilder.andWhere.mock.calls.some((call) => call[0] instanceof Brackets)).toBe(true);
  });
});
