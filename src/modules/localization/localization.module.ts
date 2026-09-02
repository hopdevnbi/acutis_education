import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { LearningContentModule } from '../learning-content/learning-content.module';
import { ParishModule } from '../parish/parish.module';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import {
  CurriculumLessonTranslationAdapter,
  CurriculumMetadataTranslationAdapter,
  CurriculumTopicTranslationAdapter,
  CurriculumVersionTranslationAdapter,
} from './adapters/curriculum-resource.adapters';
import { LearningContentDocumentTranslationAdapter } from './adapters/learning-content-resource.adapter';
import { QuestionBankVersionTranslationAdapter } from './adapters/question-bank-resource.adapter';
import { TranslationConfigService } from './config/translation-config.service';
import { LocalizationController } from './controllers/localization.controller';
import { LocalizationGlossaryController } from './controllers/localization-glossary.controller';
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
import { LocalizedResourceResolutionService } from './services/localized-resource-resolution.service';
import { LocalizationAccessService } from './services/localization-access.service';
import { LocalizationAdminService } from './services/localization-admin.service';
import { LocalizationService } from './services/localization.service';
import { TranslationJobProcessorService } from './services/translation-job-processor.service';
import { TranslationJobService } from './services/translation-job.service';
import { TranslationResourceService } from './services/translation-resource.service';
import { TranslationRevisionService } from './services/translation-revision.service';
import { TranslationSourceRegistryBootstrapService } from './services/translation-source-registry-bootstrap.service';
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
    AccessControlModule,
    AuthModule,
    ParishModule,
    CurriculumModule,
    LearningContentModule,
    QuestionBankModule,
  ],
  controllers: [LocalizationController, LocalizationGlossaryController],
  providers: [
    TranslationConfigService,
    LocaleResolutionService,
    TranslationResourceService,
    TranslationRevisionService,
    TranslationJobService,
    TranslationJobProcessorService,
    CatholicGlossaryService,
    TranslationSourceRegistryService,
    TranslationSourceRegistryBootstrapService,
    LocalizedResourceResolutionService,
    LocalizationAccessService,
    LocalizationAdminService,
    CurriculumMetadataTranslationAdapter,
    CurriculumVersionTranslationAdapter,
    CurriculumTopicTranslationAdapter,
    CurriculumLessonTranslationAdapter,
    LearningContentDocumentTranslationAdapter,
    QuestionBankVersionTranslationAdapter,
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
