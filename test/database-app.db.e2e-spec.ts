import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HEALTH_STATUS_OK } from '../src/health/health.types';
import { createDatabaseTestApplication } from './create-database-test-application';
import { getTestHttpServer } from './get-test-http-server';

describe('Application with database (db e2e)', () => {
  let application: INestApplication;

  beforeAll(async () => {
    application = await createDatabaseTestApplication();
  });

  afterAll(async () => {
    await application.close();
  });

  it('GET /api/v1/health returns 200 while DatabaseModule is connected to the test database', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual({ status: HEALTH_STATUS_OK });
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });
});
