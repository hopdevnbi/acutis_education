import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { ApplicationEventsModule } from '../application-events/application-events.module';
import { NotificationAccessService } from './access/notification-access.service';
import { NotificationDeviceEntity } from './entities/notification-device.entity';
import { NotificationRecipientEntity } from './entities/notification-recipient.entity';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';
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
  ],
  providers: [
    NotificationsService,
    NotificationInternalService,
    NotificationRecipientService,
    NotificationDeviceService,
    NotificationAccessService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
