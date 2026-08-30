import { InvalidParishCodeError } from '../errors/parish.errors';
import { normalizeParishCode, parseParishCode } from './parish-code.util';

describe('parish-code.util', () => {
  it('trims and lowercases parish codes', () => {
    expect(normalizeParishCode('  Giao-Xu-01  ')).toBe('giao-xu-01');
  });

  it('accepts valid parish codes', () => {
    expect(parseParishCode('giao-xu-thanh-gia')).toBe('giao-xu-thanh-gia');
    expect(parseParishCode('parish01')).toBe('parish01');
  });

  it('rejects invalid parish code characters and shapes', () => {
    expect(() => parseParishCode('')).toThrow(InvalidParishCodeError);
    expect(() => parseParishCode('   ')).toThrow(InvalidParishCodeError);
    expect(() => parseParishCode('Giao Xứ')).toThrow(InvalidParishCodeError);
    expect(() => parseParishCode('-leading')).toThrow(InvalidParishCodeError);
    expect(() => parseParishCode('trailing-')).toThrow(InvalidParishCodeError);
    expect(() => parseParishCode('a'.repeat(33))).toThrow(InvalidParishCodeError);
  });
});
