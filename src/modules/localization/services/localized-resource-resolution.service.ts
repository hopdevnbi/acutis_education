import { Injectable, Logger } from '@nestjs/common';
import { parseLocale } from '../../../common/locale';
import { normalizeUuid } from '../../../database/uuid-v4.util';
import { DerivedTranslationReadStatus } from '../enums/translation-revision-status.enum';
import { LearnerTranslationReadStatus } from '../enums/learner-translation-read-status.enum';
import { UnsupportedTranslationResourceError } from '../errors/localization.errors';
import type {
  LocalizedResourceResolution,
  ResolveLocalizedResourceInput,
  ResolveLocalizedResourceWithRevisionInput,
  TranslationResourceRef,
  TranslationResourceSnapshot,
  TranslationRevisionSnapshot,
} from '../interfaces/localization.interface';
import type { TranslationSourceSnapshot } from '../interfaces/translation-source-adapter.interface';
import { mapDerivedToLearnerTranslationReadStatus } from '../utils/map-derived-to-learner-status.util';
import { parseTranslationPayloadJson } from '../utils/parse-translation-payload.util';
import { deriveTranslationReadStatus } from '../utils/derive-translation-read-status.util';
import { TranslationResourceService } from './translation-resource.service';
import { TranslationRevisionService } from './translation-revision.service';
import { TranslationSourceRegistryService } from './translation-source-registry.service';

function buildResourceKey(resourceType: string, resourceId: string): string {
  return `${resourceType}:${normalizeUuid(resourceId)}`;
}

@Injectable()
export class LocalizedResourceResolutionService {
  private readonly logger = new Logger(LocalizedResourceResolutionService.name);

  constructor(
    private readonly translationSourceRegistryService: TranslationSourceRegistryService,
    private readonly translationResourceService: TranslationResourceService,
    private readonly translationRevisionService: TranslationRevisionService,
  ) {}

  async resolveLocalizedResource(
    input: ResolveLocalizedResourceInput,
  ): Promise<LocalizedResourceResolution> {
    const sourceSnapshot = await this.translationSourceRegistryService.resolveSource(
      input.resourceType,
      input.resourceId,
    );

    return this.resolveFromSourceSnapshot({
      sourceSnapshot,
      targetLocale: parseLocale(input.targetLocale),
      requestedLocale: input.requestedLocale ?? parseLocale(input.targetLocale),
      parishId: input.parishId,
    });
  }

  async resolveLocalizedResources(
    inputs: readonly ResolveLocalizedResourceInput[],
  ): Promise<readonly LocalizedResourceResolution[]> {
    if (inputs.length === 0) {
      return [];
    }

    const sourceSnapshots = await Promise.all(
      inputs.map(async (input) => {
        const snapshot = await this.translationSourceRegistryService
          .getAdapter(input.resourceType)
          .resolveSource(input.resourceId);

        if (snapshot === null) {
          throw new UnsupportedTranslationResourceError();
        }

        return { input, sourceSnapshot: snapshot };
      }),
    );

    const refs: TranslationResourceRef[] = sourceSnapshots
      .filter(
        ({ input, sourceSnapshot }) =>
          parseLocale(sourceSnapshot.sourceLocale) !== parseLocale(input.targetLocale),
      )
      .map(({ input }) => ({
        resourceType: input.resourceType,
        resourceId: input.resourceId,
      }));

    const resourceMap = await this.translationResourceService.findResourcesByRefs(refs);
    const revisionMapsByLocale = new Map<string, Map<string, TranslationRevisionSnapshot>>();

    for (const targetLocale of new Set(inputs.map((input) => parseLocale(input.targetLocale)))) {
      const translationResourceIds = sourceSnapshots
        .filter(({ input }) => parseLocale(input.targetLocale) === targetLocale)
        .map(({ input }) => resourceMap.get(buildResourceKey(input.resourceType, input.resourceId)))
        .filter((resource): resource is TranslationResourceSnapshot => resource !== undefined)
        .map((resource) => resource.id);

      revisionMapsByLocale.set(
        targetLocale,
        await this.translationRevisionService.findLatestApprovedRevisionsForResources({
          translationResourceIds,
          targetLocale,
        }),
      );
    }

    return sourceSnapshots.map(({ input, sourceSnapshot }) => {
      const resourceKey = buildResourceKey(input.resourceType, input.resourceId);
      const translationResource = resourceMap.get(resourceKey) ?? null;
      const targetLocale = parseLocale(input.targetLocale);
      const revisionMap =
        revisionMapsByLocale.get(targetLocale) ?? new Map<string, TranslationRevisionSnapshot>();
      const revision =
        translationResource === null
          ? null
          : (revisionMap.get(normalizeUuid(translationResource.id)) ?? null);
      const derived = deriveTranslationReadStatus({
        revision,
        currentSourceContentHash: sourceSnapshot.sourceContentHash,
        sourceLocale: sourceSnapshot.sourceLocale,
        targetLocale,
      });

      return this.buildResolution({
        sourceSnapshot,
        targetLocale,
        requestedLocale: input.requestedLocale ?? targetLocale,
        translationResource,
        revision,
        derivedStatus: derived.derivedStatus,
      });
    });
  }

