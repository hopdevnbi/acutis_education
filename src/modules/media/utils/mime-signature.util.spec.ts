import { MediaCategory } from '../enums/media-category.enum';
import { detectMimeSignatureFromBuffer, isBlockedMimeType } from './mime-signature.util';

describe('mime-signature.util', () => {
  it('detects jpeg, png, webp, and pdf signatures', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const webp = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP', 'ascii'),
    ]);
    const pdf = Buffer.from('%PDF-1.7');

    expect(detectMimeSignatureFromBuffer(jpeg)).toEqual({
      mimeType: 'image/jpeg',
      mediaCategory: MediaCategory.Image,
    });
    expect(detectMimeSignatureFromBuffer(png)?.mimeType).toBe('image/png');
    expect(detectMimeSignatureFromBuffer(webp)?.mimeType).toBe('image/webp');
    expect(detectMimeSignatureFromBuffer(pdf)?.mimeType).toBe('application/pdf');
  });

  it('rejects unknown and blocked mime types', () => {
    expect(detectMimeSignatureFromBuffer(Buffer.from('<svg></svg>'))).toBeNull();
    expect(isBlockedMimeType('application/octet-stream')).toBe(true);
    expect(isBlockedMimeType('text/html')).toBe(true);
    expect(isBlockedMimeType('image/svg+xml')).toBe(true);
  });
});
