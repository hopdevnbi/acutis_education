export class InvalidRoleCodeError extends Error {
  constructor() {
    super('Role code is invalid.');
    this.name = 'InvalidRoleCodeError';
  }
}

export class InvalidPermissionCodeError extends Error {
  constructor() {
    super('Permission code is invalid.');
    this.name = 'InvalidPermissionCodeError';
  }
}

export class RoleCodeAlreadyExistsError extends Error {
  constructor(code: string) {
    super(`Role code "${code}" already exists.`);
    this.name = 'RoleCodeAlreadyExistsError';
  }
}

export class PermissionCodeAlreadyExistsError extends Error {
  constructor(code: string) {
    super(`Permission code "${code}" already exists.`);
    this.name = 'PermissionCodeAlreadyExistsError';
  }
}

export class RoleNotFoundError extends Error {
  constructor(code: string) {
    super(`Role "${code}" was not found.`);
    this.name = 'RoleNotFoundError';
  }
}

export class PermissionNotFoundError extends Error {
  constructor(code: string) {
    super(`Permission "${code}" was not found.`);
    this.name = 'PermissionNotFoundError';
  }
}

export class UserNotFoundForRoleAssignmentError extends Error {
  constructor() {
    super('User was not found for role assignment.');
    this.name = 'UserNotFoundForRoleAssignmentError';
  }
}
