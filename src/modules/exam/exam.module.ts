import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamAssignmentEntity } from './entities/exam-assignment.entity';
import { ExamAttemptAnswerEntity } from './entities/exam-attempt-answer.entity';
import { ExamAttemptQuestionEntity } from './entities/exam-attempt-question.entity';
import { ExamAttemptEntity } from './entities/exam-attempt.entity';
import { ExamVersionQuestionEntity } from './entities/exam-version-question.entity';
import { ExamVersionEntity } from './entities/exam-version.entity';
import { ExamEntity } from './entities/exam.entity';
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
  ],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}
