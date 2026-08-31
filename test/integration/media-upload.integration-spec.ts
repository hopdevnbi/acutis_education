import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type INestApplication } from '@nestjs/common';
import AppDataSource from '../../src/database/data-source';
import { generateUuidV4 } from '../../src/database/uuid-v4.util';
import { MediaCategory } from '../../src/modules/media/enums/media-category.enum';
import { MediaVisibility } from '../../src/modules/media/enums/media-visibility.enum';
import { MediaAssetService } from '../../src/modules/media/services/media-asset.service';
import { createDatabaseTestApplication } from '../create-database-test-application';

describe('Media upload integration (MSSQL + local provider)', () => {
  let application: INestApplication;
  let mediaAssetService: MediaAssetService;
  let storageRoot: string;
  let previousLocalRoot: string | undefined;

  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]);
  let userId: string;

  beforeAll(async () => {
    storageRoot = await mkdtemp(join(tmpdir(), 'media-upload-int-'));
    previousLocalRoot = process.env['MEDIA_LOCAL_ROOT'];
    process.env['MEDIA_LOCAL_ROOT'] = storageRoot;
    process.env['MEDIA_STORAGE_PROVIDER'] = 'local';

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    application = await createDatabaseTestApplication();
    mediaAssetService = application.get(MediaAssetService);

    userId = generateUuidV4();
    await AppDataSource.query(
      `
        INSERT INTO users (id, email, password_hash, status)
        VALUES (@0, @1, @2, @3)
      `,
      [
        userId,
        `media-upload-${userId}@example.com`,
        '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhash',
        'ACTIVE',
      ],
    );
  });

  afterEach(async () => {
    await AppDataSource.query(`DELETE FROM media_assets`);
  });

  afterAll(async () => {
    await AppDataSource.query(`DELETE FROM users WHERE id = @0`, [userId]);
    await application.close();
    await rm(storageRoot, { recursive: true, force: true });

    if (previousLocalRoot === undefined) {
      delete process.env['MEDIA_LOCAL_ROOT'];
    } else {
      process.env['MEDIA_LOCAL_ROOT'] = previousLocalRoot;
    }

    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it('uploads an image, marks it READY, and streams matching bytes', async () => {
    const snapshot = await mediaAssetService.createFromUpload({
      fileBuffer: jpegBuffer,
      originalFileName: 'lesson-photo.jpg',
      intendedCategory: MediaCategory.Image,
      visibility: MediaVisibility.Private,
      createdByUserId: userId,
    });

    expect(snapshot.status).toBe('READY');
    expect(snapshot.mimeType).toBe('image/jpeg');
    expect(snapshot.checksumSha256).toHaveLength(64);

    const content = await mediaAssetService.openAssetContent(snapshot.id);
    const chunks: Buffer[] = [];

    for await (const chunk of content.body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
    }

    expect(Buffer.concat(chunks)).toEqual(jpegBuffer);
  });
});
