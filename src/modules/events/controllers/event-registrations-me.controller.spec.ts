import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import {
  EventRegistrationStatus,
  EventScopeType,
  EventStatus,
} from '../enums/event.enums';
import { EventsService } from '../events.service';
import type {
  EventRegistrationSnapshot,
  EventSnapshot,
} from '../interfaces/event.interfaces';
import { EventAudienceResolver } from '../services/event-audience.resolver';
import { EventRegistrationsMeController } from './event-registrations-me.controller';

describe('EventRegistrationsMeController', () => {
  let controller: EventRegistrationsMeController;
  let eventsService: jest.Mocked<Partial<EventsService>>;
  let audienceResolver: jest.Mocked<Partial<EventAudienceResolver>>;

  const userId = '11111111-1111-4111-8111-111111111111';
  const eventId = '22222222-2222-4222-8222-222222222222';
  const studentId = '33333333-3333-4333-8333-333333333333';

  const user: AuthenticatedUser = {
    userId,
    username: 'parentuser',
    roles: ['PARENT'],
    permissions: ['events.read'],
  };

  const mockEvent: EventSnapshot = {
    id: eventId,
    code: 'RETREAT-2026',
    title: 'Youth Retreat',
    description: 'Description',
    summary: null,
    locale: 'vi-VN',
    scopeType: EventScopeType.Global,
    scopeKey: 'GLOBAL',
    parishId: null,
    classId: null,
    status: EventStatus.Published,
    timezone: 'Asia/Ho_Chi_Minh',
    startsAt: new Date('2026-10-01T08:00:00Z'),
    endsAt: new Date('2026-10-01T17:00:00Z'),
    venueName: 'Parish Hall',
    address: null,
    coverMediaAssetId: null,
    capacity: 100,
    isRegistrationRequired: true,
    registrationDeadline: null,
    publishedAt: new Date(),
    cancelledAt: null,
    cancellationReason: null,
    version: 1,
    createdByUserId: userId,
    updatedByUserId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRegistration: EventRegistrationSnapshot = {
    id: '44444444-4444-4444-8444-444444444444',
    eventId,
    registrantKey: `USER:${userId}`,
    userId,
    studentId: null,
    enrollmentId: null,
    status: EventRegistrationStatus.Registered,
    registeredAt: new Date(),
    cancelledAt: null,
    checkedInAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    eventsService = {
      findMyRegistrations: jest.fn().mockResolvedValue({
        items: [{ registration: mockRegistration, event: mockEvent }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    };

    audienceResolver = {
      listLinkedStudentIdsForParent: jest.fn().mockResolvedValue([studentId]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventRegistrationsMeController],
      providers: [
        { provide: EventsService, useValue: eventsService },
        { provide: EventAudienceResolver, useValue: audienceResolver },
      ],
    }).compile();

    controller = module.get<EventRegistrationsMeController>(
      EventRegistrationsMeController,
    );
  });

  describe('listMyRegistrations', () => {
    it('returns paginated registrations for self and linked children', async () => {
      const response = await controller.listMyRegistrations(user, { page: 1, limit: 20 });
      expect(response.items).toHaveLength(1);
      expect(response.items[0].registration.id).toBe(mockRegistration.id);
      expect(response.items[0].event.id).toBe(mockEvent.id);
      expect(audienceResolver.listLinkedStudentIdsForParent).toHaveBeenCalledWith(userId);
      expect(eventsService.findMyRegistrations).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          linkedStudentIds: [studentId],
        }),
      );
    });
  });
});
