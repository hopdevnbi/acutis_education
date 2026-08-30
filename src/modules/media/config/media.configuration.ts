import { registerAs } from '@nestjs/config';
import { parseNodeEnvironment } from '../../../config/app.configuration';
import type { NodeEnvironment } from '../../../config/config.types';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import { StorageProviderConfigurationError } from '../providers/errors/storage-provider.errors';
import { resolveAbsoluteStorageRoot } from '../utils/local-path.util';
import { normalizeS3Prefix } from '../utils/s3-prefix.util';
import {
  DEFAULT_MEDIA_LOCAL_ROOT,
  DEFAULT_MEDIA_MAX_AUDIO_BYTES,
  DEFAULT_MEDIA_MAX_DOCUMENT_BYTES,
  DEFAULT_MEDIA_MAX_IMAGE_BYTES,
  DEFAULT_MEDIA_MAX_VIDEO_BYTES,
  DEFAULT_MEDIA_PRESIGNED_URL_TTL_SECONDS,
  MEDIA_CONFIGURATION_NAMESPACE,
  MEDIA_STORAGE_PROVIDER_VALUES,
  type MediaConfiguration,
  type MediaS3Configuration,
  type MediaSizeLimitsConfiguration,
  type MediaStorageProviderSelection,
} from './media.config.types';

function parseBooleanEnvironmentVariable(
  rawValue: string | undefined,
  defaultValue: boolean,
): boolean {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1') {
    return true;
  }

  if (normalized === 'false' || normalized === '0') {
    return false;
  }

  throw new StorageProviderConfigurationError(`Invalid boolean environment value: ${rawValue}`);
}

function parsePositiveInteger(rawValue: string | undefined, defaultValue: number): number {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return defaultValue;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new StorageProviderConfigurationError(`Invalid positive integer value: ${rawValue}`);
  }

  return parsed;
}

function parseStorageProviderSelection(
  rawValue: string | undefined,
): MediaStorageProviderSelection {
  const normalized = (rawValue ?? 'local').trim().toLowerCase();

  if (!MEDIA_STORAGE_PROVIDER_VALUES.includes(normalized as MediaStorageProviderSelection)) {
    throw new StorageProviderConfigurationError(
      `MEDIA_STORAGE_PROVIDER must be one of: ${MEDIA_STORAGE_PROVIDER_VALUES.join(', ')}.`,
    );
  }

  return normalized as MediaStorageProviderSelection;
}

function parseOptionalTrimmedString(rawValue: string | undefined): string | undefined {
  if (rawValue === undefined) {
    return undefined;
  }

  const trimmed = rawValue.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}

function buildS3Configuration(environment: NodeJS.ProcessEnv): MediaS3Configuration | null {
  const bucket = parseOptionalTrimmedString(environment['MEDIA_S3_BUCKET']);
  const region = parseOptionalTrimmedString(environment['MEDIA_S3_REGION']);
  const accessKeyId = parseOptionalTrimmedString(environment['MEDIA_S3_ACCESS_KEY_ID']);
  const secretAccessKey = parseOptionalTrimmedString(environment['MEDIA_S3_SECRET_ACCESS_KEY']);

  if (
    bucket === undefined &&
    region === undefined &&
    accessKeyId === undefined &&
    secretAccessKey === undefined
  ) {
    return null;
  }

  if (bucket === undefined || region === undefined) {
    throw new StorageProviderConfigurationError(
      'MEDIA_S3_BUCKET and MEDIA_S3_REGION are required when S3 storage is configured.',
    );
  }

  if (
    (accessKeyId === undefined && secretAccessKey !== undefined) ||
    (accessKeyId !== undefined && secretAccessKey === undefined)
  ) {
    throw new StorageProviderConfigurationError(
      'MEDIA_S3_ACCESS_KEY_ID and MEDIA_S3_SECRET_ACCESS_KEY must be provided together.',
    );
  }

  return {
    bucket,
    region,
    endpoint: parseOptionalTrimmedString(environment['MEDIA_S3_ENDPOINT']),
    accessKeyId,
    secretAccessKey,
    forcePathStyle: parseBooleanEnvironmentVariable(
      environment['MEDIA_S3_FORCE_PATH_STYLE'],
      false,
    ),
    prefix: normalizeS3Prefix(parseOptionalTrimmedString(environment['MEDIA_S3_PREFIX'])),
    publicBaseUrl: parseOptionalTrimmedString(environment['MEDIA_S3_PUBLIC_BASE_URL']),
    readinessProbeEnabled: parseBooleanEnvironmentVariable(
      environment['MEDIA_S3_READINESS_PROBE_ENABLED'],
      false,
    ),
  };
}

