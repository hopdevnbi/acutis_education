import { InvalidRoleCodeError } from '../errors/access-control.errors';
import {
  isValidRoleCode,
  normalizeRoleCode,
  parseRoleCode,
  ROLE_CODE_MAX_LENGTH,
} from './role-code.util';

describe('role-code.util', () => {
  it('normalizes role codes to uppercase', () => {
    expect(normalizeRoleCode(' parish_admin ')).toBe('PARISH_ADMIN');
  });

  it('accepts valid role codes', () => {
    expect(parseRoleCode('catechist')).toBe('CATECHIST');
    expect(isValidRoleCode('SUPER_ADMIN')).toBe(true);
  });

  it('rejects invalid role codes', () => {
    expect(() => {
      parseRoleCode('bad-code');
    }).toThrow(InvalidRoleCodeError);
    expect(isValidRoleCode('1ADMIN')).toBe(false);
    expect(isValidRoleCode('A'.repeat(ROLE_CODE_MAX_LENGTH + 1))).toBe(false);
  });
});
