import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { PracticeModule } from '../practice/practice.module';
import { StudentModule } from '../student/student.module';
import { LearningProgressController } from './controllers/learning-progress.controller';
import { LessonProgressEntity } from './entities/lesson-progress.entity';
import { LearningProgressAccessService } from './services/learning-progress-access.service';
import { LearningProgressAggregationService } from './services/learning-progress-aggregation.service';
import { LearningProgressService } from './services/learning-progress.service';
import { LessonProgressService } from './services/lesson-progress.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonProgressEntity]),
    EnrollmentModule,
    ClassModule,
    CurriculumModule,
    StudentModule,
    ParishModule,
    PracticeModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [LearningProgressController],
  providers: [
    LearningProgressService,
    LessonProgressService,
    LearningProgressAccessService,
    LearningProgressAggregationService,
  ],
  exports: [LearningProgressService],
})
export class LearningProgressModule {}
