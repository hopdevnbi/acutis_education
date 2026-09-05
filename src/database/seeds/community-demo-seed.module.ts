import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../config/config.module';
import { AnnouncementsModule } from '../../modules/announcements/announcements.module';
import { ClassModule } from '../../modules/class/class.module';
import { CmsModule } from '../../modules/cms/cms.module';
import { EnrollmentModule } from '../../modules/enrollment/enrollment.module';
import { EventsModule } from '../../modules/events/events.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { ParishModule } from '../../modules/parish/parish.module';
import { StudentModule } from '../../modules/student/student.module';
import { UsersModule } from '../../modules/users/users.module';
import { DatabaseModule } from '../database.module';
import { AuthRbacSeedModule } from './auth-rbac-seed.module';
import { ClassEnrollmentSeedModule } from './class-enrollment-seed.module';
import { CommunityDemoSeedService } from './community-demo.seed.service';
import { ParishAcademicSeedModule } from './parish-academic-seed.module';

@Module({
  imports: [
    ApplicationConfigModule,
    DatabaseModule,
    AuthRbacSeedModule,
    ParishAcademicSeedModule,
    ClassEnrollmentSeedModule,
    UsersModule,
    ParishModule,
    ClassModule,
    StudentModule,
    EnrollmentModule,
    CmsModule,
    AnnouncementsModule,
    EventsModule,
    NotificationsModule,
  ],
  providers: [CommunityDemoSeedService],
  exports: [CommunityDemoSeedService],
})
export class CommunityDemoSeedModule {}
