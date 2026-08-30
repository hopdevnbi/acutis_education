import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import {
  StorageObjectNotFoundError,
  UnsafeStorageKeyError,
} from './errors/storage-provider.errors';
import { LocalStorageProvider } from './local-storage.provider';

describe('LocalStorageProvider', () => {
  let rootDirectory: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    rootDirectory = await mkdtemp(join(tmpdir(), 'media-local-'));
    provider = new LocalStorageProvider(rootDirectory);
    await provider.initialize();
  });

  afterEach(async () => {
    await rm(rootDirectory, { recursive: true, force: true });
  });

  it('writes and reads buffer payloads atomically', async () => {
    const storageKey = 'assets/2026/08/test-asset';
    const payload = Buffer.from('local storage payload');

    await provider.putObject({
      storageKey,
      body: payload,
      contentType: 'text/plain',
      contentLength: payload.length,
    });

    expect(await provider.exists(storageKey)).toBe(true);

    const result = await provider.getObject(storageKey);
    const chunks: Buffer[] = [];

    for await (const chunk of result.body) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      } else if (typeof chunk === 'string') {
        chunks.push(Buffer.from(chunk));
      } else {
        chunks.push(Buffer.from(chunk as Uint8Array));
      }
    }

    expect(Buffer.concat(chunks).toString('utf8')).toBe('local storage payload');
  });

  it('writes readable stream payloads', async () => {
    const storageKey = 'assets/2026/08/stream-asset';
    const payload = Buffer.from('stream payload');

    await provider.putObject({
      storageKey,
      body: Readable.from(payload),
      contentType: 'text/plain',
      contentLength: payload.length,
    });

    const objectPath = join(rootDirectory, ...storageKey.split('/'));
    const stored = await readFile(objectPath, 'utf8');

    expect(stored).toBe('stream payload');
  });

  it('throws when reading a missing object', async () => {
    await expect(provider.getObject('assets/2026/08/missing')).rejects.toBeInstanceOf(
      StorageObjectNotFoundError,
    );
  });

  it('deletes existing objects', async () => {
    const storageKey = 'assets/2026/08/delete-me';
    const payload = Buffer.from('delete me');

    await provider.putObject({
      storageKey,
      body: payload,
      contentType: 'text/plain',
      contentLength: payload.length,
    });

    await provider.deleteObject(storageKey);

    expect(await provider.exists(storageKey)).toBe(false);
  });

  it('rejects path traversal storage keys', async () => {
    await expect(
      provider.putObject({
        storageKey: '../outside.txt',
        body: Buffer.from('bad'),
        contentType: 'text/plain',
        contentLength: 3,
      }),
    ).rejects.toBeInstanceOf(UnsafeStorageKeyError);
  });
});
