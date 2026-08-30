import { Module, type DynamicModule } from '@nestjs/common';
import { ApplicationConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { DevRbacModule } from './dev/dev-rbac.module';
import { isAuthRbacDemoEnabledFromEnvironment } from './dev/is-auth-rbac-demo-enabled';
import { HealthModule } from './health/health.module';
import { GlobalExceptionFilter } from './http/global-exception.filter';
import { ApplicationLoggingModule } from './logging/logging.module';
import { AcademicStructureModule } from './modules/academic-structure/academic-structure.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassModule } from './modules/class/class.module';
import { ClassDomainScopeModule } from './modules/enrollment/class-domain-scope.module';
import { EnrollmentModule } from './modules/enrollment/enrollment.module';
import { ParishModule } from './modules/parish/parish.module';
import { StudentModule } from './modules/student/student.module';
import { UsersModule } from './modules/users/users.module';

export interface AppModuleOptions {
  authRbacDemoEnabled?: boolean;
}

@Module({})
export class AppModule {
  static forRoot(options: AppModuleOptions = {}): DynamicModule {
    const authRbacDemoEnabled =
      options.authRbacDemoEnabled ?? isAuthRbacDemoEnabledFromEnvironment(process.env);

    return {
      module: AppModule,
      imports: [
        ApplicationConfigModule,
        ApplicationLoggingModule,
        DatabaseModule,
        HealthModule,
        UsersModule,
        AuthModule,
        AccessControlModule,
        ParishModule,
        AcademicStructureModule,
        StudentModule,
        ClassModule,
        EnrollmentModule,
        ClassDomainScopeModule,
        ...(authRbacDemoEnabled ? [DevRbacModule] : []),
      ],
      providers: [GlobalExceptionFilter],
    };
  }
}
