import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { ApplicationEventsModule } from '../application-events/application-events.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { StudentModule } from '../student/student.module';
import { UsersModule } from '../users/users.module';
import { NotificationAccessService } from './access/notification-access.service';
import { NotificationDevicesMeController } from './controllers/notification-devices-me.controller';
import { NotificationsMeController } from './controllers/notifications-me.controller';
import { NotificationDeviceEntity } from './entities/notification-device.entity';
import { NotificationRecipientEntity } from './entities/notification-recipient.entity';
import { NotificationEntity } from './entities/notification.entity';
import { CommunicationNotificationHandler } from './handlers/communication-notification.handler';
import { NotificationsService } from './notifications.service';
import { NotificationAudienceResolver } from './services/notification-audience.resolver';
import { NotificationDeviceService } from './services/notification-device.service';
import { NotificationRecipientService } from './services/notification-recipient.service';
import { NotificationInternalService } from './services/notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationRecipientEntity,
      NotificationDeviceEntity,
    ]),
    AccessControlModule,
    ApplicationEventsModule,
    AuthModule,
    UsersModule,
    ParishModule,
    ClassModule,
    EnrollmentModule,
    StudentModule,
  ],
  controllers: [NotificationsMeController, NotificationDevicesMeController],
  providers: [
    NotificationsService,
    NotificationInternalService,
    NotificationRecipientService,
    NotificationDeviceService,
    NotificationAccessService,
    NotificationAudienceResolver,
    CommunicationNotificationHandler,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
