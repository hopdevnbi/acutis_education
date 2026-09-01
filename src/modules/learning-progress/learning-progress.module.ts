import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassModule } from '../class/class.module';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { StudentModule } from '../student/student.module';
import { LessonProgressEntity } from './entities/lesson-progress.entity';
import { LearningProgressAccessService } from './services/learning-progress-access.service';
import { LearningProgressService } from './services/learning-progress.service';
import { LessonProgressService } from './services/lesson-progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonProgressEntity]),
    EnrollmentModule,
    ClassModule,
    CurriculumModule,
    StudentModule,
  ],
  providers: [LearningProgressService, LessonProgressService, LearningProgressAccessService],
  exports: [LearningProgressService],
})
export class LearningProgressModule {}
