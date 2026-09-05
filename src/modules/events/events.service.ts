import { Injectable } from '@nestjs/common';
import type {
  CreateEventInput,
  CreateEventRegistrationInput,
  CreateEventTargetInput,
  EventRegistrationSnapshot,
  EventSnapshot,
  EventTargetSnapshot,
  UpdateEventInput,
} from './interfaces/event.interfaces';
import { EventRegistrationService } from './services/event-registration.service';
import { EventTargetService } from './services/event-target.service';
import { EventInternalService } from './services/event.service';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventInternalService: EventInternalService,
    private readonly eventTargetService: EventTargetService,
    private readonly eventRegistrationService: EventRegistrationService,
  ) {}

  async createEvent(input: CreateEventInput): Promise<EventSnapshot> {
    return this.eventInternalService.create(input);
  }

  async getEventById(id: string): Promise<EventSnapshot> {
    return this.eventInternalService.getById(id);
  }

  async findEventByCode(code: string): Promise<EventSnapshot | null> {
    return this.eventInternalService.findByCode(code);
  }

  async updateEvent(id: string, input: UpdateEventInput): Promise<EventSnapshot> {
    return this.eventInternalService.update(id, input);
  }

  async publishEvent(id: string, updatedByUserId: string): Promise<EventSnapshot> {
    return this.eventInternalService.publish(id, updatedByUserId);
  }

  async cancelEvent(
    id: string,
    reason: string,
    updatedByUserId: string,
  ): Promise<EventSnapshot> {
    return this.eventInternalService.cancel(id, reason, updatedByUserId);
  }

  async completeEvent(id: string, updatedByUserId: string): Promise<EventSnapshot> {
    return this.eventInternalService.complete(id, updatedByUserId);
  }

  async archiveEvent(id: string, updatedByUserId: string): Promise<EventSnapshot> {
    return this.eventInternalService.archive(id, updatedByUserId);
  }

  async addTarget(input: CreateEventTargetInput): Promise<EventTargetSnapshot> {
    return this.eventTargetService.addTarget(input);
  }

  async listTargets(eventId: string): Promise<readonly EventTargetSnapshot[]> {
    return this.eventTargetService.listTargetsByEventId(eventId);
  }

  async register(input: CreateEventRegistrationInput): Promise<EventRegistrationSnapshot> {
    return this.eventRegistrationService.register(input);
  }

  async cancelRegistration(
    eventId: string,
    registrantKey: string,
  ): Promise<EventRegistrationSnapshot> {
    return this.eventRegistrationService.cancelRegistration(eventId, registrantKey);
  }

  async checkIn(
    eventId: string,
    registrantKey: string,
  ): Promise<EventRegistrationSnapshot> {
    return this.eventRegistrationService.checkIn(eventId, registrantKey);
  }

  async findRegistration(
    eventId: string,
    registrantKey: string,
  ): Promise<EventRegistrationSnapshot | null> {
    return this.eventRegistrationService.findRegistration(eventId, registrantKey);
  }

  async listRegistrations(eventId: string): Promise<readonly EventRegistrationSnapshot[]> {
    return this.eventRegistrationService.listRegistrationsByEventId(eventId);
  }
}