  async resolveLocalizedResourceWithRevision(
    input: ResolveLocalizedResourceWithRevisionInput,
  ): Promise<LocalizedResourceResolution> {
    const sourceSnapshot = await this.translationSourceRegistryService.resolveSource(
      input.resourceType,
      input.resourceId,
    );

    let revision: TranslationRevisionSnapshot;

    try {
      revision = await this.translationRevisionService.getRevisionById(input.translationRevisionId);
    } catch {
      return this.buildSourceFallbackResolution({
        sourceSnapshot,
        requestedLocale: null,
        translationStatus: LearnerTranslationReadStatus.Missing,
      });
    }

    const translationResource = await this.translationResourceService.findResourceByRef({
      resourceType: input.resourceType,
      resourceId: input.resourceId,
    });

    if (
      translationResource === null ||
      normalizeUuid(translationResource.id) !== normalizeUuid(revision.translationResourceId) ||
      !this.isParishCompatible(input.parishId, translationResource)
    ) {
      return this.buildSourceFallbackResolution({
        sourceSnapshot,
        requestedLocale: revision.targetLocale,
        translationStatus: LearnerTranslationReadStatus.Missing,
      });
    }

    const derived = deriveTranslationReadStatus({
      revision,
      currentSourceContentHash: sourceSnapshot.sourceContentHash,
      sourceLocale: sourceSnapshot.sourceLocale,
      targetLocale: revision.targetLocale,
    });

    return this.buildResolution({
      sourceSnapshot,
      targetLocale: revision.targetLocale,
      requestedLocale: revision.targetLocale,
      translationResource,
      revision,
      derivedStatus: derived.derivedStatus,
      pinnedRevisionId: revision.id,
    });
  }

  private async resolveFromSourceSnapshot(input: {
    readonly sourceSnapshot: TranslationSourceSnapshot;
    readonly targetLocale: string;
    readonly requestedLocale: string | null;
    readonly parishId: string | null;
  }): Promise<LocalizedResourceResolution> {
    const sourceLocale = parseLocale(input.sourceSnapshot.sourceLocale);

    if (sourceLocale === input.targetLocale) {
      return this.buildSourceResolution({
        sourceSnapshot: input.sourceSnapshot,
        requestedLocale: input.requestedLocale,
        resolvedLocale: sourceLocale,
      });
    }

    const translationResource = await this.translationResourceService.findResourceByRef({
      resourceType: input.sourceSnapshot.resourceType,
      resourceId: input.sourceSnapshot.resourceId,
    });

    if (
      translationResource === null ||
      !this.isParishCompatible(input.parishId, translationResource)
    ) {
      return this.buildSourceFallbackResolution({
        sourceSnapshot: input.sourceSnapshot,
        requestedLocale: input.requestedLocale,
        translationStatus: LearnerTranslationReadStatus.Missing,
      });
    }

    const latestApproved = await this.translationRevisionService.getLatestApprovedRevision({
      translationResourceId: translationResource.id,
      targetLocale: input.targetLocale,
      currentSourceContentHash: input.sourceSnapshot.sourceContentHash,
    });

    return this.buildResolution({
      sourceSnapshot: input.sourceSnapshot,
      targetLocale: input.targetLocale,
      requestedLocale: input.requestedLocale,
      translationResource,
      revision: latestApproved.revision,
      derivedStatus: latestApproved.derivedStatus,
    });
  }

