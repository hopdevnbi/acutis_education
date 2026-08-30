import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnvironmentFile } from 'dotenv';

export function isCiEnvironment(): boolean {
  return process.env['CI'] === 'true';
}

export function loadCliDataSourceEnvironment(): void {
  if (isCiEnvironment()) {
    return;
  }

  const environmentFilePath = resolve(process.cwd(), '.env');

  if (!existsSync(environmentFilePath)) {
    throw new Error(
      'A local .env file is required for TypeORM CLI commands. Copy .env.example to .env and configure it.',
    );
  }

  loadEnvironmentFile({ path: environmentFilePath });
}
