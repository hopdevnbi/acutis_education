import { createSign } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Injectable } from '@nestjs/common';
import { TranslationProviderId } from '../enums/translation-provider-id.enum';
import type { TranslationConfiguration } from '../config/translation.config.types';
import { TranslationConfigService } from '../config/translation-config.service';
import {
  TranslationProviderConfigurationError,
  TranslationProviderError,
} from './errors/translation-provider.errors';
import { mapGoogleTranslationError } from './map-google-translation-error.util';
import type {
  TranslationBatchInput,
  TranslationProvider,
  TranslatedUnit,
} from './translation-provider.interface';
import { validateProviderOutput } from './validate-provider-output.util';

interface GoogleServiceAccountCredentials {
  readonly client_email: string;
  readonly private_key: string;
  readonly token_uri: string;
}

@Injectable()
export class GoogleCloudTranslationProvider implements TranslationProvider {
  readonly providerId = TranslationProviderId.Google;

  constructor(private readonly translationConfigService: TranslationConfigService) {}

  async translateBatch(input: TranslationBatchInput): Promise<TranslatedUnit[]> {
    const configuration = this.translationConfigService.getConfiguration();

    if (configuration.googleCloudProjectId === null || configuration.googleCloudLocation === null) {
      throw new TranslationProviderError(
        'AUTH',
        'Google Cloud Translation is not configured.',
        false,
      );
    }

    try {
      const accessToken = await this.resolveAccessToken(configuration);
      const translatedTexts = await this.callGoogleTranslateApi(configuration, accessToken, input);

      const outputUnits = input.units.map((unit, index) => ({
        id: unit.id,
        text: translatedTexts[index] ?? '',
      }));

      return validateProviderOutput(input.units, outputUnits, configuration.maxUnitChars);
    } catch (error: unknown) {
      if (error instanceof TranslationProviderError) {
        throw error;
      }

      const mapped = mapGoogleTranslationError(error);

      throw new TranslationProviderError(mapped.code, mapped.message, mapped.retryable);
    }
  }

  private async callGoogleTranslateApi(
    configuration: TranslationConfiguration,
    accessToken: string,
    input: TranslationBatchInput,
  ): Promise<string[]> {
    const projectId = configuration.googleCloudProjectId;
    const location = configuration.googleCloudLocation;

    if (projectId === null || location === null) {
      throw new TranslationProviderError('AUTH', 'Google Cloud Translation is not configured.');
    }

    const url = `https://translation.googleapis.com/v3/projects/${projectId}/locations/${location}:translateText`;
    const body: Record<string, unknown> = {
      contents: input.units.map((unit) => unit.text),
      sourceLanguageCode: input.sourceLocale,
      targetLanguageCode: input.targetLocale,
    };

    if (
      input.glossary?.providerGlossaryId !== undefined &&
      input.glossary.providerGlossaryId !== null
    ) {
      body['glossaryConfig'] = {
        glossary: input.glossary.providerGlossaryId,
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { code?: number; message?: string; status?: string };
      };
      const mapped = mapGoogleTranslationError({
        response: {
          status: response.status,
          data: payload,
        },
      });

      throw new TranslationProviderError(mapped.code, mapped.message, mapped.retryable);
    }

    const payload = (await response.json()) as {
      translations?: Array<{ translatedText?: string }>;
    };

    return (payload.translations ?? []).map((entry) => entry.translatedText ?? '');
  }

  private async resolveAccessToken(configuration: TranslationConfiguration): Promise<string> {
    const credentialsPath = configuration.googleApplicationCredentialsPath;

    if (credentialsPath === null) {
      throw new TranslationProviderError(
        'AUTH',
        'GOOGLE_APPLICATION_CREDENTIALS is not configured.',
      );
    }

    const credentials = await this.readServiceAccountCredentials(credentialsPath);
    const assertion = buildServiceAccountJwt(credentials);
    const tokenResponse = await fetch(credentials.token_uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!tokenResponse.ok) {
      throw new TranslationProviderError('AUTH', 'Failed to obtain Google access token.');
    }

    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };

    if (tokenPayload.access_token === undefined || tokenPayload.access_token.trim().length === 0) {
      throw new TranslationProviderError('AUTH', 'Google access token response was invalid.');
    }

    return tokenPayload.access_token;
  }

  private async readServiceAccountCredentials(
    credentialsPath: string,
  ): Promise<GoogleServiceAccountCredentials> {
    const rawContents = await readFile(credentialsPath, 'utf8');
    const parsed = JSON.parse(rawContents) as Partial<GoogleServiceAccountCredentials>;

    if (
      typeof parsed.client_email !== 'string' ||
      typeof parsed.private_key !== 'string' ||
      typeof parsed.token_uri !== 'string'
    ) {
      throw new TranslationProviderConfigurationError(
        'GOOGLE_APPLICATION_CREDENTIALS must contain client_email, private_key, and token_uri.',
      );
    }

    return {
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      token_uri: parsed.token_uri,
    };
  }
}

function buildServiceAccountJwt(credentials: GoogleServiceAccountCredentials): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: credentials.client_email,
      sub: credentials.client_email,
      aud: credentials.token_uri,
      iat: issuedAt,
      exp: issuedAt + 3600,
      scope: 'https://www.googleapis.com/auth/cloud-translation',
    }),
  );
  const unsignedToken = `${header}.${payload}`;
  const signature = createSign('RSA-SHA256').update(unsignedToken).sign(credentials.private_key);
  const encodedSignature = base64UrlEncode(signature);

  return `${unsignedToken}.${encodedSignature}`;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}
