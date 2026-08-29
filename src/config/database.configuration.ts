import { registerAs } from '@nestjs/config';
import {
  DATABASE_CONFIGURATION_NAMESPACE,
  type DatabaseConfiguration,
} from './database.config.types';
import { parseNodeEnvironment } from './app.configuration';
import type { NodeEnvironment } from './config.types';

const DEFAULT_DB_PORT = 1433;

function parseRequiredString(
  rawValue: string | undefined,
  environmentVariableName: string,
): string {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    throw new Error(`${environmentVariableName} is required.`);
  }

  return rawValue.trim();
}

function parseDatabasePort(rawValue: string | undefined): number {
  if (rawValue === undefined) {
    return DEFAULT_DB_PORT;
  }

  const parsedPort = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`Invalid DB_PORT value: ${rawValue}`);
  }

  return parsedPort;
}

function resolveDatabasePort(environment: NodeJS.ProcessEnv): number {
  const databaseHost = environment['DB_HOST']?.trim();
  const publishedPort = environment['MSSQL_PUBLISH_PORT']?.trim();
  const configuredPort = environment['DB_PORT']?.trim();

  if (
    databaseHost === 'localhost' &&
    publishedPort !== undefined &&
    publishedPort.length > 0 &&
    (configuredPort === undefined || configuredPort === String(DEFAULT_DB_PORT))
  ) {
    return parseDatabasePort(publishedPort);
  }

  return parseDatabasePort(configuredPort);
}

function parseBooleanEnvironmentVariable(
  rawValue: string | undefined,
  environmentVariableName: string,
): boolean {
  if (rawValue === undefined) {
    throw new Error(`${environmentVariableName} must be explicitly provided when parsing.`);
  }

  const normalizedValue = rawValue.trim().toLowerCase();

  if (normalizedValue === 'true' || normalizedValue === '1') {
    return true;
  }

  if (normalizedValue === 'false' || normalizedValue === '0') {
    return false;
  }

  throw new Error(`Invalid ${environmentVariableName} value: ${rawValue}`);
}

export function resolveDatabaseEncrypt(
  rawValue: string | undefined,
  _nodeEnv: NodeEnvironment,
): boolean {
  if (rawValue === undefined) {
    return true;
  }

  return parseBooleanEnvironmentVariable(rawValue, 'DB_ENCRYPT');
}

export function resolveDatabaseTrustServerCertificate(
  rawValue: string | undefined,
  nodeEnv: NodeEnvironment,
): boolean {
  if (rawValue === undefined) {
    return nodeEnv === 'development';
  }

  return parseBooleanEnvironmentVariable(rawValue, 'DB_TRUST_SERVER_CERTIFICATE');
}

export function buildDatabaseConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): DatabaseConfiguration {
  const nodeEnv = parseNodeEnvironment(environment['NODE_ENV']);

  return {
    host: parseRequiredString(environment['DB_HOST'], 'DB_HOST'),
    port: resolveDatabasePort(environment),
    database: parseRequiredString(environment['DB_NAME'], 'DB_NAME'),
    username: parseRequiredString(environment['DB_USER'], 'DB_USER'),
    password: parseRequiredString(environment['DB_PASSWORD'], 'DB_PASSWORD'),
    encrypt: resolveDatabaseEncrypt(environment['DB_ENCRYPT'], nodeEnv),
    trustServerCertificate: resolveDatabaseTrustServerCertificate(
      environment['DB_TRUST_SERVER_CERTIFICATE'],
      nodeEnv,
    ),
  };
}

export default registerAs(DATABASE_CONFIGURATION_NAMESPACE, () =>
  buildDatabaseConfiguration(process.env),
);
