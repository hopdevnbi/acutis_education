import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicStructureModule } from './academic-structure/academic-structure.module';
import { AcademicYearService } from './academic-structure/services/academic-year.service';
import { CatechismLevelService } from './academic-structure/services/catechism-level.service';
import { AccessControlModule } from './access-control/access-control.module';
import { AccessControlService } from './access-control/services/access-control.service';
import { PermissionGuard } from './access-control/guards/permission.guard';
import { ClassModule } from './class/class.module';
import { ClassScopeService } from './class/services/class-scope.service';
import { ClassCatechistAssignmentService } from './class/services/class-catechist-assignment.service';
import { ClassService } from './class/services/class.service';
import { CurriculumModule } from './curriculum/curriculum.module';
import { CurriculumOrchestrationModule } from './curriculum-orchestration/curriculum-orchestration.module';
import { CurriculumDeliveryModule } from './curriculum-delivery/curriculum-delivery.module';
import { CurriculumService } from './curriculum/services/curriculum.service';
import { LessonService } from './curriculum/services/lesson.service';
import { TopicService } from './curriculum/services/topic.service';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { EnrollmentAccessService } from './enrollment/services/enrollment-access.service';
import { EnrollmentGuardianScopeService } from './enrollment/services/enrollment-guardian-scope.service';
import { EnrollmentQueryService } from './enrollment/services/enrollment-query.service';
import { EnrollmentService } from './enrollment/services/enrollment.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { AccessTokenService } from './auth/services/access-token.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ParishModule } from './parish/parish.module';
import { ParishMembershipService } from './parish/services/parish-membership.service';
import { ParishScopeService } from './parish/services/parish-scope.service';
import { ParishService } from './parish/services/parish.service';
import { StudentModule } from './student/student.module';
import { LearningContentModule } from './learning-content/learning-content.module';
import { LearningContentService } from './learning-content/services/learning-content.service';
import { MediaModule } from './media/media.module';
import { MediaAssetService } from './media/services/media-asset.service';
import { PracticeModule } from './practice/practice.module';
import { ExamModule } from './exam/exam.module';
import { PracticeService } from './practice/services/practice.service';
import { ExamService } from './exam/services/exam.service';
import { LearningProgressModule } from './learning-progress/learning-progress.module';
import { LearningProgressService } from './learning-progress/services/learning-progress.service';
import { FamilyPortalModule } from './family-portal/family-portal.module';
import { FamilyPortalService } from './family-portal/family-portal.service';
import { ClassOperationsModule } from './class-operations/class-operations.module';
import { ClassOperationsService } from './class-operations/services/class-operations.service';
import { ApplicationEventsModule } from './application-events/application-events.module';
import { GamificationModule } from './gamification/gamification.module';
import { GamificationService } from './gamification/gamification.service';
import { LocalizationModule } from './localization/localization.module';
import { LocalizationService } from './localization/services/localization.service';
import { LocaleResolutionService } from './localization/services/locale-resolution.service';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { QuestionBankService } from './question-bank/services/question-bank.service';
import { StudentAccessService } from './student/services/student-access.service';
import { LearnerSelfScopeService } from './student/services/learner-self-scope.service';
import { StudentGuardianService } from './student/services/student-guardian.service';
import { StudentService } from './student/services/student.service';
import { UserAccountService } from './users/services/user-account.service';
import { UsersModule } from './users/users.module';

type NestModuleConstructor = abstract new (...args: never[]) => unknown;

function resolveModuleExports(moduleType: NestModuleConstructor): unknown[] {
  const exports: unknown = Reflect.getMetadata(MODULE_METADATA.EXPORTS, moduleType);

  if (!Array.isArray(exports)) {
    return [];
  }

  return exports;
}

