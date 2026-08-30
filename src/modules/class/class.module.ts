import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicStructureModule } from '../academic-structure/academic-structure.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';
import { ParishModule } from '../parish/parish.module';
import { StudentModule } from '../student/student.module';
import { UsersModule } from '../users/users.module';
import { ClassCatechistAssignmentController } from './controllers/class-catechist-assignment.controller';
import { ClassController } from './controllers/class.controller';
import { ClassCatechistAssignmentEntity } from './entities/class-catechist-assignment.entity';
import { ClassEntity } from './entities/class.entity';
import { ClassCatechistAssignmentService } from './services/class-catechist-assignment.service';
import { ClassScopeService } from './services/class-scope.service';
import { ClassService } from './services/class.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassEntity, ClassCatechistAssignmentEntity]),
    ParishModule,
    AcademicStructureModule,
    UsersModule,
    forwardRef(() => EnrollmentModule),
    forwardRef(() => StudentModule),
    AuthModule,
    AccessControlModule,
  ],
  controllers: [ClassController, ClassCatechistAssignmentController],
  providers: [ClassService, ClassCatechistAssignmentService, ClassScopeService],
  exports: [ClassService, ClassCatechistAssignmentService, ClassScopeService],
})
export class ClassModule {}
