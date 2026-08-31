import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationConfigModule } from '../../config/config.module';
import { CurriculumModule } from '../../modules/curriculum/curriculum.module';
import { MediaModule } from '../../modules/media/media.module';
import { ParishModule } from '../../modules/parish/parish.module';
import { QuestionCorrectOptionEntity } from '../../modules/question-bank/entities/question-correct-option.entity';
import { QuestionCurriculumLinkEntity } from '../../modules/question-bank/entities/question-curriculum-link.entity';
import { QuestionOptionEntity } from '../../modules/question-bank/entities/question-option.entity';
import { QuestionTagLinkEntity } from '../../modules/question-bank/entities/question-tag-link.entity';
import { QuestionTagEntity } from '../../modules/question-bank/entities/question-tag.entity';
import { QuestionVersionEntity } from '../../modules/question-bank/entities/question-version.entity';
import { QuestionEntity } from '../../modules/question-bank/entities/question.entity';
import { QuestionBankService } from '../../modules/question-bank/services/question-bank.service';
import { QuestionCurriculumLinkService } from '../../modules/question-bank/services/question-curriculum-link.service';
import { QuestionExportService } from '../../modules/question-bank/services/question-export.service';
import { QuestionGradingService } from '../../modules/question-bank/services/question-grading.service';
import { QuestionImportValidationService } from '../../modules/question-bank/services/question-import-validation.service';
import { QuestionOptionService } from '../../modules/question-bank/services/question-option.service';
import { QuestionPracticeSelectionService } from '../../modules/question-bank/services/question-practice-selection.service';
import { QuestionTagService } from '../../modules/question-bank/services/question-tag.service';
import { UsersModule } from '../../modules/users/users.module';
import { DatabaseModule } from '../database.module';
import { QuestionBankDemoSeedService } from './question-bank-demo.seed.service';

@Module({
  imports: [
    ApplicationConfigModule,
    DatabaseModule,
    UsersModule,
    ParishModule,
    CurriculumModule,
    MediaModule,
    TypeOrmModule.forFeature([
      QuestionEntity,
      QuestionVersionEntity,
      QuestionOptionEntity,
      QuestionCorrectOptionEntity,
      QuestionTagEntity,
      QuestionTagLinkEntity,
      QuestionCurriculumLinkEntity,
    ]),
  ],
  providers: [
    QuestionBankService,
    QuestionOptionService,
    QuestionGradingService,
    QuestionTagService,
    QuestionCurriculumLinkService,
    QuestionExportService,
    QuestionImportValidationService,
    QuestionPracticeSelectionService,
    QuestionBankDemoSeedService,
  ],
  exports: [QuestionBankDemoSeedService],
})
export class QuestionBankDemoSeedModule {}
