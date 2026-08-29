import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CONFIGURATION_NAMESPACE,
  type AppConfiguration,
  type NodeEnvironment,
} from './config.types';
import {
  DATABASE_CONFIGURATION_NAMESPACE,
  type DatabaseConfiguration,
} from './database.config.types';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  getConfiguration(): AppConfiguration {
    const configuration = this.configService.get<AppConfiguration>(CONFIGURATION_NAMESPACE);

    if (configuration === undefined) {
      throw new Error('Application configuration is not available.');
    }

    return configuration;
  }

  getDatabaseConfiguration(): DatabaseConfiguration {
    const configuration = this.configService.get<DatabaseConfiguration>(
      DATABASE_CONFIGURATION_NAMESPACE,
    );

    if (configuration === undefined) {
      throw new Error('Database configuration is not available.');
    }

    return configuration;
  }

  getNodeEnv(): NodeEnvironment {
    return this.getConfiguration().nodeEnv;
  }

  getPort(): number {
    return this.getConfiguration().port;
  }

  isSwaggerEnabled(): boolean {
    return this.getConfiguration().swaggerEnabled;
  }
}
