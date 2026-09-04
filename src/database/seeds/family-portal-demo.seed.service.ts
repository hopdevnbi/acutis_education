import { Injectable, Logger } from '@nestjs/common';
import { AuthRbacSeedService } from './auth-rbac.seed.service';
import { ClassEnrollmentSeedService } from './class-enrollment.seed.service';
import { CurriculumDemoSeedService } from './curriculum-demo.seed.service';
import { ExamDemoSeedService, type ExamDemoSeedSummary } from './exam-demo.seed.service';
import {
  FAMILY_PORTAL_DEMO_CATECHIST_EMAIL,
  FAMILY_PORTAL_DEMO_PARENT_EMAIL,
  FAMILY_PORTAL_DEMO_SAMPLE_PASSWORD,
} from './family-portal-demo.seed.constants';
import {
  LearningProgressDemoSeedService,
  type LearningProgressDemoSeedSummary,
} from './learning-progress-demo.seed.service';
import { ParishAcademicSeedService } from './parish-academic.seed.service';
import { QuestionBankDemoSeedService } from './question-bank-demo.seed.service';

export interface FamilyPortalDemoSeedSummary {
  readonly catechistEmail: string;
  readonly parentEmail: string;
  readonly samplePassword: string;
  readonly learningProgress: LearningProgressDemoSeedSummary;
  readonly exam: ExamDemoSeedSummary;
  readonly steps: {
    readonly authRbac: true;
    readonly parishAcademic: true;
    readonly classEnrollment: true;
    readonly curriculumDemo: true;
    readonly questionBankDemo: true;
    readonly learningProgressDemo: true;
    readonly examDemo: true;
  };
}

/**
 * Orchestration-only demo seed for Family Portal manual/Postman flows.
 * Does not own domain rows; composes existing owning-domain seed services.
 */
@Injectable()
export class FamilyPortalDemoSeedService {
  private readonly logger = new Logger(FamilyPortalDemoSeedService.name);

  constructor(
    private readonly authRbacSeedService: AuthRbacSeedService,
    private readonly parishAcademicSeedService: ParishAcademicSeedService,
    private readonly classEnrollmentSeedService: ClassEnrollmentSeedService,
    private readonly curriculumDemoSeedService: CurriculumDemoSeedService,
    private readonly questionBankDemoSeedService: QuestionBankDemoSeedService,
    private readonly learningProgressDemoSeedService: LearningProgressDemoSeedService,
    private readonly examDemoSeedService: ExamDemoSeedService,
  ) {}

  async run(): Promise<FamilyPortalDemoSeedSummary> {
    this.logger.log('Running Family Portal demo seed chain (orchestration only).');

    await this.authRbacSeedService.run();
    await this.parishAcademicSeedService.run();
    await this.classEnrollmentSeedService.run();
    await this.curriculumDemoSeedService.run();
    await this.questionBankDemoSeedService.run();
    const learningProgress = await this.learningProgressDemoSeedService.run();
    const exam = await this.examDemoSeedService.run();

    const summary: FamilyPortalDemoSeedSummary = {
      catechistEmail: FAMILY_PORTAL_DEMO_CATECHIST_EMAIL,
      parentEmail: FAMILY_PORTAL_DEMO_PARENT_EMAIL,
      samplePassword: FAMILY_PORTAL_DEMO_SAMPLE_PASSWORD,
      learningProgress,
      exam,
      steps: {
        authRbac: true,
        parishAcademic: true,
        classEnrollment: true,
        curriculumDemo: true,
        questionBankDemo: true,
        learningProgressDemo: true,
        examDemo: true,
      },
    };

    this.logger.log(
      `Family Portal demo ready. catechist=${summary.catechistEmail} parent=${summary.parentEmail} classId=${learningProgress.classId} enrollmentId=${learningProgress.enrollmentId} examAssignmentId=${exam.examAssignmentId}.`,
    );

    return summary;
  }
}
