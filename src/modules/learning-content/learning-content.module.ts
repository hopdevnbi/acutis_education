import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { CurriculumModule } from '../curriculum/curriculum.module';
import { ParishModule } from '../parish/parish.module';
import { LearningContentController } from './controllers/learning-content.controller';
import { LessonContentEntity } from './entities/lesson-content.entity';
import { LearningContentService } from './services/learning-content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonContentEntity]),
    CurriculumModule,
    AuthModule,
    AccessControlModule,
    ParishModule,
  ],
  controllers: [LearningContentController],
  providers: [LearningContentService],
  exports: [LearningContentService],
})
export class LearningContentModule {}
