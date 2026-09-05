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

export class AnnouncementTargetNotAllowedError extends Error {
  constructor(message = 'You are not authorized to target this scope.') {
    super(message);
    this.name = 'AnnouncementTargetNotAllowedError';
  }
}

export class InvalidAnnouncementTransitionError extends Error {
  constructor(message = 'Invalid announcement status transition.') {
    super(message);
    this.name = 'InvalidAnnouncementTransitionError';
  }
}

export class AnnouncementAlreadyPublishedError extends Error {
  constructor(message = 'Announcement is already published.') {
    super(message);
    this.name = 'AnnouncementAlreadyPublishedError';
  }
}

export class AnnouncementAlreadyArchivedError extends Error {
  constructor(message = 'Announcement is already archived.') {
    super(message);
    this.name = 'AnnouncementAlreadyArchivedError';
  }
}

export class AnnouncementNotEditableError extends Error {
  constructor(message = 'Announcement cannot be edited in its current lifecycle state.') {
    super(message);
    this.name = 'AnnouncementNotEditableError';
  }
}

export class InvalidAnnouncementScheduleError extends Error {
  constructor(message = 'Invalid announcement display schedule.') {
    super(message);
    this.name = 'InvalidAnnouncementScheduleError';
  }
}

export class AnnouncementAccessDeniedError extends Error {
  constructor(message = 'Access to this announcement resource is denied.') {
    super(message);
    this.name = 'AnnouncementAccessDeniedError';
  }
}
