import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationConfigService } from './config/translation-config.service';
import { CatholicGlossaryTermEntity } from './entities/catholic-glossary-term.entity';
import { CatholicGlossaryVersionEntity } from './entities/catholic-glossary-version.entity';
import { TranslationJobEntity } from './entities/translation-job.entity';
import { TranslationResourceEntity } from './entities/translation-resource.entity';
import { TranslationRevisionEntity } from './entities/translation-revision.entity';
import { GoogleCloudTranslationProvider } from './providers/google-cloud-translation.provider';
import { MockTranslationProvider } from './providers/mock-translation.provider';
import { TranslationProviderRegistry } from './providers/translation-provider-registry.service';
import { CatholicGlossaryService } from './services/catholic-glossary.service';
import { LocaleResolutionService } from './services/locale-resolution.service';
import { LocalizationService } from './services/localization.service';
import { TranslationJobProcessorService } from './services/translation-job-processor.service';
import { TranslationJobService } from './services/translation-job.service';
import { TranslationResourceService } from './services/translation-resource.service';
import { TranslationRevisionService } from './services/translation-revision.service';
import { TranslationSourceRegistryService } from './services/translation-source-registry.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TranslationResourceEntity,
      TranslationRevisionEntity,
      TranslationJobEntity,
      CatholicGlossaryVersionEntity,
      CatholicGlossaryTermEntity,
    ]),
  ],
  providers: [
    TranslationConfigService,
    LocaleResolutionService,
    TranslationResourceService,
    TranslationRevisionService,
    TranslationJobService,
    TranslationJobProcessorService,
    CatholicGlossaryService,
    TranslationSourceRegistryService,
    MockTranslationProvider,
    GoogleCloudTranslationProvider,
    TranslationProviderRegistry,
    LocalizationService,
  ],
  exports: [LocalizationService, LocaleResolutionService],
})
export class LocalizationModule implements OnModuleInit {
  constructor(private readonly translationProviderRegistry: TranslationProviderRegistry) {}

  onModuleInit(): void {
    this.translationProviderRegistry.initialize();
  }
}
