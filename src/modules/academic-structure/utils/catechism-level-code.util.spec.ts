import { InvalidCatechismLevelCodeError } from '../errors/catechism-level.errors';
import { normalizeCatechismLevelCode, parseCatechismLevelCode } from './catechism-level-code.util';

describe('catechism-level-code.util', () => {
  it('trims and lowercases catechism level codes', () => {
    expect(normalizeCatechismLevelCode('  So-Cap-1  ')).toBe('so-cap-1');
  });

  it('accepts valid catechism level codes', () => {
    expect(parseCatechismLevelCode('so-cap-1')).toBe('so-cap-1');
    expect(parseCatechismLevelCode('level01')).toBe('level01');
  });

  it('rejects invalid catechism level code characters and shapes', () => {
    expect(() => parseCatechismLevelCode('')).toThrow(InvalidCatechismLevelCodeError);
    expect(() => parseCatechismLevelCode('   ')).toThrow(InvalidCatechismLevelCodeError);
    expect(() => parseCatechismLevelCode('So Cap')).toThrow(InvalidCatechismLevelCodeError);
    expect(() => parseCatechismLevelCode('-leading')).toThrow(InvalidCatechismLevelCodeError);
    expect(() => parseCatechismLevelCode('trailing-')).toThrow(InvalidCatechismLevelCodeError);
    expect(() => parseCatechismLevelCode('a'.repeat(33))).toThrow(InvalidCatechismLevelCodeError);
  });
});
