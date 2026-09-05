import {
  NotificationDevicePlatform,
  NotificationDeviceProvider,
} from '../enums/notification.enums';

export const NOTIFICATIONS_READ_PERMISSION = 'notifications.read' as const;
export const NOTIFICATIONS_DEVICES_PERMISSION = 'notifications.devices' as const;

export const NOTIFICATIONS_PERMISSIONS = [
  NOTIFICATIONS_READ_PERMISSION,
  NOTIFICATIONS_DEVICES_PERMISSION,
] as const;

export const NOTIFICATION_TITLE_MAX_LENGTH = 200 as const;
export const NOTIFICATION_SNIPPET_MAX_LENGTH = 500 as const;
export const NOTIFICATION_ACTION_URL_MAX_LENGTH = 500 as const;
export const NOTIFICATION_DEVICE_TOKEN_MAX_LENGTH = 500 as const;

export const NOTIFICATION_RECIPIENT_BATCH_SIZE = 250 as const;
export const NOTIFICATION_GLOBAL_PAGE_SIZE = 500 as const;

export const VALID_DEVICE_PLATFORM_PROVIDERS: Record<
  NotificationDevicePlatform,
  readonly NotificationDeviceProvider[]
> = {
  [NotificationDevicePlatform.Ios]: [
    NotificationDeviceProvider.Expo,
    NotificationDeviceProvider.Apns,
  ],
  [NotificationDevicePlatform.Android]: [
    NotificationDeviceProvider.Expo,
    NotificationDeviceProvider.Fcm,
  ],
  [NotificationDevicePlatform.Web]: [NotificationDeviceProvider.WebPush],
};
