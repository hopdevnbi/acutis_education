import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { StudentModule } from '../student/student.module';
import { ClassSessionAttendanceController } from './controllers/class-session-attendance.controller';
import { ClassSessionsController } from './controllers/class-sessions.controller';
import { AttendanceRecordEntity } from './entities/attendance-record.entity';
import { ClassSessionRosterEntity } from './entities/class-session-roster.entity';
import { ClassSessionEntity } from './entities/class-session.entity';
import { AttendanceService } from './services/attendance.service';
import { ClassOperationsAccessService } from './services/class-operations-access.service';
import { ClassOperationsService } from './services/class-operations.service';
import { ClassSessionRosterService } from './services/class-session-roster.service';
import { ClassSessionService } from './services/class-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ClassSessionEntity,
      ClassSessionRosterEntity,
      AttendanceRecordEntity,
    ]),
    ClassModule,
    EnrollmentModule,
    StudentModule,
    ParishModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [ClassSessionsController, ClassSessionAttendanceController],
  providers: [
    ClassOperationsService,
    ClassSessionService,
    ClassSessionRosterService,
    AttendanceService,
    ClassOperationsAccessService,
  ],
  exports: [ClassOperationsService],
})
export class ClassOperationsModule {}
