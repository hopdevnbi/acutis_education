import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { isUuidV4, normalizeUuid } from '../../../database/uuid-v4.util';
import {
  COMMUNICATION_EVENT_TYPES,
  type AnnouncementPublishedEvent,
  type CommunicationApplicationEvent,
  type EventCancelledEvent,
  type EventPublishedEvent,
  type EventUpdatedEvent,
} from '../../application-events/contracts/communication-events.contract';
import type { CommunicationEventHandler } from '../../application-events/ports/application-event.ports';
import { ApplicationEventBus } from '../../application-events/services/application-event-bus.service';
import {
  NotificationSourceType,
  NotificationType,
} from '../enums/notification.enums';
import { NotificationAudienceResolver } from '../services/notification-audience.resolver';
import { NotificationRecipientService } from '../services/notification-recipient.service';
import { NotificationInternalService } from '../services/notification.service';

@Injectable()
export class CommunicationNotificationHandler
  implements CommunicationEventHandler, OnModuleInit
{
  private readonly logger = new Logger(CommunicationNotificationHandler.name);

  constructor(
    private readonly applicationEventBus: ApplicationEventBus,
    private readonly audienceResolver: NotificationAudienceResolver,
    private readonly notificationInternalService: NotificationInternalService,
    private readonly notificationRecipientService: NotificationRecipientService,
  ) {}

  onModuleInit(): void {
    this.applicationEventBus.registerCommunicationHandler(this);
    this.logger.log('Registered CommunicationNotificationHandler with ApplicationEventBus.');
  }

  async handle(event: CommunicationApplicationEvent): Promise<void> {
    switch (event.eventType) {
      case COMMUNICATION_EVENT_TYPES.AnnouncementPublished:
        await this.handleAnnouncementPublished(event as AnnouncementPublishedEvent);
        break;

      case COMMUNICATION_EVENT_TYPES.EventPublished:
        await this.handleEventPublished(event as EventPublishedEvent);
        break;

      case COMMUNICATION_EVENT_TYPES.EventUpdated:
        await this.handleEventUpdated(event as EventUpdatedEvent);
        break;

      case COMMUNICATION_EVENT_TYPES.EventCancelled:
        await this.handleEventCancelled(event as EventCancelledEvent);
        break;

      default:
        this.logger.debug({
          action: 'communication_notification_handler.ignored_event_type',
          eventType: (event as { eventType?: string }).eventType,
          applicationEventId: (event as { applicationEventId?: string }).applicationEventId,
        });
        break;
    }
  }

  /**
   * ANNOUNCEMENT_PUBLISHED fan-out:
   * Expands targets -> creates/reuses header -> fans out to target recipients.
   */
  private async handleAnnouncementPublished(
    event: AnnouncementPublishedEvent,
  ): Promise<void> {
    // 1. Resolve recipients via target expansion
    const targetUserIds = await this.audienceResolver.expandTargets(event.targets ?? []);

    // 2. Idempotently create/get notification header
    const { notification } = await this.notificationInternalService.createOrGetHeader({
      applicationEventId: event.applicationEventId,
      operationKey: event.operationKey,
      sourceType: NotificationSourceType.Announcement,
      sourceId: event.announcementId,
      notificationType: NotificationType.AnnouncementPublished,
      title: event.title,
      snippet: event.snippet,
      actionUrl: `/announcements/${event.announcementId}`,
    });

    // 3. Idempotently fan-out recipients (supports partial-failure retry reconciliation)
    await this.notificationRecipientService.fanOutRecipients(
      notification.id,
      Array.from(targetUserIds),
    );

    this.logger.log({
      action: 'notification.announcement_published.processed',
      notificationId: notification.id,
      recipientCount: targetUserIds.size,
      operationKey: event.operationKey,
    });
  }

  /**
   * EVENT_PUBLISHED fan-out:
   * Expands targets -> creates/reuses header -> fans out to target recipients.
   */
  private async handleEventPublished(event: EventPublishedEvent): Promise<void> {
    // 1. Resolve recipients via target expansion
    const targetUserIds = await this.audienceResolver.expandTargets(event.targets ?? []);

    // 2. Idempotently create/get notification header
    const { notification } = await this.notificationInternalService.createOrGetHeader({
      applicationEventId: event.applicationEventId,
      operationKey: event.operationKey,
      sourceType: NotificationSourceType.Event,
      sourceId: event.eventId,
      notificationType: NotificationType.EventPublished,
      title: event.title,
      snippet: event.snippet,
      actionUrl: `/events/${event.eventId}`,
    });

    // 3. Idempotently fan-out recipients
    await this.notificationRecipientService.fanOutRecipients(
      notification.id,
      Array.from(targetUserIds),
    );

    this.logger.log({
      action: 'notification.event_published.processed',
      notificationId: notification.id,
      recipientCount: targetUserIds.size,
      operationKey: event.operationKey,
    });
  }

  /**
   * EVENT_UPDATED fan-out:
   * Expands targets UNION registeredRecipientUserIds snapshot -> creates/reuses header -> fans out.
   */
  private async handleEventUpdated(event: EventUpdatedEvent): Promise<void> {
    // 1. Resolve target audience
    const targetUserIds = await this.audienceResolver.expandTargets(event.targets ?? []);

    // 2. UNION with registered recipient user IDs snapshot (preserves historical registrants)
    const combinedRecipientUserIds = new Set<string>(targetUserIds);
    for (const rawUserId of event.registeredRecipientUserIds ?? []) {
      if (rawUserId && isUuidV4(rawUserId)) {
        combinedRecipientUserIds.add(normalizeUuid(rawUserId));
      }
    }

    // 3. Idempotently create/get notification header
    const { notification } = await this.notificationInternalService.createOrGetHeader({
      applicationEventId: event.applicationEventId,
      operationKey: event.operationKey,
      sourceType: NotificationSourceType.Event,
      sourceId: event.eventId,
      notificationType: NotificationType.EventUpdated,
      title: event.title,
      snippet: event.changeSummary,
      actionUrl: `/events/${event.eventId}`,
    });

    // 4. Idempotently fan-out recipients
    await this.notificationRecipientService.fanOutRecipients(
      notification.id,
      Array.from(combinedRecipientUserIds),
    );

    this.logger.log({
      action: 'notification.event_updated.processed',
      notificationId: notification.id,
      recipientCount: combinedRecipientUserIds.size,
      operationKey: event.operationKey,
    });
  }

  /**
   * EVENT_CANCELLED fan-out:
   * Expands targets UNION registeredRecipientUserIds snapshot -> creates/reuses header -> fans out.
   * Privacy safe: uses event.cancellationSummary ('Event cancelled'), NEVER raw cancellationReason.
   */
  private async handleEventCancelled(event: EventCancelledEvent): Promise<void> {
    // 1. Resolve target audience
    const targetUserIds = await this.audienceResolver.expandTargets(event.targets ?? []);

    // 2. UNION with registered recipient user IDs snapshot (preserves historical registrants)
    const combinedRecipientUserIds = new Set<string>(targetUserIds);
    for (const rawUserId of event.registeredRecipientUserIds ?? []) {
      if (rawUserId && isUuidV4(rawUserId)) {
        combinedRecipientUserIds.add(normalizeUuid(rawUserId));
      }
    }

    // 3. Idempotently create/get notification header
    const { notification } = await this.notificationInternalService.createOrGetHeader({
      applicationEventId: event.applicationEventId,
      operationKey: event.operationKey,
      sourceType: NotificationSourceType.Event,
      sourceId: event.eventId,
      notificationType: NotificationType.EventCancelled,
      title: event.title,
      snippet: event.cancellationSummary,
      actionUrl: `/events/${event.eventId}`,
    });

    // 4. Idempotently fan-out recipients
    await this.notificationRecipientService.fanOutRecipients(
      notification.id,
      Array.from(combinedRecipientUserIds),
    );

    this.logger.log({
      action: 'notification.event_cancelled.processed',
      notificationId: notification.id,
      recipientCount: combinedRecipientUserIds.size,
      operationKey: event.operationKey,
    });
  }
}
