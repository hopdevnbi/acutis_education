import { Injectable } from '@nestjs/common';
import type {
  CreateNotificationInput,
  CreateNotificationRecipientInput,
  NotificationDeviceSnapshot,
  NotificationHeaderCreationResult,
  NotificationInboxFilter,
  NotificationInboxItemSnapshot,
  NotificationRecipientSnapshot,
  NotificationSnapshot,
  PaginatedNotificationInbox,
  RegisterNotificationDeviceInput,
} from './interfaces/notification.interfaces';
import { NotificationDeviceService } from './services/notification-device.service';
import { NotificationRecipientService } from './services/notification-recipient.service';
import { NotificationInternalService } from './services/notification.service';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationInternalService: NotificationInternalService,
    private readonly notificationRecipientService: NotificationRecipientService,
    private readonly notificationDeviceService: NotificationDeviceService,
  ) {}

  async createOrGetHeader(
    input: CreateNotificationInput,
  ): Promise<NotificationHeaderCreationResult> {
    return this.notificationInternalService.createOrGetHeader(input);
  }

  async createNotification(input: CreateNotificationInput): Promise<NotificationSnapshot> {
    return this.notificationInternalService.create(input);
  }

  async getNotificationById(id: string): Promise<NotificationSnapshot> {
    return this.notificationInternalService.getById(id);
  }

  async findNotificationByOperationKey(
    operationKey: string,
  ): Promise<NotificationSnapshot | null> {
    return this.notificationInternalService.findByOperationKey(operationKey);
  }

  async fanOutRecipients(
    notificationId: string,
    recipientUserIds: readonly string[],
  ): Promise<number> {
    return this.notificationRecipientService.fanOutRecipients(
      notificationId,
      recipientUserIds,
    );
  }

  async listUserInbox(
    recipientUserId: string,
    filter?: NotificationInboxFilter,
  ): Promise<PaginatedNotificationInbox> {
    return this.notificationRecipientService.listUserInbox(recipientUserId, filter);
  }

  async getUnreadCount(recipientUserId: string): Promise<number> {
    return this.notificationRecipientService.getUnreadCount(recipientUserId);
  }

  async markRead(
    notificationId: string,
    recipientUserId: string,
  ): Promise<NotificationInboxItemSnapshot> {
    return this.notificationRecipientService.markRead(notificationId, recipientUserId);
  }

  async markAllRead(recipientUserId: string): Promise<number> {
    return this.notificationRecipientService.markAllRead(recipientUserId);
  }

  async registerDevice(
    input: RegisterNotificationDeviceInput,
  ): Promise<NotificationDeviceSnapshot> {
    return this.notificationDeviceService.registerDevice(input);
  }

  async deactivateDeviceById(
    deviceId: string,
    userId: string,
  ): Promise<NotificationDeviceSnapshot> {
    return this.notificationDeviceService.deactivateDeviceById(deviceId, userId);
  }

  // --- Backward compatibility methods ---

  async addRecipient(
    input: CreateNotificationRecipientInput,
  ): Promise<NotificationRecipientSnapshot> {
    return this.notificationRecipientService.addRecipient(input);
  }

  async addRecipientsBatch(
    notificationId: string,
    recipientUserIds: readonly string[],
  ): Promise<readonly NotificationRecipientSnapshot[]> {
    return this.notificationRecipientService.addRecipientsBatch(
      notificationId,
      recipientUserIds,
    );
  }

  async markDismissed(
    notificationId: string,
    recipientUserId: string,
  ): Promise<NotificationRecipientSnapshot> {
    return this.notificationRecipientService.markDismissed(notificationId, recipientUserId);
  }

  async listUserRecipients(
    recipientUserId: string,
    options?: { readonly limit?: number; readonly unreadOnly?: boolean },
  ): Promise<readonly NotificationRecipientSnapshot[]> {
    return this.notificationRecipientService.listUserRecipients(recipientUserId, options);
  }

  async deactivateDevice(token: string): Promise<void> {
    return this.notificationDeviceService.deactivateDevice(token);
  }

  async listActiveDevices(userId: string): Promise<readonly NotificationDeviceSnapshot[]> {
    return this.notificationDeviceService.listActiveDevicesByUser(userId);
  }
}
