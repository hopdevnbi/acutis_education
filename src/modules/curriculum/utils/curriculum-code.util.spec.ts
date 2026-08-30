import { parseCurriculumCode } from './curriculum-code.util';
import { InvalidCurriculumCodeError } from '../errors/curriculum.errors';

describe('curriculum-code.util', () => {
  it('normalizes and validates curriculum codes', () => {
    expect(parseCurriculumCode(' Khai-Tam ')).toBe('khai-tam');
  });

  it('rejects invalid curriculum codes', () => {
    expect(() => parseCurriculumCode('bad code')).toThrow(InvalidCurriculumCodeError);
  });
});
