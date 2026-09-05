export class EventNotFoundError extends Error {
  constructor(message = 'Event not found.') {
    super(message);
    this.name = 'EventNotFoundError';
  }
}

export class EventCodeConflictError extends Error {
  constructor(message = 'An event with this code already exists.') {
    super(message);
    this.name = 'EventCodeConflictError';
  }
}

export class InvalidEventScopeError extends Error {
  constructor(message = 'Invalid event scope configuration.') {
    super(message);
    this.name = 'InvalidEventScopeError';
  }
}

export class InvalidEventTransitionError extends Error {
  constructor(message = 'Invalid event status transition.') {
    super(message);
    this.name = 'InvalidEventTransitionError';
  }
}

export class InvalidEventRegistrationError extends Error {
  constructor(message = 'Invalid event registration configuration.') {
    super(message);
    this.name = 'InvalidEventRegistrationError';
  }
}

export class EventRegistrationConflictError extends Error {
  constructor(message = 'Registrant is already registered for this event.') {
    super(message);
    this.name = 'EventRegistrationConflictError';
  }
}

export class EventAccessDeniedError extends Error {
  constructor(message = 'Access to this event is denied.') {
    super(message);
    this.name = 'EventAccessDeniedError';
  }
}
