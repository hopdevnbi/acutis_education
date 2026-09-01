import { registerAs } from '@nestjs/config';
import { parseNodeEnvironment } from '../../../config/app.configuration';
import type { NodeEnvironment } from '../../../config/config.types';
import { TranslationProviderId } from '../enums/translation-provider-id.enum';
import { TranslationProviderConfigurationError } from '../providers/errors/translation-provider.errors';
import {
  DEFAULT_TRANSLATION_JOB_BATCH_SIZE,
  DEFAULT_TRANSLATION_JOB_MAX_ATTEMPTS,
  DEFAULT_TRANSLATION_MAX_BATCH_CHARS,
  DEFAULT_TRANSLATION_MAX_BATCH_UNITS,
  DEFAULT_TRANSLATION_MAX_UNIT_CHARS,
  TRANSLATION_CONFIGURATION_NAMESPACE,
  TRANSLATION_PROVIDER_VALUES,
  type TranslationConfiguration,
  type TranslationProviderSelection,
} from './translation.config.types';

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

  throw new TranslationProviderConfigurationError(`Invalid boolean environment value: ${rawValue}`);
}

function parsePositiveInteger(rawValue: string | undefined, defaultValue: number): number {
  if (rawValue === undefined || rawValue.trim().length === 0) {
    return defaultValue;
  }

  const parsed = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new TranslationProviderConfigurationError(`Invalid positive integer value: ${rawValue}`);
  }

  return parsed;
}

function parseProviderSelection(rawValue: string | undefined): TranslationProviderSelection {
  const normalized = (rawValue ?? 'mock').trim().toLowerCase();

  if (!TRANSLATION_PROVIDER_VALUES.includes(normalized as TranslationProviderSelection)) {
    throw new TranslationProviderConfigurationError(
      `TRANSLATION_PROVIDER must be one of: ${TRANSLATION_PROVIDER_VALUES.join(', ')}.`,
    );
  }

  return normalized as TranslationProviderSelection;
}

function parseOptionalTrimmedString(rawValue: string | undefined): string | null {
  if (rawValue === undefined) {
    return null;
  }

  const trimmed = rawValue.trim();

  return trimmed.length === 0 ? null : trimmed;
}

function resolveSelectedProvider(
  selection: TranslationProviderSelection,
  nodeEnvironment: NodeEnvironment,
  allowMockInProduction: boolean,
): TranslationProviderId {
  if (selection === 'mock') {
    if (nodeEnvironment === 'production' && !allowMockInProduction) {
      throw new TranslationProviderConfigurationError(
        'Mock translation provider is disallowed in production. Set ALLOW_MOCK_TRANSLATION_PROVIDER=true to override.',
      );
    }

    return TranslationProviderId.Mock;
  }

  return TranslationProviderId.Google;
}

function assertGoogleConfiguration(
  nodeEnvironment: NodeEnvironment,
  googleCloudProjectId: string | null,
  googleCloudLocation: string | null,
  googleApplicationCredentialsPath: string | null,
): void {
  if (nodeEnvironment !== 'production') {
    return;
  }

  if (googleCloudProjectId === null) {
    throw new TranslationProviderConfigurationError(
      'GOOGLE_CLOUD_PROJECT_ID is required when TRANSLATION_PROVIDER=google in production.',
    );
  }

  if (googleCloudLocation === null) {
    throw new TranslationProviderConfigurationError(
      'GOOGLE_CLOUD_LOCATION is required when TRANSLATION_PROVIDER=google in production.',
    );
  }

  if (googleApplicationCredentialsPath === null) {
    throw new TranslationProviderConfigurationError(
      'GOOGLE_APPLICATION_CREDENTIALS is required when TRANSLATION_PROVIDER=google in production.',
    );
  }
}

export function buildTranslationConfiguration(
  environment: NodeJS.ProcessEnv,
): TranslationConfiguration {
  const nodeEnvironment = parseNodeEnvironment(environment['NODE_ENV']);
  const providerSelection = parseProviderSelection(environment['TRANSLATION_PROVIDER']);
  const allowMockInProduction = parseBooleanEnvironmentVariable(
    environment['ALLOW_MOCK_TRANSLATION_PROVIDER'],
    false,
  );
  const selectedProvider = resolveSelectedProvider(
    providerSelection,
    nodeEnvironment,
    allowMockInProduction,
  );
  const googleCloudProjectId = parseOptionalTrimmedString(environment['GOOGLE_CLOUD_PROJECT_ID']);
  const googleCloudLocation =
    parseOptionalTrimmedString(environment['GOOGLE_CLOUD_LOCATION']) ?? 'global';
  const googleApplicationCredentialsPath = parseOptionalTrimmedString(
    environment['GOOGLE_APPLICATION_CREDENTIALS'],
  );

  if (selectedProvider === TranslationProviderId.Google) {
    assertGoogleConfiguration(
      nodeEnvironment,
      googleCloudProjectId,
      googleCloudLocation,
      googleApplicationCredentialsPath,
    );
  }

  return {
    selectedProvider,
    allowMockInProduction,
    maxBatchUnits: parsePositiveInteger(
      environment['TRANSLATION_MAX_BATCH_UNITS'],
      DEFAULT_TRANSLATION_MAX_BATCH_UNITS,
    ),
    maxBatchChars: parsePositiveInteger(
      environment['TRANSLATION_MAX_BATCH_CHARS'],
      DEFAULT_TRANSLATION_MAX_BATCH_CHARS,
    ),
    maxUnitChars: DEFAULT_TRANSLATION_MAX_UNIT_CHARS,
    jobMaxAttempts: parsePositiveInteger(
      environment['TRANSLATION_JOB_MAX_ATTEMPTS'],
      DEFAULT_TRANSLATION_JOB_MAX_ATTEMPTS,
    ),
    jobDefaultBatchSize: parsePositiveInteger(
      environment['TRANSLATION_JOB_BATCH_SIZE'],
      DEFAULT_TRANSLATION_JOB_BATCH_SIZE,
    ),
    googleCloudProjectId,
    googleCloudLocation,
    googleApplicationCredentialsPath,
  };
}

export default registerAs(TRANSLATION_CONFIGURATION_NAMESPACE, (): TranslationConfiguration =>
  buildTranslationConfiguration(process.env),
);
