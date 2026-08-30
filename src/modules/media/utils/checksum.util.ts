import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';

const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;

export function computeSha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function computeSha256HexFromReadable(readable: Readable): Promise<string> {
  const hash = createHash('sha256');

  for await (const chunk of readable) {
    if (Buffer.isBuffer(chunk)) {
      hash.update(chunk);
    } else if (typeof chunk === 'string') {
      hash.update(chunk);
    } else {
      hash.update(chunk as Uint8Array);
    }
  }

  return hash.digest('hex');
}

export function assertValidSha256Hex(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!SHA256_HEX_PATTERN.test(normalized)) {
    throw new Error('Checksum must be a 64-character lowercase SHA-256 hex string.');
  }

  return normalized;
}
