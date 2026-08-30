import { assertValidSha256Hex, computeSha256Hex } from './checksum.util';

describe('checksum.util', () => {
  it('computes lowercase SHA-256 hex for a buffer', () => {
    expect(computeSha256Hex(Buffer.from('hello'))).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('accepts valid lowercase SHA-256 hex strings', () => {
    const checksum = '0123456789abcdef'.repeat(4);

    expect(assertValidSha256Hex(checksum)).toBe(checksum);
    expect(assertValidSha256Hex(checksum.toUpperCase())).toBe(checksum);
  });

  it('rejects invalid checksum values', () => {
    expect(() => assertValidSha256Hex('not-a-checksum')).toThrow(
      'Checksum must be a 64-character lowercase SHA-256 hex string.',
    );
    expect(() => assertValidSha256Hex('0123456789abcdef'.repeat(3))).toThrow(
      'Checksum must be a 64-character lowercase SHA-256 hex string.',
    );
  });
});
