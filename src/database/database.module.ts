import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from '../config/app-config.service';
import { buildTypeOrmModuleOptions } from './typeorm-options.factory';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) =>
        buildTypeOrmModuleOptions(
          appConfigService.getDatabaseConfiguration(),
          appConfigService.getNodeEnv(),
          'nestjs',
        ),
    }),
  ],
})
export class DatabaseModule {}
