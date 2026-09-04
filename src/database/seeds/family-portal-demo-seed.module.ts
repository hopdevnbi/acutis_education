import { Module } from '@nestjs/common';
import { AuthRbacSeedModule } from './auth-rbac-seed.module';
import { ClassEnrollmentSeedModule } from './class-enrollment-seed.module';
import { CurriculumDemoSeedModule } from './curriculum-demo-seed.module';
import { ExamDemoSeedModule } from './exam-demo-seed.module';
import { FamilyPortalDemoSeedService } from './family-portal-demo.seed.service';
import { LearningProgressDemoSeedModule } from './learning-progress-demo-seed.module';
import { ParishAcademicSeedModule } from './parish-academic-seed.module';
import { QuestionBankDemoSeedModule } from './question-bank-demo-seed.module';

@Module({
  imports: [
    AuthRbacSeedModule,
    ParishAcademicSeedModule,
    ClassEnrollmentSeedModule,
    CurriculumDemoSeedModule,
    QuestionBankDemoSeedModule,
    LearningProgressDemoSeedModule,
    ExamDemoSeedModule,
  ],
  providers: [FamilyPortalDemoSeedService],
  exports: [FamilyPortalDemoSeedService],
})
export class FamilyPortalDemoSeedModule {}