describe('Auth module persistence boundaries', () => {
  it('exports only UserAccountService from UsersModule', () => {
    const exports = resolveModuleExports(UsersModule);

    expect(exports).toHaveLength(1);
    expect(exports[0]).toBe(UserAccountService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports JwtAuthGuard and JwtModule from AuthModule without exposing AccessTokenService', () => {
    const exports = resolveModuleExports(AuthModule);

    expect(exports).toHaveLength(2);
    expect(exports).toContain(JwtAuthGuard);
    expect(exports).toContain(JwtModule);
    expect(exports).not.toContain(AccessTokenService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports AccessControlService and PermissionGuard from AccessControlModule', () => {
    const exports = resolveModuleExports(AccessControlModule);

    expect(exports).toHaveLength(2);
    expect(exports).toContain(AccessControlService);
    expect(exports).toContain(PermissionGuard);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports ParishService, ParishScopeService, and ParishMembershipService from ParishModule', () => {
    const exports = resolveModuleExports(ParishModule);

    expect(exports).toHaveLength(3);
    expect(exports).toContain(ParishService);
    expect(exports).toContain(ParishScopeService);
    expect(exports).toContain(ParishMembershipService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports AcademicYearService and CatechismLevelService only from AcademicStructureModule', () => {
    const exports = resolveModuleExports(AcademicStructureModule);

    expect(exports).toHaveLength(2);
    expect(exports).toContain(AcademicYearService);
    expect(exports).toContain(CatechismLevelService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports StudentService, StudentGuardianService, StudentAccessService, and LearnerSelfScopeService from StudentModule', () => {
    const exports = resolveModuleExports(StudentModule);

    expect(exports).toHaveLength(4);
    expect(exports).toContain(StudentService);
    expect(exports).toContain(StudentGuardianService);
    expect(exports).toContain(StudentAccessService);
    expect(exports).toContain(LearnerSelfScopeService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports ClassService, ClassCatechistAssignmentService, and ClassScopeService from ClassModule', () => {
    const exports = resolveModuleExports(ClassModule);

    expect(exports).toHaveLength(3);
    expect(exports).toContain(ClassService);
    expect(exports).toContain(ClassCatechistAssignmentService);
    expect(exports).toContain(ClassScopeService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports enrollment public services from EnrollmentModule', () => {
    const exports = resolveModuleExports(EnrollmentModule);

    expect(exports).toHaveLength(4);
    expect(exports).toContain(EnrollmentQueryService);
    expect(exports).toContain(EnrollmentService);
    expect(exports).toContain(EnrollmentGuardianScopeService);
    expect(exports).toContain(EnrollmentAccessService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports CurriculumService, TopicService, and LessonService from CurriculumModule', () => {
    const exports = resolveModuleExports(CurriculumModule);

    expect(exports).toHaveLength(3);
    expect(exports).toContain(CurriculumService);
    expect(exports).toContain(TopicService);
    expect(exports).toContain(LessonService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports nothing from CurriculumOrchestrationModule', () => {
    const exports = resolveModuleExports(CurriculumOrchestrationModule);

    expect(exports).toHaveLength(0);
  });

  it('exports nothing from CurriculumDeliveryModule', () => {
    const exports = resolveModuleExports(CurriculumDeliveryModule);

    expect(exports).toHaveLength(0);
  });

  it('exports LearningContentService only from LearningContentModule', () => {
    const exports = resolveModuleExports(LearningContentModule);

    expect(exports).toHaveLength(1);
    expect(exports).toContain(LearningContentService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports MediaAssetService only from MediaModule', () => {
    const exports = resolveModuleExports(MediaModule);

    expect(exports).toHaveLength(1);
    expect(exports).toContain(MediaAssetService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports QuestionBankService only from QuestionBankModule', () => {
    const exports = resolveModuleExports(QuestionBankModule);

    expect(exports).toHaveLength(1);
    expect(exports).toContain(QuestionBankService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports PracticeService only from PracticeModule', () => {
    const exports = resolveModuleExports(PracticeModule);

    expect(exports).toHaveLength(1);
    expect(exports).toContain(PracticeService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports ExamService only from ExamModule', () => {
    const exports = resolveModuleExports(ExamModule);

    expect(exports).toHaveLength(1);
    expect(exports).toContain(ExamService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports LearningProgressService only from LearningProgressModule', () => {
    const exports = resolveModuleExports(LearningProgressModule);

    expect(exports).toHaveLength(1);
    expect(exports).toContain(LearningProgressService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports FamilyPortalService only from FamilyPortalModule', () => {
    const exports = resolveModuleExports(FamilyPortalModule);

    expect(exports).toHaveLength(1);
    expect(exports).toContain(FamilyPortalService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports ClassOperationsService only from ClassOperationsModule', () => {
    const exports = resolveModuleExports(ClassOperationsModule);

    expect(exports).toHaveLength(1);
    expect(exports).toContain(ClassOperationsService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports GamificationService only from GamificationModule', () => {
    const exports = resolveModuleExports(GamificationModule);

    expect(exports).toHaveLength(1);
    expect(exports).toContain(GamificationService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('imports only approved modules for ClassOperationsModule', () => {
    const imports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ClassOperationsModule);

    expect(Array.isArray(imports)).toBe(true);
    expect(imports).toContain(ClassModule);
    expect(imports).toContain(EnrollmentModule);
    expect(imports).toContain(StudentModule);
    expect(imports).toContain(ParishModule);
    expect(imports).toContain(AuthModule);
    expect(imports).toContain(AccessControlModule);
    expect(imports).not.toContain(FamilyPortalModule);
    expect(imports).not.toContain(LearningProgressModule);
    expect(imports).not.toContain(PracticeModule);
    expect(imports).not.toContain(ExamModule);
    expect(imports).not.toContain(CurriculumModule);
    expect(imports).not.toContain(LocalizationModule);
    expect(imports).not.toContain(MediaModule);
  });

  it('imports only approved modules for GamificationModule', () => {
    const imports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, GamificationModule);

    expect(Array.isArray(imports)).toBe(true);
    expect(imports).toContain(StudentModule);
    expect(imports).toContain(EnrollmentModule);
    expect(imports).toContain(ClassModule);
    expect(imports).toContain(ParishModule);
    expect(imports).toContain(AuthModule);
    expect(imports).toContain(AccessControlModule);
    expect(imports).toContain(ApplicationEventsModule);
    expect(imports).not.toContain(FamilyPortalModule);
    expect(imports).not.toContain(LearningProgressModule);
    expect(imports).not.toContain(PracticeModule);
    expect(imports).not.toContain(ExamModule);
    expect(imports).not.toContain(ClassOperationsModule);
    expect(imports).not.toContain(LocalizationModule);
    expect(imports).not.toContain(MediaModule);
  });

  it('does not import GamificationModule from source reward modules', () => {
    const learningProgressImports: unknown = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      LearningProgressModule,
    );
    const practiceImports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, PracticeModule);
    const examImports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ExamModule);
    const classOpsImports: unknown = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      ClassOperationsModule,
    );

    expect(Array.isArray(learningProgressImports)).toBe(true);
    expect(Array.isArray(practiceImports)).toBe(true);
    expect(Array.isArray(examImports)).toBe(true);
    expect(Array.isArray(classOpsImports)).toBe(true);
    expect(learningProgressImports).not.toContain(GamificationModule);
    expect(practiceImports).not.toContain(GamificationModule);
    expect(examImports).not.toContain(GamificationModule);
    expect(classOpsImports).not.toContain(GamificationModule);
  });

  it('source reward modules do not import Gamification entities or service by source text', () => {
    const sourcePaths = [
      join(__dirname, 'learning-progress/learning-progress.module.ts'),
      join(__dirname, 'practice/practice.module.ts'),
      join(__dirname, 'exam/exam.module.ts'),
      join(__dirname, 'class-operations/class-operations.module.ts'),
      join(__dirname, 'learning-progress/services/lesson-progress.service.ts'),
      join(__dirname, 'practice/services/practice-answer.service.ts'),
      join(__dirname, 'exam/services/exam-attempt-finalization.service.ts'),
      join(__dirname, 'class-operations/services/class-operations.service.ts'),
    ];

    for (const sourcePath of sourcePaths) {
      const source = readFileSync(sourcePath, 'utf8');
      expect(source).not.toMatch(/GamificationModule|GamificationService|modules\/gamification\//);
      expect(source).not.toMatch(/forwardRef\s*\(/);
    }
  });

  it('does not import ClassOperationsModule from ClassModule or EnrollmentModule', () => {
    const classImports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ClassModule);
    const enrollmentImports: unknown = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      EnrollmentModule,
    );

    expect(Array.isArray(classImports)).toBe(true);
    expect(Array.isArray(enrollmentImports)).toBe(true);
    expect(classImports).not.toContain(ClassOperationsModule);
    expect(enrollmentImports).not.toContain(ClassOperationsModule);
  });

  it('imports only the public modules required by FamilyPortalModule', () => {
    const imports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, FamilyPortalModule);

    expect(Array.isArray(imports)).toBe(true);
    expect(imports).toEqual([
      AuthModule,
      AccessControlModule,
      ClassModule,
      EnrollmentModule,
      StudentModule,
      LearningProgressModule,
      ExamModule,
    ]);
    expect(imports).not.toContain(TypeOrmModule);
    expect(imports).not.toContain(PracticeModule);
    expect(imports).not.toContain(CurriculumModule);
    expect(imports).not.toContain(LocalizationModule);
    expect(imports).not.toContain(MediaModule);
    expect(imports).not.toContain(ClassOperationsModule);
  });

  it('exports LocalizationService and LocaleResolutionService only from LocalizationModule', () => {
    const exports = resolveModuleExports(LocalizationModule);

    expect(exports).toHaveLength(2);
    expect(exports).toContain(LocalizationService);
    expect(exports).toContain(LocaleResolutionService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('does not import EnrollmentModule from StudentModule', () => {
    const imports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, StudentModule);

    expect(Array.isArray(imports)).toBe(true);
    expect(imports).not.toContain(EnrollmentModule);
  });

  it('does not import PracticeModule from ExamModule', () => {
    const imports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ExamModule);

    expect(Array.isArray(imports)).toBe(true);
    expect(imports).not.toContain(PracticeModule);
  });

  it('does not import ExamModule from LocalizationModule', () => {
    const imports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, LocalizationModule);

    expect(Array.isArray(imports)).toBe(true);
    expect(imports).not.toContain(ExamModule);
  });

  it('does not import FamilyPortalModule from EnrollmentModule', () => {
    const imports: unknown = Reflect.getMetadata(MODULE_METADATA.IMPORTS, EnrollmentModule);

    expect(Array.isArray(imports)).toBe(true);
    expect(imports).not.toContain(FamilyPortalModule);
  });

  it('does not use forwardRef in GamificationModule and avoids foreign entity imports', () => {
    const moduleSource = readFileSync(join(__dirname, 'gamification/gamification.module.ts'), 'utf8');
    expect(moduleSource).not.toMatch(/forwardRef\s*\(/);
    expect(moduleSource).not.toMatch(/from ['"].*learning-progress.*entity/);
    expect(moduleSource).not.toMatch(/from ['"].*practice.*entity/);
    expect(moduleSource).not.toMatch(/from ['"].*exam.*entity/);
    expect(moduleSource).not.toMatch(/from ['"].*class-operations.*entity/);
    expect(moduleSource).not.toMatch(/FamilyPortalModule/);
    expect(moduleSource).not.toMatch(/LocalizationModule/);
    expect(moduleSource).not.toMatch(/MediaModule/);
  });

  it('does not use forwardRef in class-domain module definitions', () => {
    const modulePaths = [
      join(__dirname, 'student/student.module.ts'),
      join(__dirname, 'class/class.module.ts'),
      join(__dirname, 'enrollment/enrollment.module.ts'),
      join(__dirname, 'parish/parish.module.ts'),
      join(__dirname, 'curriculum-orchestration/curriculum-orchestration.module.ts'),
      join(__dirname, 'curriculum-delivery/curriculum-delivery.module.ts'),
      join(__dirname, 'localization/localization.module.ts'),
      join(__dirname, 'exam/exam.module.ts'),
      join(__dirname, 'family-portal/family-portal.module.ts'),
      join(__dirname, 'class-operations/class-operations.module.ts'),
      join(__dirname, 'gamification/gamification.module.ts'),
    ];

    for (const modulePath of modulePaths) {
      const source = readFileSync(modulePath, 'utf8');

      expect(source).not.toMatch(/forwardRef\s*\(/);
    }
  });
});
