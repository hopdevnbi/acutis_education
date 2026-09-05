import {
  COMMUNICATION_EVENT_TYPES,
  type AnnouncementPublishedEvent,
  type EventCancelledEvent,
  type EventPublishedEvent,
  type EventUpdatedEvent,
} from '../../application-events/contracts/communication-events.contract';
import { ApplicationEventBus } from '../../application-events/services/application-event-bus.service';
import {
  NotificationSourceType,
  NotificationType,
} from '../enums/notification.enums';
import { NotificationAudienceResolver } from '../services/notification-audience.resolver';
import { NotificationRecipientService } from '../services/notification-recipient.service';
import { NotificationInternalService } from '../services/notification.service';
import { CommunicationNotificationHandler } from './communication-notification.handler';

describe('CommunicationNotificationHandler', () => {
  let handler: CommunicationNotificationHandler;
  let eventBus: jest.Mocked<ApplicationEventBus>;
  let audienceResolver: jest.Mocked<NotificationAudienceResolver>;
  let notificationInternalService: jest.Mocked<NotificationInternalService>;
  let notificationRecipientService: jest.Mocked<NotificationRecipientService>;

  const mockDate = new Date('2026-09-01T00:00:00.000Z');

  beforeEach(() => {
    eventBus = {
      registerCommunicationHandler: jest.fn(),
    } as unknown as jest.Mocked<ApplicationEventBus>;

    audienceResolver = {
      expandTargets: jest.fn(),
    } as unknown as jest.Mocked<NotificationAudienceResolver>;

    notificationInternalService = {
      createOrGetHeader: jest.fn(),
    } as unknown as jest.Mocked<NotificationInternalService>;

    notificationRecipientService = {
      fanOutRecipients: jest.fn(),
    } as unknown as jest.Mocked<NotificationRecipientService>;

    handler = new CommunicationNotificationHandler(
      eventBus,
      audienceResolver,
      notificationInternalService,
      notificationRecipientService,
    );
  });

  it('registers itself with ApplicationEventBus onModuleInit', () => {
    handler.onModuleInit();
    expect(eventBus.registerCommunicationHandler).toHaveBeenCalledWith(handler);
  });

  describe('handle AnnouncementPublishedEvent', () => {
    it('expands targets, creates idempotent header, and fans out recipients', async () => {
      const event: AnnouncementPublishedEvent = {
        applicationEventId: 'a0000000-0000-0000-0000-000000000001',
        operationKey: 'ANNOUNCEMENT_PUBLISHED:ann-1',
        eventType: COMMUNICATION_EVENT_TYPES.AnnouncementPublished,
        announcementId: 'b0000000-0000-0000-0000-000000000001',
        title: 'Parish Festival Announcement',
        snippet: 'Join us this weekend',
        priority: 'NORMAL',
        targets: [{ targetType: 'GLOBAL' }],
        occurredAt: mockDate,
        publishedAt: mockDate,
      };

      const resolvedUserIds = new Set([
        'c0000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000002',
      ]);
      audienceResolver.expandTargets.mockResolvedValue(resolvedUserIds);

      const mockHeader = {
        id: 'd0000000-0000-0000-0000-000000000001',
        applicationEventId: event.applicationEventId,
        operationKey: event.operationKey,
        sourceType: NotificationSourceType.Announcement,
        sourceId: event.announcementId,
        notificationType: NotificationType.AnnouncementPublished,
        title: event.title,
        snippet: event.snippet,
        actionUrl: `/announcements/${event.announcementId}`,
        createdAt: mockDate,
      };
      notificationInternalService.createOrGetHeader.mockResolvedValue({
        notification: mockHeader,
        isNew: true,
      });
      notificationRecipientService.fanOutRecipients.mockResolvedValue(2);

      await handler.handle(event);

      expect(audienceResolver.expandTargets).toHaveBeenCalledWith(event.targets);
      expect(notificationInternalService.createOrGetHeader).toHaveBeenCalledWith({
        applicationEventId: event.applicationEventId,
        operationKey: event.operationKey,
        sourceType: NotificationSourceType.Announcement,
        sourceId: event.announcementId,
        notificationType: NotificationType.AnnouncementPublished,
        title: event.title,
        snippet: event.snippet,
        actionUrl: `/announcements/${event.announcementId}`,
      });
      expect(notificationRecipientService.fanOutRecipients).toHaveBeenCalledWith(
        mockHeader.id,
        Array.from(resolvedUserIds),
      );
    });
  });

  describe('handle EventPublishedEvent', () => {
    it('expands targets, creates idempotent header, and fans out recipients', async () => {
      const event: EventPublishedEvent = {
        applicationEventId: 'a0000000-0000-0000-0000-000000000002',
        operationKey: 'EVENT_PUBLISHED:evt-1',
        eventType: COMMUNICATION_EVENT_TYPES.EventPublished,
        eventId: 'b0000000-0000-0000-0000-000000000002',
        title: 'Youth Camp 2026',
        snippet: 'Registration is now open',
        startsAt: mockDate,
        venueName: 'Camp Hall',
        targets: [{ targetType: 'PARISH', parishId: 'p0000000-0000-0000-0000-000000000001' }],
        occurredAt: mockDate,
        publishedAt: mockDate,
      };

      const resolvedUserIds = new Set(['c0000000-0000-0000-0000-000000000001']);
      audienceResolver.expandTargets.mockResolvedValue(resolvedUserIds);

      notificationInternalService.createOrGetHeader.mockResolvedValue({
        notification: {
          id: 'd0000000-0000-0000-0000-000000000002',
          applicationEventId: event.applicationEventId,
          operationKey: event.operationKey,
          sourceType: NotificationSourceType.Event,
          sourceId: event.eventId,
          notificationType: NotificationType.EventPublished,
          title: event.title,
          snippet: event.snippet,
          actionUrl: `/events/${event.eventId}`,
          createdAt: mockDate,
        },
        isNew: true,
      });

      await handler.handle(event);

      expect(audienceResolver.expandTargets).toHaveBeenCalledWith(event.targets);
      expect(notificationRecipientService.fanOutRecipients).toHaveBeenCalledWith(
        'd0000000-0000-0000-0000-000000000002',
        ['c0000000-0000-0000-0000-000000000001'],
      );
    });
  });

  describe('handle EventUpdatedEvent (target UNION registeredRecipientUserIds)', () => {
    it('unions target expansion with atomic registeredRecipientUserIds snapshot', async () => {
      const event: EventUpdatedEvent = {
        applicationEventId: 'a0000000-0000-0000-0000-000000000003',
        operationKey: 'EVENT_UPDATED:evt-1:v2',
        eventType: COMMUNICATION_EVENT_TYPES.EventUpdated,
        eventId: 'b0000000-0000-0000-0000-000000000002',
        version: 2,
        title: 'Youth Camp 2026',
        changeSummary: 'VENUE: Camp Hall B',
        startsAt: mockDate,
        venueName: 'Camp Hall B',
        targets: [{ targetType: 'CLASS', classId: 'c0000000-0000-0000-0000-000000000010' }],
        registeredRecipientUserIds: [
          'r0000000-0000-0000-0000-000000000001', // Historical registrant outside current class
          't0000000-0000-0000-0000-000000000001', // Overlaps with target
        ],
        occurredAt: mockDate,
        updatedAt: mockDate,
      };

      const targetUserIds = new Set([
        't0000000-0000-0000-0000-000000000001',
        't0000000-0000-0000-0000-000000000002',
      ]);
      audienceResolver.expandTargets.mockResolvedValue(targetUserIds);

      notificationInternalService.createOrGetHeader.mockResolvedValue({
        notification: {
          id: 'd0000000-0000-0000-0000-000000000003',
          applicationEventId: event.applicationEventId,
          operationKey: event.operationKey,
          sourceType: NotificationSourceType.Event,
          sourceId: event.eventId,
          notificationType: NotificationType.EventUpdated,
          title: event.title,
          snippet: event.changeSummary,
          actionUrl: `/events/${event.eventId}`,
          createdAt: mockDate,
        },
        isNew: true,
      });

      await handler.handle(event);

      // Total recipients should be 3: t1, t2, and r1 (deduped union)
      expect(notificationRecipientService.fanOutRecipients).toHaveBeenCalledWith(
        'd0000000-0000-0000-0000-000000000003',
        expect.arrayContaining([
          't0000000-0000-0000-0000-000000000001',
          't0000000-0000-0000-0000-000000000002',
          'r0000000-0000-0000-0000-000000000001',
        ]),
      );
    });
  });

  describe('handle EventCancelledEvent (privacy safe summary + union)', () => {
    it('uses safe cancellationSummary and unions targets with registered recipients', async () => {
      const event: EventCancelledEvent = {
        applicationEventId: 'a0000000-0000-0000-0000-000000000004',
        operationKey: 'EVENT_CANCELLED:evt-1',
        eventType: COMMUNICATION_EVENT_TYPES.EventCancelled,
        eventId: 'b0000000-0000-0000-0000-000000000002',
        title: 'Youth Camp 2026',
        cancellationSummary: 'Event cancelled', // Safe summary!
        targets: [],
        registeredRecipientUserIds: ['r0000000-0000-0000-0000-000000000001'],
        occurredAt: mockDate,
        cancelledAt: mockDate,
      };

      audienceResolver.expandTargets.mockResolvedValue(new Set());

      notificationInternalService.createOrGetHeader.mockResolvedValue({
        notification: {
          id: 'd0000000-0000-0000-0000-000000000004',
          applicationEventId: event.applicationEventId,
          operationKey: event.operationKey,
          sourceType: NotificationSourceType.Event,
          sourceId: event.eventId,
          notificationType: NotificationType.EventCancelled,
          title: event.title,
          snippet: 'Event cancelled',
          actionUrl: `/events/${event.eventId}`,
          createdAt: mockDate,
        },
        isNew: true,
      });

      await handler.handle(event);

      expect(notificationInternalService.createOrGetHeader).toHaveBeenCalledWith({
        applicationEventId: event.applicationEventId,
        operationKey: event.operationKey,
        sourceType: NotificationSourceType.Event,
        sourceId: event.eventId,
        notificationType: NotificationType.EventCancelled,
        title: event.title,
        snippet: 'Event cancelled',
        actionUrl: `/events/${event.eventId}`,
      });
      expect(notificationRecipientService.fanOutRecipients).toHaveBeenCalledWith(
        'd0000000-0000-0000-0000-000000000004',
        ['r0000000-0000-0000-0000-000000000001'],
      );
    });
  });

  describe('zero-recipient behavior', () => {
    it('persists header even when recipient set is empty', async () => {
      const event: AnnouncementPublishedEvent = {
        applicationEventId: 'a0000000-0000-0000-0000-000000000005',
        operationKey: 'ANNOUNCEMENT_PUBLISHED:empty-1',
        eventType: COMMUNICATION_EVENT_TYPES.AnnouncementPublished,
        announcementId: 'b0000000-0000-0000-0000-000000000005',
        title: 'Empty Audience',
        snippet: 'Nobody here',
        priority: 'LOW',
        targets: [],
        occurredAt: mockDate,
        publishedAt: mockDate,
      };

      audienceResolver.expandTargets.mockResolvedValue(new Set());
      notificationInternalService.createOrGetHeader.mockResolvedValue({
        notification: {
          id: 'd0000000-0000-0000-0000-000000000005',
          applicationEventId: event.applicationEventId,
          operationKey: event.operationKey,
          sourceType: NotificationSourceType.Announcement,
          sourceId: event.announcementId,
          notificationType: NotificationType.AnnouncementPublished,
          title: event.title,
          snippet: event.snippet,
          actionUrl: `/announcements/${event.announcementId}`,
          createdAt: mockDate,
        },
        isNew: true,
      });

      await handler.handle(event);

      expect(notificationInternalService.createOrGetHeader).toHaveBeenCalled();
      expect(notificationRecipientService.fanOutRecipients).toHaveBeenCalledWith(
        'd0000000-0000-0000-0000-000000000005',
        [],
      );
    });
  });

  describe('unknown event type', () => {
    it('safely ignores unknown event types without throwing', async () => {
      await expect(
        handler.handle({
          eventType: 'UNKNOWN_CUSTOM_EVENT' as any,
          applicationEventId: 'x0000000-0000-0000-0000-000000000001',
          operationKey: 'UNKNOWN:1',
          occurredAt: mockDate,
        } as any),
      ).resolves.not.toThrow();
    });
  });
});
