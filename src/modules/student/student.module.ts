import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { UsersModule } from '../users/users.module';
import { StudentGuardianController } from './controllers/student-guardian.controller';
import { StudentController } from './controllers/student.controller';
import { StudentGuardianEntity } from './entities/student-guardian.entity';
import { StudentEntity } from './entities/student.entity';
import { StudentGuardianService } from './services/student-guardian.service';
import { StudentAccessService } from './services/student-access.service';
import { StudentService } from './services/student.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentEntity, StudentGuardianEntity]),
    UsersModule,
    ParishModule,
    forwardRef(() => EnrollmentModule),
    forwardRef(() => ClassModule),
    AuthModule,
    AccessControlModule,
  ],
  controllers: [StudentController, StudentGuardianController],
  providers: [StudentService, StudentGuardianService, StudentAccessService],
  exports: [StudentService, StudentGuardianService, StudentAccessService],
})
export class StudentModule {}
