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
import { EnrollmentModule } from './enrollment/enrollment.module';
import { EnrollmentQueryService } from './enrollment/services/enrollment-query.service';
import { EnrollmentService } from './enrollment/services/enrollment.service';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';
import { AccessTokenService } from './auth/services/access-token.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ParishModule } from './parish/parish.module';
import { ParishScopeService } from './parish/services/parish-scope.service';
import { ParishService } from './parish/services/parish.service';
import { StudentModule } from './student/student.module';
import { StudentAccessService } from './student/services/student-access.service';
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

  it('exports ParishService and ParishScopeService from ParishModule', () => {
    const exports = resolveModuleExports(ParishModule);

    expect(exports).toHaveLength(2);
    expect(exports).toContain(ParishService);
    expect(exports).toContain(ParishScopeService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports AcademicYearService and CatechismLevelService only from AcademicStructureModule', () => {
    const exports = resolveModuleExports(AcademicStructureModule);

    expect(exports).toHaveLength(2);
    expect(exports).toContain(AcademicYearService);
    expect(exports).toContain(CatechismLevelService);
    expect(exports).not.toContain(TypeOrmModule);
  });

  it('exports StudentService, StudentGuardianService, and StudentAccessService from StudentModule', () => {
    const exports = resolveModuleExports(StudentModule);

    expect(exports).toHaveLength(3);
    expect(exports).toContain(StudentService);
    expect(exports).toContain(StudentGuardianService);
    expect(exports).toContain(StudentAccessService);
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

  it('exports EnrollmentQueryService and EnrollmentService only from EnrollmentModule', () => {
    const exports = resolveModuleExports(EnrollmentModule);

    expect(exports).toHaveLength(2);
    expect(exports).toContain(EnrollmentQueryService);
    expect(exports).toContain(EnrollmentService);
    expect(exports).not.toContain(TypeOrmModule);
  });
});
