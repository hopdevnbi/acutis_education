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
