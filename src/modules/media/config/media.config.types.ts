import type { MediaStorageProvider } from '../enums/media-storage-provider.enum';

export const MEDIA_CONFIGURATION_NAMESPACE = 'media' as const;

export const MEDIA_STORAGE_PROVIDER_VALUES = ['local', 's3', 'auto'] as const;

export type MediaStorageProviderSelection = (typeof MEDIA_STORAGE_PROVIDER_VALUES)[number];

export const DEFAULT_MEDIA_LOCAL_ROOT = './storage/uploads' as const;
export const DEFAULT_MEDIA_MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const DEFAULT_MEDIA_MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const DEFAULT_MEDIA_MAX_AUDIO_BYTES = 25 * 1024 * 1024;
export const DEFAULT_MEDIA_MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const DEFAULT_MEDIA_PRESIGNED_URL_TTL_SECONDS = 900;

export interface MediaS3Configuration {
  readonly bucket: string;
  readonly region: string;
  readonly endpoint?: string;
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
  readonly forcePathStyle: boolean;
  readonly prefix: string;
  readonly publicBaseUrl?: string;
  readonly readinessProbeEnabled: boolean;
}

export interface MediaSizeLimitsConfiguration {
  readonly maxImageBytes: number;
  readonly maxDocumentBytes: number;
  readonly maxAudioBytes: number;
  readonly maxVideoBytes: number;
  readonly globalMaxBytes: number;
}

export interface MediaConfiguration {
  readonly storageProviderSelection: MediaStorageProviderSelection;
  readonly allowLocalFallback: boolean;
  readonly localRoot: string;
  readonly selectedWriteProvider: MediaStorageProvider;
  readonly s3: MediaS3Configuration | null;
  readonly sizeLimits: MediaSizeLimitsConfiguration;
  readonly presignedUrlTtlSeconds: number;
}
