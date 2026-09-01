import { Injectable } from '@nestjs/common';
import type { TranslationResourceType } from '../enums/translation-resource-type.enum';
import type {
  TranslationSourceAdapter,
  TranslationSourceSnapshot,
} from '../interfaces/translation-source-adapter.interface';
import { UnsupportedTranslationResourceError } from '../errors/localization.errors';

@Injectable()
export class TranslationSourceRegistryService {
  private readonly adapters = new Map<TranslationResourceType, TranslationSourceAdapter>();

  registerAdapter(adapter: TranslationSourceAdapter): void {
    this.adapters.set(adapter.resourceType, adapter);
  }

  getAdapter(resourceType: TranslationResourceType): TranslationSourceAdapter {
    const adapter = this.adapters.get(resourceType);

    if (adapter === undefined) {
      throw new UnsupportedTranslationResourceError();
    }

    return adapter;
  }

  async resolveSource(
    resourceType: TranslationResourceType,
    resourceId: string,
  ): Promise<TranslationSourceSnapshot> {
    const adapter = this.getAdapter(resourceType);
    const snapshot = await adapter.resolveSource(resourceId);

    if (snapshot === null) {
      throw new UnsupportedTranslationResourceError();
    }

    return snapshot;
  }
}
