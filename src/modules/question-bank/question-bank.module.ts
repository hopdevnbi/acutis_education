import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { ParishModule } from '../parish/parish.module';
import { QuestionController } from './controllers/question.controller';
import { QuestionTagController } from './controllers/question-tag.controller';
import { QuestionVersionController } from './controllers/question-version.controller';
import { QuestionCorrectOptionEntity } from './entities/question-correct-option.entity';
import { QuestionCurriculumLinkEntity } from './entities/question-curriculum-link.entity';
import { QuestionOptionEntity } from './entities/question-option.entity';
import { QuestionTagLinkEntity } from './entities/question-tag-link.entity';
import { QuestionTagEntity } from './entities/question-tag.entity';
import { QuestionVersionEntity } from './entities/question-version.entity';
import { QuestionEntity } from './entities/question.entity';
import { QuestionBankService } from './services/question-bank.service';
import { QuestionCurriculumLinkService } from './services/question-curriculum-link.service';
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
    AuthModule,
    AccessControlModule,
  ],
  controllers: [QuestionController, QuestionVersionController, QuestionTagController],
  providers: [QuestionBankService, QuestionTagService, QuestionCurriculumLinkService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
