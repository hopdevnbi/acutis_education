import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { MediaModule } from '../media/media.module';
import { ParishModule } from '../parish/parish.module';
import { QuestionController } from './controllers/question.controller';
import { QuestionImportController } from './controllers/question-import.controller';
import { QuestionTagController } from './controllers/question-tag.controller';
import { QuestionVersionController } from './controllers/question-version.controller';
import { QuestionCorrectOptionEntity } from './entities/question-correct-option.entity';
import { QuestionCurriculumLinkEntity } from './entities/question-curriculum-link.entity';
import { QuestionOptionEntity } from './entities/question-option.entity';
import { QuestionTagLinkEntity } from './entities/question-tag-link.entity';
import { QuestionTagEntity } from './entities/question-tag.entity';
import { QuestionVersionEntity } from './entities/question-version.entity';
import { QuestionEntity } from './entities/question.entity';
import { QuestionPracticeSelectionService } from './services/question-practice-selection.service';
import { QuestionBankService } from './services/question-bank.service';
import { QuestionCurriculumLinkService } from './services/question-curriculum-link.service';
import { QuestionExportService } from './services/question-export.service';
import { QuestionGradingService } from './services/question-grading.service';
import { QuestionImportValidationService } from './services/question-import-validation.service';
import { QuestionOptionService } from './services/question-option.service';
import { QuestionTagService } from './services/question-tag.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionEntity,
      QuestionVersionEntity,
      QuestionOptionEntity,
      QuestionCorrectOptionEntity,
      QuestionTagEntity,
      QuestionTagLinkEntity,
      QuestionCurriculumLinkEntity,
    ]),
    ParishModule,
    CurriculumModule,
    MediaModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [
    QuestionController,
    QuestionVersionController,
    QuestionTagController,
    QuestionImportController,
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
  ],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
