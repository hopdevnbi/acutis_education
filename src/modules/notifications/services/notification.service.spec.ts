import {
  NotificationDevicePlatform,
  NotificationDeviceProvider,
  NotificationSourceType,
  NotificationType,
} from '../enums/notification.enums';

describe('NotificationEnumsAndContracts', () => {
  it('contains expected NotificationSourceType values', () => {
    expect(Object.values(NotificationSourceType)).toEqual(
      expect.arrayContaining(['ANNOUNCEMENT', 'EVENT', 'SYSTEM']),
    );
  });

  it('contains expected NotificationType values', () => {
    expect(Object.values(NotificationType)).toEqual(
      expect.arrayContaining([
        'ANNOUNCEMENT_PUBLISHED',
        'EVENT_PUBLISHED',
        'EVENT_UPDATED',
        'EVENT_CANCELLED',
      ]),
    );
  });

  it('contains expected NotificationDevicePlatform values', () => {
    expect(Object.values(NotificationDevicePlatform)).toEqual(
      expect.arrayContaining(['IOS', 'ANDROID', 'WEB']),
    );
  });

  it('contains expected NotificationDeviceProvider values', () => {
    expect(Object.values(NotificationDeviceProvider)).toEqual(
      expect.arrayContaining(['EXPO', 'FCM', 'APNS', 'WEB_PUSH']),
    );
  });
});
