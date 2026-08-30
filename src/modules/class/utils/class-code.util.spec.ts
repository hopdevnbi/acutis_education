import { InvalidClassCodeError } from '../errors/class.errors';
import { normalizeClassCode, parseClassCode } from './class-code.util';

describe('class-code.util', () => {
  it('trims and lowercases class codes', () => {
    expect(normalizeClassCode('  Khai-Tam-A  ')).toBe('khai-tam-a');
  });

  it('accepts valid class codes', () => {
    expect(parseClassCode('khai-tam-a')).toBe('khai-tam-a');
    expect(parseClassCode('class01')).toBe('class01');
  });

  it('rejects invalid class code characters and shapes', () => {
    expect(() => parseClassCode('')).toThrow(InvalidClassCodeError);
    expect(() => parseClassCode('   ')).toThrow(InvalidClassCodeError);
    expect(() => parseClassCode('Khai Tam')).toThrow(InvalidClassCodeError);
    expect(() => parseClassCode('-leading')).toThrow(InvalidClassCodeError);
    expect(() => parseClassCode('trailing-')).toThrow(InvalidClassCodeError);
    expect(() => parseClassCode('a'.repeat(33))).toThrow(InvalidClassCodeError);
  });
});
