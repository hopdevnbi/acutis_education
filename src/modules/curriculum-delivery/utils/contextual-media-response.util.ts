function sanitizeContentDispositionFileName(fileName: string): string {
  return fileName.replace(/["\r\n]/g, '_');
}

export function buildContextualMediaContentHeaders(
  originalFileName: string,
  mimeType: string,
  contentLength: number,
): Record<string, string> {
  const sanitizedFileName = sanitizeContentDispositionFileName(originalFileName);
  const dispositionType = mimeType.startsWith('image/') ? 'inline' : 'attachment';

  return {
    'Content-Type': mimeType,
    'Content-Length': String(contentLength),
    'Content-Disposition': `${dispositionType}; filename="${sanitizedFileName}"`,
    'Cache-Control': 'private, no-store',
  };
}
