export class NotificationNotFoundError extends Error {
  constructor(message = 'Notification not found.') {
    super(message);
    this.name = 'NotificationNotFoundError';
  }
}

export class DuplicateNotificationError extends Error {
  constructor(message = 'A notification with this operation key or application event ID already exists.') {
    super(message);
    this.name = 'DuplicateNotificationError';
  }
}

export class NotificationRecipientNotFoundError extends Error {
  constructor(message = 'Notification recipient record not found.') {
    super(message);
    this.name = 'NotificationRecipientNotFoundError';
  }
}

export class NotificationDeviceNotFoundError extends Error {
  constructor(message = 'Notification device not found.') {
    super(message);
    this.name = 'NotificationDeviceNotFoundError';
  }
}

export class NotificationAccessDeniedError extends Error {
  constructor(message = 'Access to this notification resource is denied.') {
    super(message);
    this.name = 'NotificationAccessDeniedError';
  }
}
