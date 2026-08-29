import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnvironmentFile } from 'dotenv';
import { DataSource } from 'typeorm';
import { parseNodeEnvironment } from '../config/app.configuration';
import { buildDatabaseConfiguration } from '../config/database.configuration';
import { buildTypeOrmDataSourceOptions } from './typeorm-options.factory';

const environmentFilePath = resolve(process.cwd(), '.env');
const environmentExamplePath = resolve(process.cwd(), '.env.example');

if (existsSync(environmentFilePath)) {
  loadEnvironmentFile({ path: environmentFilePath });
} else if (existsSync(environmentExamplePath)) {
  loadEnvironmentFile({ path: environmentExamplePath });
}

const nodeEnv = parseNodeEnvironment(process.env['NODE_ENV']);
const databaseConfiguration = buildDatabaseConfiguration(process.env);

const AppDataSource = new DataSource(
  buildTypeOrmDataSourceOptions(databaseConfiguration, nodeEnv, 'cli-typescript'),
);

export default AppDataSource;
