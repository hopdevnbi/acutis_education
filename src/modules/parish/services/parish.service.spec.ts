import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Brackets, QueryFailedError, type Repository, type SelectQueryBuilder } from 'typeorm';
import { ParishEntity } from '../entities/parish.entity';
import { ParishStatus } from '../enums/parish-status.enum';
import {
  InvalidParishIdError,
  ParishCodeAlreadyExistsError,
  ParishInactiveError,
  ParishNotFoundError,
} from '../errors/parish.errors';
import { ParishService } from './parish.service';

describe('ParishService', () => {
  let parishService: ParishService;
  let parishRepository: jest.Mocked<
    Pick<Repository<ParishEntity>, 'create' | 'save' | 'findOne' | 'createQueryBuilder'>
  >;
  let queryBuilder: jest.Mocked<
    Pick<
      SelectQueryBuilder<ParishEntity>,
      'andWhere' | 'orderBy' | 'skip' | 'take' | 'getCount' | 'getMany'
    >
  >;

  const parishId = '11111111-1111-4111-8111-111111111111';

  beforeEach(async () => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    };

    parishRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ParishService,
        {
          provide: getRepositoryToken(ParishEntity),
          useValue: parishRepository,
        },
      ],
    }).compile();

    parishService = moduleRef.get(ParishService);
  });

  it('creates a parish with normalized code and safe snapshot', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const updatedAt = new Date('2026-01-01T00:00:00.000Z');
    const savedParish = {
      id: parishId,
      code: 'giao-xu-thanh-gia',
      name: 'Giáo xứ Thánh Gia',
      status: ParishStatus.Active,
      createdAt,
      updatedAt,
    } satisfies ParishEntity;

    parishRepository.create.mockReturnValue(savedParish);
    parishRepository.save.mockResolvedValue(savedParish);

    const snapshot = await parishService.createParish({
      code: '  Giao-Xu-Thanh-Gia  ',
      name: '  Giáo xứ Thánh Gia  ',
    });

    expect(parishRepository.create).toHaveBeenCalledWith({
      code: 'giao-xu-thanh-gia',
      name: 'Giáo xứ Thánh Gia',
      status: ParishStatus.Active,
    });
    expect(snapshot).toEqual({
      id: parishId,
      code: 'giao-xu-thanh-gia',
      name: 'Giáo xứ Thánh Gia',
      status: ParishStatus.Active,
      createdAt,
      updatedAt,
    });
  });

  it('maps duplicate parish code persistence failures to ParishCodeAlreadyExistsError', async () => {
    parishRepository.create.mockReturnValue({
      id: parishId,
      code: 'duplicate-code',
      name: 'Duplicate Parish',
      status: ParishStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies ParishEntity);

    const duplicateKeyError = new QueryFailedError('INSERT', [], new Error('duplicate key'));
    Object.assign(duplicateKeyError, { driverError: { number: 2627 } });
    parishRepository.save.mockRejectedValue(duplicateKeyError);

    await expect(
      parishService.createParish({
        code: 'duplicate-code',
        name: 'Duplicate Parish',
      }),
    ).rejects.toBeInstanceOf(ParishCodeAlreadyExistsError);
  });

  it('returns a parish snapshot by id', async () => {
    parishRepository.findOne.mockResolvedValue({
      id: parishId,
      code: 'sample-parish',
      name: 'Sample Parish',
      status: ParishStatus.Active,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies ParishEntity);

    const snapshot = await parishService.getParishById(parishId);

    expect(snapshot.id).toBe(parishId);
    expect(snapshot.code).toBe('sample-parish');
  });

  it('throws ParishNotFoundError when parish id does not exist', async () => {
    parishRepository.findOne.mockResolvedValue(null);

    await expect(parishService.getParishById(parishId)).rejects.toBeInstanceOf(ParishNotFoundError);
  });

  it('throws InvalidParishIdError for malformed ids', async () => {
    await expect(parishService.getParishById('not-a-uuid')).rejects.toBeInstanceOf(
      InvalidParishIdError,
    );
  });

  it('updates parish code and name', async () => {
    const parish = {
      id: parishId,
      code: 'old-code',
      name: 'Old Name',
      status: ParishStatus.Active,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies ParishEntity;

    parishRepository.findOne.mockResolvedValue(parish);
    parishRepository.save.mockImplementation((entity) => Promise.resolve(entity as ParishEntity));

    const snapshot = await parishService.updateParish(parishId, {
      code: 'new-code',
      name: 'New Name',
    });

    expect(snapshot.code).toBe('new-code');
    expect(snapshot.name).toBe('New Name');
  });

  it('updates parish status', async () => {
    const parish = {
      id: parishId,
      code: 'sample-parish',
      name: 'Sample Parish',
      status: ParishStatus.Active,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies ParishEntity;

    parishRepository.findOne.mockResolvedValue(parish);
    parishRepository.save.mockImplementation((entity) => Promise.resolve(entity as ParishEntity));

    const snapshot = await parishService.updateParishStatus(parishId, ParishStatus.Inactive);

    expect(snapshot.status).toBe(ParishStatus.Inactive);
  });

  it('assertParishActive returns snapshot for active parishes', async () => {
    parishRepository.findOne.mockResolvedValue({
      id: parishId,
      code: 'active-parish',
      name: 'Active Parish',
      status: ParishStatus.Active,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies ParishEntity);

    const snapshot = await parishService.assertParishActive(parishId);

    expect(snapshot.status).toBe(ParishStatus.Active);
  });

  it('assertParishActive rejects inactive parishes', async () => {
    parishRepository.findOne.mockResolvedValue({
      id: parishId,
      code: 'inactive-parish',
      name: 'Inactive Parish',
      status: ParishStatus.Inactive,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    } satisfies ParishEntity);

    await expect(parishService.assertParishActive(parishId)).rejects.toBeInstanceOf(
      ParishInactiveError,
    );
  });

  it('lists parishes using query builder filters and pagination', async () => {
    queryBuilder.getCount.mockResolvedValue(1);
    queryBuilder.getMany.mockResolvedValue([
      {
        id: parishId,
        code: 'listed-parish',
        name: 'Listed Parish',
        status: ParishStatus.Active,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      } satisfies ParishEntity,
    ]);

    const result = await parishService.listParishes({
      page: 1,
      limit: 20,
      sortBy: 'name',
      sort: 'ASC',
      status: ParishStatus.Active,
      search: 'listed',
    });

    expect(parishRepository.createQueryBuilder).toHaveBeenCalledWith('parish');
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('parish.status = :status', {
      status: ParishStatus.Active,
    });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(expect.any(Brackets));
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
