import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../config/config.module';
import { ClassModule } from '../../modules/class/class.module';
import { CurriculumModule } from '../../modules/curriculum/curriculum.module';
import { EnrollmentModule } from '../../modules/enrollment/enrollment.module';
import { LearningProgressModule } from '../../modules/learning-progress/learning-progress.module';
import { ParishModule } from '../../modules/parish/parish.module';
import { StudentModule } from '../../modules/student/student.module';
import { UsersModule } from '../../modules/users/users.module';
import { DatabaseModule } from '../database.module';
import { LearningProgressDemoSeedService } from './learning-progress-demo.seed.service';

@Module({
  imports: [
    ApplicationConfigModule,
    DatabaseModule,
    UsersModule,
    ParishModule,
    ClassModule,
    StudentModule,
    EnrollmentModule,
    CurriculumModule,
    LearningProgressModule,
  ],
  providers: [LearningProgressDemoSeedService],
  exports: [LearningProgressDemoSeedService],
})
export class LearningProgressDemoSeedModule {}
