import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonContentEntity } from './entities/lesson-content.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LessonContentEntity])],
})
export class LearningContentModule {}
