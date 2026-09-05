import { Global, Module } from '@nestjs/common';
import { APPLICATION_EVENT_PUBLISHER } from './ports/application-event.ports';
import { ApplicationEventBus } from './services/application-event-bus.service';

@Global()
@Module({
  providers: [
    ApplicationEventBus,
    {
      provide: APPLICATION_EVENT_PUBLISHER,
      useExisting: ApplicationEventBus,
    },
  ],
  exports: [ApplicationEventBus, APPLICATION_EVENT_PUBLISHER],
})
export class ApplicationEventsModule {}
