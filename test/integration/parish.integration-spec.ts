import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../../src/database/data-source';
import { ApplicationConfigModule } from '../../src/config/config.module';
import { DatabaseModule } from '../../src/database/database.module';
import { ParishStatus } from '../../src/modules/parish/enums/parish-status.enum';
import {
  ParishCodeAlreadyExistsError,
  ParishInactiveError,
  ParishNotFoundError,
} from '../../src/modules/parish/errors/parish.errors';
import { ParishModule } from '../../src/modules/parish/parish.module';
import { ParishService } from '../../src/modules/parish/services/parish.service';

const TEST_CODE_PREFIX = 'par003-int-';

describe('ParishService integration (MSSQL)', () => {
  let moduleRef: TestingModule;
  let parishService: ParishService;

  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    moduleRef = await Test.createTestingModule({
      imports: [ApplicationConfigModule, DatabaseModule, ParishModule],
    }).compile();

    parishService = moduleRef.get(ParishService);
  });

  afterEach(async () => {
    await AppDataSource.query(`
      DELETE FROM parishes
      WHERE code LIKE '${TEST_CODE_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await moduleRef.close();

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('creates a parish with normalized code and Vietnamese name', async () => {
    const snapshot = await parishService.createParish({
      code: `  ${TEST_CODE_PREFIX}vn  `.toUpperCase(),
      name: '  Giáo xứ Thánh Gia  ',
    });

    expect(snapshot.code).toBe(`${TEST_CODE_PREFIX}vn`);
    expect(snapshot.name).toBe('Giáo xứ Thánh Gia');
    expect(snapshot.status).toBe(ParishStatus.Active);
  });

  it('maps duplicate parish codes to ParishCodeAlreadyExistsError', async () => {
    const duplicateCode = `${TEST_CODE_PREFIX}duplicate`;

    await parishService.createParish({
      code: duplicateCode,
      name: 'First Parish',
    });

    await expect(
      parishService.createParish({
        code: duplicateCode,
        name: 'Second Parish',
      }),
    ).rejects.toBeInstanceOf(ParishCodeAlreadyExistsError);
  });

  it('updates parish code and name', async () => {
    const created = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}update`,
      name: 'Original Name',
    });

    const updated = await parishService.updateParish(created.id, {
      code: `${TEST_CODE_PREFIX}updated`,
      name: 'Updated Name',
    });

    expect(updated.code).toBe(`${TEST_CODE_PREFIX}updated`);
    expect(updated.name).toBe('Updated Name');
  });

  it('transitions parish status and supports reactivation', async () => {
    const created = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}status`,
      name: 'Status Parish',
    });

    const inactive = await parishService.updateParishStatus(created.id, ParishStatus.Inactive);
    expect(inactive.status).toBe(ParishStatus.Inactive);

    await expect(parishService.assertParishActive(created.id)).rejects.toBeInstanceOf(
      ParishInactiveError,
    );

    const reactivated = await parishService.updateParishStatus(created.id, ParishStatus.Active);
    expect(reactivated.status).toBe(ParishStatus.Active);

    const activeSnapshot = await parishService.assertParishActive(created.id);
    expect(activeSnapshot.id).toBe(created.id);
  });

  it('lists parishes with pagination, status filter, and search', async () => {
    await parishService.createParish({
      code: `${TEST_CODE_PREFIX}alpha`,
      name: 'Alpha Parish',
    });
    const inactive = await parishService.createParish({
      code: `${TEST_CODE_PREFIX}beta`,
      name: 'Beta Parish',
    });
    await parishService.updateParishStatus(inactive.id, ParishStatus.Inactive);

    const activeResults = await parishService.listParishes({
      page: 1,
      limit: 10,
      sortBy: 'name',
      sort: 'ASC',
      status: ParishStatus.Active,
      search: TEST_CODE_PREFIX,
    });

    expect(activeResults.items.some((item) => item.code === `${TEST_CODE_PREFIX}alpha`)).toBe(true);
    expect(activeResults.items.some((item) => item.code === `${TEST_CODE_PREFIX}beta`)).toBe(false);

    const searchResults = await parishService.listParishes({
      page: 1,
      limit: 10,
      sortBy: 'code',
      sort: 'DESC',
      search: 'beta',
    });

    expect(searchResults.items.some((item) => item.code === `${TEST_CODE_PREFIX}beta`)).toBe(true);
  });

  it('throws ParishNotFoundError for missing parishes', async () => {
    await expect(
      parishService.getParishById('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'),
    ).rejects.toBeInstanceOf(ParishNotFoundError);
  });
});
