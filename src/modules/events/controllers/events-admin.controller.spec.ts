import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { EventAccessService } from '../access/event-access.service';
import {
  EventRegistrationStatus,
  EventScopeType,
  EventStatus,
} from '../enums/event.enums';
import { EventsService } from '../events.service';
import type {
  EventRegistrationSnapshot,
  EventSnapshot,
  EventWithTargetsSnapshot,
} from '../interfaces/event.interfaces';
import { EventsAdminController } from './events-admin.controller';

describe('EventsAdminController', () => {
  let controller: EventsAdminController;
  let eventsService: jest.Mocked<Partial<EventsService>>;
  let eventAccessService: jest.Mocked<Partial<EventAccessService>>;

  const adminUserId = '11111111-1111-4111-8111-111111111111';
  const eventId = '22222222-2222-4222-8222-222222222222';
  const registrationId = '33333333-3333-4333-8333-333333333333';

  const adminUser: AuthenticatedUser = {
    userId: adminUserId,
    username: 'admin',
    roles: ['SUPER_ADMIN'],
    permissions: ['events.manage', 'events.checkin'],
  };

  const mockEvent: EventSnapshot = {
    id: eventId,
    code: 'RETREAT-2026',
    title: 'Youth Retreat',
    description: 'Retreat details...',
    summary: 'Summary',
    locale: 'vi-VN',
    scopeType: EventScopeType.Global,
    scopeKey: 'GLOBAL',
    parishId: null,
    classId: null,
    status: EventStatus.Draft,
    timezone: 'Asia/Ho_Chi_Minh',
    startsAt: new Date('2026-10-01T08:00:00Z'),
    endsAt: new Date('2026-10-01T17:00:00Z'),
    venueName: 'Parish Hall',
    address: null,
    coverMediaAssetId: null,
    capacity: 100,
    isRegistrationRequired: true,
    registrationDeadline: new Date('2026-09-25T23:59:59Z'),
    publishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    version: 0,
    createdByUserId: adminUserId,
    updatedByUserId: adminUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockItem: EventWithTargetsSnapshot = {
    event: mockEvent,
    targets: [],
    activeRegistrationCount: 0,
  };

  const mockRegistration: EventRegistrationSnapshot = {
    id: registrationId,
    eventId,
    registrantKey: 'USER:44444444-4444-4444-8444-444444444444',
    userId: '44444444-4444-4444-8444-444444444444',
    studentId: null,
    enrollmentId: null,
    status: EventRegistrationStatus.Attended,
    registeredAt: new Date(),
    cancelledAt: null,
    checkedInAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    eventsService = {
      findAdminList: jest.fn().mockResolvedValue({
        items: [mockItem],
        total: 1,
        page: 1,
        limit: 20,
      }),
      createEvent: jest.fn().mockResolvedValue(mockItem),
      getEventById: jest.fn().mockResolvedValue(mockItem),
      updateEvent: jest.fn().mockResolvedValue(mockItem),
      publishEvent: jest.fn().mockResolvedValue({
        ...mockItem,
        event: { ...mockEvent, status: EventStatus.Published, version: 1 },
      }),
      cancelEvent: jest.fn().mockResolvedValue({
        ...mockItem,
        event: { ...mockEvent, status: EventStatus.Cancelled, version: 2 },
      }),
      completeEvent: jest.fn().mockResolvedValue({
        ...mockItem,
        event: { ...mockEvent, status: EventStatus.Completed },
      }),
      archiveEvent: jest.fn().mockResolvedValue({
        ...mockItem,
        event: { ...mockEvent, status: EventStatus.Archived },
      }),
      checkIn: jest.fn().mockResolvedValue(mockRegistration),
      findAttendeeList: jest.fn().mockResolvedValue({
        items: [{ registration: mockRegistration, displayName: 'John Doe' }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    };

    eventAccessService = {
      getAdminActorScope: jest.fn().mockResolvedValue({
        isSuperAdmin: true,
        adminParishIds: [],
        assignedClassIds: [],
        isCatechistOnly: false,
      }),
      assertCanCreateEvent: jest.fn().mockResolvedValue(undefined),
      assertCanManageEvent: jest.fn().mockResolvedValue(undefined),
      assertCanPublishEvent: jest.fn().mockResolvedValue(undefined),
      assertCanCancelEvent: jest.fn().mockResolvedValue(undefined),
      assertCanCompleteEvent: jest.fn().mockResolvedValue(undefined),
      assertCanArchiveEvent: jest.fn().mockResolvedValue(undefined),
      assertCanCheckIn: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsAdminController],
      providers: [
        { provide: EventsService, useValue: eventsService },
        { provide: EventAccessService, useValue: eventAccessService },
      ],
    }).compile();

    controller = module.get<EventsAdminController>(EventsAdminController);
  });

  describe('listAdmin', () => {
    it('returns paginated admin events', async () => {
      const response = await controller.listAdmin(adminUser, { page: 1, limit: 20 });
      expect(response.items).toHaveLength(1);
      expect(response.total).toBe(1);
    });
  });

  describe('create', () => {
    it('creates draft event after scope assertion', async () => {
      const response = await controller.create(adminUser, {
        code: 'RETREAT-2026',
        title: 'Youth Retreat',
        description: 'Details',
        scopeType: EventScopeType.Global,
        startsAt: new Date('2026-10-01T08:00:00Z'),
        endsAt: new Date('2026-10-01T17:00:00Z'),
      });

      expect(response.id).toBe(eventId);
      expect(eventAccessService.assertCanCreateEvent).toHaveBeenCalled();
    });
  });

  describe('publish', () => {
    it('publishes draft event and returns published response', async () => {
      const response = await controller.publish(adminUser, eventId);
      expect(response.status).toBe(EventStatus.Published);
      expect(response.version).toBe(1);
    });
  });

  describe('cancel', () => {
    it('cancels published event with reason', async () => {
      const response = await controller.cancel(adminUser, eventId, {
        cancellationReason: 'Bad weather',
      });
      expect(response.status).toBe(EventStatus.Cancelled);
    });
  });

  describe('checkIn', () => {
    it('checks in attendee by registrationId', async () => {
      const response = await controller.checkIn(adminUser, eventId, { registrationId });
      expect(response.status).toBe(EventRegistrationStatus.Attended);
      expect(eventsService.checkIn).toHaveBeenCalledWith(eventId, registrationId);
    });
  });

  describe('listAttendees', () => {
    it('returns attendee list for event check-in lookup', async () => {
      const response = await controller.listAttendees(adminUser, eventId, {
        page: 1,
        limit: 20,
      });
      expect(response.items).toHaveLength(1);
      expect(response.items[0].displayName).toBe('John Doe');
      expect(response.items[0].status).toBe(EventRegistrationStatus.Attended);
    });
  });
});
