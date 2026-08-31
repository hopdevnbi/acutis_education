import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { MediaModule } from '../media/media.module';
import { ParishModule } from '../parish/parish.module';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import { StudentModule } from '../student/student.module';
import { PracticeController } from './controllers/practice.controller';
import { PracticeAnswerAttemptEntity } from './entities/practice-answer-attempt.entity';
import { PracticeSessionQuestionEntity } from './entities/practice-session-question.entity';
import { PracticeSessionEntity } from './entities/practice-session.entity';
import { PracticeAccessService } from './services/practice-access.service';
import { PracticeGenerationService } from './services/practice-generation.service';
import { PracticeMediaService } from './services/practice-media.service';
import { PracticeSessionQueryService } from './services/practice-session-query.service';
import { PracticeService } from './services/practice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PracticeSessionEntity,
      PracticeSessionQuestionEntity,
      PracticeAnswerAttemptEntity,
    ]),
    QuestionBankModule,
    EnrollmentModule,
    ClassModule,
    CurriculumModule,
    MediaModule,
    ParishModule,
    StudentModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [PracticeController],
  providers: [
    PracticeService,
    PracticeGenerationService,
    PracticeSessionQueryService,
    PracticeMediaService,
    PracticeAccessService,
  ],
  exports: [PracticeService],
})
export class PracticeModule {}
