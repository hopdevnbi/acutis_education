import {
  buildAppConfiguration,
  parseNodeEnvironment,
  parsePort,
  parseSwaggerEnabled,
} from './app.configuration';

describe('app configuration parsing', () => {
  const originalEnvironment = process.env;

  beforeEach(() => {
    process.env = { ...originalEnvironment };
  });

  afterAll(() => {
    process.env = originalEnvironment;
  });

  it('uses development defaults for local bootstrap', () => {
    delete process.env['NODE_ENV'];
    delete process.env['PORT'];
    delete process.env['SWAGGER_ENABLED'];

    expect(buildAppConfiguration()).toEqual({
      nodeEnv: 'development',
      port: 3000,
      swaggerEnabled: true,
    });
  });

  it('disables Swagger by default in production', () => {
    delete process.env['SWAGGER_ENABLED'];
    process.env['NODE_ENV'] = 'production';

    expect(parseSwaggerEnabled(undefined, 'production')).toBe(false);
  });

  it('rejects invalid NODE_ENV values', () => {
    expect(() => parseNodeEnvironment('staging')).toThrow('Invalid NODE_ENV value');
  });

  it('rejects invalid PORT values', () => {
    expect(() => parsePort('not-a-port')).toThrow('Invalid PORT value');
    expect(() => parsePort('70000')).toThrow('Invalid PORT value');
  });

  it('parses explicit Swagger flags predictably', () => {
    expect(parseSwaggerEnabled('true', 'production')).toBe(true);
    expect(parseSwaggerEnabled('0', 'production')).toBe(false);
    expect(() => parseSwaggerEnabled('maybe', 'production')).toThrow(
      'Invalid SWAGGER_ENABLED value',
    );
  });
});
