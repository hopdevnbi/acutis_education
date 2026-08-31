import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Test, type TestingModule } from '@nestjs/testing';
import AppDataSource from '../src/database/data-source';
import { AuthRbacSeedModule } from '../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../src/database/seeds/auth-rbac.seed.service';
import {
  AUTH_RBAC_SAMPLE_DOMAIN,
  AUTH_RBAC_SAMPLE_PASSWORD,
} from '../src/database/seeds/auth-rbac.seed.constants';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

interface LoginResponseBody {
  accessToken: string;
  user: {
    id: string;
    email: string;
  };
}

interface MediaAssetResponseBody {
  id: string;
  originalFileName: string;
  mimeType: string;
  mediaCategory: string;
  status: string;
  checksumSha256: string;
}

describe('Media API (db e2e)', () => {
  let application: INestApplication;
  let seedModuleRef: TestingModule;

  const adminEmail = `admin@${AUTH_RBAC_SAMPLE_DOMAIN}`;
  const parentEmail = `parent@${AUTH_RBAC_SAMPLE_DOMAIN}`;
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0xff, 0xd9]);

  beforeAll(async () => {
    application = await createDatabaseTestApplication();

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    if ((await AppDataSource.showMigrations()) === true) {
      await AppDataSource.runMigrations();
    }

    seedModuleRef = await Test.createTestingModule({
      imports: [AuthRbacSeedModule],
    }).compile();

    await seedModuleRef.init();
    await seedModuleRef.get(AuthRbacSeedService).run();
  });

  afterEach(async () => {
    await AppDataSource.query(`DELETE FROM media_assets`);
  });

  afterAll(async () => {
    await seedModuleRef.close();
    await application.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: AUTH_RBAC_SAMPLE_PASSWORD })
      .expect(200);

    return (response.body as LoginResponseBody).accessToken;
  }

  it('returns 401 for unauthenticated upload', async () => {
    await request(getTestHttpServer(application))
      .post('/api/v1/media/assets')
      .attach('file', jpegBuffer, 'photo.jpg')
      .field('intendedCategory', 'IMAGE')
      .expect(401);
  });

  it('allows parish admin upload, metadata read, and content read', async () => {
    const accessToken = await login(adminEmail);

    const uploadResponse = await request(getTestHttpServer(application))
      .post('/api/v1/media/assets')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', jpegBuffer, 'photo.jpg')
      .field('intendedCategory', 'IMAGE')
      .expect(201);

    const uploadedAsset = uploadResponse.body as MediaAssetResponseBody;

    await request(getTestHttpServer(application))
      .get(`/api/v1/media/assets/${uploadedAsset.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const contentResponse = await request(getTestHttpServer(application))
      .get(`/api/v1/media/assets/${uploadedAsset.id}/content`)
      .set('Authorization', `Bearer ${accessToken}`)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });
        response.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      })
      .expect(200);

    expect(contentResponse.body).toEqual(jpegBuffer);
  });

  it('denies parent access to admin-uploaded private asset content', async () => {
    const adminToken = await login(adminEmail);
    const parentToken = await login(parentEmail);

    const uploadResponse = await request(getTestHttpServer(application))
      .post('/api/v1/media/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', jpegBuffer, 'photo.jpg')
      .field('intendedCategory', 'IMAGE')
      .expect(201);

    const uploadedAsset = uploadResponse.body as MediaAssetResponseBody;

    await request(getTestHttpServer(application))
      .get(`/api/v1/media/assets/${uploadedAsset.id}/content`)
      .set('Authorization', `Bearer ${parentToken}`)
      .expect(403);
  });

  it('rejects SVG uploads', async () => {
    const accessToken = await login(adminEmail);
    const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>', 'utf8');

    await request(getTestHttpServer(application))
      .post('/api/v1/media/assets')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('file', svgBuffer, 'evil.svg')
      .field('intendedCategory', 'IMAGE')
      .expect(415);
  });
});
