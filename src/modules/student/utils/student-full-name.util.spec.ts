import { normalizeStudentFullName, parseStudentFullName } from './student-full-name.util';
import { InvalidStudentFullNameError } from '../errors/student.errors';

describe('student-full-name.util', () => {
  it('normalizes whitespace in student full names', () => {
    expect(normalizeStudentFullName('  Nguyễn   Văn An  ')).toBe('Nguyễn Văn An');
  });

  it('parses valid student full names', () => {
    expect(parseStudentFullName('Lê Thị B')).toBe('Lê Thị B');
  });

  it('rejects empty student full names', () => {
    expect(() => parseStudentFullName('   ')).toThrow(InvalidStudentFullNameError);
  });
});
