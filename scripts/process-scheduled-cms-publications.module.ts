import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../src/config/config.module';
import { DatabaseModule } from '../src/database/database.module';
import { CmsModule } from '../src/modules/cms/cms.module';

@Module({
  imports: [ApplicationConfigModule, DatabaseModule, CmsModule],
})
export class ProcessScheduledCmsPublicationsModule {}
