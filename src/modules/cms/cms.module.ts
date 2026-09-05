import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ParishModule } from '../parish/parish.module';
import { CmsAccessService } from './access/cms-access.service';
import { CmsService } from './cms.service';
import { CmsAdminEntriesController } from './controllers/cms-admin-entries.controller';
import { CmsEntriesController } from './controllers/cms-entries.controller';
import { CmsEntryEntity } from './entities/cms-entry.entity';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { CmsEntryService } from './services/cms-entry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CmsEntryEntity]),
    AuthModule,
    AccessControlModule,
    ParishModule,
  ],
  controllers: [CmsEntriesController, CmsAdminEntriesController],
  providers: [
    CmsService,
    CmsEntryService,
    CmsAccessService,
    OptionalJwtAuthGuard,
  ],
  exports: [CmsService],
})
export class CmsModule {}
