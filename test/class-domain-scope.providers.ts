import { CLASS_PARENT_READ_SCOPE_PORT } from '../src/modules/class/interfaces/class-parent-read-scope.port';
import { EnrollmentAccessService } from '../src/modules/enrollment/services/enrollment-access.service';
import { EnrollmentGuardianScopeService } from '../src/modules/enrollment/services/enrollment-guardian-scope.service';
import { PARISH_GUARDIAN_READ_SCOPE_PORT } from '../src/modules/parish/interfaces/parish-guardian-read-scope.port';
import { STUDENT_DOMAIN_SCOPE_PORT } from '../src/modules/student/interfaces/student-domain-scope.port';

export const classDomainScopeProviders = [
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
] as const;
