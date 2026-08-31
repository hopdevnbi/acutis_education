import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionCorrectOptionEntity } from './entities/question-correct-option.entity';
import { QuestionCurriculumLinkEntity } from './entities/question-curriculum-link.entity';
import { QuestionOptionEntity } from './entities/question-option.entity';
import { QuestionTagLinkEntity } from './entities/question-tag-link.entity';
import { QuestionTagEntity } from './entities/question-tag.entity';
import { QuestionVersionEntity } from './entities/question-version.entity';
import { QuestionEntity } from './entities/question.entity';

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
  ],
})
export class QuestionBankModule {}
