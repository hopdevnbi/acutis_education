import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import AppDataSource from '../src/database/data-source';
import { AUTH_REFRESH_COOKIE_NAME } from '../src/modules/auth/config/auth.config.types';
import { UserStatus } from '../src/modules/users/enums/user-status.enum';
import { UserAccountService } from '../src/modules/users/services/user-account.service';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

const TEST_EMAIL_PREFIX = 'auth004-e2e-';
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

interface ErrorResponseBody {
  statusCode: number;
  message: string;
}

interface AuthenticatedProfileResponseBody {
  id: string;
  email: string;
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

describe('Auth login and access JWT (db e2e)', () => {
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

  it('POST /api/v1/auth/login returns an access token for valid credentials', async () => {
    const email = buildTestEmail('login-success');
    const createdAccount = await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    const response = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    const body = response.body as LoginResponseBody;

    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.tokenType).toBe('Bearer');
    expect(body.expiresIn).toBe(900);
    expect(body.user).toEqual({
      id: createdAccount.id,
      email,
    });
    expect(body).not.toHaveProperty('password');
    expect(body).not.toHaveProperty('passwordHash');
    expect(body).not.toHaveProperty('refreshToken');
    expect(decodeJwtPayload(body.accessToken).sub).toBe(createdAccount.id);
    expect(decodeJwtPayload(body.accessToken).sid).toEqual(expect.any(String));

    const cookieHeaders = response.headers['set-cookie'] as string | string[] | undefined;
    const cookieHeaderList = Array.isArray(cookieHeaders)
      ? cookieHeaders
      : cookieHeaders === undefined
        ? []
        : [cookieHeaders];
    expect(
      cookieHeaderList.some((headerValue: string) =>
        headerValue.startsWith(`${AUTH_REFRESH_COOKIE_NAME}=`),
      ),
    ).toBe(true);
  });

  it.each([
    ['wrong password', 'active', TEST_PASSWORD, 'WrongPassword999!'],
    ['unknown email', 'missing', TEST_PASSWORD, TEST_PASSWORD],
    ['inactive account', 'inactive', TEST_PASSWORD, TEST_PASSWORD],
    ['locked account', 'locked', TEST_PASSWORD, TEST_PASSWORD],
  ])(
    'POST /api/v1/auth/login returns generic 401 for %s',
    async (_label, localPart, accountPassword, attemptedPassword) => {
      if (localPart !== 'missing') {
        const status =
          localPart === 'inactive'
            ? UserStatus.Inactive
            : localPart === 'locked'
              ? UserStatus.Locked
              : UserStatus.Active;

        await userAccountService.createAccount({
          email: buildTestEmail(localPart),
          password: accountPassword,
          status,
        });
      }

      const email = localPart === 'missing' ? buildTestEmail(localPart) : buildTestEmail(localPart);

      const response = await request(getTestHttpServer(application))
        .post('/api/v1/auth/login')
        .send({ email, password: attemptedPassword })
        .expect(401);

      const body = response.body as ErrorResponseBody;

      expect(body.message).toBe('Invalid credentials');
      expect(body.statusCode).toBe(401);
    },
  );

  it('POST /api/v1/auth/login returns 400 for malformed payloads', async () => {
    const response = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email: buildTestEmail('malformed') })
      .expect(400);

    expect((response.body as ErrorResponseBody).statusCode).toBe(400);
  });

  it('GET /api/v1/auth/me enforces bearer access token authentication', async () => {
    const email = buildTestEmail('auth-me');
    const createdAccount = await userAccountService.createAccount({
      email,
      password: TEST_PASSWORD,
    });

    const loginResponse = await request(getTestHttpServer(application))
      .post('/api/v1/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);

    const accessToken = (loginResponse.body as LoginResponseBody).accessToken;

    await request(getTestHttpServer(application)).get('/api/v1/auth/me').expect(401);
    await request(getTestHttpServer(application))
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    const profileResponse = await request(getTestHttpServer(application))
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profileResponse.body as AuthenticatedProfileResponseBody).toEqual({
      id: createdAccount.id,
      email,
    });
  });
});
