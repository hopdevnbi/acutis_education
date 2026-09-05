export class AnnouncementNotFoundError extends Error {
  constructor(message = 'Announcement not found.') {
    super(message);
    this.name = 'AnnouncementNotFoundError';
  }
}

export class InvalidAnnouncementTargetError extends Error {
  constructor(message = 'Invalid announcement target configuration.') {
    super(message);
    this.name = 'InvalidAnnouncementTargetError';
  }
}

export class InvalidAnnouncementTransitionError extends Error {
  constructor(message = 'Invalid announcement status transition.') {
    super(message);
    this.name = 'InvalidAnnouncementTransitionError';
  }
}

export class AnnouncementAccessDeniedError extends Error {
  constructor(message = 'Access to this announcement is denied.') {
    super(message);
    this.name = 'AnnouncementAccessDeniedError';
  }
}