  private buildResolution(input: {
    readonly sourceSnapshot: TranslationSourceSnapshot;
    readonly targetLocale: string;
    readonly requestedLocale: string | null;
    readonly translationResource: TranslationResourceSnapshot | null;
    readonly revision: TranslationRevisionSnapshot | null;
    readonly derivedStatus: DerivedTranslationReadStatus;
    readonly pinnedRevisionId?: string;
  }): LocalizedResourceResolution {
    const sourceLocale = parseLocale(input.sourceSnapshot.sourceLocale);

    if (
      input.derivedStatus === DerivedTranslationReadStatus.Source ||
      sourceLocale === input.targetLocale
    ) {
      return this.buildSourceResolution({
        sourceSnapshot: input.sourceSnapshot,
        requestedLocale: input.requestedLocale,
        resolvedLocale: sourceLocale,
      });
    }

    const translationStatus = mapDerivedToLearnerTranslationReadStatus(input.derivedStatus);

    if (translationStatus !== LearnerTranslationReadStatus.Approved || input.revision === null) {
      return this.buildSourceFallbackResolution({
        sourceSnapshot: input.sourceSnapshot,
        requestedLocale: input.requestedLocale,
        translationStatus,
      });
    }

    try {
      const payload = parseTranslationPayloadJson(input.revision.payloadJson);
      const adapter = this.translationSourceRegistryService.getAdapter(
        input.sourceSnapshot.resourceType,
      );
      const mergedPayload = adapter.applyTranslation(input.sourceSnapshot, payload);

      return {
        payload: mergedPayload,
        requestedLocale: input.requestedLocale,
        resolvedLocale: input.targetLocale,
        sourceLocale,
        translationStatus,
        isFallback: false,
        translationRevisionId: input.pinnedRevisionId ?? input.revision.id,
        sourceContentHash: input.sourceSnapshot.sourceContentHash,
      };
    } catch {
      this.logger.warn(
        `Invalid approved translation payload for ${input.sourceSnapshot.resourceType}:${input.sourceSnapshot.resourceId}. Falling back to source.`,
      );

      return this.buildSourceFallbackResolution({
        sourceSnapshot: input.sourceSnapshot,
        requestedLocale: input.requestedLocale,
        translationStatus: LearnerTranslationReadStatus.Stale,
      });
    }
  }

  private buildSourceResolution(input: {
    readonly sourceSnapshot: TranslationSourceSnapshot;
    readonly requestedLocale: string | null;
    readonly resolvedLocale: string;
  }): LocalizedResourceResolution {
    return {
      payload: input.sourceSnapshot.payload,
      requestedLocale: input.requestedLocale,
      resolvedLocale: input.resolvedLocale,
      sourceLocale: parseLocale(input.sourceSnapshot.sourceLocale),
      translationStatus: LearnerTranslationReadStatus.Source,
      isFallback: false,
      translationRevisionId: null,
      sourceContentHash: input.sourceSnapshot.sourceContentHash,
    };
  }

  private buildSourceFallbackResolution(input: {
    readonly sourceSnapshot: TranslationSourceSnapshot;
    readonly requestedLocale: string | null;
    readonly translationStatus: LearnerTranslationReadStatus;
  }): LocalizedResourceResolution {
    return {
      payload: input.sourceSnapshot.payload,
      requestedLocale: input.requestedLocale,
      resolvedLocale: parseLocale(input.sourceSnapshot.sourceLocale),
      sourceLocale: parseLocale(input.sourceSnapshot.sourceLocale),
      translationStatus: input.translationStatus,
      isFallback: true,
      translationRevisionId: null,
      sourceContentHash: input.sourceSnapshot.sourceContentHash,
    };
  }

  private isParishCompatible(
    requestedParishId: string | null,
    translationResource: TranslationResourceSnapshot,
  ): boolean {
    if (requestedParishId === null || translationResource.parishId === null) {
      return true;
    }

    return normalizeUuid(translationResource.parishId) === normalizeUuid(requestedParishId);
  }
}
