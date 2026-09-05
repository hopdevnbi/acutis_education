export class CmsEntryNotFoundError extends Error {
  constructor(message = 'CMS entry not found.') {
    super(message);
    this.name = 'CmsEntryNotFoundError';
  }
}

export class CmsSlugConflictError extends Error {
  constructor(message = 'A CMS entry with this slug already exists within scope.') {
    super(message);
    this.name = 'CmsSlugConflictError';
  }
}

export class CmsEntryNotEditableError extends Error {
  constructor(message = 'CMS entry cannot be edited in its current lifecycle state.') {
    super(message);
    this.name = 'CmsEntryNotEditableError';
  }
}

export class InvalidCmsTransitionError extends Error {
  constructor(message = 'Invalid CMS entry status transition.') {
    super(message);
    this.name = 'InvalidCmsTransitionError';
  }
}

export class InvalidCmsLifecycleTransitionError extends Error {
  constructor(message = 'Invalid CMS entry lifecycle transition.') {
    super(message);
    this.name = 'InvalidCmsLifecycleTransitionError';
  }
}

export class InvalidCmsScopeError extends Error {
  constructor(message = 'Invalid CMS scope configuration.') {
    super(message);
    this.name = 'InvalidCmsScopeError';
  }
}

export class InvalidCmsScheduleError extends Error {
  constructor(message = 'Invalid CMS schedule configuration.') {
    super(message);
    this.name = 'InvalidCmsScheduleError';
  }
}

export class InvalidCmsSlugError extends Error {
  constructor(message = 'Invalid CMS slug format.') {
    super(message);
    this.name = 'InvalidCmsSlugError';
  }
}

export class CmsAccessDeniedError extends Error {
  constructor(message = 'Access to this CMS resource is denied.') {
    super(message);
    this.name = 'CmsAccessDeniedError';
  }
}

export class CmsScopeAccessDeniedError extends Error {
  constructor(message = 'Access to this CMS scope is denied.') {
    super(message);
    this.name = 'CmsScopeAccessDeniedError';
  }
}
