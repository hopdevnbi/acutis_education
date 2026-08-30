import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ClassModule } from '../class/class.module';
import { StudentModule } from '../student/student.module';
import { EnrollmentController } from './controllers/enrollment.controller';
import { EnrollmentEntity } from './entities/enrollment.entity';
import { EnrollmentQueryService } from './services/enrollment-query.service';
import { EnrollmentService } from './services/enrollment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnrollmentEntity]),
    forwardRef(() => StudentModule),
    forwardRef(() => ClassModule),
    AuthModule,
    AccessControlModule,
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentQueryService, EnrollmentService],
  exports: [EnrollmentQueryService, EnrollmentService],
})
export class EnrollmentModule {}
