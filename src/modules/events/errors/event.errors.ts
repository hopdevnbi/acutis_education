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

export class EventTargetNotAllowedError extends Error {
  constructor(message = 'You are not authorized to target this scope.') {
    super(message);
    this.name = 'EventTargetNotAllowedError';
  }
}

export class InvalidEventTransitionError extends Error {
  constructor(message = 'Invalid event status transition.') {
    super(message);
    this.name = 'InvalidEventTransitionError';
  }
}

export class EventAlreadyPublishedError extends Error {
  constructor(message = 'Event is already published.') {
    super(message);
    this.name = 'EventAlreadyPublishedError';
  }
}

export class EventAlreadyCancelledError extends Error {
  constructor(message = 'Event is already cancelled.') {
    super(message);
    this.name = 'EventAlreadyCancelledError';
  }
}

export class EventAlreadyCompletedError extends Error {
  constructor(message = 'Event is already completed.') {
    super(message);
    this.name = 'EventAlreadyCompletedError';
  }
}

export class EventAlreadyArchivedError extends Error {
  constructor(message = 'Event is already archived.') {
    super(message);
    this.name = 'EventAlreadyArchivedError';
  }
}

export class EventNotEditableError extends Error {
  constructor(message = 'Event cannot be edited in its current lifecycle state.') {
    super(message);
    this.name = 'EventNotEditableError';
  }
}

export class InvalidEventRegistrationError extends Error {
  constructor(message = 'Invalid event registration configuration.') {
    super(message);
    this.name = 'InvalidEventRegistrationError';
  }
}

export class EventNotRegistrableError extends Error {
  constructor(message = 'Event is not accepting registrations.') {
    super(message);
    this.name = 'EventNotRegistrableError';
  }
}

export class EventCapacityReachedError extends Error {
  constructor(message = 'Event has reached its maximum registration capacity.') {
    super(message);
    this.name = 'EventCapacityReachedError';
  }
}

export class EventAlreadyRegisteredError extends Error {
  constructor(message = 'Registrant is already actively registered for this event.') {
    super(message);
    this.name = 'EventAlreadyRegisteredError';
  }
}

export class EventRegistrationConflictError extends Error {
  constructor(message = 'Registration conflicts with existing registration status.') {
    super(message);
    this.name = 'EventRegistrationConflictError';
  }
}

export class EventRegistrationNotFoundError extends Error {
  constructor(message = 'Event registration not found.') {
    super(message);
    this.name = 'EventRegistrationNotFoundError';
  }
}

export class EventRegistrationCannotCancelError extends Error {
  constructor(message = 'Registration cannot be cancelled in its current state.') {
    super(message);
    this.name = 'EventRegistrationCannotCancelError';
  }
}

export class EventCheckInNotAllowedError extends Error {
  constructor(message = 'Check-in is not permitted for this registration.') {
    super(message);
    this.name = 'EventCheckInNotAllowedError';
  }
}

export class EventAccessDeniedError extends Error {
  constructor(message = 'Access to this event is denied.') {
    super(message);
    this.name = 'EventAccessDeniedError';
  }
}
