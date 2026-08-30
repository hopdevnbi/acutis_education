import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicStructureModule } from '../academic-structure/academic-structure.module';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { ParishModule } from '../parish/parish.module';
import { ClassController } from './controllers/class.controller';
import { ClassCatechistAssignmentEntity } from './entities/class-catechist-assignment.entity';
import { ClassEntity } from './entities/class.entity';
import { ClassService } from './services/class.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClassEntity, ClassCatechistAssignmentEntity]),
    ParishModule,
    AcademicStructureModule,
    AuthModule,
    AccessControlModule,
  ],
  controllers: [ClassController],
  providers: [ClassService],
  exports: [ClassService],
})
export class ClassModule {}
