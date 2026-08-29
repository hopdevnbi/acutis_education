import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SWAGGER_DOCUMENT_PATH } from '../src/bootstrap/configure-swagger';
import type { ApiErrorResponse } from '../src/http/api-error-response.types';
import { createTestApplication } from './create-test-application';
import { getTestHttpServer } from './get-test-http-server';

interface OpenApiDocument {
  readonly openapi: string;
  readonly info: {
    readonly title: string;
    readonly version: string;
  };
}

describe('Infrastructure (e2e)', () => {
  let application: INestApplication;

  beforeAll(async () => {
    application = await createTestApplication();
  });

  afterAll(async () => {
    await application.close();
  });

  it('returns a safe 404 error contract with a request ID', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/does-not-exist')
      .expect(404);

    const responseBody = response.body as ApiErrorResponse;

    expect(responseBody.statusCode).toBe(404);
    expect(responseBody.error).toBe('Not Found');
    expect(responseBody.path).toBe('/api/v1/does-not-exist');
    expect(typeof responseBody.requestId).toBe('string');
    expect(typeof responseBody.timestamp).toBe('string');
    expect(typeof responseBody.message).toBe('string');
    expect(responseBody).not.toHaveProperty('stack');
    expect(response.headers['x-request-id']).toBe(responseBody.requestId);
  });

  it('preserves a valid incoming request ID header', async () => {
    const incomingRequestId = '550e8400-e29b-41d4-a716-446655440000';

    const response = await request(getTestHttpServer(application))
      .get('/api/v1/health')
      .set('X-Request-Id', incomingRequestId)
      .expect(200);

    expect(response.headers['x-request-id']).toBe(incomingRequestId);
  });

  it('replaces an invalid incoming request ID header', async () => {
    const response = await request(getTestHttpServer(application))
      .get('/api/v1/health')
      .set('X-Request-Id', 'not-a-valid-request-id')
      .expect(200);

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(response.headers['x-request-id']).not.toBe('not-a-valid-request-id');
  });
});

describe('Swagger (e2e)', () => {
  let application: INestApplication;
  const previousSwaggerEnabled = process.env['SWAGGER_ENABLED'];

  beforeAll(async () => {
    process.env['SWAGGER_ENABLED'] = 'true';
    application = await createTestApplication();
  });

  afterAll(async () => {
    await application.close();

    if (previousSwaggerEnabled === undefined) {
      delete process.env['SWAGGER_ENABLED'];
    } else {
      process.env['SWAGGER_ENABLED'] = previousSwaggerEnabled;
    }
  });

  it('serves OpenAPI JSON when Swagger is enabled', async () => {
    const response = await request(getTestHttpServer(application))
      .get(`/${SWAGGER_DOCUMENT_PATH}-json`)
      .expect(200);

    const openApiDocument = response.body as OpenApiDocument;

    expect(typeof openApiDocument.openapi).toBe('string');
    expect(openApiDocument.info.title).toBe('Catechism API');
    expect(openApiDocument.info.version).toBe('1.0');
  });
});
