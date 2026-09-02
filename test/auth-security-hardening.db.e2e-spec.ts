import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const TEST_EMAIL_PREFIX = 'auth007-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';

function buildCookieHeader(setCookieHeader: string | string[] | undefined): string {
  const cookieHeaders = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader === undefined
      ? []
      : [setCookieHeader];

  return cookieHeaders.map((headerValue) => headerValue.split(';')[0] ?? headerValue).join('; ');
}

describe('Auth security hardening (db e2e)', () => {
  let application: INestApplication;
  let userAccountService: UserAccountService;

  beforeAll(async () => {
    application = await createDatabaseTestApplication();
    userAccountService = application.get(UserAccountService);
  });

  afterEach(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM users
      WHERE email LIKE '${TEST_EMAIL_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await application.close();
  });

  function buildTestEmail(localPart: string): string {
    return `${TEST_EMAIL_PREFIX}${localPart}@example.com`;
  }

  it('sets Cache-Control: no-store on login and refresh responses', async () => {
    const email = buildTestEmail('cache-control');
    await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    const loginResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    expect(loginResponse.headers['cache-control']).toBe('no-store');
    expect(loginResponse.headers['pragma']).toBe('no-cache');

    const refreshResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/refresh')
      .set('Cookie', buildCookieHeader(loginResponse.headers['set-cookie']))
      .expect(200);

    expect(refreshResponse.headers['cache-control']).toBe('no-store');
    expect(refreshResponse.headers['pragma']).toBe('no-cache');
  });
});

describe('Auth login rate limiting (db e2e)', () => {
  let application: INestApplication;
  let userAccountService: UserAccountService;
  const originalLoginThrottleLimit = process.env['AUTH_LOGIN_THROTTLE_LIMIT'];
  const originalLoginThrottleTtlMs = process.env['AUTH_LOGIN_THROTTLE_TTL_MS'];

  beforeAll(async () => {
    process.env['AUTH_LOGIN_THROTTLE_LIMIT'] = '2';
    process.env['AUTH_LOGIN_THROTTLE_TTL_MS'] = '60000';
    application = await createDatabaseTestApplication();
    userAccountService = application.get(UserAccountService);
  });

  afterEach(async () => {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    await AppDataSource.query(`
      DELETE FROM auth_sessions
      WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE '${TEST_EMAIL_PREFIX}%'
      )
    `);
    await AppDataSource.query(`
      DELETE FROM users
      WHERE email LIKE '${TEST_EMAIL_PREFIX}%'
    `);
  });

  afterAll(async () => {
    await application.close();

    if (originalLoginThrottleLimit === undefined) {
      delete process.env['AUTH_LOGIN_THROTTLE_LIMIT'];
    } else {
      process.env['AUTH_LOGIN_THROTTLE_LIMIT'] = originalLoginThrottleLimit;
    }

    if (originalLoginThrottleTtlMs === undefined) {
      delete process.env['AUTH_LOGIN_THROTTLE_TTL_MS'];
    } else {
      process.env['AUTH_LOGIN_THROTTLE_TTL_MS'] = originalLoginThrottleTtlMs;
    }
  });

  it('returns 429 when login attempts exceed the configured limit', async () => {
    const email = `${TEST_EMAIL_PREFIX}throttle@example.com`;
    await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword999!' })
      .expect(401);

    await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword999!' })
      .expect(401);

    const throttledResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword999!' })
      .expect(429);

    expect(throttledResponse.body).toMatchObject({
      statusCode: 429,
    });
  });
});
