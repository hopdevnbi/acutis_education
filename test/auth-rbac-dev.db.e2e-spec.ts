import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AuthRbacSeedModule } from '../src/database/seeds/auth-rbac-seed.module';
import { AuthRbacSeedService } from '../src/database/seeds/auth-rbac.seed.service';
import {
  AUTH_RBAC_SAMPLE_DOMAIN,
  AUTH_RBAC_SAMPLE_PASSWORD,
  AUTH_RBAC_SEED_PERMISSIONS,
  AUTH_RBAC_SEED_ROLES,
} from '../src/database/seeds/auth-rbac.seed.constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const SEED_ROLE_CODES = AUTH_RBAC_SEED_ROLES.map((role) => `'${role.code}'`).join(', ');
const SEED_PERMISSION_CODES = AUTH_RBAC_SEED_PERMISSIONS.map(
  (permission) => `'${permission.code}'`,
).join(', ');

interface LoginResponseBody {
  accessToken: string;
}

describe('Dev RBAC endpoints with seeded accounts (db e2e)', () => {
  let application: INestApplication;
  let seedModuleRef: TestingModule;

  beforeAll(async () => {
    seedModuleRef = await Test.createTestingModule({
      imports: [AuthRbacSeedModule],
    }).compile();

    const seedService = seedModuleRef.get(AuthRbacSeedService);
    await seedService.run();

    application = await createDatabaseTestApplication({ authRbacDemoEnabled: true });
  });

  afterAll(async () => {
    await application.close();
    await seedModuleRef.close();

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}')
    `);
    await AppDataSource.query(`
      DELETE FROM media_assets
      WHERE created_by_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      UPDATE curriculum_versions
      SET published_by_user_id = NULL
      WHERE published_by_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      UPDATE curriculum_versions
      SET created_by_user_id = NULL
      WHERE created_by_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      UPDATE curriculum_assignments
      SET assigned_by_user_id = NULL
      WHERE assigned_by_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      UPDATE question_versions
      SET published_by_user_id = NULL
      WHERE published_by_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      UPDATE question_versions
      SET created_by_user_id = NULL
      WHERE created_by_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      UPDATE questions
      SET created_by_user_id = NULL
      WHERE created_by_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      UPDATE practice_sessions
      SET created_by_user_id = NULL
      WHERE created_by_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      UPDATE practice_answer_attempts
      SET submitted_by_user_id = NULL
      WHERE submitted_by_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM enrollments
      WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE 'Demo Student%')
    `);
    await AppDataSource.query(`
      DELETE FROM class_catechist_assignments
      WHERE catechist_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM student_guardians
      WHERE guardian_user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM parish_memberships
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM role_permissions
      WHERE role_id IN (SELECT id FROM roles WHERE code IN (${SEED_ROLE_CODES}))
    `);
    await AppDataSource.query(`
      DELETE FROM user_roles
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}')
    `);
    await AppDataSource.query(`
      DELETE FROM permissions
      WHERE code IN (${SEED_PERMISSION_CODES})
    `);
    await AppDataSource.query(`
      DELETE FROM roles
      WHERE code IN (${SEED_ROLE_CODES})
    `);
    await AppDataSource.query(`
      DELETE FROM users
      WHERE email LIKE '%@${AUTH_RBAC_SAMPLE_DOMAIN}'
    `);
  });

  async function login(email: string): Promise<string> {
    const response = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: AUTH_RBAC_SAMPLE_PASSWORD })
      .expect(200);

    return (response.body as LoginResponseBody).accessToken;
  }

  it('allows parish admin on dev read and manage endpoints', async () => {
    const accessToken = await login(`admin@${AUTH_RBAC_SAMPLE_DOMAIN}`);

    await request(getTestHttpServer(application))
      .get('/api/v1/dev/rbac/read')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(getTestHttpServer(application))
      .get('/api/v1/dev/rbac/manage')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('allows catechist read but denies manage on dev RBAC endpoints', async () => {
    const accessToken = await login(`catechist@${AUTH_RBAC_SAMPLE_DOMAIN}`);

    await request(getTestHttpServer(application))
      .get('/api/v1/dev/rbac/read')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(getTestHttpServer(application))
      .get('/api/v1/dev/rbac/manage')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('denies parent on dev RBAC test endpoints', async () => {
    const accessToken = await login(`parent@${AUTH_RBAC_SAMPLE_DOMAIN}`);

    await request(getTestHttpServer(application))
      .get('/api/v1/dev/rbac/read')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    await request(getTestHttpServer(application))
      .get('/api/v1/dev/rbac/manage')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);
  });

  it('does not register dev RBAC routes when demo mode is disabled', async () => {
    const disabledDemoApplication = await createDatabaseTestApplication({
      authRbacDemoEnabled: false,
    });

    try {
      const accessToken = await login(`admin@${AUTH_RBAC_SAMPLE_DOMAIN}`);

      await request(getTestHttpServer(disabledDemoApplication))
        .get('/api/v1/dev/rbac/read')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    } finally {
      await disabledDemoApplication.close();
    }
  });
});
