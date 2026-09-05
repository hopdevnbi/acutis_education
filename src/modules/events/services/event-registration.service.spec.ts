import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { DataSource, Repository } from 'typeorm';
import { StudentService } from '../../student/services/student.service';
import { EventRegistrationEntity } from '../entities/event-registration.entity';
import { EventEntity } from '../entities/event.entity';
import {
  EventRegistrationStatus,
  EventScopeType,
  EventStatus,
} from '../enums/event.enums';
import {
  EventAlreadyRegisteredError,
  EventCapacityReachedError,
  EventCheckInNotAllowedError,
  EventNotRegistrableError,
  EventRegistrationCannotCancelError,
  EventRegistrationConflictError,
  EventRegistrationNotFoundError,
} from '../errors/event.errors';
import type { EventSnapshot } from '../interfaces/event.interfaces';
import { EventRegistrationService } from './event-registration.service';

describe('EventRegistrationService', () => {
  let service: EventRegistrationService;
  let repository: jest.Mocked<Partial<Repository<EventRegistrationEntity>>>;
  let eventRepoMock: { findOne: jest.Mock };
  let dataSource: jest.Mocked<Partial<DataSource>>;
  let studentService: jest.Mocked<Partial<StudentService>>;

  const eventId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const registrationId = '33333333-3333-4333-8333-333333333333';

  const mockPublishedEvent: EventSnapshot = {
    id: eventId,
    code: 'RETREAT-2026',
    title: 'Youth Retreat',
    description: 'Details',
    summary: null,
    locale: 'vi-VN',
    scopeType: EventScopeType.Global,
    scopeKey: 'GLOBAL',
    parishId: null,
    classId: null,
    status: EventStatus.Published,
    timezone: 'Asia/Ho_Chi_Minh',
    startsAt: new Date(Date.now() + 86400000), // tomorrow
    endsAt: new Date(Date.now() + 172800000),
    venueName: 'Parish Hall',
    address: null,
    coverMediaAssetId: null,
    capacity: 2,
    isRegistrationRequired: true,
    registrationDeadline: new Date(Date.now() + 43200000),
    publishedAt: new Date(),
    cancelledAt: null,
    cancellationReason: null,
    version: 1,
    createdByUserId: userId,
    updatedByUserId: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRegistration: EventRegistrationEntity = {
    id: registrationId,
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
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      save: jest.fn().mockImplementation(async (e) => e),
      create: jest.fn().mockImplementation((dto) => ({ ...mockRegistration, ...dto })),
      createQueryBuilder: jest.fn(),
    };

    eventRepoMock = {
      findOne: jest.fn().mockImplementation((options) => {
        return Promise.resolve({
          ...mockPublishedEvent,
          ...options?.where,
        });
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const mockManager = {
          getRepository: (entity: any) => {
            if (entity === EventEntity) {
              return eventRepoMock;
            }
            return repository;
          },
        };
        return cb(mockManager);
      }),
    };

    studentService = {
      getStudentSnapshotsByIds: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventRegistrationService,
        { provide: getRepositoryToken(EventRegistrationEntity), useValue: repository },
        { provide: DataSource, useValue: dataSource },
        { provide: StudentService, useValue: studentService },
      ],
    }).compile();

    service = module.get<EventRegistrationService>(EventRegistrationService);
  });

  describe('register', () => {
    it('acquires pessimistic_write lock on the event entity row', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);
      (repository.count as jest.Mock).mockResolvedValue(0);

      await service.register(mockPublishedEvent, userId);

      expect(eventRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: eventId },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('successfully registers within capacity', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);
      (repository.count as jest.Mock).mockResolvedValue(0);

      const result = await service.register(mockPublishedEvent, userId);
      expect(result.status).toBe(EventRegistrationStatus.Registered);
      expect(result.registrantKey).toBe(`USER:${userId}`);
    });

    it('rejects registration if event is DRAFT', async () => {
      const draftEvent = { ...mockPublishedEvent, status: EventStatus.Draft };
      await expect(service.register(draftEvent, userId)).rejects.toThrow(
        EventNotRegistrableError,
      );
    });

    it('throws EventAlreadyRegisteredError if already registered', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockRegistration);

      await expect(service.register(mockPublishedEvent, userId)).rejects.toThrow(
        EventAlreadyRegisteredError,
      );
    });

    it('throws EventCapacityReachedError if capacity is exceeded in transaction after lock', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);
      (repository.count as jest.Mock).mockResolvedValue(2); // capacity is 2

      await expect(service.register(mockPublishedEvent, userId)).rejects.toThrow(
        EventCapacityReachedError,
      );
    });

    it('allows re-registration of previously cancelled registration under the same capacity lock', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockRegistration,
        status: EventRegistrationStatus.Cancelled,
        cancelledAt: new Date(),
      });
      (repository.count as jest.Mock).mockResolvedValue(0);

      const result = await service.register(mockPublishedEvent, userId);
      expect(result.status).toBe(EventRegistrationStatus.Registered);
      expect(result.cancelledAt).toBeNull();
      expect(eventRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: eventId },
        lock: { mode: 'pessimistic_write' },
      });
    });

    it('rejects re-registration of NO_SHOW status under lock', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockRegistration,
        status: EventRegistrationStatus.NoShow,
      });

      await expect(service.register(mockPublishedEvent, userId)).rejects.toThrow(
        EventRegistrationConflictError,
      );
    });

    it('proceeds without capacity check if event capacity is null (unlimited)', async () => {
      eventRepoMock.findOne.mockResolvedValue({
        ...mockPublishedEvent,
        capacity: null,
      });
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.register(
        { ...mockPublishedEvent, capacity: null },
        userId,
      );
      expect(result.status).toBe(EventRegistrationStatus.Registered);
      expect(repository.count).not.toHaveBeenCalled();
    });
  });

  describe('cancelRegistration', () => {
    it('cancels active registration', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({ ...mockRegistration });

      const result = await service.cancelRegistration(eventId, `USER:${userId}`);
      expect(result.status).toBe(EventRegistrationStatus.Cancelled);
      expect(result.cancelledAt).not.toBeNull();
    });

    it('returns 200 idempotently if already cancelled', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockRegistration,
        status: EventRegistrationStatus.Cancelled,
      });

      const result = await service.cancelRegistration(eventId, `USER:${userId}`);
      expect(result.status).toBe(EventRegistrationStatus.Cancelled);
    });

    it('throws 409 if registration has already attended', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockRegistration,
        status: EventRegistrationStatus.Attended,
      });

      await expect(
        service.cancelRegistration(eventId, `USER:${userId}`),
      ).rejects.toThrow(EventRegistrationCannotCancelError);
    });

    it('throws 404 if registration not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.cancelRegistration(eventId, `USER:${userId}`),
      ).rejects.toThrow(EventRegistrationNotFoundError);
    });
  });

  describe('checkIn', () => {
    it('transitions REGISTERED to ATTENDED', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({ ...mockRegistration });

      const result = await service.checkIn(eventId, registrationId);
      expect(result.status).toBe(EventRegistrationStatus.Attended);
      expect(result.checkedInAt).not.toBeNull();
    });

    it('returns idempotently if already ATTENDED', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockRegistration,
        status: EventRegistrationStatus.Attended,
        checkedInAt: new Date(),
      });

      const result = await service.checkIn(eventId, registrationId);
      expect(result.status).toBe(EventRegistrationStatus.Attended);
    });

    it('rejects check-in if registration is CANCELLED', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockRegistration,
        status: EventRegistrationStatus.Cancelled,
      });

      await expect(service.checkIn(eventId, registrationId)).rejects.toThrow(
        EventCheckInNotAllowedError,
      );
    });
  });

  describe('countActiveByEventId', () => {
    it('uses injected repository when manager is not provided', async () => {
      (repository.count as jest.Mock).mockResolvedValue(5);

      const count = await service.countActiveByEventId(eventId);
      expect(count).toBe(5);
      expect(repository.count).toHaveBeenCalled();
    });

    it('uses manager.getRepository when manager is provided', async () => {
      const managerRepo = {
        count: jest.fn().mockResolvedValue(8),
      };
      const managerMock = {
        getRepository: jest.fn().mockReturnValue(managerRepo),
      } as any;

      const count = await service.countActiveByEventId(eventId, managerMock);
      expect(count).toBe(8);
      expect(managerMock.getRepository).toHaveBeenCalledWith(EventRegistrationEntity);
      expect(managerRepo.count).toHaveBeenCalled();
    });
  });

  describe('listNotificationRecipientUserIds', () => {
    it('queries DISTINCT user_id for REGISTERED and ATTENDED statuses using injected repo', async () => {
      const qbMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { userId: '22222222-2222-4222-8222-222222222222' },
          { userId: '33333333-3333-4333-8333-333333333333' },
        ]),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);

      const userIds = await service.listNotificationRecipientUserIds(eventId);

      expect(qbMock.select).toHaveBeenCalledWith('DISTINCT reg.userId', 'userId');
      expect(qbMock.where).toHaveBeenCalledWith('reg.eventId = :eid', { eid: eventId });
      expect(qbMock.andWhere).toHaveBeenCalledWith('reg.status IN (:...statuses)', {
        statuses: [EventRegistrationStatus.Registered, EventRegistrationStatus.Attended],
      });
      expect(userIds).toEqual([
        '22222222-2222-4222-8222-222222222222',
        '33333333-3333-4333-8333-333333333333',
      ]);
    });

    it('uses manager.getRepository when manager is provided for atomic in-transaction query', async () => {
      const qbMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { userId: '22222222-2222-4222-8222-222222222222' },
        ]),
      };
      const managerRepo = {
        createQueryBuilder: jest.fn().mockReturnValue(qbMock),
      };
      const managerMock = {
        getRepository: jest.fn().mockReturnValue(managerRepo),
      } as any;

      const userIds = await service.listNotificationRecipientUserIds(eventId, managerMock);

      expect(managerMock.getRepository).toHaveBeenCalledWith(EventRegistrationEntity);
      expect(managerRepo.createQueryBuilder).toHaveBeenCalledWith('reg');
      expect(qbMock.where).toHaveBeenCalledWith('reg.eventId = :eid', { eid: eventId });
      expect(userIds).toEqual(['22222222-2222-4222-8222-222222222222']);
    });

    it('returns empty array when no active registrations exist', async () => {
      const qbMock = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      (repository.createQueryBuilder as jest.Mock).mockReturnValue(qbMock);

      const userIds = await service.listNotificationRecipientUserIds(eventId);
      expect(userIds).toEqual([]);
    });
  });
});
