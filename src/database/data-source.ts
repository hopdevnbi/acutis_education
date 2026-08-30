import { DataSource } from 'typeorm';
import { parseNodeEnvironment } from '../config/app.configuration';
import { buildDatabaseConfiguration } from '../config/database.configuration';
import { loadCliDataSourceEnvironment } from './load-cli-data-source-environment';
import { buildTypeOrmDataSourceOptions } from './typeorm-options.factory';

loadCliDataSourceEnvironment();

const nodeEnv = parseNodeEnvironment(process.env['NODE_ENV']);
const databaseConfiguration = buildDatabaseConfiguration(process.env);

const AppDataSource = new DataSource(
  buildTypeOrmDataSourceOptions(databaseConfiguration, nodeEnv, 'cli-typescript'),
);

export default AppDataSource;
