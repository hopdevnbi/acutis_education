import { UnsafeStorageKeyError } from '../providers/errors/storage-provider.errors';
import { assertSafeStorageKey, buildMediaStorageKey } from './storage-key.util';

describe('storage-key.util', () => {
  const assetId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  it('builds a partitioned storage key from asset id and createdAt', () => {
    const createdAt = new Date('2026-08-30T12:00:00.000Z');

    expect(buildMediaStorageKey(assetId, createdAt)).toBe(
      'assets/2026/08/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
  });

  it('rejects non-UUID asset ids', () => {
    expect(() => buildMediaStorageKey('not-a-uuid')).toThrow(UnsafeStorageKeyError);
  });

  it('accepts safe storage keys', () => {
    expect(assertSafeStorageKey('assets/2026/08/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')).toBe(
      'assets/2026/08/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );
  });

  it('rejects unsafe storage keys', () => {
    expect(() => assertSafeStorageKey('../escape')).toThrow('parent directory segments');
    expect(() => assertSafeStorageKey('/absolute/path')).toThrow('unsafe path characters');
    expect(() => assertSafeStorageKey('assets//empty-segment')).toThrow('empty path segments');
    expect(() => assertSafeStorageKey('assets/bad segment/file')).toThrow('is not allowed');
  });
});
