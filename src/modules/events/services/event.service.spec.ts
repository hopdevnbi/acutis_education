import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';
import { APPLICATION_EVENT_PUBLISHER } from '../../application-events/ports/application-event.ports';
import { EventEntity } from '../entities/event.entity';
import {
  CommunicationTargetType,
  EventScopeType,
  EventStatus,
} from '../enums/event.enums';
import {
  EventAlreadyPublishedError,
  EventCapacityReachedError,
  EventCodeConflictError,
  EventNotEditableError,
  EventNotFoundError,
} from '../errors/event.errors';
import { EventRegistrationService } from './event-registration.service';
import { EventTargetService } from './event-target.service';
import { EventInternalService } from './event.service';

describe('EventInternalService', () => {
  let service: EventInternalService;
  let repository: jest.Mocked<Partial<Repository<EventEntity>>>;
  let eventTargetService: jest.Mocked<Partial<EventTargetService>>;
  let eventRegistrationService: jest.Mocked<Partial<EventRegistrationService>>;
  let eventPublisher: { publishCommunicationEvent: jest.Mock };
  let dataSource: any;
  let mockManager: any;
  let executionLog: string[];

  const eventId = '11111111-1111-4111-8111-111111111111';
  const authorUserId = '22222222-2222-4222-8222-222222222222';

  const mockDraftEntity: EventEntity = {
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
    address: '123 Main St',
    coverMediaAssetId: null,
    capacity: 100,
    isRegistrationRequired: true,
    registrationDeadline: new Date('2026-09-25T23:59:59Z'),
    publishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    version: 0,
    createdByUserId: authorUserId,
    updatedByUserId: authorUserId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    executionLog = [];

    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...mockDraftEntity, ...dto })),
      save: jest.fn().mockImplementation(async (entity) => entity),
      createQueryBuilder: jest.fn(),
    };

    mockManager = {
      getRepository: jest.fn().mockImplementation((token) => {
        if (token === EventEntity) {
          return repository;
        }
        return repository;
      }),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        executionLog.push('tx:start');
        const res = await cb(mockManager);
        executionLog.push('tx:commit');
        return res;
      }),
    };

    eventTargetService = {
      replaceTargets: jest.fn().mockResolvedValue([]),
      listTargetsByEventId: jest.fn().mockResolvedValue([]),
    };

    eventRegistrationService = {
      countActiveByEventId: jest.fn().mockResolvedValue(10),
      listNotificationRecipientUserIds: jest.fn().mockImplementation(async () => {
        executionLog.push('snapshot:recipients');
        return ['user-1', 'user-2'];
      }),
    };

    eventPublisher = {
      publishCommunicationEvent: jest.fn().mockImplementation(async () => {
        executionLog.push('event:published');
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventInternalService,
        { provide: getRepositoryToken(EventEntity), useValue: repository },
        { provide: EventTargetService, useValue: eventTargetService },
        { provide: EventRegistrationService, useValue: eventRegistrationService },
        { provide: APPLICATION_EVENT_PUBLISHER, useValue: eventPublisher },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<EventInternalService>(EventInternalService);
  });

  describe('create', () => {
    it('creates draft event with version=0 and scopeKey', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.create({
        code: 'RETREAT-2026',
        title: 'Youth Retreat',
        description: 'Details',
        scopeType: EventScopeType.Global,
        startsAt: new Date('2026-10-01T08:00:00Z'),
        endsAt: new Date('2026-10-01T17:00:00Z'),
        authorUserId,
      });

      expect(result.event.status).toBe(EventStatus.Draft);
      expect(result.event.version).toBe(0);
      expect(result.event.scopeKey).toBe('GLOBAL');
      expect(repository.save).toHaveBeenCalled();
    });

    it('throws EventCodeConflictError on duplicate code', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(mockDraftEntity);

      await expect(
        service.create({
          code: 'RETREAT-2026',
          title: 'Youth Retreat',
          description: 'Details',
          scopeType: EventScopeType.Global,
          startsAt: new Date('2026-10-01T08:00:00Z'),
          endsAt: new Date('2026-10-01T17:00:00Z'),
          authorUserId,
        }),
      ).rejects.toThrow(EventCodeConflictError);
    });
  });

  describe('publish', () => {
    it('uses pessimistic write lock on EventEntity, sets publishedAt, version=1, and emits EventPublishedEvent post-commit', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({ ...mockDraftEntity });

      const result = await service.publish(eventId, authorUserId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: eventId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(result.event.status).toBe(EventStatus.Published);
      expect(result.event.version).toBe(1);
      expect(result.event.publishedAt).not.toBeNull();
      expect(eventPublisher.publishCommunicationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'COMMUNICATION_EVENT.EVENT_PUBLISHED',
          operationKey: `EVENT_PUBLISHED:${eventId}`,
          eventId,
        }),
      );
      expect(executionLog).toEqual(['tx:start', 'tx:commit', 'event:published']);
    });

    it('throws EventAlreadyPublishedError if already published', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
      });

      await expect(service.publish(eventId, authorUserId)).rejects.toThrow(
        EventAlreadyPublishedError,
      );
    });
  });

  describe('update', () => {
    it('disallows modifying immutable fields once PUBLISHED', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
      });

      await expect(
        service.update(eventId, {
          scopeType: EventScopeType.Parish,
          updatedByUserId: authorUserId,
        }),
      ).rejects.toThrow(EventNotEditableError);
    });

    it('significant update uses event pessimistic lock and captures recipient snapshot inside transaction before commit', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
        version: 1,
      });

      const result = await service.update(eventId, {
        venueName: 'New Cathedral Grounds',
        updatedByUserId: authorUserId,
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: eventId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(eventRegistrationService.listNotificationRecipientUserIds).toHaveBeenCalledWith(
        eventId,
        mockManager,
      );
      expect(result.event.version).toBe(2);
      expect(eventPublisher.publishCommunicationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'COMMUNICATION_EVENT.EVENT_UPDATED',
          operationKey: `EVENT_UPDATED:${eventId}:v2`,
          changeSummary: 'VENUE',
          registeredRecipientUserIds: ['user-1', 'user-2'],
        }),
      );

      // Verify execution order: snapshot inside transaction BEFORE commit, event published AFTER commit
      expect(executionLog).toEqual([
        'tx:start',
        'snapshot:recipients',
        'tx:commit',
        'event:published',
      ]);
    });

    it('minor update skips recipient snapshot and skips event emission', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
        version: 1,
      });

      const result = await service.update(eventId, {
        summary: 'Updated summary note only',
        updatedByUserId: authorUserId,
      });

      expect(result.event.version).toBe(1); // unchanged
      expect(eventRegistrationService.listNotificationRecipientUserIds).not.toHaveBeenCalled();
      expect(eventPublisher.publishCommunicationEvent).not.toHaveBeenCalled();
      expect(executionLog).toEqual(['tx:start', 'tx:commit']);
    });

    it('no post-commit registration re-query occurs after transaction commits', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
        version: 1,
      });

      await service.update(eventId, {
        venueName: 'New Venue',
        updatedByUserId: authorUserId,
      });

      expect(eventRegistrationService.listNotificationRecipientUserIds).toHaveBeenCalledTimes(1);
      expect(eventRegistrationService.listNotificationRecipientUserIds).toHaveBeenCalledWith(
        eventId,
        mockManager,
      );
    });

    it('disallows reducing capacity below current active registrations', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
        capacity: 50,
      });
      (eventRegistrationService.countActiveByEventId as jest.Mock).mockResolvedValue(25);

      await expect(
        service.update(eventId, {
          capacity: 20, // lower than 25 active
          updatedByUserId: authorUserId,
        }),
      ).rejects.toThrow(EventCapacityReachedError);
    });
  });

  describe('cancel', () => {
    it('cancellation uses event pessimistic lock, captures recipient snapshot inside transaction, and emits EventCancelledEvent post-commit without raw reason', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
        version: 1,
      });

      const result = await service.cancel(
        eventId,
        'Confidential reason with child student medical note.',
        authorUserId,
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: eventId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(eventRegistrationService.listNotificationRecipientUserIds).toHaveBeenCalledWith(
        eventId,
        mockManager,
      );
      expect(result.event.status).toBe(EventStatus.Cancelled);
      expect(result.event.version).toBe(2);

      // Verify execution order: snapshot inside transaction BEFORE commit, event published AFTER commit
      expect(executionLog).toEqual([
        'tx:start',
        'snapshot:recipients',
        'tx:commit',
        'event:published',
      ]);

      expect(eventPublisher.publishCommunicationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'COMMUNICATION_EVENT.EVENT_CANCELLED',
          operationKey: `EVENT_CANCELLED:${eventId}`,
          cancellationSummary: 'Event cancelled',
          registeredRecipientUserIds: ['user-1', 'user-2'],
        }),
      );

      const publishedPayload = eventPublisher.publishCommunicationEvent.mock.calls[0][0];
      expect(publishedPayload.cancellationReason).toBeUndefined();
      expect(publishedPayload.cancellationSummary).toBe('Event cancelled');
      expect(JSON.stringify(publishedPayload)).not.toContain(
        'Confidential reason with child student medical note.',
      );
    });

    it('no post-commit registration re-query on cancellation', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
        version: 1,
      });

      await service.cancel(eventId, 'Standard weather cancellation', authorUserId);

      expect(eventRegistrationService.listNotificationRecipientUserIds).toHaveBeenCalledTimes(1);
      expect(eventRegistrationService.listNotificationRecipientUserIds).toHaveBeenCalledWith(
        eventId,
        mockManager,
      );
    });
  });
});
