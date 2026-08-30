import { generateUuidV4, isUuidV4 } from './uuid-v4.util';

describe('uuid-v4.util', () => {
  it('generates RFC UUID v4 values', () => {
    const value = generateUuidV4();

    expect(isUuidV4(value)).toBe(true);
  });

  it('rejects non-v4 UUID shapes', () => {
    expect(isUuidV4('not-a-uuid')).toBe(false);
    expect(isUuidV4('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false);
  });
});
