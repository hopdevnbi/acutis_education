import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { UsersModule } from '../users/users.module';
import { StudentGuardianController } from './controllers/student-guardian.controller';
import { StudentController } from './controllers/student.controller';
import { StudentGuardianEntity } from './entities/student-guardian.entity';
import { StudentEntity } from './entities/student.entity';
import { StudentGuardianService } from './services/student-guardian.service';
import { StudentService } from './services/student.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StudentEntity, StudentGuardianEntity]),
    UsersModule,
    ParishModule,
    EnrollmentModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [StudentController, StudentGuardianController],
  providers: [StudentService, StudentGuardianService],
  exports: [StudentService, StudentGuardianService],
})
export class StudentModule {}
