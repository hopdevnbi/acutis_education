import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { ApplicationEventsModule } from '../application-events/application-events.module';
import { ParishModule } from '../parish/parish.module';
import { AnnouncementAccessService } from './access/announcement-access.service';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementTargetEntity } from './entities/announcement-target.entity';
import { AnnouncementUserStateEntity } from './entities/announcement-user-state.entity';
import { AnnouncementEntity } from './entities/announcement.entity';
import { AnnouncementTargetService } from './services/announcement-target.service';
import { AnnouncementUserStateService } from './services/announcement-user-state.service';
import { AnnouncementInternalService } from './services/announcement.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnnouncementEntity,
      AnnouncementTargetEntity,
      AnnouncementUserStateEntity,
    ]),
    AccessControlModule,
    ParishModule,
    ApplicationEventsModule,
  ],
  providers: [
    AnnouncementsService,
    AnnouncementInternalService,
    AnnouncementTargetService,
    AnnouncementUserStateService,
    AnnouncementAccessService,
  ],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
