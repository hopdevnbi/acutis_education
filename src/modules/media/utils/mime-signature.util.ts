import { MediaCategory } from '../enums/media-category.enum';

export interface DetectedMimeSignature {
  readonly mimeType: string;
  readonly mediaCategory: MediaCategory;
}

function startsWithBytes(buffer: Buffer, signature: readonly number[]): boolean {
  if (buffer.length < signature.length) {
    return false;
  }

  return signature.every((byte, index) => buffer[index] === byte);
}

function detectPdf(buffer: Buffer): DetectedMimeSignature | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    return {
      mimeType: 'application/pdf',
      mediaCategory: MediaCategory.Document,
    };
  }

  return null;
}

function detectJpeg(buffer: Buffer): DetectedMimeSignature | null {
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return {
      mimeType: 'image/jpeg',
      mediaCategory: MediaCategory.Image,
    };
  }

  return null;
}

function detectPng(buffer: Buffer): DetectedMimeSignature | null {
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return {
      mimeType: 'image/png',
      mediaCategory: MediaCategory.Image,
    };
  }

  return null;
}

function detectWebp(buffer: Buffer): DetectedMimeSignature | null {
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return {
      mimeType: 'image/webp',
      mediaCategory: MediaCategory.Image,
    };
  }

  return null;
}

const BLOCKED_MIME_PREFIXES = [
  'image/svg',
  'text/html',
  'application/javascript',
  'text/javascript',
  'application/x-msdownload',
  'application/x-executable',
  'application/zip',
  'application/x-zip-compressed',
  'application/gzip',
  'application/x-rar-compressed',
] as const;

export function isBlockedMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase();

  if (normalized === 'application/octet-stream') {
    return true;
  }

  return BLOCKED_MIME_PREFIXES.some((blockedPrefix) => normalized.startsWith(blockedPrefix));
}

export function detectMimeSignatureFromBuffer(buffer: Buffer): DetectedMimeSignature | null {
  return detectJpeg(buffer) ?? detectPng(buffer) ?? detectWebp(buffer) ?? detectPdf(buffer);
}
