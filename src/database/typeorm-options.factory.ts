import { join } from 'node:path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions, LoggerOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import type { NodeEnvironment } from '../config/config.types';
import type { DatabaseConfiguration } from '../config/database.config.types';
import {
  DATABASE_ENTITY_SUFFIX,
  DATABASE_MIGRATIONS_DIRECTORY,
  TYPEORM_MIGRATIONS_TABLE_NAME,
} from './database.constants';

export type TypeOrmRuntime = 'nestjs' | 'cli-typescript' | 'cli-javascript';

function resolveCompiledRuntime(): boolean {
  return __filename.endsWith('.js');
}

function resolveMigrationGlob(runtime: TypeOrmRuntime): string {
  const migrationsDirectory = join(__dirname, DATABASE_MIGRATIONS_DIRECTORY);

  if (runtime === 'cli-javascript' || (runtime === 'nestjs' && resolveCompiledRuntime())) {
    return join(migrationsDirectory, '*.js');
  }

  return join(migrationsDirectory, '*.ts');
}

function resolveEntityGlob(runtime: TypeOrmRuntime): string {
  const sourceRoot = join(__dirname, '..');

  if (runtime === 'cli-javascript' || (runtime === 'nestjs' && resolveCompiledRuntime())) {
    return join(sourceRoot, '**', `*${DATABASE_ENTITY_SUFFIX}.js`);
  }

  return join(sourceRoot, '**', `*${DATABASE_ENTITY_SUFFIX}.ts`);
}

function resolveTypeOrmLogging(nodeEnv: NodeEnvironment): LoggerOptions {
  if (nodeEnv === 'development') {
    return ['error', 'warn', 'schema', 'migration'];
  }

  return ['error'];
}

export function buildTypeOrmDataSourceOptions(
  databaseConfiguration: DatabaseConfiguration,
  nodeEnv: NodeEnvironment,
  runtime: TypeOrmRuntime,
): DataSourceOptions {
  return {
    type: 'mssql',
    host: databaseConfiguration.host,
    port: databaseConfiguration.port,
    username: databaseConfiguration.username,
    password: databaseConfiguration.password,
    database: databaseConfiguration.database,
    options: {
      encrypt: databaseConfiguration.encrypt,
      trustServerCertificate: databaseConfiguration.trustServerCertificate,
    },
    synchronize: false,
    migrationsRun: false,
    entities: [resolveEntityGlob(runtime)],
    migrations: [resolveMigrationGlob(runtime)],
    migrationsTableName: TYPEORM_MIGRATIONS_TABLE_NAME,
    namingStrategy: new SnakeNamingStrategy(),
    logging: resolveTypeOrmLogging(nodeEnv),
  };
}

export function buildTypeOrmModuleOptions(
  databaseConfiguration: DatabaseConfiguration,
  nodeEnv: NodeEnvironment,
  runtime: TypeOrmRuntime,
): TypeOrmModuleOptions {
  return {
    ...buildTypeOrmDataSourceOptions(databaseConfiguration, nodeEnv, runtime),
    autoLoadEntities: true,
  };
}

export function buildSanitizedTypeOrmOptionsForLogging(
  options: DataSourceOptions,
): Record<string, unknown> {
  return {
    type: options.type,
    host: 'host' in options ? options.host : undefined,
    port: 'port' in options ? options.port : undefined,
    database: 'database' in options ? options.database : undefined,
    username: 'username' in options ? options.username : undefined,
    password: '[REDACTED]',
    synchronize: options.synchronize,
    migrationsRun: options.migrationsRun,
    migrationsTableName: options.migrationsTableName,
    logging: options.logging,
  };
}
