import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../config/config.module';
import { AcademicStructureModule } from '../../modules/academic-structure/academic-structure.module';
import { CurriculumModule } from '../../modules/curriculum/curriculum.module';
import { CurriculumVersionOrchestrationService } from '../../modules/curriculum-orchestration/services/curriculum-version-orchestration.service';
import { LearningContentModule } from '../../modules/learning-content/learning-content.module';
import { ParishModule } from '../../modules/parish/parish.module';
import { UsersModule } from '../../modules/users/users.module';
import { DatabaseModule } from '../database.module';
import { CurriculumDemoSeedService } from './curriculum-demo.seed.service';

@Module({
  imports: [
    ApplicationConfigModule,
    DatabaseModule,
    UsersModule,
    ParishModule,
    AcademicStructureModule,
    CurriculumModule,
    LearningContentModule,
  ],
  providers: [CurriculumVersionOrchestrationService, CurriculumDemoSeedService],
  exports: [CurriculumDemoSeedService],
})
export class CurriculumDemoSeedModule {}
