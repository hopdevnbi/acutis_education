// Placeholder MSSQL settings for automated tests only (no live database required).
process.env['DB_HOST'] = process.env['DB_HOST'] ?? 'localhost';
process.env['DB_PORT'] = process.env['DB_PORT'] ?? '1433';
process.env['DB_NAME'] = process.env['DB_NAME'] ?? 'catechism_api_test';
process.env['DB_USER'] = process.env['DB_USER'] ?? 'sa';
process.env['DB_PASSWORD'] = process.env['DB_PASSWORD'] ?? 'test-password';
process.env['DB_ENCRYPT'] = process.env['DB_ENCRYPT'] ?? 'true';
process.env['DB_TRUST_SERVER_CERTIFICATE'] = process.env['DB_TRUST_SERVER_CERTIFICATE'] ?? 'true';
process.env['JWT_ACCESS_SECRET'] =
  process.env['JWT_ACCESS_SECRET'] ?? 'test-only-jwt-access-secret-32chars-minimum-value';
process.env['JWT_ACCESS_EXPIRES_IN'] = process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m';
process.env['JWT_REFRESH_HASH_SECRET'] =
  process.env['JWT_REFRESH_HASH_SECRET'] ?? 'test-only-refresh-hash-secret-32chars-minimum-value';
process.env['JWT_REFRESH_EXPIRES_IN'] = process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d';
