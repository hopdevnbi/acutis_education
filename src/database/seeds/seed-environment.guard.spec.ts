import {
  assertSafeSeedEnvironment,
  DEVELOPMENT_DATABASE_NAME,
  TEST_DATABASE_NAME,
  UnsafeSeedEnvironmentError,
} from './seed-environment.guard';

describe('assertSafeSeedEnvironment', () => {
  it('allows development and test database names outside production', () => {
    expect(
      assertSafeSeedEnvironment({
        NODE_ENV: 'development',
        DB_NAME: DEVELOPMENT_DATABASE_NAME,
      }),
    ).toBe(DEVELOPMENT_DATABASE_NAME);

    expect(
      assertSafeSeedEnvironment({
        NODE_ENV: 'test',
        DB_NAME: TEST_DATABASE_NAME,
      }),
    ).toBe(TEST_DATABASE_NAME);
  });

  it('rejects production environment', () => {
    expect(() => {
      assertSafeSeedEnvironment({
        NODE_ENV: 'production',
        DB_NAME: DEVELOPMENT_DATABASE_NAME,
      });
    }).toThrow(UnsafeSeedEnvironmentError);
  });

  it('rejects unknown database names', () => {
    expect(() => {
      assertSafeSeedEnvironment({
        NODE_ENV: 'development',
        DB_NAME: 'unknown_database',
      });
    }).toThrow(UnsafeSeedEnvironmentError);
  });

  it('rejects missing DB_NAME', () => {
    expect(() => {
      assertSafeSeedEnvironment({
        NODE_ENV: 'development',
      });
    }).toThrow(UnsafeSeedEnvironmentError);
  });
});
