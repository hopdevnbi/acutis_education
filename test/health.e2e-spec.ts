import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HEALTH_STATUS_OK } from '../src/health/health.types';
import { createTestApplication } from './create-test-application';
import { getTestHttpServer } from './get-test-http-server';

describe('Health (e2e)', () => {
  let application: INestApplication;

  beforeAll(async () => {
    application = await createTestApplication();
  });

  afterAll(async () => {
    await application.close();
  });

  it('GET /api/v1/health returns a successful status payload', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toEqual({ status: HEALTH_STATUS_OK });
  });
});
