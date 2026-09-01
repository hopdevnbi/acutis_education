import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../src/config/config.module';
import { DatabaseModule } from '../src/database/database.module';
import { LocalizationModule } from '../src/modules/localization/localization.module';

@Module({
  imports: [ApplicationConfigModule, DatabaseModule, LocalizationModule],
})
export class LocalizationProcessJobsModule {}
