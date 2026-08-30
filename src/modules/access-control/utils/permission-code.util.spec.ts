import { InvalidPermissionCodeError } from '../errors/access-control.errors';
import {
  isValidPermissionCode,
  normalizePermissionCode,
  parsePermissionCode,
  PERMISSION_CODE_MAX_LENGTH,
} from './permission-code.util';

describe('permission-code.util', () => {
  it('normalizes permission codes to lowercase', () => {
    expect(normalizePermissionCode(' Users.Read ')).toBe('users.read');
  });

  it('accepts valid permission codes', () => {
    expect(parsePermissionCode('Users.Manage')).toBe('users.manage');
    expect(isValidPermissionCode('classes.read')).toBe(true);
  });

  it('rejects invalid permission codes', () => {
    expect(() => {
      parsePermissionCode('users');
    }).toThrow(InvalidPermissionCodeError);
    expect(isValidPermissionCode('Users.Read')).toBe(false);
    expect(isValidPermissionCode('a'.repeat(PERMISSION_CODE_MAX_LENGTH + 1))).toBe(false);
  });
});
