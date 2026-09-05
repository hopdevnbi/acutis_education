import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../config/config.module';
import { ClassModule } from '../../modules/class/class.module';
import { ClassOperationsModule } from '../../modules/class-operations/class-operations.module';
import { EnrollmentModule } from '../../modules/enrollment/enrollment.module';
import { ParishModule } from '../../modules/parish/parish.module';
import { StudentModule } from '../../modules/student/student.module';
import { UsersModule } from '../../modules/users/users.module';
import { DatabaseModule } from '../database.module';
import { AuthRbacSeedModule } from './auth-rbac-seed.module';
import { ClassEnrollmentSeedModule } from './class-enrollment-seed.module';
import { ClassOperationsDemoSeedService } from './class-operations-demo.seed.service';
import { ParishAcademicSeedModule } from './parish-academic-seed.module';

@Module({
  imports: [
    ApplicationConfigModule,
    DatabaseModule,
    AuthRbacSeedModule,
    ParishAcademicSeedModule,
    ClassEnrollmentSeedModule,
    UsersModule,
    ParishModule,
    ClassModule,
    StudentModule,
    EnrollmentModule,
    ClassOperationsModule,
  ],
  providers: [ClassOperationsDemoSeedService],
  exports: [ClassOperationsDemoSeedService],
})
export class ClassOperationsDemoSeedModule {}
