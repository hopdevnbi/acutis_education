import { parseExamCode } from './exam-code.util';
import { InvalidExamCodeError } from '../errors/exam.errors';

describe('exam-code.util', () => {
  it('normalizes and validates exam codes', () => {
    expect(parseExamCode(' Midterm-2026 ')).toBe('midterm-2026');
  });

  it('rejects invalid exam codes', () => {
    expect(() => parseExamCode('bad code')).toThrow(InvalidExamCodeError);
  });
});
