import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CurriculumAssignmentEntity } from './entities/curriculum-assignment.entity';
import { CurriculumVersionEntity } from './entities/curriculum-version.entity';
import { CurriculumEntity } from './entities/curriculum.entity';
import { LessonEntity } from './entities/lesson.entity';
import { TopicEntity } from './entities/topic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CurriculumEntity,
      CurriculumVersionEntity,
      TopicEntity,
      LessonEntity,
      CurriculumAssignmentEntity,
    ]),
  ],
})
export class CurriculumModule {}
