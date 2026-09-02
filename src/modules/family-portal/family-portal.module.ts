import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ExamModule } from '../exam/exam.module';
import { LearningProgressModule } from '../learning-progress/learning-progress.module';
import { StudentModule } from '../student/student.module';
import { FamilyPortalCatechistController } from './controllers/family-portal-catechist.controller';
import { FamilyPortalParentController } from './controllers/family-portal-parent.controller';
import { FamilyPortalService } from './family-portal.service';
import { CatechistPortalService } from './services/catechist-portal.service';
import { FamilyPortalAccessService } from './services/family-portal-access.service';
import { ParentPortalService } from './services/parent-portal.service';

@Module({
  imports: [
    AuthModule,
    AccessControlModule,
    ClassModule,
    EnrollmentModule,
    StudentModule,
    LearningProgressModule,
    ExamModule,
  ],
  controllers: [FamilyPortalCatechistController, FamilyPortalParentController],
  providers: [
    FamilyPortalService,
    CatechistPortalService,
    ParentPortalService,
    FamilyPortalAccessService,
  ],
  exports: [FamilyPortalService],
})
export class FamilyPortalModule {}
