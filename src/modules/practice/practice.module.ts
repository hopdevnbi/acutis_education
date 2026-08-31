import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PracticeAnswerAttemptEntity } from './entities/practice-answer-attempt.entity';
import { PracticeSessionQuestionEntity } from './entities/practice-session-question.entity';
import { PracticeSessionEntity } from './entities/practice-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PracticeSessionEntity,
      PracticeSessionQuestionEntity,
      PracticeAnswerAttemptEntity,
    ]),
  ],
})
export class PracticeModule {}
