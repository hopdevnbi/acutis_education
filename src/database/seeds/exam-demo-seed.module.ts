import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationConfigModule } from '../../config/config.module';
import { ClassModule } from '../../modules/class/class.module';
import { EnrollmentModule } from '../../modules/enrollment/enrollment.module';
import { ExamAssignmentEntity } from '../../modules/exam/entities/exam-assignment.entity';
import { ExamModule } from '../../modules/exam/exam.module';
import { ExamAssignmentService } from '../../modules/exam/services/exam-assignment.service';
import { ExamVersionOrchestrationService } from '../../modules/exam/services/exam-version-orchestration.service';
import { ParishModule } from '../../modules/parish/parish.module';
import { QuestionBankModule } from '../../modules/question-bank/question-bank.module';
import { StudentModule } from '../../modules/student/student.module';
import { UsersModule } from '../../modules/users/users.module';
import { DatabaseModule } from '../database.module';
import { ExamDemoSeedService } from './exam-demo.seed.service';

@Module({
  imports: [
    ApplicationConfigModule,
    DatabaseModule,
    UsersModule,
    ParishModule,
    ClassModule,
    StudentModule,
    EnrollmentModule,
    QuestionBankModule,
    ExamModule,
    TypeOrmModule.forFeature([ExamAssignmentEntity]),
  ],
  providers: [ExamVersionOrchestrationService, ExamAssignmentService, ExamDemoSeedService],
  exports: [ExamDemoSeedService],
})
export class ExamDemoSeedModule {}
