import { InvalidAcademicYearDateRangeError } from '../errors/academic-year.errors';
import { assertStartDateBeforeEndDate, parseIsoDateOnly } from './academic-year-date.util';

describe('academic-year-date.util', () => {
  it('parses valid ISO date-only strings', () => {
    expect(parseIsoDateOnly('2026-09-01')).toBe('2026-09-01');
    expect(parseIsoDateOnly('  2027-06-30  ')).toBe('2027-06-30');
  });

  it('rejects invalid ISO date-only strings', () => {
    expect(() => parseIsoDateOnly('2026/09/01')).toThrow(InvalidAcademicYearDateRangeError);
    expect(() => parseIsoDateOnly('2026-13-01')).toThrow(InvalidAcademicYearDateRangeError);
    expect(() => parseIsoDateOnly('2026-02-30')).toThrow(InvalidAcademicYearDateRangeError);
  });

  it('requires start date to be before end date', () => {
    expect(() => assertStartDateBeforeEndDate('2027-06-30', '2026-09-01')).toThrow(
      InvalidAcademicYearDateRangeError,
    );
    expect(() => assertStartDateBeforeEndDate('2026-09-01', '2026-09-01')).toThrow(
      InvalidAcademicYearDateRangeError,
    );
  });
});
