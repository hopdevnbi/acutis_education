import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { ApplicationEventsModule } from '../application-events/application-events.module';
import { ParishModule } from '../parish/parish.module';
import { EventAccessService } from './access/event-access.service';
import { EventRegistrationEntity } from './entities/event-registration.entity';
import { EventTargetEntity } from './entities/event-target.entity';
import { EventEntity } from './entities/event.entity';
import { EventsService } from './events.service';
import { EventRegistrationService } from './services/event-registration.service';
import { EventTargetService } from './services/event-target.service';
import { EventInternalService } from './services/event.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventEntity,
      EventTargetEntity,
      EventRegistrationEntity,
    ]),
    AccessControlModule,
    ParishModule,
    ApplicationEventsModule,
  ],
  providers: [
    EventsService,
    EventInternalService,
    EventTargetService,
    EventRegistrationService,
    EventAccessService,
  ],
  exports: [EventsService],
})
export class EventsModule {}
