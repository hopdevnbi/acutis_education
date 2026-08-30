import { parseDurationToSeconds } from './parse-duration-to-seconds';

describe('parseDurationToSeconds', () => {
  it('parses supported duration units', () => {
    expect(parseDurationToSeconds('30s')).toBe(30);
    expect(parseDurationToSeconds('15m')).toBe(900);
    expect(parseDurationToSeconds('2h')).toBe(7200);
    expect(parseDurationToSeconds('1d')).toBe(86_400);
  });

  it('rejects unsupported duration formats', () => {
    expect(() => {
      parseDurationToSeconds('15 minutes');
    }).toThrow('Invalid JWT_ACCESS_EXPIRES_IN value: 15 minutes');
  });
});
