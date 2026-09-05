import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { EnrollmentQueryService } from '../../enrollment/services/enrollment-query.service';
import { StudentGuardianService } from '../../student/services/student-guardian.service';
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
import { EventsController } from './events.controller';

describe('EventsController', () => {
  let controller: EventsController;
  let eventsService: jest.Mocked<Partial<EventsService>>;
  let audienceResolver: jest.Mocked<Partial<EventAudienceResolver>>;
  let studentGuardianService: jest.Mocked<Partial<StudentGuardianService>>;
  let enrollmentQueryService: jest.Mocked<Partial<EnrollmentQueryService>>;

  const userId = '11111111-1111-4111-8111-111111111111';
  const eventId = '22222222-2222-4222-8222-222222222222';
  const studentId = '33333333-3333-4333-8333-333333333333';

  const user: AuthenticatedUser = {
    userId,
    username: 'testuser',
    roles: ['PARENT'],
    permissions: ['events.read', 'events.register'],
  };

  const mockEvent: EventSnapshot = {
    id: eventId,
    code: 'RETREAT-2026',
    title: 'Youth Retreat',
    description: 'Full retreat description',
    summary: 'Summary',
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
    registrationDeadline: new Date('2026-09-25T23:59:59Z'),
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
      findUserList: jest.fn().mockResolvedValue({
        items: [{ event: mockEvent, isRegistered: false }],
        total: 1,
        page: 1,
        limit: 20,
      }),
      getUserEventDetail: jest.fn().mockResolvedValue({
        event: mockEvent,
        currentUserRegistration: mockRegistration,
      }),
      register: jest.fn().mockResolvedValue(mockRegistration),
      cancelRegistration: jest.fn().mockResolvedValue({
        ...mockRegistration,
        status: EventRegistrationStatus.Cancelled,
        cancelledAt: new Date(),
      }),
      listTargets: jest.fn().mockResolvedValue([]),
    };

    audienceResolver = {
      resolveAudienceKeys: jest.fn().mockResolvedValue(['GLOBAL']),
      listLinkedStudentIdsForParent: jest.fn().mockResolvedValue([studentId]),
      isChildEligibleForEvent: jest.fn().mockResolvedValue(true),
    };

    studentGuardianService = {
      assertGuardianLinked: jest.fn().mockResolvedValue({} as any),
    };

    enrollmentQueryService = {
      listActiveEnrollmentsByStudentIds: jest
        .fn()
        .mockResolvedValue([{ id: 'enr-1' } as any]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: eventsService },
        { provide: EventAudienceResolver, useValue: audienceResolver },
        { provide: StudentGuardianService, useValue: studentGuardianService },
        { provide: EnrollmentQueryService, useValue: enrollmentQueryService },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  describe('list', () => {
    it('returns public list of visible published events', async () => {
      const response = await controller.list(user, { page: 1, limit: 20 });
      expect(response.items).toHaveLength(1);
      expect(response.items[0].code).toBe('RETREAT-2026');
      expect((response.items[0] as any).description).toBeUndefined();
    });
  });

  describe('getDetail', () => {
    it('returns event detail with registration status', async () => {
      const response = await controller.getDetail(user, eventId);
      expect(response.id).toBe(eventId);
      expect(response.description).toBe(mockEvent.description);
      expect(response.currentUserRegistration?.status).toBe(EventRegistrationStatus.Registered);
    });

    it('throws 404 when event is not visible to user', async () => {
      (eventsService.getUserEventDetail as jest.Mock).mockResolvedValue(null);
      await expect(controller.getDetail(user, 'unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('register', () => {
    it('allows self-registration for audience-eligible user', async () => {
      const response = await controller.register(user, eventId, {});
      expect(response.status).toBe(EventRegistrationStatus.Registered);
      expect(eventsService.register).toHaveBeenCalledWith(
        mockEvent,
        userId,
        undefined,
        null,
      );
    });

    it('allows parent registering linked child', async () => {
      const childRegistration = {
        ...mockRegistration,
        registrantKey: `STUDENT:${studentId}`,
        studentId,
        enrollmentId: 'enr-1',
      };
      (eventsService.register as jest.Mock).mockResolvedValue(childRegistration);

      const response = await controller.register(user, eventId, { studentId });
      expect(response.registrantKey).toBe(`STUDENT:${studentId}`);
      expect(studentGuardianService.assertGuardianLinked).toHaveBeenCalledWith(
        userId,
        studentId,
      );
    });

    it('denies child registration when studentGuardianService rejects link', async () => {
      (studentGuardianService.assertGuardianLinked as jest.Mock).mockRejectedValue(
        new Error('Not linked'),
      );

      await expect(
        controller.register(user, eventId, { studentId }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelRegistration', () => {
    it('cancels own registration', async () => {
      const response = await controller.cancelRegistration(user, eventId, {});
      expect(response.status).toBe(EventRegistrationStatus.Cancelled);
      expect(eventsService.cancelRegistration).toHaveBeenCalledWith(
        eventId,
        `USER:${userId}`,
      );
    });

    it('allows parent to cancel linked child registration', async () => {
      const response = await controller.cancelRegistration(user, eventId, { studentId });
      expect(response.status).toBe(EventRegistrationStatus.Cancelled);
      expect(eventsService.cancelRegistration).toHaveBeenCalledWith(
        eventId,
        `STUDENT:${studentId}`,
      );
    });
  });
});
