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
import { ExamResultController } from './controllers/exam-result.controller';
import { ExamController } from './controllers/exam.controller';
import { ExamVersionController } from './controllers/exam-version.controller';
import { ExamAssignmentEntity } from './entities/exam-assignment.entity';
import { ExamAttemptAnswerEntity } from './entities/exam-attempt-answer.entity';
import { ExamAttemptQuestionEntity } from './entities/exam-attempt-question.entity';
import { ExamAttemptEntity } from './entities/exam-attempt.entity';
import { ExamVersionQuestionEntity } from './entities/exam-version-question.entity';
import { ExamVersionEntity } from './entities/exam-version.entity';
import { ExamEntity } from './entities/exam.entity';
import { ExamAssignmentAttemptSummaryService } from './services/exam-assignment-attempt-summary.service';
import { ExamAssignmentService } from './services/exam-assignment.service';
import { ExamAttemptAccessService } from './services/exam-attempt-access.service';
import { ExamAttemptAnswerService } from './services/exam-attempt-answer.service';
import { ExamAttemptFinalizationService } from './services/exam-attempt-finalization.service';
import { ExamAttemptGenerationService } from './services/exam-attempt-generation.service';
import { ExamAttemptQueryService } from './services/exam-attempt-query.service';
import { ExamAttemptResultQueryService } from './services/exam-attempt-result-query.service';
import { ExamLearnerAssignmentService } from './services/exam-learner-assignment.service';
import { ExamResultAccessService } from './services/exam-result-access.service';
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
    ExamResultController,
  ],
  providers: [
    ExamService,
    ExamVersionOrchestrationService,
    ExamAssignmentService,
    ExamAssignmentAttemptSummaryService,
    ExamAttemptAccessService,
    ExamAttemptAnswerService,
    ExamAttemptFinalizationService,
    ExamAttemptGenerationService,
    ExamAttemptQueryService,
    ExamAttemptResultQueryService,
    ExamLearnerAssignmentService,
    ExamResultAccessService,
  ],
  exports: [ExamService],
})
export class ExamModule {}
