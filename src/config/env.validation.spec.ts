import { envValidationSchema } from './env.validation';

const validDatabaseEnvironment = {
  DB_HOST: 'localhost',
  DB_PORT: '1433',
  DB_NAME: 'catechism_api',
  DB_USER: 'sa',
  DB_PASSWORD: 'test-password',
  JWT_ACCESS_SECRET: 'local-development-jwt-access-secret-32chars-min',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_HASH_SECRET: 'local-development-refresh-hash-secret-32chars-min',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

describe('envValidationSchema', () => {
  it('accepts valid defaults with required database settings', () => {
    const validationResult = envValidationSchema.validate(validDatabaseEnvironment);

    expect(validationResult.error).toBeUndefined();
    expect(validationResult.value).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      DB_HOST: 'localhost',
      DB_PORT: 1433,
      DB_NAME: 'catechism_api',
      DB_USER: 'sa',
      DB_PASSWORD: 'test-password',
      JWT_ACCESS_SECRET: 'local-development-jwt-access-secret-32chars-min',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_HASH_SECRET: 'local-development-refresh-hash-secret-32chars-min',
      JWT_REFRESH_EXPIRES_IN: '7d',
    });
  });

  it('accepts controlled NODE_ENV values and numeric PORT', () => {
    const validationResult = envValidationSchema.validate({
      NODE_ENV: 'production',
      PORT: '8080',
      SWAGGER_ENABLED: 'false',
      ...validDatabaseEnvironment,
      DB_ENCRYPT: 'true',
      DB_TRUST_SERVER_CERTIFICATE: 'false',
    });

    expect(validationResult.error).toBeUndefined();
    expect(validationResult.value).toEqual({
      NODE_ENV: 'production',
      PORT: 8080,
      SWAGGER_ENABLED: false,
      DB_HOST: 'localhost',
      DB_PORT: 1433,
      DB_NAME: 'catechism_api',
      DB_USER: 'sa',
      DB_PASSWORD: 'test-password',
      DB_ENCRYPT: true,
      DB_TRUST_SERVER_CERTIFICATE: false,
      JWT_ACCESS_SECRET: 'local-development-jwt-access-secret-32chars-min',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_HASH_SECRET: 'local-development-refresh-hash-secret-32chars-min',
      JWT_REFRESH_EXPIRES_IN: '7d',
    });
  });

  it('rejects invalid NODE_ENV values', () => {
    const validationResult = envValidationSchema.validate({
      NODE_ENV: 'staging',
      ...validDatabaseEnvironment,
    });

    expect(validationResult.error).toBeDefined();
  });

  it('rejects invalid PORT values', () => {
    const validationResult = envValidationSchema.validate({
      PORT: 70000,
      ...validDatabaseEnvironment,
    });

    expect(validationResult.error).toBeDefined();
  });

  it('rejects empty DB_PASSWORD values', () => {
    const validationResult = envValidationSchema.validate({
      ...validDatabaseEnvironment,
      DB_PASSWORD: '',
    });

    expect(validationResult.error).toBeDefined();
  });

  it('rejects missing DB_HOST values', () => {
    const validationResult = envValidationSchema.validate({
      DB_PORT: '1433',
      DB_NAME: 'catechism_api',
      DB_USER: 'sa',
      DB_PASSWORD: 'test-password',
    });

    expect(validationResult.error).toBeDefined();
  });

  it('rejects invalid DB_PORT values', () => {
    const validationResult = envValidationSchema.validate({
      ...validDatabaseEnvironment,
      DB_PORT: 70000,
    });

    expect(validationResult.error).toBeDefined();
  });

  it('rejects invalid DB_ENCRYPT values', () => {
    const validationResult = envValidationSchema.validate({
      ...validDatabaseEnvironment,
      DB_ENCRYPT: 'maybe',
    });

    expect(validationResult.error).toBeDefined();
  });

  it('rejects missing JWT_ACCESS_SECRET values', () => {
    const validationResult = envValidationSchema.validate({
      DB_HOST: 'localhost',
      DB_PORT: '1433',
      DB_NAME: 'catechism_api',
      DB_USER: 'sa',
      DB_PASSWORD: 'test-password',
    });

    expect(validationResult.error).toBeDefined();
  });

  it('rejects forbidden JWT_ACCESS_SECRET placeholders', () => {
    const validationResult = envValidationSchema.validate({
      ...validDatabaseEnvironment,
      JWT_ACCESS_SECRET: 'changeme',
    });

    expect(validationResult.error).toBeDefined();
  });

  it('rejects missing JWT_REFRESH_HASH_SECRET values', () => {
    const validationResult = envValidationSchema.validate({
      DB_HOST: 'localhost',
      DB_PORT: '1433',
      DB_NAME: 'catechism_api',
      DB_USER: 'sa',
      DB_PASSWORD: 'test-password',
      JWT_ACCESS_SECRET: 'local-development-jwt-access-secret-32chars-min',
    });

    expect(validationResult.error).toBeDefined();
  });

  it('rejects forbidden JWT_REFRESH_HASH_SECRET placeholders', () => {
    const validationResult = envValidationSchema.validate({
      ...validDatabaseEnvironment,
      JWT_REFRESH_HASH_SECRET: 'changeme',
    });

    expect(validationResult.error).toBeDefined();
  });
});
