import { Module } from '@nestjs/common';
import { ApplicationConfigModule } from '../../config/config.module';
import { AcademicStructureModule } from '../../modules/academic-structure/academic-structure.module';
import { ClassModule } from '../../modules/class/class.module';
import { ClassDomainScopeModule } from '../../modules/enrollment/class-domain-scope.module';
import { EnrollmentModule } from '../../modules/enrollment/enrollment.module';
import { ParishModule } from '../../modules/parish/parish.module';
import { StudentModule } from '../../modules/student/student.module';
import { UsersModule } from '../../modules/users/users.module';
import { DatabaseModule } from '../database.module';
import { ClassEnrollmentSeedService } from './class-enrollment.seed.service';

@Module({
  imports: [
    ApplicationConfigModule,
    DatabaseModule,
    UsersModule,
    ParishModule,
    AcademicStructureModule,
    ClassModule,
    StudentModule,
    EnrollmentModule,
    ClassDomainScopeModule,
  ],
  providers: [ClassEnrollmentSeedService],
  exports: [ClassEnrollmentSeedService],
})
export class ClassEnrollmentSeedModule {}
