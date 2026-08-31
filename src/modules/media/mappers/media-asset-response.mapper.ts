import type { MediaAssetSnapshot } from '../interfaces/media-asset.interface';
import type { MediaAssetResponseDto } from '../dto/media-asset-response.dto';

export function toMediaAssetResponseDto(snapshot: MediaAssetSnapshot): MediaAssetResponseDto {
  return {
    id: snapshot.id,
    originalFileName: snapshot.originalFileName,
    mimeType: snapshot.mimeType,
    mediaCategory: snapshot.mediaCategory,
    sizeBytes: snapshot.sizeBytes,
    checksumSha256: snapshot.checksumSha256,
    status: snapshot.status,
    visibility: snapshot.visibility,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
  };
}

function sanitizeContentDispositionFileName(fileName: string): string {
  return fileName.replace(/["\r\n]/g, '_');
}

export function buildContentDispositionHeader(fileName: string, mimeType: string): string {
  const sanitizedFileName = sanitizeContentDispositionFileName(fileName);
  const dispositionType = mimeType.startsWith('image/') ? 'inline' : 'attachment';

  return `${dispositionType}; filename="${sanitizedFileName}"`;
}
