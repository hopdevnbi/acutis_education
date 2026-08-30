import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicStructureModule } from '../academic-structure/academic-structure.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ParishModule } from '../parish/parish.module';
import { CurriculumController } from './controllers/curriculum.controller';
import { TopicController } from './controllers/topic.controller';
import { CurriculumAssignmentEntity } from './entities/curriculum-assignment.entity';
import { CurriculumVersionEntity } from './entities/curriculum-version.entity';
import { CurriculumEntity } from './entities/curriculum.entity';
import { LessonEntity } from './entities/lesson.entity';
import { TopicEntity } from './entities/topic.entity';
import { CurriculumService } from './services/curriculum.service';
import { LessonService } from './services/lesson.service';
import { TopicService } from './services/topic.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CurriculumEntity,
      CurriculumVersionEntity,
      TopicEntity,
      LessonEntity,
      CurriculumAssignmentEntity,
    ]),
    ParishModule,
    AcademicStructureModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [CurriculumController, TopicController],
  providers: [CurriculumService, TopicService, LessonService],
  exports: [CurriculumService, TopicService, LessonService],
})
export class CurriculumModule {}
