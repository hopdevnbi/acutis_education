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

export class InvalidCmsScopeError extends Error {
  constructor(message = 'Invalid CMS scope configuration.') {
    super(message);
    this.name = 'InvalidCmsScopeError';
  }
}

export class InvalidCmsTransitionError extends Error {
  constructor(message = 'Invalid CMS entry status transition.') {
    super(message);
    this.name = 'InvalidCmsTransitionError';
  }
}

export class CmsAccessDeniedError extends Error {
  constructor(message = 'Access to this CMS resource is denied.') {
    super(message);
    this.name = 'CmsAccessDeniedError';
  }
}
