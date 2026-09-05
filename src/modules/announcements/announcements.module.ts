import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { ApplicationEventsModule } from '../application-events/application-events.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { StudentModule } from '../student/student.module';
import { AnnouncementAccessService } from './access/announcement-access.service';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsAdminController } from './controllers/announcements-admin.controller';
import { AnnouncementsController } from './controllers/announcements.controller';
import { AnnouncementTargetEntity } from './entities/announcement-target.entity';
import { AnnouncementUserStateEntity } from './entities/announcement-user-state.entity';
import { AnnouncementEntity } from './entities/announcement.entity';
import { AnnouncementAudienceResolver } from './services/announcement-audience.resolver';
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
    AuthModule,
    AccessControlModule,
    ParishModule,
    ClassModule,
    EnrollmentModule,
    StudentModule,
    ApplicationEventsModule,
  ],
  controllers: [AnnouncementsController, AnnouncementsAdminController],
  providers: [
    AnnouncementsService,
    AnnouncementInternalService,
    AnnouncementTargetService,
    AnnouncementUserStateService,
    AnnouncementAccessService,
    AnnouncementAudienceResolver,
  ],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
