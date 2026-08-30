import { sanitizeOriginalFileName } from './original-filename.util';

describe('sanitizeOriginalFileName', () => {
  it('removes path separators and control characters', () => {
    expect(sanitizeOriginalFileName('../secret/photo.jpg')).toBe('secretphoto.jpg');
    expect(sanitizeOriginalFileName('lesson\x00notes.pdf')).toBe('lessonnotes.pdf');
  });

  it('uses fallback when sanitized name is empty', () => {
    expect(sanitizeOriginalFileName('...')).toBe('upload.bin');
    expect(sanitizeOriginalFileName('   ')).toBe('upload.bin');
  });

  it('truncates names longer than 260 characters', () => {
    const longName = `${'a'.repeat(300)}.png`;

    expect(sanitizeOriginalFileName(longName)).toHaveLength(260);
  });
});
