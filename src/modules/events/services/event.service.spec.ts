import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
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
    repository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...mockDraftEntity, ...dto })),
      save: jest.fn().mockImplementation(async (entity) => entity),
      createQueryBuilder: jest.fn(),
    };

    eventTargetService = {
      replaceTargets: jest.fn().mockResolvedValue([]),
      listTargetsByEventId: jest.fn().mockResolvedValue([]),
    };

    eventRegistrationService = {
      countActiveByEventId: jest.fn().mockResolvedValue(10),
    };

    eventPublisher = {
      publishCommunicationEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventInternalService,
        { provide: getRepositoryToken(EventEntity), useValue: repository },
        { provide: EventTargetService, useValue: eventTargetService },
        { provide: EventRegistrationService, useValue: eventRegistrationService },
        { provide: APPLICATION_EVENT_PUBLISHER, useValue: eventPublisher },
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
    it('transitions DRAFT to PUBLISHED, sets version=1, and emits EventPublishedEvent post-commit', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({ ...mockDraftEntity });

      const result = await service.publish(eventId, authorUserId);

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

    it('emits EventUpdatedEvent and increments version on significant change when PUBLISHED', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
        version: 1,
      });

      const result = await service.update(eventId, {
        venueName: 'New Cathedral Grounds',
        updatedByUserId: authorUserId,
      });

      expect(result.event.version).toBe(2);
      expect(eventPublisher.publishCommunicationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'COMMUNICATION_EVENT.EVENT_UPDATED',
          operationKey: `EVENT_UPDATED:${eventId}:v2`,
          changeSummary: 'VENUE',
        }),
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
    it('transitions to CANCELLED, increments version, and emits EventCancelledEvent', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue({
        ...mockDraftEntity,
        status: EventStatus.Published,
        version: 1,
      });

      const result = await service.cancel(
        eventId,
        'Due to extreme typhoon warning.',
        authorUserId,
      );

      expect(result.event.status).toBe(EventStatus.Cancelled);
      expect(result.event.version).toBe(2);
      expect(eventPublisher.publishCommunicationEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'COMMUNICATION_EVENT.EVENT_CANCELLED',
          operationKey: `EVENT_CANCELLED:${eventId}`,
        }),
      );
    });
  });
});
