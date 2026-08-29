import { assertSafeTestDatabaseName, UnsafeTestDatabaseNameError } from './test-database.guard';

describe('assertSafeTestDatabaseName', () => {
  it('accepts the default dedicated test database name', () => {
    expect(() => assertSafeTestDatabaseName('catechism_api_test')).not.toThrow();
  });

  it('rejects the development database name', () => {
    expect(() => assertSafeTestDatabaseName('catechism_api')).toThrow(UnsafeTestDatabaseNameError);
  });

  it('rejects database names without the _test suffix', () => {
    expect(() => assertSafeTestDatabaseName('catechism_api_dev')).toThrow(
      UnsafeTestDatabaseNameError,
    );
  });

  it('rejects unsafe characters even when the suffix matches', () => {
    expect(() => assertSafeTestDatabaseName('catechism-api_test')).toThrow(
      UnsafeTestDatabaseNameError,
    );
  });
});
