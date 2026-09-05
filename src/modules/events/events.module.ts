import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { ApplicationEventsModule } from '../application-events/application-events.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { StudentModule } from '../student/student.module';
import { EventAccessService } from './access/event-access.service';
import { EventRegistrationsMeController } from './controllers/event-registrations-me.controller';
import { EventsAdminController } from './controllers/events-admin.controller';
import { EventsController } from './controllers/events.controller';
import { EventRegistrationEntity } from './entities/event-registration.entity';
import { EventTargetEntity } from './entities/event-target.entity';
import { EventEntity } from './entities/event.entity';
import { EventsService } from './events.service';
import { EventAudienceResolver } from './services/event-audience.resolver';
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
    AuthModule,
    AccessControlModule,
    ParishModule,
    ClassModule,
    EnrollmentModule,
    StudentModule,
    ApplicationEventsModule,
  ],
  controllers: [
    EventsController,
    EventsAdminController,
    EventRegistrationsMeController,
  ],
  providers: [
    EventsService,
    EventInternalService,
    EventTargetService,
    EventRegistrationService,
    EventAccessService,
    EventAudienceResolver,
  ],
  exports: [EventsService],
})
export class EventsModule {}
