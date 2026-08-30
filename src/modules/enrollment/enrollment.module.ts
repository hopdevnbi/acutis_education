import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { ParishModule } from '../parish/parish.module';
import { StudentModule } from '../student/student.module';
import { EnrollmentController } from './controllers/enrollment.controller';
import { ParishEnrollmentStudentController } from './controllers/parish-enrollment-student.controller';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { EnrollmentGuardianScopeService } from './services/enrollment-guardian-scope.service';
import { EnrollmentAccessService } from './services/enrollment-access.service';
import { EnrollmentQueryService } from './services/enrollment-query.service';
import { EnrollmentService } from './services/enrollment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnrollmentEntity]),
    StudentModule,
    ClassModule,
    ParishModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [EnrollmentController, ParishEnrollmentStudentController],
  providers: [
    EnrollmentQueryService,
    EnrollmentService,
    EnrollmentGuardianScopeService,
    EnrollmentAccessService,
  ],
  exports: [
    EnrollmentQueryService,
    EnrollmentService,
    EnrollmentGuardianScopeService,
    EnrollmentAccessService,
  ],
})
export class EnrollmentModule {}
