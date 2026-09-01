import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranslationResourceEntity } from './entities/translation-resource.entity';
import { TranslationRevisionEntity } from './entities/translation-revision.entity';
import { LocaleResolutionService } from './services/locale-resolution.service';
import { LocalizationService } from './services/localization.service';
import { TranslationResourceService } from './services/translation-resource.service';
import { TranslationRevisionService } from './services/translation-revision.service';

@Module({
  imports: [TypeOrmModule.forFeature([TranslationResourceEntity, TranslationRevisionEntity])],
  providers: [
    LocaleResolutionService,
    TranslationResourceService,
    TranslationRevisionService,
    LocalizationService,
  ],
  exports: [LocalizationService, LocaleResolutionService],
})
export class LocalizationModule {}
