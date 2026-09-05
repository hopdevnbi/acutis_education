import type {
  NotificationDevicePlatform,
  NotificationDeviceProvider,
  NotificationSourceType,
  NotificationType,
} from '../enums/notification.enums';

export interface NotificationSnapshot {
  readonly id: string;
  readonly applicationEventId: string;
  readonly operationKey: string;
  readonly sourceType: NotificationSourceType;
  readonly sourceId: string;
  readonly notificationType: NotificationType;
  readonly title: string;
  readonly snippet: string;
  readonly actionUrl: string;
  readonly createdAt: Date;
}

export interface NotificationRecipientSnapshot {
  readonly id: string;
  readonly notificationId: string;
  readonly recipientUserId: string;
  readonly isRead: boolean;
  readonly readAt: Date | null;
  readonly isDismissed: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface NotificationDeviceSnapshot {
  readonly id: string;
  readonly userId: string;
  readonly platform: NotificationDevicePlatform;
  readonly provider: NotificationDeviceProvider;
  readonly token: string;
  readonly isActive: boolean;
  readonly appVersion: string | null;
  readonly locale: string | null;
  readonly lastSeenAt: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateNotificationInput {
  readonly applicationEventId: string;
  readonly operationKey: string;
  readonly sourceType: NotificationSourceType;
  readonly sourceId: string;
  readonly notificationType: NotificationType;
  readonly title: string;
  readonly snippet: string;
  readonly actionUrl: string;
}

export interface CreateNotificationRecipientInput {
  readonly notificationId: string;
  readonly recipientUserId: string;
}

export interface RegisterNotificationDeviceInput {
  readonly userId: string;
  readonly platform: NotificationDevicePlatform;
  readonly provider: NotificationDeviceProvider;
  readonly token: string;
  readonly appVersion?: string | null;
  readonly locale?: string | null;
}

export interface NotificationInboxItemSnapshot {
  readonly id: string; // primary item id = notificationId
  readonly notificationId: string;
  readonly type: NotificationType;
  readonly sourceType: NotificationSourceType;
  readonly sourceId: string;
  readonly title: string;
  readonly snippet: string;
  readonly actionUrl: string;
  readonly isRead: boolean;
  readonly readAt: Date | null;
  readonly createdAt: Date;
}

export interface NotificationInboxFilter {
  readonly page?: number;
  readonly limit?: number;
  readonly unreadOnly?: boolean;
  readonly type?: NotificationType;
  readonly sourceType?: NotificationSourceType;
}

export interface PaginatedNotificationInbox {
  readonly items: readonly NotificationInboxItemSnapshot[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
}

export interface NotificationHeaderCreationResult {
  readonly notification: NotificationSnapshot;
  readonly isNew: boolean;
}
