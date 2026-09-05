import { Injectable } from '@nestjs/common';
import type {
  CreateEventInput,
  EventAdminListFilter,
  EventAttendeeListFilter,
  EventAttendeeSnapshot,
  EventPaginatedResult,
  EventRegistrationSnapshot,
  EventRegistrationWithEventSnapshot,
  EventSnapshot,
  EventTargetSnapshot,
  EventUserListFilter,
  EventWithTargetsSnapshot,
  MyEventRegistrationsFilter,
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

  async createEvent(input: CreateEventInput): Promise<EventWithTargetsSnapshot> {
    return this.eventInternalService.create(input);
  }

  async getEventById(id: string): Promise<EventWithTargetsSnapshot> {
    return this.eventInternalService.getById(id);
  }

  async findEventByCode(code: string): Promise<EventSnapshot | null> {
    return this.eventInternalService.findByCode(code);
  }

  async updateEvent(id: string, input: UpdateEventInput): Promise<EventWithTargetsSnapshot> {
    return this.eventInternalService.update(id, input);
  }

  async publishEvent(id: string, updatedByUserId: string): Promise<EventWithTargetsSnapshot> {
    return this.eventInternalService.publish(id, updatedByUserId);
  }

  async cancelEvent(
    id: string,
    reason: string,
    updatedByUserId: string,
  ): Promise<EventWithTargetsSnapshot> {
    return this.eventInternalService.cancel(id, reason, updatedByUserId);
  }

  async completeEvent(id: string, updatedByUserId: string): Promise<EventWithTargetsSnapshot> {
    return this.eventInternalService.complete(id, updatedByUserId);
  }

  async archiveEvent(id: string, updatedByUserId: string): Promise<EventWithTargetsSnapshot> {
    return this.eventInternalService.archive(id, updatedByUserId);
  }

  async findAdminList(
    filter: EventAdminListFilter,
  ): Promise<EventPaginatedResult<EventWithTargetsSnapshot>> {
    return this.eventInternalService.findAdminList(filter);
  }

  async findUserList(
    filter: EventUserListFilter,
    now?: Date,
  ): Promise<EventPaginatedResult<{ event: EventSnapshot; isRegistered: boolean }>> {
    return this.eventInternalService.findUserList(filter, now);
  }

  async getUserEventDetail(
    id: string,
    userId: string,
    audienceKeys: readonly string[],
    linkedStudentIds: readonly string[],
    now?: Date,
  ): Promise<{
    event: EventSnapshot;
    currentUserRegistration: EventRegistrationSnapshot | null;
  } | null> {
    return this.eventInternalService.getUserEventDetail(
      id,
      userId,
      audienceKeys,
      linkedStudentIds,
      now,
    );
  }

  async register(
    event: EventSnapshot,
    userId: string,
    studentId?: string | null,
    enrollmentId?: string | null,
    now?: Date,
  ): Promise<EventRegistrationSnapshot> {
    return this.eventRegistrationService.register(event, userId, studentId, enrollmentId, now);
  }

  async cancelRegistration(
    eventId: string,
    registrantKey: string,
    now?: Date,
  ): Promise<EventRegistrationSnapshot> {
    return this.eventRegistrationService.cancelRegistration(eventId, registrantKey, now);
  }

  async checkIn(
    eventId: string,
    registrationId: string,
    now?: Date,
  ): Promise<EventRegistrationSnapshot> {
    return this.eventRegistrationService.checkIn(eventId, registrationId, now);
  }

  async findMyRegistrations(
    filter: MyEventRegistrationsFilter,
  ): Promise<EventPaginatedResult<EventRegistrationWithEventSnapshot>> {
    return this.eventRegistrationService.findMyRegistrations(filter);
  }

  async findAttendeeList(
    filter: EventAttendeeListFilter,
  ): Promise<EventPaginatedResult<EventAttendeeSnapshot>> {
    return this.eventRegistrationService.findAttendeeList(filter);
  }

  async listTargets(eventId: string): Promise<readonly EventTargetSnapshot[]> {
    return this.eventTargetService.listTargetsByEventId(eventId);
  }

  async listNotificationRecipientUserIds(eventId: string): Promise<string[]> {
    return this.eventRegistrationService.listNotificationRecipientUserIds(eventId);
  }
}
