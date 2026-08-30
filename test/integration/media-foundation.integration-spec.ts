import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';

const TEST_CODE_PREFIX = 'media002-';
const DUMMY_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash';
const VALID_CHECKSUM = '0123456789abcdef'.repeat(4);

async function insertUser(email: string): Promise<string> {
  const id = generateUuidV4();

  await AppDataSource.query(
    `
      INSERT INTO users (id, email, password_hash, status)
      VALUES (@0, @1, @2, @3)
    `,
    [id, email, DUMMY_PASSWORD_HASH, 'ACTIVE'],
  );

  return id;
}

interface InsertMediaAssetInput {
  id: string;
  storageProvider: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  mediaCategory: string;
  sizeBytes: number;
  checksumSha256: string;
  status: string;
  visibility: string;
  createdByUserId: string | null;
}

async function insertMediaAsset(input: InsertMediaAssetInput): Promise<string> {
  await AppDataSource.query(
    `
      INSERT INTO media_assets (
        id,
        storage_provider,
        storage_key,
        original_file_name,
        mime_type,
        media_category,
        size_bytes,
        checksum_sha256,
        status,
        visibility,
        created_by_user_id
      )
      VALUES (@0, @1, @2, @3, @4, @5, @6, @7, @8, @9, @10)
    `,
    [
      input.id,
      input.storageProvider,
      input.storageKey,
      input.originalFileName,
      input.mimeType,
      input.mediaCategory,
      input.sizeBytes,
      input.checksumSha256,
      input.status,
      input.visibility,
      input.createdByUserId,
    ],
  );

  return input.id;
}

function buildValidAssetInput(
  overrides: Partial<InsertMediaAssetInput> = {},
): InsertMediaAssetInput {
  const assetId = overrides.id ?? generateUuidV4();

  return {
    id: assetId,
    storageProvider: 'local',
    storageKey: `assets/2026/08/${assetId}`,
    originalFileName: 'lesson-photo.jpg',
    mimeType: 'image/jpeg',
    mediaCategory: 'IMAGE',
    sizeBytes: 1024,
    checksumSha256: VALID_CHECKSUM,
    status: 'PENDING',
    visibility: 'PRIVATE',
    createdByUserId: null,
    ...overrides,
  };
}

describe('Media foundation integration (MSSQL)', () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    const hasPendingMigrations = await AppDataSource.showMigrations();

    if (hasPendingMigrations) {
      await AppDataSource.runMigrations();
    }
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('persists media asset metadata with Unicode file names', async () => {
    const assetId = generateUuidV4();

    await insertMediaAsset(
      buildValidAssetInput({
        id: assetId,
        originalFileName: 'Giáo lý — ảnh bài học.jpg',
      }),
    );

    const rows = await AppDataSource.query<Array<{ original_file_name: string; status: string }>>(
      `SELECT original_file_name, status FROM media_assets WHERE id = @0`,
      [assetId],
    );

    expect(rows[0]?.original_file_name).toBe('Giáo lý — ảnh bài học.jpg');
    expect(rows[0]?.status).toBe('PENDING');
  });

  it('enforces unique storage provider and storage key pairs', async () => {
    const assetId = generateUuidV4();
    const duplicateKey = `assets/2026/08/${TEST_CODE_PREFIX}duplicate`;

    await insertMediaAsset(
      buildValidAssetInput({
        id: assetId,
        storageKey: duplicateKey,
      }),
    );

    await expect(
      insertMediaAsset(
        buildValidAssetInput({
          storageKey: duplicateKey,
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects non-positive size_bytes values', async () => {
    await expect(
      insertMediaAsset(
        buildValidAssetInput({
          sizeBytes: 0,
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects invalid checksum format', async () => {
    await expect(
      insertMediaAsset(
        buildValidAssetInput({
          checksumSha256: 'INVALID',
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects invalid enum values for provider, category, status, and visibility', async () => {
    await expect(
      insertMediaAsset(
        buildValidAssetInput({
          storageProvider: 'azure',
        }),
      ),
    ).rejects.toThrow();

    await expect(
      insertMediaAsset(
        buildValidAssetInput({
          mediaCategory: 'ARCHIVE',
        }),
      ),
    ).rejects.toThrow();

    await expect(
      insertMediaAsset(
        buildValidAssetInput({
          status: 'UPLOADING',
        }),
      ),
    ).rejects.toThrow();

    await expect(
      insertMediaAsset(
        buildValidAssetInput({
          visibility: 'INTERNAL',
        }),
      ),
    ).rejects.toThrow();
  });

  it('stores created_by_user_id without a database-generated UUID default on id', async () => {
    const defaultConstraintResult = await AppDataSource.query<
      Array<{ default_definition: string | null }>
    >(`
      SELECT dc.definition AS default_definition
      FROM sys.tables t
      INNER JOIN sys.columns c
        ON c.object_id = t.object_id
      LEFT JOIN sys.default_constraints dc
        ON dc.parent_object_id = c.object_id
        AND dc.parent_column_id = c.column_id
      WHERE t.name = 'media_assets'
        AND c.name = 'id'
    `);

    expect(defaultConstraintResult[0]?.default_definition).toBeNull();
  });

  it('accepts optional created_by_user_id foreign key to users', async () => {
    const userId = await insertUser(`${TEST_CODE_PREFIX}owner@example.com`);
    const assetId = generateUuidV4();

    await insertMediaAsset(
      buildValidAssetInput({
        id: assetId,
        createdByUserId: userId,
        status: 'READY',
      }),
    );

    const rows = await AppDataSource.query<Array<{ created_by_user_id: string }>>(
      `SELECT created_by_user_id FROM media_assets WHERE id = @0`,
      [assetId],
    );

    expect(rows[0]?.created_by_user_id?.toLowerCase()).toBe(userId.toLowerCase());
  });
});
