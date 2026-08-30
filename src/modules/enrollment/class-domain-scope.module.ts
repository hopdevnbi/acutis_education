import { Global, Module } from '@nestjs/common';
import { CLASS_PARENT_READ_SCOPE_PORT } from '../class/interfaces/class-parent-read-scope.port';
import { EnrollmentAccessService } from './services/enrollment-access.service';
import { EnrollmentGuardianScopeService } from './services/enrollment-guardian-scope.service';
import { EnrollmentModule } from './enrollment.module';
import { PARISH_GUARDIAN_READ_SCOPE_PORT } from '../parish/interfaces/parish-guardian-read-scope.port';
import { STUDENT_DOMAIN_SCOPE_PORT } from '../student/interfaces/student-domain-scope.port';

@Global()
@Module({
  imports: [EnrollmentModule],
  providers: [
    {
      provide: STUDENT_DOMAIN_SCOPE_PORT,
      useExisting: EnrollmentAccessService,
    },
    {
      provide: PARISH_GUARDIAN_READ_SCOPE_PORT,
      useExisting: EnrollmentGuardianScopeService,
    },
    {
      provide: CLASS_PARENT_READ_SCOPE_PORT,
      useExisting: EnrollmentGuardianScopeService,
    },
  ],
  exports: [
    STUDENT_DOMAIN_SCOPE_PORT,
    PARISH_GUARDIAN_READ_SCOPE_PORT,
    CLASS_PARENT_READ_SCOPE_PORT,
  ],
})
export class ClassDomainScopeModule {}
