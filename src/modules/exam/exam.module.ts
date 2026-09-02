import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { LocalizationModule } from '../localization/localization.module';
import { ParishModule } from '../parish/parish.module';
import { QuestionBankModule } from '../question-bank/question-bank.module';
import { StudentModule } from '../student/student.module';
import { ExamAssignmentController } from './controllers/exam-assignment.controller';
import { ExamCommandController } from './controllers/exam-command.controller';
import { ExamLearnerController } from './controllers/exam-learner.controller';
import { ExamController } from './controllers/exam.controller';
import { ExamVersionController } from './controllers/exam-version.controller';
import { ExamAssignmentEntity } from './entities/exam-assignment.entity';
import { ExamAttemptAnswerEntity } from './entities/exam-attempt-answer.entity';
import { ExamAttemptQuestionEntity } from './entities/exam-attempt-question.entity';
import { ExamAttemptEntity } from './entities/exam-attempt.entity';
import { ExamVersionQuestionEntity } from './entities/exam-version-question.entity';
import { ExamVersionEntity } from './entities/exam-version.entity';
import { ExamEntity } from './entities/exam.entity';
import { ExamAssignmentService } from './services/exam-assignment.service';
import { ExamAttemptAccessService } from './services/exam-attempt-access.service';
import { ExamAttemptGenerationService } from './services/exam-attempt-generation.service';
import { ExamAttemptQueryService } from './services/exam-attempt-query.service';
import { ExamLearnerAssignmentService } from './services/exam-learner-assignment.service';
import { ExamVersionOrchestrationService } from './services/exam-version-orchestration.service';
import { ExamService } from './services/exam.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExamEntity,
      ExamVersionEntity,
      ExamVersionQuestionEntity,
      ExamAssignmentEntity,
      ExamAttemptEntity,
      ExamAttemptQuestionEntity,
      ExamAttemptAnswerEntity,
    ]),
    ParishModule,
    ClassModule,
    QuestionBankModule,
    EnrollmentModule,
    StudentModule,
    LocalizationModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [
    ExamController,
    ExamVersionController,
    ExamCommandController,
    ExamAssignmentController,
    ExamLearnerController,
  ],
  providers: [
    ExamService,
    ExamVersionOrchestrationService,
    ExamAssignmentService,
    ExamAttemptAccessService,
    ExamAttemptGenerationService,
    ExamAttemptQueryService,
    ExamLearnerAssignmentService,
  ],
  exports: [ExamService],
})
export class ExamModule {}
