export enum NotificationSourceType {
  Announcement = 'ANNOUNCEMENT',
  Event = 'EVENT',
  System = 'SYSTEM',
}

export enum NotificationType {
  AnnouncementPublished = 'ANNOUNCEMENT_PUBLISHED',
  EventPublished = 'EVENT_PUBLISHED',
  EventUpdated = 'EVENT_UPDATED',
  EventCancelled = 'EVENT_CANCELLED',
}

export enum NotificationDevicePlatform {
  Ios = 'IOS',
  Android = 'ANDROID',
  Web = 'WEB',
}

export enum NotificationDeviceProvider {
  Expo = 'EXPO',
  Fcm = 'FCM',
  Apns = 'APNS',
  WebPush = 'WEB_PUSH',
}
