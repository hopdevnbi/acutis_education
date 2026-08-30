import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { LearningContentModule } from '../learning-content/learning-content.module';
import { ParishModule } from '../parish/parish.module';
import { CurriculumCommandController } from './controllers/curriculum-command.controller';
import { LessonController } from './controllers/lesson.controller';
import { CurriculumVersionOrchestrationService } from './services/curriculum-version-orchestration.service';

@Module({
  imports: [CurriculumModule, LearningContentModule, AuthModule, AccessControlModule, ParishModule],
  controllers: [LessonController, CurriculumCommandController],
  providers: [CurriculumVersionOrchestrationService],
})
export class CurriculumOrchestrationModule {}
