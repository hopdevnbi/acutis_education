import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { ParishModule } from '../parish/parish.module';
import { CmsAccessService } from './access/cms-access.service';
import { CmsService } from './cms.service';
import { CmsEntryEntity } from './entities/cms-entry.entity';
import { CmsEntryService } from './services/cms-entry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CmsEntryEntity]),
    AccessControlModule,
    ParishModule,
  ],
  providers: [CmsService, CmsEntryService, CmsAccessService],
  exports: [CmsService],
})
export class CmsModule {}
