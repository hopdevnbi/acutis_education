import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AUTH_REFRESH_COOKIE_NAME } from '../src/modules/auth/config/auth.config.types';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const TEST_EMAIL_PREFIX = 'auth005-e2e-';
const TEST_PASSWORD = 'SecurePassword123!';

interface LoginResponseBody {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
  };
}

interface AccessTokenResponseBody {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

function decodeJwtPayload(token: string): { sub: string; sid: string } {
  const payloadPart = token.split('.')[1];

  if (payloadPart === undefined) {
    throw new Error('Invalid JWT payload.');
  }

  return JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as {
    sub: string;
    sid: string;
  };
}

function expectRefreshCookie(setCookieHeader: string | string[] | undefined): void {
  const cookieHeaders = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader === undefined
      ? []
      : [setCookieHeader];

  expect(
    cookieHeaders.some((headerValue) => headerValue.startsWith(`${AUTH_REFRESH_COOKIE_NAME}=`)),
  ).toBe(true);
}

function buildCookieHeader(setCookieHeader: string | string[] | undefined): string {
  const cookieHeaders = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader === undefined
      ? []
      : [setCookieHeader];

  return cookieHeaders.map((headerValue) => headerValue.split(';')[0] ?? headerValue).join('; ');
}

describe('Auth refresh session and logout (db e2e)', () => {
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

  it('runs login, refresh rotation, replay detection, and logout over HTTP', async () => {
    const email = buildTestEmail('full-flow');
    const createdAccount = await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    const agent = request.agent(getTestHttpServer(application));

    const loginResponse = await agent
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    const loginBody = loginResponse.body as LoginResponseBody;
    const loginPayload = decodeJwtPayload(loginBody.accessToken);

    expect(loginBody.user.id).toBe(createdAccount.id);
    expect(loginPayload.sub).toBe(createdAccount.id);
    expect(loginPayload.sid).toEqual(expect.any(String));
    expect(loginBody).not.toHaveProperty('refreshToken');
    expectRefreshCookie(loginResponse.headers['set-cookie']);

    await agent
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const refreshResponse = await agent.post('/api/v1/auth/refresh').expect(200);
    const refreshBody = refreshResponse.body as AccessTokenResponseBody;
    const refreshPayload = decodeJwtPayload(refreshBody.accessToken);

    expect(refreshBody.accessToken).not.toBe(loginBody.accessToken);
    expect(refreshPayload.sub).toBe(createdAccount.id);
    expect(refreshPayload.sid).not.toBe(loginPayload.sid);
    expectRefreshCookie(refreshResponse.headers['set-cookie']);

    const replayResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/refresh')
      .set('Cookie', buildCookieHeader(loginResponse.headers['set-cookie']))
      .expect(401);
    expect((replayResponse.body as ErrorResponseBody).message).toBe('Invalid credentials');

    await agent.post('/api/v1/auth/refresh').expect(401);

    const freshLoginResponse = await agent
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    const freshAccessToken = (freshLoginResponse.body as LoginResponseBody).accessToken;

    await agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${freshAccessToken}`)
      .expect(204);

    await agent.post('/api/v1/auth/refresh').expect(401);
  });

  it('POST /api/v1/auth/refresh returns 401 when refresh cookie is missing', async () => {
    const response = await request(getTestHttpServer(application))
      .post('/api/v1/auth/refresh')
      .expect(401);

    expect((response.body as ErrorResponseBody).message).toBe('Invalid credentials');
  });
});