function buildSizeLimits(environment: NodeJS.ProcessEnv): MediaSizeLimitsConfiguration {
  const maxImageBytes = parsePositiveInteger(
    environment['MEDIA_MAX_IMAGE_BYTES'],
    DEFAULT_MEDIA_MAX_IMAGE_BYTES,
  );
  const maxDocumentBytes = parsePositiveInteger(
    environment['MEDIA_MAX_DOCUMENT_BYTES'],
    DEFAULT_MEDIA_MAX_DOCUMENT_BYTES,
  );
  const maxAudioBytes = parsePositiveInteger(
    environment['MEDIA_MAX_AUDIO_BYTES'],
    DEFAULT_MEDIA_MAX_AUDIO_BYTES,
  );
  const maxVideoBytes = parsePositiveInteger(
    environment['MEDIA_MAX_VIDEO_BYTES'],
    DEFAULT_MEDIA_MAX_VIDEO_BYTES,
  );
  const globalMaxBytes = Math.max(maxImageBytes, maxDocumentBytes, maxAudioBytes, maxVideoBytes);

  return {
    maxImageBytes,
    maxDocumentBytes,
    maxAudioBytes,
    maxVideoBytes,
    globalMaxBytes,
  };
}

export function resolveSelectedWriteProvider(input: {
  nodeEnv: NodeEnvironment;
  selection: MediaStorageProviderSelection;
  allowLocalFallback: boolean;
  s3Configuration: MediaS3Configuration | null;
  s3ReadinessPassed: boolean;
}): MediaStorageProvider {
  const { nodeEnv, selection, allowLocalFallback, s3Configuration, s3ReadinessPassed } = input;

  if (nodeEnv === 'production' && selection === 'auto') {
    throw new StorageProviderConfigurationError(
      'MEDIA_STORAGE_PROVIDER=auto is not allowed in production.',
    );
  }

  if (nodeEnv === 'production' && allowLocalFallback) {
    throw new StorageProviderConfigurationError(
      'MEDIA_STORAGE_ALLOW_LOCAL_FALLBACK must be false in production.',
    );
  }

  if (selection === 'local') {
    return MediaStorageProvider.Local;
  }

  if (selection === 's3') {
    if (s3Configuration === null) {
      if (allowLocalFallback && nodeEnv !== 'production') {
        return MediaStorageProvider.Local;
      }

      throw new StorageProviderConfigurationError(
        'MEDIA_STORAGE_PROVIDER=s3 requires valid S3 configuration.',
      );
    }

    if (!s3ReadinessPassed && !allowLocalFallback) {
      throw new StorageProviderConfigurationError('S3 storage is not ready.');
    }

    if (!s3ReadinessPassed && allowLocalFallback && nodeEnv !== 'production') {
      return MediaStorageProvider.Local;
    }

    return MediaStorageProvider.S3;
  }

  if (s3Configuration !== null && s3ReadinessPassed) {
    return MediaStorageProvider.S3;
  }

  return MediaStorageProvider.Local;
}

export function buildMediaConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
  options: { s3ReadinessPassed?: boolean } = {},
): MediaConfiguration {
  const nodeEnv = parseNodeEnvironment(environment['NODE_ENV']);
  const storageProviderSelection = parseStorageProviderSelection(
    environment['MEDIA_STORAGE_PROVIDER'],
  );
  const allowLocalFallback = parseBooleanEnvironmentVariable(
    environment['MEDIA_STORAGE_ALLOW_LOCAL_FALLBACK'],
    false,
  );
  const localRoot = resolveAbsoluteStorageRoot(
    parseOptionalTrimmedString(environment['MEDIA_LOCAL_ROOT']) ?? DEFAULT_MEDIA_LOCAL_ROOT,
  );
  const s3 = buildS3Configuration(environment);
  const s3ReadinessPassed =
    options.s3ReadinessPassed ?? (s3 === null ? true : !s3.readinessProbeEnabled);
  const selectedWriteProvider = resolveSelectedWriteProvider({
    nodeEnv,
    selection: storageProviderSelection,
    allowLocalFallback,
    s3Configuration: s3,
    s3ReadinessPassed,
  });

  return {
    storageProviderSelection,
    allowLocalFallback,
    localRoot,
    selectedWriteProvider,
    s3,
    sizeLimits: buildSizeLimits(environment),
    presignedUrlTtlSeconds: parsePositiveInteger(
      environment['MEDIA_PRESIGNED_URL_TTL_SECONDS'],
      DEFAULT_MEDIA_PRESIGNED_URL_TTL_SECONDS,
    ),
  };
}

export default registerAs(MEDIA_CONFIGURATION_NAMESPACE, () =>
  buildMediaConfiguration(process.env),
);
